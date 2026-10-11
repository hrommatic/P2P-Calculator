import { prisma } from '../../lib/prisma.js';
import type { DatabaseSchema } from '../../schemas/admin.schema.js';
import {
  mapAuditLog,
  mapExchange,
  mapGlobalBank,
  mapSession,
  mapSiteSettings,
  mapTrade,
  mapUser,
  mapUserBank,
  parseDate,
} from './mappers.js';
import { buildBootstrapDatabase, needsSeed } from './seed.js';
import { ensureDemoUsers } from './demo-users.js';

async function deleteOrphans(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  model: {
    deleteMany: (args: { where: Record<string, unknown> }) => Promise<unknown>;
  },
  ids: string[],
  field: string,
): Promise<void> {
  if (ids.length === 0) {
    await model.deleteMany({ where: {} });
    return;
  }
  await model.deleteMany({ where: { [field]: { notIn: ids } } });
}

const TX_OPTIONS = { maxWait: 15000, timeout: 60000 };

export async function saveDatabase(db: DatabaseSchema): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const userIds = db.users.map((u) => u.id);
    const sessionTokens = db.sessions.map((s) => s.token);
    const globalBankIds = db.globalBanks.map((b) => b.id);
    const userBankIds = db.userBanks.map((b) => b.id);
    const exchangeIds = db.exchanges.map((e) => e.id);
    const tradeIds = db.trades.map((t) => t.id);
    const auditIds = db.auditLogs.map((l) => l.id);
    const failedKeys = Object.keys(db.failedAttempts);

    await Promise.all([
      deleteOrphans(tx, tx.user, userIds, 'id'),
      deleteOrphans(tx, tx.session, sessionTokens, 'token'),
      deleteOrphans(tx, tx.globalBank, globalBankIds, 'id'),
      deleteOrphans(tx, tx.userBank, userBankIds, 'id'),
      deleteOrphans(tx, tx.exchange, exchangeIds, 'id'),
      deleteOrphans(tx, tx.trade, tradeIds, 'id'),
      deleteOrphans(tx, tx.auditLog, auditIds, 'id'),
      deleteOrphans(tx, tx.failedAttempt, failedKeys, 'rateKey'),
    ]);

    await Promise.all(db.users.map((u) => tx.user.upsert({
        where: { id: u.id },
        create: {
          id: u.id,
          nickname: u.nickname,
          telegram: u.telegram,
          passwordHash: u.passwordHash,
          role: u.role,
          status: u.status,
          createdAt: parseDate(u.createdAt),
          updatedAt: parseDate(u.updatedAt),
          lastLoginAt: u.lastLoginAt ? parseDate(u.lastLoginAt) : null,
          themePreference: u.themePreference,
          languagePreference: u.languagePreference,
        },
        update: {
          nickname: u.nickname,
          telegram: u.telegram,
          passwordHash: u.passwordHash,
          role: u.role,
          status: u.status,
          createdAt: parseDate(u.createdAt),
          updatedAt: parseDate(u.updatedAt),
          lastLoginAt: u.lastLoginAt ? parseDate(u.lastLoginAt) : null,
          themePreference: u.themePreference,
          languagePreference: u.languagePreference,
        },
      })));

    await Promise.all(db.sessions.map((s) => tx.session.upsert({
        where: { token: s.token },
        create: {
          token: s.token,
          userId: s.userId,
          createdAt: parseDate(s.createdAt),
          expiresAt: parseDate(s.expiresAt),
        },
        update: {
          userId: s.userId,
          createdAt: parseDate(s.createdAt),
          expiresAt: parseDate(s.expiresAt),
        },
      })));

    await Promise.all(db.globalBanks.map((b) => tx.globalBank.upsert({
        where: { id: b.id },
        create: {
          id: b.id,
          name: b.name,
          code: b.code,
          defaultLimitUah: b.defaultLimitUah,
          color: b.color,
          logoSvg: b.logoSvg ?? null,
          isActive: b.isActive,
          createdAt: parseDate(b.createdAt),
        },
        update: {
          name: b.name,
          code: b.code,
          defaultLimitUah: b.defaultLimitUah,
          color: b.color,
          logoSvg: b.logoSvg ?? null,
          isActive: b.isActive,
          createdAt: parseDate(b.createdAt),
        },
      })));

    await Promise.all(db.userBanks.map((b) => tx.userBank.upsert({
        where: { id: b.id },
        create: {
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
        },
        update: {
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
        },
      })));

    await Promise.all(db.exchanges.map((e) => tx.exchange.upsert({
        where: { id: e.id },
        create: {
          id: e.id,
          name: e.name,
          code: e.code,
          isActive: e.isActive,
          createdAt: parseDate(e.createdAt),
        },
        update: {
          name: e.name,
          code: e.code,
          isActive: e.isActive,
          createdAt: parseDate(e.createdAt),
        },
      })));

    await Promise.all(db.trades.map((t) => tx.trade.upsert({
        where: { id: t.id },
        create: {
          id: t.id,
          userId: t.userId,
          createdAt: parseDate(t.createdAt),
          updatedAt: t.updatedAt ? parseDate(t.updatedAt) : null,
          buyExchange: t.buyExchange,
          buyBankId: t.buyBankId,
          buyBankName: t.buyBankName,
          buyRate: t.buyRate,
          buyAmountUah: t.buyAmountUah,
          buyCommission: t.buyCommission,
          buyCommissionType: t.buyCommissionType,
          buyUsdtAmount: t.buyUsdtAmount,
          sellExchange: t.sellExchange,
          sellBankId: t.sellBankId,
          sellBankName: t.sellBankName,
          sellRate: t.sellRate,
          sellUsdtAmount: t.sellUsdtAmount,
          sellAmountUah: t.sellAmountUah,
          sellCommission: t.sellCommission,
          sellCommissionType: t.sellCommissionType,
          extraExpensesUah: t.extraExpensesUah,
          totalCostUah: t.totalCostUah,
          grossRevenueUah: t.grossRevenueUah,
          totalCommissionsUah: t.totalCommissionsUah,
          grossProfitUah: t.grossProfitUah,
          netProfitUah: t.netProfitUah,
          roiPercent: t.roiPercent,
          spreadPerUnit: t.spreadPerUnit,
          spreadPercent: t.spreadPercent,
          notes: t.notes ?? null,
        },
        update: {
          userId: t.userId,
          createdAt: parseDate(t.createdAt),
          updatedAt: t.updatedAt ? parseDate(t.updatedAt) : null,
          buyExchange: t.buyExchange,
          buyBankId: t.buyBankId,
          buyBankName: t.buyBankName,
          buyRate: t.buyRate,
          buyAmountUah: t.buyAmountUah,
          buyCommission: t.buyCommission,
          buyCommissionType: t.buyCommissionType,
          buyUsdtAmount: t.buyUsdtAmount,
          sellExchange: t.sellExchange,
          sellBankId: t.sellBankId,
          sellBankName: t.sellBankName,
          sellRate: t.sellRate,
          sellUsdtAmount: t.sellUsdtAmount,
          sellAmountUah: t.sellAmountUah,
          sellCommission: t.sellCommission,
          sellCommissionType: t.sellCommissionType,
          extraExpensesUah: t.extraExpensesUah,
          totalCostUah: t.totalCostUah,
          grossRevenueUah: t.grossRevenueUah,
          totalCommissionsUah: t.totalCommissionsUah,
          grossProfitUah: t.grossProfitUah,
          netProfitUah: t.netProfitUah,
          roiPercent: t.roiPercent,
          spreadPerUnit: t.spreadPerUnit,
          spreadPercent: t.spreadPercent,
          notes: t.notes ?? null,
        },
      })));

    const s = db.siteSettings;
    await tx.siteSettings.upsert({
      where: { id: 1 },
      create: {
        id: 1,
        siteName: s.siteName,
        curatorTelegram: s.curatorTelegram,
        defaultLanguage: s.defaultLanguage,
        defaultTheme: s.defaultTheme,
        bankLimitMode: s.bankLimitMode,
        announcement: s.announcement ?? null,
        allowRegistration: s.allowRegistration,
      },
      update: {
        siteName: s.siteName,
        curatorTelegram: s.curatorTelegram,
        defaultLanguage: s.defaultLanguage,
        defaultTheme: s.defaultTheme,
        bankLimitMode: s.bankLimitMode,
        announcement: s.announcement ?? null,
        allowRegistration: s.allowRegistration,
      },
    });

    await Promise.all(db.auditLogs.map((log) => tx.auditLog.upsert({
        where: { id: log.id },
        create: {
          id: log.id,
          timestamp: parseDate(log.timestamp),
          actionType: log.actionType,
          adminId: log.adminId,
          adminNickname: log.adminNickname,
          targetUserId: log.targetUserId ?? null,
          details: log.details,
        },
        update: {
          timestamp: parseDate(log.timestamp),
          actionType: log.actionType,
          adminId: log.adminId,
          adminNickname: log.adminNickname,
          targetUserId: log.targetUserId ?? null,
          details: log.details,
        },
      })));

    await Promise.all(Object.entries(db.failedAttempts).map(([key, value]) => tx.failedAttempt.upsert({
        where: { rateKey: key },
        create: {
          rateKey: key,
          count: value.count,
          lockedUntil: value.lockedUntil != null ? BigInt(value.lockedUntil) : null,
        },
        update: {
          count: value.count,
          lockedUntil: value.lockedUntil != null ? BigInt(value.lockedUntil) : null,
        },
      })));
  }, TX_OPTIONS);
}

