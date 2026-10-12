import { prisma } from "../../lib/prisma.js";
import { withDbRetry } from "../../lib/db-retry.js";
import type {
  User,
  SiteSettings,
  ThemePreference,
  LanguagePreference,
} from "../../schemas/auth.schema.js";
import type {
  GlobalBank,
  UserBank,
  Exchange,
} from "../../schemas/banks.schema.js";
import type { Trade } from "../../schemas/trades.schema.js";
import type { AuditLog } from "../../schemas/admin.schema.js";
import {
  mapAuditLog,
  mapExchange,
  mapGlobalBank,
  mapSiteSettings,
  mapTrade,
  mapUser,
  mapUserBank,
  parseDate,
} from "./mappers.js";
import { createTTLCache } from "../../lib/server-cache.js";
import { buildBootstrapDatabase, needsSeed } from "./seed.js";
import {
  accumulateKyivProfitBuckets,
  isKyivToday,
  tradeMatchesKyivMonthDays,
} from "../../lib/kyiv-dates.js";
import {
  buildTradeListQuery,
  type TradeListFilters,
} from "./trade-filters.js";

const TX_OPTIONS = { maxWait: 15000, timeout: 60000 };

const exchangesCache = createTTLCache<Exchange[]>(60_000);
const globalBanksCache = createTTLCache<GlobalBank[]>(60_000);

export function invalidateReferenceDataCache(): void {
  exchangesCache.clear();
  globalBanksCache.clear();
}

let bootstrapPromise: Promise<void> | null = null;

async function runBootstrapIfNeeded(): Promise<void> {
  await withDbRetry(async () => {
    if (await needsSeed()) {
      const db = await buildBootstrapDatabase();
      const { saveDatabase } = await import("./repository.js");
      await saveDatabase(db);
    }
  });
}

export async function ensureBootstrapped(): Promise<void> {
  bootstrapPromise ??= runBootstrapIfNeeded().catch(err => {
    bootstrapPromise = null;
    throw err;
  });
  await bootstrapPromise;
}

export async function pingDatabase(): Promise<void> {
  await ensureBootstrapped();
  await prisma.$queryRaw`SELECT 1`;
}

export async function getSiteSettings(): Promise<SiteSettings> {
  await ensureBootstrapped();
  const row = await prisma.siteSettings.findUnique({ where: { id: 1 } });
  if (!row) throw new Error("site_settings row missing");
  return mapSiteSettings(row);
}

export async function getActiveExchanges(): Promise<Exchange[]> {
  const cached = exchangesCache.get();
  if (cached) return cached;
  await ensureBootstrapped();
  const rows = await prisma.exchange.findMany({ where: { isActive: true } });
  const mapped = rows.map(mapExchange);
  exchangesCache.set(mapped);
  return mapped;
}

export async function findUserByNickname(
  nickname: string,
): Promise<User | null> {
  await ensureBootstrapped();
  const row = await prisma.user.findUnique({
    where: { nickname: nickname.toLowerCase() },
  });
  return row ? mapUser(row) : null;
}

export async function findUserById(id: string): Promise<User | null> {
  await ensureBootstrapped();
  const row = await prisma.user.findUnique({ where: { id } });
  return row ? mapUser(row) : null;
}

export async function getFailedAttempt(rateKey: string) {
  await ensureBootstrapped();
  const row = await prisma.failedAttempt.findUnique({ where: { rateKey } });
  if (!row) return null;
  return {
    count: row.count,
    lockedUntil: row.lockedUntil != null ? Number(row.lockedUntil) : undefined,
  };
}

export async function upsertFailedAttempt(
  rateKey: string,
  count: number,
  lockedUntil?: number,
) {
  await prisma.failedAttempt.upsert({
    where: { rateKey },
    create: {
      rateKey,
      count,
      lockedUntil: lockedUntil != null ? BigInt(lockedUntil) : null,
    },
    update: {
      count,
      lockedUntil: lockedUntil != null ? BigInt(lockedUntil) : null,
    },
  });
}

export async function deleteFailedAttempt(rateKey: string) {
  await prisma.failedAttempt.deleteMany({ where: { rateKey } });
}

