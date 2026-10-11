import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDb, saveDatabase, createBackup, listBackups } from '../utils/db/index.js';
import type { User, UserStatus, UserRole, LanguagePreference, ThemePreference, BankLimitMode } from '../schemas/auth.schema.js';
import type { GlobalBank, Exchange } from '../schemas/banks.schema.js';
import type { AuditLog } from '../schemas/admin.schema.js';
import { hashPassword, generateTemporaryPassword } from '../lib/crypto.js';
import { parseJsonBody } from '../middlewares/helpers.js';

export async function logAdminAction(admin: User, actionType: string, details: string, targetUserId?: string) {
  const db = await getDb();
  const log: AuditLog = {
    id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    timestamp: new Date().toISOString(),
    actionType,
    adminId: admin.id,
    adminNickname: admin.nickname,
    targetUserId,
    details,
  };
  db.auditLogs.unshift(log);
  if (db.auditLogs.length > 500) db.auditLogs = db.auditLogs.slice(0, 500);
  await saveDatabase(db);
}

export async function handleAdminOverview(req: VercelRequest, res: VercelResponse, user: User) {
const db = await getDb();
  const students = db.users.filter(u => u.role === 'student');
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

  const tradesToday = db.trades.filter(t => new Date(t.createdAt).getTime() >= todayStart);

  let totalPlatformTurnover = 0;
  let totalStudentProfit = 0;

  db.trades.forEach(t => {
    totalPlatformTurnover += (t.buyAmountUah + t.sellAmountUah);
    totalStudentProfit += t.netProfitUah;
  });

  const activeStudents = students.filter(s => {
    if (!s.lastLoginAt) return false;
    return (Date.now() - new Date(s.lastLoginAt).getTime()) < 7 * 86400000;
  });

  return res.json({
    totalStudents: students.length,
    activeStudents: activeStudents.length,
    tradesToday: tradesToday.length,
    totalPlatformTurnover: Math.round((totalPlatformTurnover + Number.EPSILON) * 100) / 100,
    totalStudentProfit: Math.round((totalStudentProfit + Number.EPSILON) * 100) / 100,
    totalTradesCount: db.trades.length,
  });
}

export async function handleAdminUsers(req: VercelRequest, res: VercelResponse, user: User) {
const db = await getDb();
  const { search, status } = req.query;

  let users = db.users.map(u => {
    const userTrades = db.trades.filter(t => t.userId === u.id);
    let allTimeProfit = 0;
    let buyTurnover = 0;
    let sellTurnover = 0;

    userTrades.forEach(t => {
      allTimeProfit += t.netProfitUah;
      buyTurnover += t.buyAmountUah;
      sellTurnover += t.sellAmountUah;
    });

    return {
      id: u.id,
      nickname: u.nickname,
      telegram: u.telegram,
      role: u.role,
      status: u.status,
      createdAt: u.createdAt,
      lastLoginAt: u.lastLoginAt,
      tradesCount: userTrades.length,
      allTimeProfit: Math.round((allTimeProfit + Number.EPSILON) * 100) / 100,
      buyTurnover: Math.round((buyTurnover + Number.EPSILON) * 100) / 100,
      sellTurnover: Math.round((sellTurnover + Number.EPSILON) * 100) / 100,
    };
  });

  if (search && typeof search === 'string' && search.trim()) {
    const q = search.trim().toLowerCase();
    users = users.filter(u => u.nickname.toLowerCase().includes(q) || u.telegram.toLowerCase().includes(q));
  }

  if (status && status !== 'all') {
    users = users.filter(u => u.status === status);
  }

  return res.json({ users });
}

export async function handleAdminUserStatus(req: VercelRequest, res: VercelResponse, user: User) {
const db = await getDb();
  const targetUser = db.users.find(u => u.id === String(req.query.id));

  if (!targetUser) {
    return res.status(404).json({ error: 'Користувача не знайдено' });
  }

  if (targetUser.id === user.id) {
    return res.status(400).json({ error: 'Неможливо змінити власний статус' });
  }

  const body = parseJsonBody(req);
  const status = body.status;
  if (typeof status !== 'string' || !['active', 'blocked'].includes(status)) {
    return res.status(400).json({ error: 'Недійсний статус' });
  }

  targetUser.status = status as UserStatus;
  targetUser.updatedAt = new Date().toISOString();

  // If blocked, drop active sessions
  if (status === 'blocked') {
    db.sessions = db.sessions.filter(s => s.userId !== targetUser.id);
  }

  await saveDatabase(db);
  await logAdminAction(user, 'USER_STATUS_CHANGE', `User ${targetUser.nickname} status changed to ${status}`, targetUser.id);

  return res.json({ success: true, user: targetUser });
}

