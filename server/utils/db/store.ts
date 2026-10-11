import { prisma } from '../../lib/prisma.js';
import type { User, SiteSettings, ThemePreference, LanguagePreference } from '../../schemas/auth.schema.js';
import type { GlobalBank, UserBank, Exchange } from '../../schemas/banks.schema.js';
import type { Trade } from '../../schemas/trades.schema.js';
import type { AuditLog } from '../../schemas/admin.schema.js';
import {
  mapAuditLog,
  mapExchange,
  mapGlobalBank,
  mapSiteSettings,
  mapTrade,
  mapUser,
  mapUserBank,
  parseDate,
} from './mappers.js';
import { buildBootstrapDatabase, needsSeed } from './seed.js';
import { ensureDemoUsersPrisma } from './demo-users.js';

const TX_OPTIONS = { maxWait: 15000, timeout: 60000 };

let bootstrapPromise: Promise<void> | null = null;

export async function ensureBootstrapped(): Promise<void> {
  if (!bootstrapPromise) {
    bootstrapPromise = (async () => {
      if (await needsSeed()) {
        const db = await buildBootstrapDatabase();
        const { saveDatabase } = await import('./repository.js');
        await saveDatabase(db);
      }
      await ensureDemoUsersPrisma();
    })();
  }
  await bootstrapPromise;
}

export async function pingDatabase(): Promise<void> {
  await ensureBootstrapped();
  await prisma.$queryRaw`SELECT 1`;
}

export async function getSiteSettings(): Promise<SiteSettings> {
  await ensureBootstrapped();
  const row = await prisma.siteSettings.findUnique({ where: { id: 1 } });
  if (!row) throw new Error('site_settings row missing');
  return mapSiteSettings(row);
}

export async function getActiveExchanges(): Promise<Exchange[]> {
  await ensureBootstrapped();
  const rows = await prisma.exchange.findMany({ where: { isActive: true } });
  return rows.map(mapExchange);
}