export async function createSession(
  token: string,
  userId: string,
  createdAt: string,
  expiresAt: string,
) {
  await prisma.session.create({
    data: {
      token,
      userId,
      createdAt: parseDate(createdAt),
      expiresAt: parseDate(expiresAt),
    },
  });
}

export async function deleteSession(token: string) {
  await prisma.session.deleteMany({ where: { token } });
}

export async function deleteSessionsForUser(userId: string) {
  await prisma.session.deleteMany({ where: { userId } });
}

export async function updateUserLastLogin(userId: string, lastLoginAt: string) {
  await prisma.user.update({
    where: { id: userId },
    data: { lastLoginAt: parseDate(lastLoginAt), updatedAt: new Date() },
  });
}

export async function updateUserPassword(userId: string, passwordHash: string) {
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash, updatedAt: new Date() },
  });
}

export async function updateUserProfile(
  userId: string,
  data: Partial<
    Pick<User, "telegram" | "themePreference" | "languagePreference">
  >,
) {
  await prisma.user.update({
    where: { id: userId },
    data: {
      ...(data.telegram !== undefined ? { telegram: data.telegram } : {}),
      ...(data.themePreference !== undefined
        ? { themePreference: data.themePreference }
        : {}),
      ...(data.languagePreference !== undefined
        ? { languagePreference: data.languagePreference }
        : {}),
      updatedAt: new Date(),
    },
  });
}

export async function registerUserWithBanks(
  user: User,
  banks: UserBank[],
  session: { token: string; createdAt: string; expiresAt: string },
) {
  await prisma.$transaction(async (tx) => {
    await tx.user.create({
      data: {
        id: user.id,
        nickname: user.nickname,
        telegram: user.telegram,
        passwordHash: user.passwordHash,
        role: user.role,
        status: user.status,
        createdAt: parseDate(user.createdAt),
        updatedAt: parseDate(user.updatedAt),
        lastLoginAt: parseDate(user.lastLoginAt!),
        themePreference: user.themePreference,
        languagePreference: user.languagePreference,
      },
    });
    if (banks.length > 0) {
      await tx.userBank.createMany({
        data: banks.map((b) => ({
          id: b.id,
          userId: b.userId,
          globalBankId: b.globalBankId ?? null,
          name: b.name,
          turnoverLimitUah: b.turnoverLimitUah,
          initialTurnoverUah: b.initialTurnoverUah,
          buyTurnoverUah: b.buyTurnoverUah,
          sellTurnoverUah: b.sellTurnoverUah,
          netProfitUah: b.netProfitUah,
          tradesCount: b.tradesCount,
          notes: b.notes ?? null,
          color: b.color ?? null,
          logoSvg: b.logoSvg ?? null,
          isArchived: b.isArchived,
          createdAt: parseDate(b.createdAt),
          updatedAt: parseDate(b.updatedAt),
        })),
      });
    }
    await tx.session.create({
      data: {
        token: session.token,
        userId: user.id,
        createdAt: parseDate(session.createdAt),
        expiresAt: parseDate(session.expiresAt),
      },
    });
  }, TX_OPTIONS);
}

export async function getUserBanks(
  userId: string,
  includeArchived = false,
): Promise<UserBank[]> {
  await ensureBootstrapped();
  const rows = await prisma.userBank.findMany({
    where: { userId, ...(includeArchived ? {} : { isArchived: false }) },
  });
  return rows.map(mapUserBank);
}

export async function getActiveGlobalBanks(): Promise<GlobalBank[]> {
  const cached = globalBanksCache.get();
  if (cached) return cached;
  await ensureBootstrapped();
  const rows = await prisma.globalBank.findMany({ where: { isActive: true } });
  const mapped = rows.map(mapGlobalBank);
  globalBanksCache.set(mapped);
  return mapped;
}

export async function findUserBankById(id: string): Promise<UserBank | null> {
  const row = await prisma.userBank.findUnique({ where: { id } });
  return row ? mapUserBank(row) : null;
}

export async function findDuplicateUserBankName(
  userId: string,
  name: string,
  excludeBankId?: string,
): Promise<UserBank | null> {
  const trimmed = name.trim();
  if (!trimmed) return null;
  const row = await prisma.userBank.findFirst({
    where: {
      userId,
      isArchived: false,
      name: { equals: trimmed, mode: "insensitive" },
      ...(excludeBankId ? { NOT: { id: excludeBankId } } : {}),
    },
  });
  return row ? mapUserBank(row) : null;
}

