export type UserRole = 'student' | 'admin';
export type UserStatus = 'active' | 'blocked';
export type ThemePreference = 'light' | 'navy';
export type LanguagePreference = 'uk' | 'ru' | 'en';
export type BankLimitMode = 'separate' | 'total' | 'buy_only';

export interface User {
  id: string;
  nickname: string;
  telegram: string;
  passwordHash: string;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string | null;
  themePreference: ThemePreference;
  languagePreference: LanguagePreference;
}

export interface Session {
  token: string;
  userId: string;
  createdAt: string;
  expiresAt: string;
}

export interface SiteSettings {
  siteName: string;
  curatorTelegram: string;
  defaultLanguage: LanguagePreference;
  defaultTheme: ThemePreference;
  bankLimitMode: BankLimitMode;
  announcement?: string;
  allowRegistration: boolean;
}

export interface FailedAttempt {
  rateKey: string;
  count: number;
  lockedUntil?: number;
}