export async function loadDatabase(): Promise<DatabaseSchema> {
  if (await needsSeed()) {
    await saveDatabase(await buildBootstrapDatabase());
  }

  const [
    users,
    sessions,
    globalBanks,
    userBanks,
    exchanges,
    trades,
    siteSettingsRow,
    auditLogs,
    failedRows,
  ] = await Promise.all([
    prisma.user.findMany(),
    prisma.session.findMany(),
    prisma.globalBank.findMany(),
    prisma.userBank.findMany(),
    prisma.exchange.findMany(),
    prisma.trade.findMany(),
    prisma.siteSettings.findUnique({ where: { id: 1 } }),
    prisma.auditLog.findMany({ orderBy: { timestamp: 'desc' } }),
    prisma.failedAttempt.findMany(),
  ]);

  if (!siteSettingsRow) {
    throw new Error(
      'site_settings row missing after seed; database may be in an inconsistent state',
    );
  }

  const failedAttempts: DatabaseSchema['failedAttempts'] = {};
  for (const row of failedRows) {
    const entry: { count: number; lockedUntil?: number } = { count: row.count };
    if (row.lockedUntil != null) entry.lockedUntil = Number(row.lockedUntil);
    failedAttempts[row.rateKey] = entry;
  }

  const db: DatabaseSchema = {
    users: users.map(mapUser),
    sessions: sessions.map(mapSession),
    globalBanks: globalBanks.map(mapGlobalBank),
    userBanks: userBanks.map(mapUserBank),
    exchanges: exchanges.map(mapExchange),
    trades: trades.map(mapTrade),
    siteSettings: mapSiteSettings(siteSettingsRow),
    auditLogs: auditLogs.map(mapAuditLog),
    failedAttempts,
  };

  if (ensureDemoUsers(db)) {
    await saveDatabase(db);
  }

  return db;
}

export async function getDb(): Promise<DatabaseSchema> {
  return loadDatabase();
}