export async function createUserBank(bank: UserBank) {
  await prisma.userBank.create({
    data: {
      id: bank.id,
      userId: bank.userId,
      globalBankId: bank.globalBankId ?? null,
      name: bank.name,
      turnoverLimitUah: bank.turnoverLimitUah,
      initialTurnoverUah: bank.initialTurnoverUah,
      buyTurnoverUah: bank.buyTurnoverUah,
      sellTurnoverUah: bank.sellTurnoverUah,
      netProfitUah: bank.netProfitUah,
      tradesCount: bank.tradesCount,
      notes: bank.notes ?? null,
      color: bank.color ?? null,
      logoSvg: bank.logoSvg ?? null,
      isArchived: bank.isArchived,
      createdAt: parseDate(bank.createdAt),
      updatedAt: parseDate(bank.updatedAt),
    },
  });
}

export async function updateUserBankRecord(bank: UserBank) {
  await prisma.userBank.update({
    where: { id: bank.id },
    data: {
      name: bank.name,
      turnoverLimitUah: bank.turnoverLimitUah,
      initialTurnoverUah: bank.initialTurnoverUah,
      notes: bank.notes ?? null,
      color: bank.color ?? null,
      updatedAt: parseDate(bank.updatedAt),
    },
  });
}

export async function deleteUserBankRecord(id: string) {
  await prisma.userBank.delete({ where: { id } });
}

export async function syncUserBankStats(userId: string) {
  await withDbRetry(async () => {
    const [banks, trades] = await Promise.all([
      prisma.userBank.findMany({ where: { userId, isArchived: false } }),
      prisma.trade.findMany({
        where: { userId },
        select: {
          buyBankId: true,
          sellBankId: true,
          buyAmountUah: true,
          sellAmountUah: true,
          netProfitUah: true,
        },
      }),
    ]);

    const now = new Date();
    if (banks.length > 0) {
      await prisma.$transaction(async (tx) => {
        for (const bank of banks) {
          let buyTurnover = 0;
          let sellTurnover = 0;
          let netProfit = 0;
          let count = 0;

          for (const trade of trades) {
            let involved = false;
            if (trade.buyBankId === bank.id) {
              buyTurnover += trade.buyAmountUah;
              involved = true;
            }
            if (trade.sellBankId === bank.id) {
              sellTurnover += trade.sellAmountUah;
              involved = true;
            }
            if (involved) {
              count += 1;
              netProfit += trade.netProfitUah;
            }
          }

          await tx.userBank.update({
            where: { id: bank.id },
            data: {
              buyTurnoverUah:
                Math.round((buyTurnover + Number.EPSILON) * 100) / 100,
              sellTurnoverUah:
                Math.round((sellTurnover + Number.EPSILON) * 100) / 100,
              netProfitUah: Math.round((netProfit + Number.EPSILON) * 100) / 100,
              tradesCount: count,
              updatedAt: now,
            },
          });
        }
      }, TX_OPTIONS);
    }
  });
}

export async function countActiveUserBanks(userId: string): Promise<number> {
  await ensureBootstrapped();
  return prisma.userBank.count({
    where: { userId, isArchived: false },
  });
}

export async function getTradesForUser(
  userId: string,
  filters: TradeListFilters = {},
): Promise<Trade[]> {
  await ensureBootstrapped();

  const { where, orderBy, monthDayFilter } = buildTradeListQuery(
    userId,
    filters,
  );

  const rows = await prisma.trade.findMany({ where, orderBy });
  let trades = rows.map(mapTrade);

  if (monthDayFilter) {
    const { monthKey, dayFrom, dayTo } = monthDayFilter;
    trades = trades.filter((t) =>
      tradeMatchesKyivMonthDays(t.createdAt, monthKey, dayFrom, dayTo),
    );
  }

  return trades;
}

export async function findTradeById(id: string): Promise<Trade | null> {
  const row = await prisma.trade.findUnique({ where: { id } });
  return row ? mapTrade(row) : null;
}