export async function findUserByNickname(nickname: string): Promise<User | null> {
  await ensureBootstrapped();
  const row = await prisma.user.findUnique({ where: { nickname: nickname.toLowerCase() } });
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

export async function createSession(token: string, userId: string, createdAt: string, expiresAt: string) {
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
  data: Partial<Pick<User, 'telegram' | 'themePreference' | 'languagePreference'>>,
) {
  await prisma.user.update({
    where: { id: userId },
    data: {
      ...(data.telegram !== undefined ? { telegram: data.telegram } : {}),
      ...(data.themePreference !== undefined ? { themePreference: data.themePreference } : {}),
      ...(data.languagePreference !== undefined ? { languagePreference: data.languagePreference } : {}),
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

export async function getUserBanks(userId: string, includeArchived = false): Promise<UserBank[]> {
  await ensureBootstrapped();
  const rows = await prisma.userBank.findMany({
    where: { userId, ...(includeArchived ? {} : { isArchived: false }) },
  });
  return rows.map(mapUserBank);
}

export async function getActiveGlobalBanks(): Promise<GlobalBank[]> {
  await ensureBootstrapped();
  const rows = await prisma.globalBank.findMany({ where: { isActive: true } });
  return rows.map(mapGlobalBank);
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
  const normalized = name.trim().toLowerCase();
  const rows = await prisma.userBank.findMany({
    where: { userId, isArchived: false, ...(excludeBankId ? { NOT: { id: excludeBankId } } : {}) },
  });
  const match = rows.find((b) => b.name.trim().toLowerCase() === normalized);
  return match ? mapUserBank(match) : null;
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

export async function archiveUserBankRecord(id: string, updatedAt: string) {
  await prisma.userBank.update({
    where: { id },
    data: { isArchived: true, updatedAt: parseDate(updatedAt) },
  });
}

export async function syncUserBankStats(userId: string) {
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
  await Promise.all(
    banks.map((bank) => {
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
          // Credit full link profit to every bank involved (buy and/or sell).
          netProfit += trade.netProfitUah;
        }
      }

      return prisma.userBank.update({
        where: { id: bank.id },
        data: {
          buyTurnoverUah: Math.round((buyTurnover + Number.EPSILON) * 100) / 100,
          sellTurnoverUah: Math.round((sellTurnover + Number.EPSILON) * 100) / 100,
          netProfitUah: Math.round((netProfit + Number.EPSILON) * 100) / 100,
          tradesCount: count,
          updatedAt: now,
        },
      });
    }),
  );
}

type TradeFilters = {
  dateRange?: string | string[];
  bankId?: string | string[];
  exchange?: string | string[];
  search?: string | string[];
  sort?: string | string[];
};

export async function getTradesForUser(userId: string, filters: TradeFilters = {}): Promise<Trade[]> {
  await ensureBootstrapped();
  const rows = await prisma.trade.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });
  let trades = rows.map(mapTrade);

  const dateRange = filters.dateRange ? String(filters.dateRange) : undefined;
  const bankId = filters.bankId ? String(filters.bankId) : undefined;
  const exchange = filters.exchange ? String(filters.exchange) : undefined;
  const search = filters.search ? String(filters.search) : undefined;
  const sort = filters.sort ? String(filters.sort) : undefined;

  if (dateRange) {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const yesterdayStart = todayStart - 86400000;
    const weekStart = todayStart - 7 * 86400000;
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

    trades = trades.filter((t) => {
      const time = new Date(t.createdAt).getTime();
      if (dateRange === 'today') return time >= todayStart;
      if (dateRange === 'yesterday') return time >= yesterdayStart && time < todayStart;
      if (dateRange === 'week') return time >= weekStart;
      if (dateRange === 'month') return time >= monthStart;
      return true;
    });
  }

  if (bankId && bankId !== 'all') {
    trades = trades.filter((t) => t.buyBankId === bankId || t.sellBankId === bankId);
  }

  if (exchange && exchange !== 'all') {
    trades = trades.filter((t) => t.buyExchange === exchange || t.sellExchange === exchange);
  }

  if (search?.trim()) {
    const q = search.trim().toLowerCase();
    trades = trades.filter(
      (t) =>
        (t.notes && t.notes.toLowerCase().includes(q)) ||
        t.buyBankName.toLowerCase().includes(q) ||
        t.sellBankName.toLowerCase().includes(q) ||
        t.buyExchange.toLowerCase().includes(q) ||
        t.sellExchange.toLowerCase().includes(q),
    );
  }

  if (sort === 'profit_desc') trades.sort((a, b) => b.netProfitUah - a.netProfitUah);
  else if (sort === 'profit_asc') trades.sort((a, b) => a.netProfitUah - b.netProfitUah);
  else if (sort === 'spread_desc') trades.sort((a, b) => b.spreadPercent - a.spreadPercent);
  else trades.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

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

export async function getDashboardStats(userId: string) {
  const [trades, banksCount] = await Promise.all([
    prisma.trade.findMany({ where: { userId } }),
    prisma.userBank.count({ where: { userId, isArchived: false } }),
  ]);

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const yesterdayStart = todayStart - 86400000;
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

  let profitToday = 0;
  let profitYesterday = 0;
  let profitMonth = 0;
  let profitAllTime = 0;
  let buyTurnover = 0;
  let sellTurnover = 0;

  for (const t of trades) {
    const time = t.createdAt.getTime();
    profitAllTime += t.netProfitUah;
    buyTurnover += t.buyAmountUah;
    sellTurnover += t.sellAmountUah;
    if (time >= todayStart) profitToday += t.netProfitUah;
    if (time >= yesterdayStart && time < todayStart) profitYesterday += t.netProfitUah;
    if (time >= monthStart) profitMonth += t.netProfitUah;
  }

  const recentTrades = [...trades]
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, 10)
    .map(mapTrade);

  return {
    profitToday: Math.round((profitToday + Number.EPSILON) * 100) / 100,
    profitYesterday: Math.round((profitYesterday + Number.EPSILON) * 100) / 100,
    profitMonth: Math.round((profitMonth + Number.EPSILON) * 100) / 100,
    profitAllTime: Math.round((profitAllTime + Number.EPSILON) * 100) / 100,
    buyTurnover: Math.round((buyTurnover + Number.EPSILON) * 100) / 100,
    sellTurnover: Math.round((sellTurnover + Number.EPSILON) * 100) / 100,
    totalTurnover: Math.round((buyTurnover + sellTurnover + Number.EPSILON) * 100) / 100,
    tradesCount: trades.length,
    banksCount,
    recentTrades,
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
      orderBy: { timestamp: 'asc' },
      take: count - 500,
      select: { id: true },
    });
    if (oldest.length > 0) {
      await prisma.auditLog.deleteMany({ where: { id: { in: oldest.map((o) => o.id) } } });
    }
  }
}

