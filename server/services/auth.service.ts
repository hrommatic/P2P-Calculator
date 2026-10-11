import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDb, saveDatabase } from '../utils/db/index.js';
import type { User, ThemePreference, LanguagePreference } from '../schemas/auth.schema.js';
import { hashPassword, verifyPassword, generateToken } from '../lib/crypto.js';
import { parseJsonBody, getClientIp, getBearerToken } from '../middlewares/helpers.js';

export async function handleAuthRegister(req: VercelRequest, res: VercelResponse) {
  const body = parseJsonBody(req);
  const nickname = body.nickname;
  const telegram = body.telegram;
  const password = body.password;
  const confirmPassword = body.confirmPassword;
  const db = await getDb();

  if (!db.siteSettings.allowRegistration) {
    return res.status(403).json({ error: 'Реєстрація тимчасово призупинена адміністратором' });
  }

  if (!nickname || typeof nickname !== 'string' || nickname.trim().length < 3) {
    return res.status(400).json({ error: 'Нікнейм має містити щонайменше 3 символи' });
  }

  const cleanNickname = nickname.trim().toLowerCase();
  if (!/^[a-zA-Z0-9_]{3,24}$/.test(cleanNickname)) {
    return res.status(400).json({ error: 'Нікнейм може містити лише латинські літери, цифри та _ (3-24 символи)' });
  }

  if (!telegram || typeof telegram !== 'string') {
    return res.status(400).json({ error: 'Вкажіть Telegram у форматі @username' });
  }

  let cleanTelegram = telegram.trim();
  if (!cleanTelegram.startsWith('@')) {
    cleanTelegram = `@${cleanTelegram}`;
  }
  if (!/^@[a-zA-Z0-9_]{3,32}$/.test(cleanTelegram)) {
    return res.status(400).json({ error: 'Некоректний Telegram нікнейм' });
  }

  if (!password || typeof password !== 'string' || password.length < 6) {
    return res.status(400).json({ error: 'Пароль має містити щонайменше 6 символів' });
  }

  if (password !== confirmPassword) {
    return res.status(400).json({ error: 'Паролі не співпадають' });
  }

  // Check unique nickname
  const existing = db.users.find(u => u.nickname.toLowerCase() === cleanNickname);
  if (existing) {
    return res.status(400).json({ error: 'Користувач із таким нікнеймом уже зареєстрований' });
  }

  const userId = `user_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const now = new Date().toISOString();

  const newUser: User = {
    id: userId,
    nickname: cleanNickname,
    telegram: cleanTelegram,
    passwordHash: hashPassword(password),
    role: 'student',
    status: 'active',
    createdAt: now,
    updatedAt: now,
    lastLoginAt: now,
    themePreference: db.siteSettings.defaultTheme || 'navy',
    languagePreference: db.siteSettings.defaultLanguage || 'uk',
  };

  db.users.push(newUser);

  // Initialize standard user banks for the new student from active global banks
  const initialBanks = db.globalBanks.filter(gb => gb.isActive).slice(0, 4);
  initialBanks.forEach(gb => {
    db.userBanks.push({
      id: `ub_${userId}_${gb.code}`,
      userId: userId,
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
    });
  });

  // Issue session token
  const token = generateToken();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  db.sessions.push({
    token,
    userId,
    createdAt: now,
    expiresAt,
  });

  await saveDatabase(db);

  return res.json({
    token,
    user: {
      id: newUser.id,
      nickname: newUser.nickname,
      telegram: newUser.telegram,
      role: newUser.role,
      status: newUser.status,
      themePreference: newUser.themePreference,
      languagePreference: newUser.languagePreference,
      createdAt: newUser.createdAt,
    },
  });
}

export async function handleAuthLogin(req: VercelRequest, res: VercelResponse) {
  const body = parseJsonBody(req);
  const nickname = body.nickname;
  const password = body.password;
  const ip = getClientIp(req);
  const rateLimitKey = `${ip}_${String(nickname || '').toLowerCase()}`;

  const db = await getDb();

  // Rate limiting check: 5 attempts max in 5 minutes
  const attemptInfo = db.failedAttempts[rateLimitKey];
  if (attemptInfo && attemptInfo.lockedUntil && attemptInfo.lockedUntil > Date.now()) {
    const remainingSeconds = Math.ceil((attemptInfo.lockedUntil - Date.now()) / 1000);
    return res.status(429).json({
      error: `Забагато невдалих спроб входу. Спробуйте знову через ${remainingSeconds} сек.`,
    });
  }

  if (!nickname || typeof password !== 'string') {
    return res.status(400).json({ error: 'Введіть нікнейм та пароль' });
  }

  const cleanNickname = String(nickname).trim().toLowerCase();
  const user = db.users.find(u => u.nickname.toLowerCase() === cleanNickname);

  if (!user || !verifyPassword(password, user.passwordHash)) {
    // Record failed attempt
    const count = (attemptInfo?.count || 0) + 1;
    let lockedUntil: number | undefined;
    if (count >= 5) {
      lockedUntil = Date.now() + 5 * 60 * 1000; // Lock for 5 minutes
    }
    db.failedAttempts[rateLimitKey] = { count, lockedUntil };
    await saveDatabase(db);

    return res.status(401).json({ error: 'Невірний нікнейм або пароль' });
  }

  if (user.status === 'blocked') {
    return res.status(403).json({
      error: `Ваш акаунт заблоковано. Напишіть у Telegram куратору ${db.siteSettings.curatorTelegram} для відновлення доступу.`,
    });
  }

  // Clear failed attempts on success
  delete db.failedAttempts[rateLimitKey];

  const now = new Date().toISOString();
  user.lastLoginAt = now;

  const token = generateToken();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  db.sessions.push({
    token,
    userId: user.id,
    createdAt: now,
    expiresAt,
  });

  await saveDatabase(db);

  return res.json({
    token,
    user: {
      id: user.id,
      nickname: user.nickname,
      telegram: user.telegram,
      role: user.role,
      status: user.status,
      themePreference: user.themePreference,
      languagePreference: user.languagePreference,
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt,
    },
    siteSettings: {
      siteName: db.siteSettings.siteName,
      curatorTelegram: db.siteSettings.curatorTelegram,
      announcement: db.siteSettings.announcement,
    },
  });
}

export async function handleAuthLogout(req: VercelRequest, res: VercelResponse, user: User) {
const token = getBearerToken(req);
  if (token) {
    const db = await getDb();
    db.sessions = db.sessions.filter(s => s.token !== token);
    await saveDatabase(db);
  }
  return res.json({ success: true });
}

export async function handleAuthMe(req: VercelRequest, res: VercelResponse, user: User) {
const db = await getDb();
  return res.json({
    user: {
      id: user.id,
      nickname: user.nickname,
      telegram: user.telegram,
      role: user.role,
      status: user.status,
      themePreference: user.themePreference,
      languagePreference: user.languagePreference,
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt,
    },
    siteSettings: db.siteSettings,
  });
}

export async function handleAuthChangePassword(req: VercelRequest, res: VercelResponse, user: User) {
  const body = parseJsonBody(req);
  const currentPassword = body.currentPassword;
  const newPassword = body.newPassword;
  const confirmNewPassword = body.confirmNewPassword;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Заповніть усі поля' });
  }

  if (typeof currentPassword !== 'string' || !verifyPassword(currentPassword, user.passwordHash)) {
    return res.status(400).json({ error: 'Поточний пароль невірний' });
  }

  if (typeof newPassword !== 'string' || newPassword.length < 6) {
    return res.status(400).json({ error: 'Новий пароль має бути не менше 6 символів' });
  }

  if (newPassword !== confirmNewPassword) {
    return res.status(400).json({ error: 'Нові паролі не співпадають' });
  }

  const db = await getDb();
  const dbUser = db.users.find(u => u.id === user.id);
  if (dbUser) {
    dbUser.passwordHash = hashPassword(newPassword);
    dbUser.updatedAt = new Date().toISOString();
    await saveDatabase(db);
  }

  return res.json({ success: true, message: 'Пароль успішно змінено' });
}

export async function handleAuthUpdateProfile(req: VercelRequest, res: VercelResponse, user: User) {
  const body = parseJsonBody(req);
  const telegram = body.telegram;
  const themePreference = body.themePreference;
  const languagePreference = body.languagePreference;
  const db = await getDb();
  const dbUser = db.users.find(u => u.id === user.id);

  if (!dbUser) return res.status(404).json({ error: 'User not found' });

  if (typeof telegram === 'string' && telegram) {
    let cleanTelegram = telegram.trim();
    if (!cleanTelegram.startsWith('@')) cleanTelegram = `@${cleanTelegram}`;
    if (!/^@[a-zA-Z0-9_]{3,32}$/.test(cleanTelegram)) {
      return res.status(400).json({ error: 'Некоректний формат Telegram' });
    }
    dbUser.telegram = cleanTelegram;
  }

  if (typeof themePreference === 'string' && ['light', 'navy'].includes(themePreference)) {
    dbUser.themePreference = themePreference as ThemePreference;
  }

  if (typeof languagePreference === 'string' && ['uk', 'ru', 'en'].includes(languagePreference)) {
    dbUser.languagePreference = languagePreference as LanguagePreference;
  }

  dbUser.updatedAt = new Date().toISOString();
  await saveDatabase(db);

  return res.json({
    success: true,
    user: {
      id: dbUser.id,
      nickname: dbUser.nickname,
      telegram: dbUser.telegram,
      role: dbUser.role,
      status: dbUser.status,
      themePreference: dbUser.themePreference,
      languagePreference: dbUser.languagePreference,
      createdAt: dbUser.createdAt,
    },
  });
}

export async function handleExchanges(req: VercelRequest, res: VercelResponse) {
const db = await getDb();
  return res.json({ exchanges: db.exchanges.filter(e => e.isActive) });
}

export async function handleSettingsPublic(req: VercelRequest, res: VercelResponse) {
const db = await getDb();
  return res.json({
    siteName: db.siteSettings.siteName,
    curatorTelegram: db.siteSettings.curatorTelegram,
    defaultLanguage: db.siteSettings.defaultLanguage,
    defaultTheme: db.siteSettings.defaultTheme,
    announcement: db.siteSettings.announcement,
    allowRegistration: db.siteSettings.allowRegistration,
  });
}