function tradeToCreateData(trade: Trade) {
  return {
    id: trade.id,
    userId: trade.userId,
    createdAt: parseDate(trade.createdAt),
    updatedAt: trade.updatedAt ? parseDate(trade.updatedAt) : null,
    buyExchange: trade.buyExchange,
    buyBankId: trade.buyBankId,
    buyBankName: trade.buyBankName,
    buyRate: trade.buyRate,
    buyAmountUah: trade.buyAmountUah,
    buyCommission: trade.buyCommission,
    buyCommissionType: trade.buyCommissionType,
    buyUsdtAmount: trade.buyUsdtAmount,
    sellExchange: trade.sellExchange,
    sellBankId: trade.sellBankId,
    sellBankName: trade.sellBankName,
    sellRate: trade.sellRate,
    sellUsdtAmount: trade.sellUsdtAmount,
    sellAmountUah: trade.sellAmountUah,
    sellCommission: trade.sellCommission,
    sellCommissionType: trade.sellCommissionType,
    extraExpensesUah: trade.extraExpensesUah,
    totalCostUah: trade.totalCostUah,
    grossRevenueUah: trade.grossRevenueUah,
    totalCommissionsUah: trade.totalCommissionsUah,
    grossProfitUah: trade.grossProfitUah,
    netProfitUah: trade.netProfitUah,
    roiPercent: trade.roiPercent,
    spreadPerUnit: trade.spreadPerUnit,
    spreadPercent: trade.spreadPercent,
    notes: trade.notes ?? null,
  };
}

export async function createTradeRecord(trade: Trade) {
  await prisma.trade.create({ data: tradeToCreateData(trade) });
}

export async function updateTradeRecord(trade: Trade) {
  await prisma.trade.update({
    where: { id: trade.id },
    data: tradeToCreateData(trade),
  });
}

export async function deleteTradeRecord(id: string) {
  await prisma.trade.delete({ where: { id } });
}

/** @deprecated Stats are derived from filtered trades on the client; use countActiveUserBanks. */
export async function getDashboardStats(userId: string) {
  const banksCount = await countActiveUserBanks(userId);
  return {
    profitToday: 0,
    profitMonth: 0,
    spreadTodayPercent: 0,
    roiTodayPercent: 0,
    buyTurnoverToday: 0,
    sellTurnoverToday: 0,
    totalTurnoverToday: 0,
    tradesCountToday: 0,
    banksCount,
    recentTrades: [],
  };
}

export async function insertAuditLog(log: AuditLog) {
  await prisma.auditLog.create({
    data: {
      id: log.id,
      timestamp: parseDate(log.timestamp),
      actionType: log.actionType,
      adminId: log.adminId,
      adminNickname: log.adminNickname,
      targetUserId: log.targetUserId ?? null,
      details: log.details,
    },
  });
  const count = await prisma.auditLog.count();
  if (count > 500) {
    const oldest = await prisma.auditLog.findMany({
      orderBy: { timestamp: "asc" },
      take: count - 500,
      select: { id: true },
    });
    if (oldest.length > 0) {
      await prisma.auditLog.deleteMany({
        where: { id: { in: oldest.map((o) => o.id) } },
      });
    }
  }
}

export async function getAuditLogs(limit = 100) {
  const rows = await prisma.auditLog.findMany({
    orderBy: { timestamp: "desc" },
    take: limit,
  });
  return rows.map(mapAuditLog);
}

export async function getAllGlobalBanks() {
  const rows = await prisma.globalBank.findMany();
  return rows.map(mapGlobalBank);
}

export async function getAllExchanges() {
  const rows = await prisma.exchange.findMany();
  return rows.map(mapExchange);
}

export async function createGlobalBank(bank: GlobalBank) {
  await prisma.globalBank.create({
    data: {
      id: bank.id,
      name: bank.name,
      code: bank.code,
      defaultLimitUah: bank.defaultLimitUah,
      color: bank.color,
      logoSvg: bank.logoSvg ?? null,
      isActive: bank.isActive,
      createdAt: parseDate(bank.createdAt),
    },
  });
  invalidateReferenceDataCache();
}

export async function updateGlobalBank(bank: GlobalBank) {
  await prisma.globalBank.update({
    where: { id: bank.id },
    data: {
      name: bank.name,
      defaultLimitUah: bank.defaultLimitUah,
      color: bank.color,
      logoSvg: bank.logoSvg ?? null,
      isActive: bank.isActive,
    },
  });
  invalidateReferenceDataCache();
}