export async function getAuditLogs(limit = 100) {
  const rows = await prisma.auditLog.findMany({
    orderBy: { timestamp: 'desc' },
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
}

export async function updateExchangeRecord(exchange: Exchange) {
  await prisma.exchange.update({
    where: { id: exchange.id },
    data: { name: exchange.name, isActive: exchange.isActive },
  });
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
  const [students, tradesTodayCount, tradeAgg] = await Promise.all([
    prisma.user.findMany({ where: { role: 'student' } }),
    prisma.trade.count({
      where: {
        createdAt: {
          gte: new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate()),
        },
      },
    }),
    prisma.trade.aggregate({
      _sum: { buyAmountUah: true, sellAmountUah: true, netProfitUah: true },
      _count: true,
    }),
  ]);

  const activeStudents = students.filter((s) => {
    if (!s.lastLoginAt) return false;
    return Date.now() - s.lastLoginAt.getTime() < 7 * 86400000;
  });

  const totalPlatformTurnover =
    (tradeAgg._sum.buyAmountUah ?? 0) + (tradeAgg._sum.sellAmountUah ?? 0);

  return {
    totalStudents: students.length,
    activeStudents: activeStudents.length,
    tradesToday: tradesTodayCount,
    totalPlatformTurnover: Math.round((totalPlatformTurnover + Number.EPSILON) * 100) / 100,
    totalStudentProfit: Math.round(((tradeAgg._sum.netProfitUah ?? 0) + Number.EPSILON) * 100) / 100,
    totalTradesCount: tradeAgg._count,
  };
}

export async function getAdminUsers(search?: string, status?: string) {
  const users = await prisma.user.findMany({ orderBy: { createdAt: 'desc' } });
  const tradeRows = await prisma.trade.findMany({
    select: { userId: true, netProfitUah: true, buyAmountUah: true, sellAmountUah: true },
  });

  const statsByUser = new Map<string, { profit: number; buy: number; sell: number; count: number }>();
  for (const t of tradeRows) {
    const s = statsByUser.get(t.userId) ?? { profit: 0, buy: 0, sell: 0, count: 0 };
    s.profit += t.netProfitUah;
    s.buy += t.buyAmountUah;
    s.sell += t.sellAmountUah;
    s.count += 1;
    statsByUser.set(t.userId, s);
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
    result = result.filter((u) => u.nickname.toLowerCase().includes(q) || u.telegram.toLowerCase().includes(q));
  }
  if (status && status !== 'all') {
    result = result.filter((u) => u.status === status);
  }
  return result;
}

export async function getStudentsStats() {
  const students = await prisma.user.findMany({ where: { role: 'student' } });
  const trades = await prisma.trade.findMany();

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const yesterdayStart = todayStart - 86400000;
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

  return students.map((student) => {
    const userTrades = trades.filter((t) => t.userId === student.id);
    let profitToday = 0;
    let profitYesterday = 0;
    let profitMonth = 0;
    let profitAllTime = 0;
    let buyTurnover = 0;
    let sellTurnover = 0;

    for (const t of userTrades) {
      const time = t.createdAt.getTime();
      profitAllTime += t.netProfitUah;
      buyTurnover += t.buyAmountUah;
      sellTurnover += t.sellAmountUah;
      if (time >= todayStart) profitToday += t.netProfitUah;
      if (time >= yesterdayStart && time < todayStart) profitYesterday += t.netProfitUah;
      if (time >= monthStart) profitMonth += t.netProfitUah;
    }

    return {
      userId: student.id,
      nickname: student.nickname,
      telegram: student.telegram,
      status: student.status,
      profitToday: Math.round((profitToday + Number.EPSILON) * 100) / 100,
      profitYesterday: Math.round((profitYesterday + Number.EPSILON) * 100) / 100,
      profitMonth: Math.round((profitMonth + Number.EPSILON) * 100) / 100,
      profitAllTime: Math.round((profitAllTime + Number.EPSILON) * 100) / 100,
      buyTurnover: Math.round((buyTurnover + Number.EPSILON) * 100) / 100,
      sellTurnover: Math.round((sellTurnover + Number.EPSILON) * 100) / 100,
      tradesCount: userTrades.length,
      lastLoginAt: student.lastLoginAt?.toISOString() ?? null,
    };
  });
}

export async function updateUserStatus(userId: string, status: User['status']) {
  await prisma.user.update({
    where: { id: userId },
    data: { status, updatedAt: new Date() },
  });
  if (status === 'blocked') {
    await deleteSessionsForUser(userId);
  }
}

export async function updateUserAdminProfile(
  userId: string,
  data: Partial<Pick<User, 'nickname' | 'telegram' | 'role'>>,
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
    prisma.user.update({ where: { id: userId }, data: { passwordHash, updatedAt: new Date() } }),
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

export async function nicknameTaken(nickname: string, excludeUserId?: string): Promise<boolean> {
  const row = await prisma.user.findUnique({ where: { nickname: nickname.toLowerCase() } });
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