export async function handleAdminUserProfile(req: VercelRequest, res: VercelResponse, user: User) {
const db = await getDb();
  const targetUser = db.users.find(u => u.id === String(req.query.id));

  if (!targetUser) {
    return res.status(404).json({ error: 'Користувача не знайдено' });
  }

  const body = parseJsonBody(req);
  const nickname = body.nickname;
  const telegram = body.telegram;
  const role = body.role;

  if (typeof nickname === 'string' && nickname.trim()) {
    const cleanNick = nickname.trim().toLowerCase();
    const existing = db.users.find(u => u.nickname.toLowerCase() === cleanNick && u.id !== targetUser.id);
    if (existing) {
      return res.status(400).json({ error: 'Цей нікнейм уже зайнятий' });
    }
    targetUser.nickname = cleanNick;
  }

  if (typeof telegram === 'string' && telegram.trim()) {
    let cleanTg = telegram.trim();
    if (!cleanTg.startsWith('@')) cleanTg = `@${cleanTg}`;
    targetUser.telegram = cleanTg;
  }

  if (typeof role === 'string' && ['student', 'admin'].includes(role)) {
    targetUser.role = role as UserRole;
  }

  targetUser.updatedAt = new Date().toISOString();
  await saveDatabase(db);

  await logAdminAction(user, 'USER_PROFILE_UPDATE', `Updated profile of ${targetUser.nickname}`, targetUser.id);

  return res.json({ success: true, user: targetUser });
}

export async function handleAdminUserResetPassword(req: VercelRequest, res: VercelResponse, user: User) {
const db = await getDb();
  const targetUser = db.users.find(u => u.id === String(req.query.id));

  if (!targetUser) {
    return res.status(404).json({ error: 'Користувача не знайдено' });
  }

  const tempPassword = generateTemporaryPassword();
  targetUser.passwordHash = hashPassword(tempPassword);
  targetUser.updatedAt = new Date().toISOString();

  // Invalidate old sessions
  db.sessions = db.sessions.filter(s => s.userId !== targetUser.id);
  await saveDatabase(db);

  await logAdminAction(user, 'PASSWORD_RESET', `Admin generated temporary password for ${targetUser.nickname}`, targetUser.id);

  return res.json({
    success: true,
    temporaryPassword: tempPassword,
    message: `Тимчасовий пароль згенеровано. Передайте його учневі особисто в Telegram ${targetUser.telegram}.`,
  });
}

export async function handleAdminUserDelete(req: VercelRequest, res: VercelResponse, user: User) {
const db = await getDb();
  const targetIndex = db.users.findIndex(u => u.id === String(req.query.id));

  if (targetIndex === -1) {
    return res.status(404).json({ error: 'Користувача не знайдено' });
  }

  if (db.users[targetIndex].id === user.id) {
    return res.status(400).json({ error: 'Неможливо видалити власний адміністраторський акаунт' });
  }

  const deletedNick = db.users[targetIndex].nickname;
  const deletedId = db.users[targetIndex].id;

  db.users.splice(targetIndex, 1);
  db.sessions = db.sessions.filter(s => s.userId !== deletedId);
  db.trades = db.trades.filter(t => t.userId !== deletedId);
  db.userBanks = db.userBanks.filter(b => b.userId !== deletedId);

  await saveDatabase(db);
  await logAdminAction(user, 'USER_DELETE', `Deleted user ${deletedNick} and associated data`, deletedId);

  return res.json({ success: true, message: 'Користувача видалено' });
}