export async function createExchangeRecord(exchange: Exchange) {
  await prisma.exchange.create({
    data: {
      id: exchange.id,
      name: exchange.name,
      code: exchange.code,
      isActive: exchange.isActive,
      createdAt: parseDate(exchange.createdAt),
    },
  });
  invalidateReferenceDataCache();
}

export async function updateExchangeRecord(exchange: Exchange) {
  await prisma.exchange.update({
    where: { id: exchange.id },
    data: { name: exchange.name, isActive: exchange.isActive },
  });
  invalidateReferenceDataCache();
}

export async function updateSiteSettings(settings: SiteSettings) {
  await prisma.siteSettings.update({
    where: { id: 1 },
    data: {
      siteName: settings.siteName,
      curatorTelegram: settings.curatorTelegram,
      defaultLanguage: settings.defaultLanguage,
      defaultTheme: settings.defaultTheme,
      bankLimitMode: settings.bankLimitMode,
      announcement: settings.announcement ?? null,
      allowRegistration: settings.allowRegistration,
    },
  });
}

export async function getAdminOverviewStats() {
  const weekAgo = new Date(Date.now() - 7 * 86400000);
  const dayStart = new Date(
    new Date().getFullYear(),
    new Date().getMonth(),
    new Date().getDate(),
  );

  const [totalStudents, activeStudents, tradesTodayCount, tradeAgg] =
    await Promise.all([
      prisma.user.count({ where: { role: "student" } }),
      prisma.user.count({
        where: { role: "student", lastLoginAt: { gte: weekAgo } },
      }),
      prisma.trade.count({ where: { createdAt: { gte: dayStart } } }),
      prisma.trade.aggregate({
        _sum: { buyAmountUah: true, sellAmountUah: true, netProfitUah: true },
        _count: true,
      }),
    ]);

  const totalPlatformTurnover =
    (tradeAgg._sum.buyAmountUah ?? 0) + (tradeAgg._sum.sellAmountUah ?? 0);

  return {
    totalStudents,
    activeStudents,
    tradesToday: tradesTodayCount,
    totalPlatformTurnover:
      Math.round((totalPlatformTurnover + Number.EPSILON) * 100) / 100,
    totalStudentProfit:
      Math.round(((tradeAgg._sum.netProfitUah ?? 0) + Number.EPSILON) * 100) /
      100,
    totalTradesCount: tradeAgg._count,
  };
}

export async function getAdminUsers(search?: string, status?: string) {
  const [users, tradeGroups] = await Promise.all([
    prisma.user.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.trade.groupBy({
      by: ["userId"],
      _sum: { netProfitUah: true, buyAmountUah: true, sellAmountUah: true },
      _count: true,
    }),
  ]);

  const statsByUser = new Map<
    string,
    { profit: number; buy: number; sell: number; count: number }
  >();
  for (const g of tradeGroups) {
    statsByUser.set(g.userId, {
      profit: g._sum.netProfitUah ?? 0,
      buy: g._sum.buyAmountUah ?? 0,
      sell: g._sum.sellAmountUah ?? 0,
      count: g._count,
    });
  }

  let result = users.map((u) => {
    const s = statsByUser.get(u.id) ?? { profit: 0, buy: 0, sell: 0, count: 0 };
    return {
      id: u.id,
      nickname: u.nickname,
      telegram: u.telegram,
      role: u.role,
      status: u.status,
      createdAt: u.createdAt.toISOString(),
      lastLoginAt: u.lastLoginAt?.toISOString() ?? null,
      tradesCount: s.count,
      allTimeProfit: Math.round((s.profit + Number.EPSILON) * 100) / 100,
      buyTurnover: Math.round((s.buy + Number.EPSILON) * 100) / 100,
      sellTurnover: Math.round((s.sell + Number.EPSILON) * 100) / 100,
    };
  });

  if (search?.trim()) {
    const q = search.trim().toLowerCase();
    result = result.filter(
      (u) =>
        u.nickname.toLowerCase().includes(q) ||
        u.telegram.toLowerCase().includes(q),
    );
  }
  if (status && status !== "all") {
    result = result.filter((u) => u.status === status);
  }
  return result;
}

