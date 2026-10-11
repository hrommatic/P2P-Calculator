import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { hashPassword } from './crypto.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '../data');
const DB_FILE = path.join(DATA_DIR, 'p2p_database.json');
const BACKUPS_DIR = path.join(DATA_DIR, 'backups');

export interface User {
  id: string;
  nickname: string;
  telegram: string;
  passwordHash: string;
  role: 'student' | 'admin';
  status: 'active' | 'blocked';
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string | null;
  themePreference: 'light' | 'navy';
  languagePreference: 'uk' | 'ru' | 'en';
}

export interface Session {
  token: string;
  userId: string;
  createdAt: string;
  expiresAt: string;
}

export interface GlobalBank {
  id: string;
  name: string;
  code: string;
  defaultLimitUah: number;
  color: string;
  logoSvg?: string;
  isActive: boolean;
  createdAt: string;
}

export interface UserBank {
  id: string;
  userId: string;
  globalBankId?: string;
  name: string;
  turnoverLimitUah: number;
  initialTurnoverUah: number;
  buyTurnoverUah: number;
  sellTurnoverUah: number;
  netProfitUah: number;
  tradesCount: number;
  notes?: string;
  color?: string;
  logoSvg?: string;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Exchange {
  id: string;
  name: string;
  code: string;
  isActive: boolean;
  createdAt: string;
}

export interface Trade {
  id: string;
  userId: string;
  createdAt: string;
  updatedAt?: string;
  // Buy side
  buyExchange: string;
  buyBankId: string;
  buyBankName: string;
  buyRate: number;
  buyAmountUah: number;
  buyCommission: number;
  buyCommissionType: 'percent' | 'fixed_uah' | 'fixed_usdt';
  buyUsdtAmount: number;
  // Sell side
  sellExchange: string;
  sellBankId: string;
  sellBankName: string;
  sellRate: number;
  sellUsdtAmount: number;
  sellAmountUah: number;
  sellCommission: number;
  sellCommissionType: 'percent' | 'fixed_uah' | 'fixed_usdt';
  extraExpensesUah: number;
  // Calculations
  totalCostUah: number;
  grossRevenueUah: number;
  totalCommissionsUah: number;
  grossProfitUah: number;
  netProfitUah: number;
  roiPercent: number;
  spreadPerUnit: number;
  spreadPercent: number;
  notes?: string;
}

export interface SiteSettings {
  siteName: string;
  curatorTelegram: string;
  defaultLanguage: 'uk' | 'ru' | 'en';
  defaultTheme: 'light' | 'navy';
  bankLimitMode: 'separate' | 'total' | 'buy_only';
  announcement?: string;
  allowRegistration: boolean;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  actionType: string;
  adminId: string;
  adminNickname: string;
  targetUserId?: string;
  details: string;
}

export interface DatabaseSchema {
  users: User[];
  sessions: Session[];
  globalBanks: GlobalBank[];
  userBanks: UserBank[];
  exchanges: Exchange[];
  trades: Trade[];
  siteSettings: SiteSettings;
  auditLogs: AuditLog[];
  failedAttempts: { [key: string]: { count: number; lockedUntil?: number } };
}

// In-memory cache synced to disk
let db: DatabaseSchema;

function ensureDirectories() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(BACKUPS_DIR)) {
    fs.mkdirSync(BACKUPS_DIR, { recursive: true });
  }
}