export async function handleAdminStudentsStats(req: VercelRequest, res: VercelResponse, user: User) {
const db = await getDb();
  const students = db.users.filter(u => u.role === 'student');

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const yesterdayStart = todayStart - 86400000;
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

  const results = students.map(student => {
    const trades = db.trades.filter(t => t.userId === student.id);
    let profitToday = 0;
    let profitYesterday = 0;
    let profitMonth = 0;
    let profitAllTime = 0;
    let buyTurnover = 0;
    let sellTurnover = 0;

    trades.forEach(t => {
      const time = new Date(t.createdAt).getTime();
      profitAllTime += t.netProfitUah;
      buyTurnover += t.buyAmountUah;
      sellTurnover += t.sellAmountUah;

      if (time >= todayStart) profitToday += t.netProfitUah;
      if (time >= yesterdayStart && time < todayStart) profitYesterday += t.netProfitUah;
      if (time >= monthStart) profitMonth += t.netProfitUah;
    });

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
      tradesCount: trades.length,
      lastLoginAt: student.lastLoginAt,
    };
  });

  return res.json({ results });
}

export async function handleGetAdminGlobalBanks(req: VercelRequest, res: VercelResponse, user: User) {
const db = await getDb();
  return res.json({ banks: db.globalBanks });
}

export async function handlePostAdminGlobalBank(req: VercelRequest, res: VercelResponse, user: User) {
const db = await getDb();
  const body = parseJsonBody(req);
  const name = body.name;
  const code = body.code;
  const defaultLimitUah = body.defaultLimitUah;
  const color = body.color;
  const logoSvg = body.logoSvg;

  if (typeof name !== 'string' || typeof code !== 'string' || !name || !code) {
    return res.status(400).json({ error: 'Вкажіть назву та код банку' });
  }

  const newBank: GlobalBank = {
    id: `gb_${code.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${Date.now().toString(36)}`,
    name: name.trim(),
    code: code.trim().toLowerCase(),
    defaultLimitUah: Number(defaultLimitUah) || 100000,
    color: typeof color === 'string' ? color : '#2563EB',
    logoSvg: typeof logoSvg === 'string' ? logoSvg : undefined,
    isActive: true,
    createdAt: new Date().toISOString(),
  };

  db.globalBanks.push(newBank);
  await saveDatabase(db);
  await logAdminAction(user, 'BANK_CREATE', `Created global bank ${newBank.name}`);

  return res.json({ success: true, bank: newBank });
}

export async function handlePutAdminGlobalBank(req: VercelRequest, res: VercelResponse, user: User) {
const db = await getDb();
  const bank = db.globalBanks.find(b => b.id === String(req.query.id));

  if (!bank) return res.status(404).json({ error: 'Банк не знайдено' });

  const body = parseJsonBody(req);
  const name = body.name;
  const defaultLimitUah = body.defaultLimitUah;
  const color = body.color;
  const logoSvg = body.logoSvg;
  const isActive = body.isActive;
  if (typeof name === 'string' && name) bank.name = name.trim();
  if (defaultLimitUah !== undefined) bank.defaultLimitUah = Number(defaultLimitUah);
  if (typeof color === 'string' && color) bank.color = color;
  if (logoSvg !== undefined) bank.logoSvg = typeof logoSvg === 'string' ? logoSvg : undefined;
  if (isActive !== undefined) bank.isActive = Boolean(isActive);

  await saveDatabase(db);
  await logAdminAction(user, 'BANK_UPDATE', `Updated global bank ${bank.name}`);

  return res.json({ success: true, bank });
}

export async function handleDeleteAdminGlobalBank(req: VercelRequest, res: VercelResponse, user: User) {
const db = await getDb();
  const bank = db.globalBanks.find(b => b.id === String(req.query.id));
  if (!bank) return res.status(404).json({ error: 'Банк не знайдено' });

  bank.isActive = false;
  await saveDatabase(db);
  await logAdminAction(user, 'BANK_ARCHIVE', `Archived global bank ${bank.name}`);

  return res.json({ success: true, message: 'Банк деактивовано' });
}

export async function handleGetAdminExchanges(req: VercelRequest, res: VercelResponse, user: User) {
const db = await getDb();
  return res.json({ exchanges: db.exchanges });
}