export async function getStudentsStats() {
  const students = await prisma.user.findMany({
    where: { role: "student" },
    select: {
      id: true,
      nickname: true,
      telegram: true,
      status: true,
      lastLoginAt: true,
    },
  });
  if (students.length === 0) return [];

  const studentIds = students.map((s) => s.id);
  const trades = await prisma.trade.findMany({
    where: { userId: { in: studentIds } },
    select: {
      userId: true,
      createdAt: true,
      netProfitUah: true,
      buyAmountUah: true,
      sellAmountUah: true,
    },
  });

  type Acc = {
    profitToday: number;
    profitYesterday: number;
    profitMonth: number;
    profitAllTime: number;
    buyTurnover: number;
    sellTurnover: number;
    tradesCount: number;
  };

  const byUser = new Map<string, Acc>();
  for (const t of trades) {
    const acc = byUser.get(t.userId) ?? {
      profitToday: 0,
      profitYesterday: 0,
      profitMonth: 0,
      profitAllTime: 0,
      buyTurnover: 0,
      sellTurnover: 0,
      tradesCount: 0,
    };
    acc.profitAllTime += t.netProfitUah;
    acc.buyTurnover += t.buyAmountUah;
    acc.sellTurnover += t.sellAmountUah;
    acc.tradesCount += 1;
    accumulateKyivProfitBuckets(t.createdAt, t.netProfitUah, acc);
    byUser.set(t.userId, acc);
  }

  const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

  return students.map((student) => {
    const s = byUser.get(student.id) ?? {
      profitToday: 0,
      profitYesterday: 0,
      profitMonth: 0,
      profitAllTime: 0,
      buyTurnover: 0,
      sellTurnover: 0,
      tradesCount: 0,
    };
    return {
      userId: student.id,
      nickname: student.nickname,
      telegram: student.telegram,
      status: student.status,
      profitToday: round2(s.profitToday),
      profitYesterday: round2(s.profitYesterday),
      profitMonth: round2(s.profitMonth),
      profitAllTime: round2(s.profitAllTime),
      buyTurnover: round2(s.buyTurnover),
      sellTurnover: round2(s.sellTurnover),
      tradesCount: s.tradesCount,
      lastLoginAt: student.lastLoginAt?.toISOString() ?? null,
    };
  });
}

export async function updateUserStatus(userId: string, status: User["status"]) {
  await prisma.user.update({
    where: { id: userId },
    data: { status, updatedAt: new Date() },
  });
  if (status === "blocked") {
    await deleteSessionsForUser(userId);
  }
}

export async function updateUserAdminProfile(
  userId: string,
  data: Partial<Pick<User, "nickname" | "telegram" | "role">>,
) {
  await prisma.user.update({
    where: { id: userId },
    data: {
      ...(data.nickname !== undefined ? { nickname: data.nickname } : {}),
      ...(data.telegram !== undefined ? { telegram: data.telegram } : {}),
      ...(data.role !== undefined ? { role: data.role } : {}),
      updatedAt: new Date(),
    },
  });
}

export async function resetUserPassword(userId: string, passwordHash: string) {
  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: { passwordHash, updatedAt: new Date() },
    }),
    prisma.session.deleteMany({ where: { userId } }),
  ]);
}

export async function deleteUserAndData(userId: string) {
  await prisma.$transaction([
    prisma.trade.deleteMany({ where: { userId } }),
    prisma.userBank.deleteMany({ where: { userId } }),
    prisma.session.deleteMany({ where: { userId } }),
    prisma.user.delete({ where: { id: userId } }),
  ]);
}

export async function nicknameTaken(
  nickname: string,
  excludeUserId?: string,
): Promise<boolean> {
  const row = await prisma.user.findUnique({
    where: { nickname: nickname.toLowerCase() },
  });
  if (!row) return false;
  return row.id !== excludeUserId;
}

export function toPublicUser(user: User) {
  return {
    id: user.id,
    nickname: user.nickname,
    telegram: user.telegram,
    role: user.role,
    status: user.status,
    themePreference: user.themePreference,
    languagePreference: user.languagePreference,
    createdAt: user.createdAt,
    lastLoginAt: user.lastLoginAt,
  };
}

export type { ThemePreference, LanguagePreference };