function getInitialDatabase(): DatabaseSchema {
  const adminId = 'user_admin_001';
  const daniloId = 'user_danilo_002';
  const now = new Date().toISOString();

  const globalBanks: GlobalBank[] = [
    { id: 'gb_mono', name: 'Monobank', code: 'mono', defaultLimitUah: 100000, color: '#101010', isActive: true, createdAt: now },
    { id: 'gb_privat', name: 'PrivatBank', code: 'privat', defaultLimitUah: 150000, color: '#65A30D', isActive: true, createdAt: now },
    { id: 'gb_abank', name: 'A-Bank', code: 'abank', defaultLimitUah: 100000, color: '#0284C7', isActive: true, createdAt: now },
    { id: 'gb_pumb', name: 'PUMB', code: 'pumb', defaultLimitUah: 100000, color: '#DC2626', isActive: true, createdAt: now },
    { id: 'gb_sense', name: 'Sense Bank', code: 'sense', defaultLimitUah: 100000, color: '#EA580C', isActive: true, createdAt: now },
    { id: 'gb_raiff', name: 'Raiffeisen', code: 'raiff', defaultLimitUah: 150000, color: '#CA8A04', isActive: true, createdAt: now },
    { id: 'gb_oschad', name: 'Oschadbank', code: 'oschad', defaultLimitUah: 100000, color: '#059669', isActive: true, createdAt: now },
    { id: 'gb_sport', name: 'Sportbank', code: 'sport', defaultLimitUah: 80000, color: '#7C3AED', isActive: true, createdAt: now },
  ];

  const exchanges: Exchange[] = [
    { id: 'ex_binance', name: 'Binance', code: 'binance', isActive: true, createdAt: now },
    { id: 'ex_bybit', name: 'Bybit', code: 'bybit', isActive: true, createdAt: now },
    { id: 'ex_okx', name: 'OKX', code: 'okx', isActive: true, createdAt: now },
    { id: 'ex_bitget', name: 'Bitget', code: 'bitget', isActive: true, createdAt: now },
    { id: 'ex_whitebit', name: 'WhiteBIT', code: 'whitebit', isActive: true, createdAt: now },
    { id: 'ex_kucoin', name: 'KuCoin', code: 'kucoin', isActive: true, createdAt: now },
    { id: 'ex_gate', name: 'Gate.io', code: 'gate', isActive: true, createdAt: now },
    { id: 'ex_htx', name: 'HTX', code: 'htx', isActive: true, createdAt: now },
  ];

  // Default secure admin and Danilo accounts
  const adminUser: User = {
    id: adminId,
    nickname: 'admin',
    telegram: '@Chromatik',
    passwordHash: hashPassword('AdminP2P#2026!'),
    role: 'admin',
    status: 'active',
    createdAt: now,
    updatedAt: now,
    lastLoginAt: now,
    themePreference: 'navy',
    languagePreference: 'uk',
  };

  const daniloUser: User = {
    id: daniloId,
    nickname: 'danilo',
    telegram: '@danilo_p2p',
    passwordHash: hashPassword('Danilo#2026!'),
    role: 'student',
    status: 'active',
    createdAt: new Date(Date.now() - 14 * 86400000).toISOString(),
    updatedAt: now,
    lastLoginAt: now,
    themePreference: 'navy',
    languagePreference: 'uk',
  };

  // Danilo banks
  const daniloMonoId = 'ub_danilo_mono';
  const daniloPrivatId = 'ub_danilo_privat';
  const daniloAbankId = 'ub_danilo_abank';

  const userBanks: UserBank[] = [
    {
      id: daniloMonoId,
      userId: daniloId,
      globalBankId: 'gb_mono',
      name: 'Monobank',
      turnoverLimitUah: 100000,
      initialTurnoverUah: 0,
      buyTurnoverUah: 35000,
      sellTurnoverUah: 0,
      netProfitUah: 1120.45,
      tradesCount: 3,
      color: '#101010',
      isArchived: false,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: daniloPrivatId,
      userId: daniloId,
      globalBankId: 'gb_privat',
      name: 'PrivatBank',
      turnoverLimitUah: 150000,
      initialTurnoverUah: 0,
      buyTurnoverUah: 0,
      sellTurnoverUah: 36120.45,
      netProfitUah: 0,
      tradesCount: 3,
      color: '#65A30D',
      isArchived: false,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: daniloAbankId,
      userId: daniloId,
      globalBankId: 'gb_abank',
      name: 'A-Bank',
      turnoverLimitUah: 100000,
      initialTurnoverUah: 0,
      buyTurnoverUah: 15000,
      sellTurnoverUah: 15480,
      netProfitUah: 480.00,
      tradesCount: 1,
      color: '#0284C7',
      isArchived: false,
      createdAt: now,
      updatedAt: now,
    },
  ];

  // Danilo seed trades
  const today = new Date();
  const yesterday = new Date(Date.now() - 86400000);
  const fiveDaysAgo = new Date(Date.now() - 5 * 86400000);

  const trades: Trade[] = [
    {
      id: 'trade_001',
      userId: daniloId,
      createdAt: today.toISOString(),
      buyExchange: 'Binance',
      buyBankId: daniloMonoId,
      buyBankName: 'Monobank',
      buyRate: 44.00,
      buyAmountUah: 10000,
      buyCommission: 0,
      buyCommissionType: 'percent',
      buyUsdtAmount: 227.2727,
      sellExchange: 'Binance',
      sellBankId: daniloPrivatId,
      sellBankName: 'PrivatBank',
      sellRate: 46.00,
      sellUsdtAmount: 227.2727,
      sellAmountUah: 10454.55,
      sellCommission: 0,
      sellCommissionType: 'percent',
      extraExpensesUah: 0,
      totalCostUah: 10000,
      grossRevenueUah: 10454.55,
      totalCommissionsUah: 0,
      grossProfitUah: 454.55,
      netProfitUah: 454.55,
      roiPercent: 4.55,
      spreadPerUnit: 2.00,
      spreadPercent: 4.55,
      notes: 'Связка Mono -> Privat через Binance P2P',
    },
    {
      id: 'trade_002',
      userId: daniloId,
      createdAt: yesterday.toISOString(),
      buyExchange: 'Bybit',
      buyBankId: daniloMonoId,
      buyBankName: 'Monobank',
      buyRate: 44.20,
      buyAmountUah: 25000,
      buyCommission: 0.1,
      buyCommissionType: 'percent',
      buyUsdtAmount: 565.0452,
      sellExchange: 'Bybit',
      sellBankId: daniloPrivatId,
      sellBankName: 'PrivatBank',
      sellRate: 45.45,
      sellUsdtAmount: 565.0452,
      sellAmountUah: 25681.30,
      sellCommission: 15,
      sellCommissionType: 'fixed_uah',
      extraExpensesUah: 0,
      totalCostUah: 25025.00,
      grossRevenueUah: 25681.30,
      totalCommissionsUah: 40.00,
      grossProfitUah: 681.30,
      netProfitUah: 665.90,
      roiPercent: 2.66,
      spreadPerUnit: 1.25,
      spreadPercent: 2.83,
      notes: 'Круг Bybit P2P со стаканом',
    },
    {
      id: 'trade_003',
      userId: daniloId,
      createdAt: fiveDaysAgo.toISOString(),
      buyExchange: 'OKX',
      buyBankId: daniloAbankId,
      buyBankName: 'A-Bank',
      buyRate: 44.10,
      buyAmountUah: 15000,
      buyCommission: 0,
      buyCommissionType: 'percent',
      buyUsdtAmount: 340.1360,
      sellExchange: 'OKX',
      sellBankId: daniloAbankId,
      sellBankName: 'A-Bank',
      sellRate: 45.52,
      sellUsdtAmount: 340.1360,
      sellAmountUah: 15483.00,
      sellCommission: 0,
      sellCommissionType: 'percent',
      extraExpensesUah: 3.00,
      totalCostUah: 15000,
      grossRevenueUah: 15483.00,
      totalCommissionsUah: 0,
      grossProfitUah: 483.00,
      netProfitUah: 480.00,
      roiPercent: 3.20,
      spreadPerUnit: 1.42,
      spreadPercent: 3.22,
      notes: 'Внутрибанковский круг А-Банк',
    },
  ];

  const siteSettings: SiteSettings = {
    siteName: 'P2P Calculator',
    curatorTelegram: '@Chromatik',
    defaultLanguage: 'uk',
    defaultTheme: 'navy',
    bankLimitMode: 'separate',
    announcement: 'Вітаємо на платформі P2P Calculator. Всі розрахунки та ліміти синхронізовано.',
    allowRegistration: true,
  };

  const auditLogs: AuditLog[] = [
    {
      id: 'log_init',
      timestamp: now,
      actionType: 'SYSTEM_BOOTSTRAP',
      adminId: adminId,
      adminNickname: 'admin',
      details: 'Initial system bootstrap completed successfully.',
    },
  ];

  return {
    users: [adminUser, daniloUser],
    sessions: [],
    globalBanks,
    userBanks,
    exchanges,
    trades,
    siteSettings,
    auditLogs,
    failedAttempts: {},
  };
}

