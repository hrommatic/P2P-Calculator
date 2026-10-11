import { hashPassword } from '../../lib/crypto.js';
import type { User } from '../../schemas/auth.schema.js';
import type { GlobalBank } from '../../schemas/banks.schema.js';
import type { DatabaseSchema } from '../../schemas/admin.schema.js';

export const DEMO_STUDENT_NICKNAME = 'danilo';
export const DEFAULT_DEMO_STUDENT_PASSWORD = 'Danilo#2026!';

export function isDemoLoginEnabled(): boolean {
  return process.env.DEMO_LOGIN_ENABLED !== 'false';
}

export function getDemoStudentPassword(): string {
  return process.env.DEMO_STUDENT_PASSWORD?.trim() || DEFAULT_DEMO_STUDENT_PASSWORD;
}

export function buildDemoStudentUser(now: string): User {
  return {
    id: 'user_danilo_demo',
    nickname: DEMO_STUDENT_NICKNAME,
    telegram: '@danilo_demo',
    passwordHash: hashPassword(getDemoStudentPassword()),
    role: 'student',
    status: 'active',
    createdAt: now,
    updatedAt: now,
    lastLoginAt: now,
    themePreference: 'navy',
    languagePreference: 'uk',
  };
}

export function buildDemoStudentBanks(userId: string, globalBanks: GlobalBank[], now: string) {
  const initialBanks = globalBanks.filter((gb) => gb.isActive).slice(0, 4);
  return initialBanks.map((gb) => ({
    id: `ub_${userId}_${gb.code}`,
    userId,
    globalBankId: gb.id,
    name: gb.name,
    turnoverLimitUah: gb.defaultLimitUah,
    initialTurnoverUah: 0,
    buyTurnoverUah: 0,
    sellTurnoverUah: 0,
    netProfitUah: 0,
    tradesCount: 0,
    color: gb.color,
    isArchived: false,
    createdAt: now,
    updatedAt: now,
  }));
}

export function ensureDemoUsers(db: DatabaseSchema): boolean {
  if (!isDemoLoginEnabled()) return false;

  const existing = db.users.find((u) => u.nickname.toLowerCase() === DEMO_STUDENT_NICKNAME);
  if (existing) return false;

  const now = new Date().toISOString();
  const student = buildDemoStudentUser(now);
  db.users.push(student);
  db.userBanks.push(...buildDemoStudentBanks(student.id, db.globalBanks, now));
  return true;
}
