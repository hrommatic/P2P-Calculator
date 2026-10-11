export type {
  User,
  Session,
  SiteSettings,
  FailedAttempt,
  UserRole,
  UserStatus,
  ThemePreference,
  LanguagePreference,
  BankLimitMode,
} from './auth.schema.js';
export type { GlobalBank, UserBank, Exchange } from './banks.schema.js';
export type { Trade, CommissionType } from './trades.schema.js';

import type { User, Session, SiteSettings } from './auth.schema.js';
import type { GlobalBank, UserBank, Exchange } from './banks.schema.js';
import type { Trade } from './trades.schema.js';

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
  failedAttempts: Record<string, { count: number; lockedUntil?: number }>;
}