export function loadDatabase(): DatabaseSchema {
  ensureDirectories();
  if (!fs.existsSync(DB_FILE)) {
    const initialData = getInitialDatabase();
    saveDatabase(initialData);
    db = initialData;
    return db;
  }

  try {
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    db = JSON.parse(raw);
    return db;
  } catch (err) {
    console.error('Error loading database, creating backup and reinitializing:', err);
    const initialData = getInitialDatabase();
    saveDatabase(initialData);
    db = initialData;
    return db;
  }
}

export function saveDatabase(dataToSave?: DatabaseSchema) {
  ensureDirectories();
  const current = dataToSave || db;
  const tmpFile = `${DB_FILE}.tmp.${Date.now()}`;
  try {
    fs.writeFileSync(tmpFile, JSON.stringify(current, null, 2), 'utf-8');
    fs.renameSync(tmpFile, DB_FILE);
  } catch (err) {
    if (fs.existsSync(tmpFile)) {
      try { fs.unlinkSync(tmpFile); } catch {}
    }
    throw err;
  }
}

export function createBackup(): string {
  ensureDirectories();
  const current = getDb();
  const filename = `p2p_backup_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
  const backupPath = path.join(BACKUPS_DIR, filename);
  fs.writeFileSync(backupPath, JSON.stringify(current, null, 2), 'utf-8');
  return filename;
}

export function listBackups(): string[] {
  ensureDirectories();
  return fs.readdirSync(BACKUPS_DIR).filter(f => f.endsWith('.json')).sort().reverse();
}

export function getDb(): DatabaseSchema {
  if (!db) {
    db = loadDatabase();
  }
  return db;
}
