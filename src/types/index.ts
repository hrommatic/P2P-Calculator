export type Role = 'student' | 'admin';
export type AccountStatus = 'active' | 'blocked';
export type ThemeMode = 'light' | 'navy';
export type Language = 'uk' | 'ru' | 'en';

export interface User {
  id: string;
  nickname: string;
  telegram: string;
  role: Role;
  status: AccountStatus;
  themePreference: ThemeMode;
  languagePreference: Language;
  createdAt: string;
  lastLoginAt?: string | null;
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
  buyExchange: string;
  buyBankId: string;
  buyBankName: string;
  buyRate: number;
  buyAmountUah: number;
  buyCommission: number;
  buyCommissionType: 'percent' | 'fixed_uah' | 'fixed_usdt';
  buyUsdtAmount: number;

  sellExchange: string;
  sellBankId: string;
  sellBankName: string;
  sellRate: number;
  sellUsdtAmount: number;
  sellAmountUah: number;
  sellCommission: number;
  sellCommissionType: 'percent' | 'fixed_uah' | 'fixed_usdt';
  extraExpensesUah: number;

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

export interface DashboardStats {
  profitToday: number;
  profitMonth: number;
  spreadTodayPercent: number;
  roiTodayPercent: number;
  buyTurnoverToday: number;
  sellTurnoverToday: number;
  totalTurnoverToday: number;
  tradesCountToday: number;
  banksCount: number;
  usdUahRate: number | null;
  recentTrades: Trade[];
}

export interface SiteSettings {
  siteName: string;
  curatorTelegram: string;
  defaultLanguage: Language;
  defaultTheme: ThemeMode;
  bankLimitMode: 'separate' | 'total' | 'buy_only';
  announcement?: string;
  allowRegistration: boolean;
}

export interface AdminOverview {
  totalStudents: number;
  activeStudents: number;
  tradesToday: number;
  totalPlatformTurnover: number;
  totalStudentProfit: number;
  totalTradesCount: number;
}

export interface StudentStatsItem {
  userId: string;
  nickname: string;
  telegram: string;
  status: AccountStatus;
  profitToday: number;
  profitYesterday: number;
  profitMonth: number;
  profitAllTime: number;
  buyTurnover: number;
  sellTurnover: number;
  tradesCount: number;
  lastLoginAt: string | null;
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