export async function handlePostAdminExchange(req: VercelRequest, res: VercelResponse, user: User) {
const db = await getDb();
  const body = parseJsonBody(req);
  const name = body.name;
  const code = body.code;

  if (typeof name !== 'string' || typeof code !== 'string' || !name || !code) {
    return res.status(400).json({ error: 'Вкажіть назву та код біржі' });
  }

  const newExchange: Exchange = {
    id: `ex_${code.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${Date.now().toString(36)}`,
    name: name.trim(),
    code: code.trim().toLowerCase(),
    isActive: true,
    createdAt: new Date().toISOString(),
  };

  db.exchanges.push(newExchange);
  await saveDatabase(db);
  await logAdminAction(user, 'EXCHANGE_CREATE', `Created exchange ${newExchange.name}`);

  return res.json({ success: true, exchange: newExchange });
}

export async function handlePutAdminExchange(req: VercelRequest, res: VercelResponse, user: User) {
const db = await getDb();
  const ex = db.exchanges.find(e => e.id === String(req.query.id));
  if (!ex) return res.status(404).json({ error: 'Біржу не знайдено' });

  const body = parseJsonBody(req);
  const name = body.name;
  const isActive = body.isActive;
  if (typeof name === 'string' && name) ex.name = name.trim();
  if (isActive !== undefined) ex.isActive = Boolean(isActive);

  await saveDatabase(db);
  await logAdminAction(user, 'EXCHANGE_UPDATE', `Updated exchange ${ex.name}`);

  return res.json({ success: true, exchange: ex });
}

export async function handleGetAdminSettings(req: VercelRequest, res: VercelResponse, user: User) {
const db = await getDb();
  return res.json({ settings: db.siteSettings });
}

export async function handlePutAdminSettings(req: VercelRequest, res: VercelResponse, user: User) {
const db = await getDb();
  const body = parseJsonBody(req);
  const siteName = body.siteName;
  const curatorTelegram = body.curatorTelegram;
  const defaultLanguage = body.defaultLanguage;
  const defaultTheme = body.defaultTheme;
  const bankLimitMode = body.bankLimitMode;
  const announcement = body.announcement;
  const allowRegistration = body.allowRegistration;

  if (typeof siteName === 'string' && siteName) db.siteSettings.siteName = siteName.trim();
  if (typeof curatorTelegram === 'string' && curatorTelegram) {
    let clean = curatorTelegram.trim();
    if (!clean.startsWith('@')) clean = `@${clean}`;
    db.siteSettings.curatorTelegram = clean;
  }
  if (typeof defaultLanguage === 'string' && ['uk', 'ru', 'en'].includes(defaultLanguage)) {
    db.siteSettings.defaultLanguage = defaultLanguage as LanguagePreference;
  }
  if (typeof defaultTheme === 'string' && ['light', 'navy'].includes(defaultTheme)) {
    db.siteSettings.defaultTheme = defaultTheme as ThemePreference;
  }
  if (typeof bankLimitMode === 'string' && ['separate', 'total', 'buy_only'].includes(bankLimitMode)) {
    db.siteSettings.bankLimitMode = bankLimitMode as BankLimitMode;
  }
  if (announcement !== undefined) {
    db.siteSettings.announcement = String(announcement).trim();
  }
  if (allowRegistration !== undefined) {
    db.siteSettings.allowRegistration = Boolean(allowRegistration);
  }

  await saveDatabase(db);
  await logAdminAction(user, 'SETTINGS_UPDATE', 'Updated site configuration');

  return res.json({ success: true, settings: db.siteSettings });
}

export async function handleAdminAuditLogs(req: VercelRequest, res: VercelResponse, user: User) {
const db = await getDb();
  return res.json({ logs: db.auditLogs.slice(0, 100) });
}

export async function handleAdminBackup(req: VercelRequest, res: VercelResponse, user: User) {
const filename = await createBackup();
  await logAdminAction(user, 'SYSTEM_BACKUP', `Created system snapshot ${filename}`);
  return res.json({ success: true, filename, backups: await listBackups() });
}

export async function handleAdminBackups(req: VercelRequest, res: VercelResponse, user: User) {
return res.json({ backups: await listBackups() });
}

