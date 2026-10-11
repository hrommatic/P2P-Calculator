import { hashPassword } from '../../lib/crypto.js';
import { prisma } from '../../lib/prisma.js';
import type { User, SiteSettings } from '../../schemas/auth.schema.js';
import type { GlobalBank, Exchange } from '../../schemas/banks.schema.js';
import type { AuditLog, DatabaseSchema } from '../../schemas/admin.schema.js';

function getSeedGlobalBanks(now: string): GlobalBank[] {
  return [
    { id: 'gb_mono', name: 'Monobank', code: 'mono', defaultLimitUah: 100000, color: '#101010', isActive: true, createdAt: now },
    { id: 'gb_privat', name: 'PrivatBank', code: 'privat', defaultLimitUah: 150000, color: '#65A30D', isActive: true, createdAt: now },
    { id: 'gb_abank', name: 'A-Bank', code: 'abank', defaultLimitUah: 100000, color: '#0284C7', isActive: true, createdAt: now },
    { id: 'gb_pumb', name: 'PUMB', code: 'pumb', defaultLimitUah: 100000, color: '#DC2626', isActive: true, createdAt: now },
    { id: 'gb_sense', name: 'Sense Bank', code: 'sense', defaultLimitUah: 100000, color: '#EA580C', isActive: true, createdAt: now },
    { id: 'gb_raiff', name: 'Raiffeisen', code: 'raiff', defaultLimitUah: 150000, color: '#CA8A04', isActive: true, createdAt: now },
    { id: 'gb_oschad', name: 'Oschadbank', code: 'oschad', defaultLimitUah: 100000, color: '#059669', isActive: true, createdAt: now },
    { id: 'gb_sport', name: 'Sportbank', code: 'sport', defaultLimitUah: 80000, color: '#7C3AED', isActive: true, createdAt: now },
  ];
}

function getSeedExchanges(now: string): Exchange[] {
  return [
    { id: 'ex_binance', name: 'Binance', code: 'binance', isActive: true, createdAt: now },
    { id: 'ex_bybit', name: 'Bybit', code: 'bybit', isActive: true, createdAt: now },
    { id: 'ex_okx', name: 'OKX', code: 'okx', isActive: true, createdAt: now },
    { id: 'ex_bitget', name: 'Bitget', code: 'bitget', isActive: true, createdAt: now },
    { id: 'ex_whitebit', name: 'WhiteBIT', code: 'whitebit', isActive: true, createdAt: now },
    { id: 'ex_kucoin', name: 'KuCoin', code: 'kucoin', isActive: true, createdAt: now },
    { id: 'ex_gate', name: 'Gate.io', code: 'gate', isActive: true, createdAt: now },
    { id: 'ex_htx', name: 'HTX', code: 'htx', isActive: true, createdAt: now },
  ];
}

export async function needsSeed(): Promise<boolean> {
  const count = await prisma.user.count();
  return count === 0;
}

export async function buildBootstrapDatabase(): Promise<DatabaseSchema> {
  const adminPassword = process.env.ADMIN_INITIAL_PASSWORD;
  if (!adminPassword || adminPassword.trim().length === 0) {
    throw new Error(
      'ADMIN_INITIAL_PASSWORD is required to seed the default admin user on first deploy. Set it in Vercel project environment variables.',
    );
  }

  const adminId = 'user_admin_001';
  const now = new Date().toISOString();

  const adminUser: User = {
    id: adminId,
    nickname: 'admin',
    telegram: '@Chromatik',
    passwordHash: hashPassword(adminPassword),
    role: 'admin',
    status: 'active',
    createdAt: now,
    updatedAt: now,
    lastLoginAt: now,
    themePreference: 'navy',
    languagePreference: 'uk',
  };

  const siteSettings: SiteSettings = {
    siteName: 'P2P Calculator',
    curatorTelegram: '@Chromatik',
    defaultLanguage: 'uk',
    defaultTheme: 'navy',
    bankLimitMode: 'separate',
    announcement: 'Вітаємо на платформі P2P Calculator. Всі розрахунки та ліміти синхронізовано.',
    allowRegistration: true,
  };

  const bootstrapLog: AuditLog = {
    id: 'log_init',
    timestamp: now,
    actionType: 'SYSTEM_BOOTSTRAP',
    adminId,
    adminNickname: 'admin',
    details: 'Initial system bootstrap completed successfully.',
  };

  return {
    users: [adminUser],
    sessions: [],
    globalBanks: getSeedGlobalBanks(now),
    userBanks: [],
    exchanges: getSeedExchanges(now),
    trades: [],
    siteSettings,
    auditLogs: [bootstrapLog],
    failedAttempts: {},
  };
}
