import type {
  AuditLog as PrismaAuditLog,
  Exchange as PrismaExchange,
  GlobalBank as PrismaGlobalBank,
  Session as PrismaSession,
  SiteSettings as PrismaSiteSettings,
  Trade as PrismaTrade,
  User as PrismaUser,
  UserBank as PrismaUserBank,
} from '@prisma/client';
import type { User, Session, SiteSettings } from '../../schemas/auth.schema.js';
import type { GlobalBank, UserBank, Exchange } from '../../schemas/banks.schema.js';
import type { Trade } from '../../schemas/trades.schema.js';
import type { AuditLog } from '../../schemas/admin.schema.js';
import { normalizeCuratorTelegram } from '../curator-telegram.js';

export function toIso(d: Date): string {
  return d.toISOString();
}

export function parseDate(iso: string): Date {
  return new Date(iso);
}

export function mapUser(row: PrismaUser): User {
  return {
    id: row.id,
    nickname: row.nickname,
    telegram: row.telegram,
    passwordHash: row.passwordHash,
    role: row.role as User['role'],
    status: row.status as User['status'],
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt),
    lastLoginAt: row.lastLoginAt ? toIso(row.lastLoginAt) : null,
    themePreference: row.themePreference as User['themePreference'],
    languagePreference: row.languagePreference as User['languagePreference'],
  };
}

export function mapSession(row: PrismaSession): Session {
  return {
    token: row.token,
    userId: row.userId,
    createdAt: toIso(row.createdAt),
    expiresAt: toIso(row.expiresAt),
  };
}

export function mapGlobalBank(row: PrismaGlobalBank): GlobalBank {
  const bank: GlobalBank = {
    id: row.id,
    name: row.name,
    code: row.code,
    defaultLimitUah: row.defaultLimitUah,
    color: row.color,
    isActive: row.isActive,
    createdAt: toIso(row.createdAt),
  };
  if (row.logoSvg) bank.logoSvg = row.logoSvg;
  return bank;
}

export function mapUserBank(row: PrismaUserBank): UserBank {
  const bank: UserBank = {
    id: row.id,
    userId: row.userId,
    name: row.name,
    turnoverLimitUah: row.turnoverLimitUah,
    initialTurnoverUah: row.initialTurnoverUah,
    buyTurnoverUah: row.buyTurnoverUah,
    sellTurnoverUah: row.sellTurnoverUah,
    netProfitUah: row.netProfitUah,
    tradesCount: row.tradesCount,
    isArchived: row.isArchived,
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt),
  };
  if (row.globalBankId) bank.globalBankId = row.globalBankId;
  if (row.notes) bank.notes = row.notes;
  if (row.color) bank.color = row.color;
  if (row.logoSvg) bank.logoSvg = row.logoSvg;
  return bank;
}

export function mapExchange(row: PrismaExchange): Exchange {
  return {
    id: row.id,
    name: row.name,
    code: row.code,
    isActive: row.isActive,
    createdAt: toIso(row.createdAt),
  };
}

export function mapTrade(row: PrismaTrade): Trade {
  const trade: Trade = {
    id: row.id,
    userId: row.userId,
    createdAt: toIso(row.createdAt),
    buyExchange: row.buyExchange,
    buyBankId: row.buyBankId,
    buyBankName: row.buyBankName,
    buyRate: row.buyRate,
    buyAmountUah: row.buyAmountUah,
    buyCommission: row.buyCommission,
    buyCommissionType: row.buyCommissionType as Trade['buyCommissionType'],
    buyUsdtAmount: row.buyUsdtAmount,
    sellExchange: row.sellExchange,
    sellBankId: row.sellBankId,
    sellBankName: row.sellBankName,
    sellRate: row.sellRate,
    sellUsdtAmount: row.sellUsdtAmount,
    sellAmountUah: row.sellAmountUah,
    sellCommission: row.sellCommission,
    sellCommissionType: row.sellCommissionType as Trade['sellCommissionType'],
    extraExpensesUah: row.extraExpensesUah,
    totalCostUah: row.totalCostUah,
    grossRevenueUah: row.grossRevenueUah,
    totalCommissionsUah: row.totalCommissionsUah,
    grossProfitUah: row.grossProfitUah,
    netProfitUah: row.netProfitUah,
    roiPercent: row.roiPercent,
    spreadPerUnit: row.spreadPerUnit,
    spreadPercent: row.spreadPercent,
  };
  if (row.updatedAt) trade.updatedAt = toIso(row.updatedAt);
  if (row.notes) trade.notes = row.notes;
  return trade;
}

export function mapSiteSettings(row: PrismaSiteSettings): SiteSettings {
  const settings: SiteSettings = {
    siteName: row.siteName,
    curatorTelegram: normalizeCuratorTelegram(row.curatorTelegram),
    defaultLanguage: row.defaultLanguage as SiteSettings['defaultLanguage'],
    defaultTheme: row.defaultTheme as SiteSettings['defaultTheme'],
    bankLimitMode: row.bankLimitMode as SiteSettings['bankLimitMode'],
    allowRegistration: row.allowRegistration,
  };
  if (row.announcement) settings.announcement = row.announcement;
  return settings;
}

export function mapAuditLog(row: PrismaAuditLog): AuditLog {
  const log: AuditLog = {
    id: row.id,
    timestamp: toIso(row.timestamp),
    actionType: row.actionType,
    adminId: row.adminId,
    adminNickname: row.adminNickname,
    details: row.details,
  };
  if (row.targetUserId) log.targetUserId = row.targetUserId;
  return log;
}
