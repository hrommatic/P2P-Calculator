import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { User, ThemePreference, LanguagePreference } from '../schemas/auth.schema.js';
import type { UserBank } from '../schemas/banks.schema.js';
import { hashPassword, verifyPassword, generateToken } from '../lib/crypto.js';
import { parseJsonBody, getClientIp, getBearerToken } from '../middlewares/helpers.js';
import {
  createSession,
  deleteFailedAttempt,
  deleteSession,
  findUserByNickname,
  getActiveGlobalBanks,
  getActiveExchanges,
  getFailedAttempt,
  getSiteSettings,
  registerUserWithBanks,
  toPublicUser,
  updateUserLastLogin,
  updateUserPassword,
  updateUserProfile,
  upsertFailedAttempt,
} from '../utils/db/store.js';

export async function handleAuthRegister(req: VercelRequest, res: VercelResponse) {
  const body = parseJsonBody(req);
  const nickname = body.nickname;
  const telegram = body.telegram;
  const password = body.password;
  const confirmPassword = body.confirmPassword;
  const siteSettings = await getSiteSettings();

  if (!siteSettings.allowRegistration) {
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

  const existing = await findUserByNickname(cleanNickname);
  if (existing) {
    return res.status(400).json({ error: 'Користувач із таким нікнеймом уже зареєстрований' });
  }

  const userId = `user_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const now = new Date().toISOString();
  const globalBanks = await getActiveGlobalBanks();

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
    themePreference: 'navy',
    languagePreference: siteSettings.defaultLanguage || 'uk',
  };

  const initialBanks: UserBank[] = globalBanks.slice(0, 4).map((gb) => ({
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
    logoSvg: gb.logoSvg,
    isArchived: false,
    createdAt: now,
    updatedAt: now,
  }));

  const token = generateToken();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  await registerUserWithBanks(newUser, initialBanks, {
    token,
    createdAt: now,
    expiresAt,
  });

  return res.json({
    token,
    user: toPublicUser(newUser),
  });
}

export async function handleAuthLogin(req: VercelRequest, res: VercelResponse) {
  const body = parseJsonBody(req);
  const nickname = body.nickname;
  const password = body.password;
  const ip = getClientIp(req);
  const rateLimitKey = `${ip}_${String(nickname || '').toLowerCase()}`;

  const attemptInfo = await getFailedAttempt(rateLimitKey);
  if (attemptInfo?.lockedUntil && attemptInfo.lockedUntil > Date.now()) {
    const remainingSeconds = Math.ceil((attemptInfo.lockedUntil - Date.now()) / 1000);
    return res.status(429).json({
      error: `Забагато невдалих спроб входу. Спробуйте знову через ${remainingSeconds} сек.`,
    });
  }

  if (!nickname || typeof password !== 'string') {
    return res.status(400).json({ error: 'Введіть нікнейм та пароль' });
  }

  const cleanNickname = String(nickname).trim().toLowerCase();
  const user = await findUserByNickname(cleanNickname);
  const siteSettings = await getSiteSettings();

  if (!user || !verifyPassword(password, user.passwordHash)) {
    const count = (attemptInfo?.count || 0) + 1;
    const lockedUntil = count >= 5 ? Date.now() + 5 * 60 * 1000 : undefined;
    await upsertFailedAttempt(rateLimitKey, count, lockedUntil);
    return res.status(401).json({ error: 'Невірний нікнейм або пароль' });
  }

  if (user.status === 'blocked') {
    return res.status(403).json({
      error: `Ваш акаунт заблоковано. Напишіть у Telegram куратору ${siteSettings.curatorTelegram} для відновлення доступу.`,
    });
  }

  await deleteFailedAttempt(rateLimitKey);

  const now = new Date().toISOString();
  await updateUserLastLogin(user.id, now);

  const token = generateToken();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  await createSession(token, user.id, now, expiresAt);

  return res.json({
    token,
    user: toPublicUser({ ...user, lastLoginAt: now }),
    siteSettings: {
      siteName: siteSettings.siteName,
      curatorTelegram: siteSettings.curatorTelegram,
      announcement: siteSettings.announcement,
    },
  });
}

export async function handleAuthLogout(req: VercelRequest, res: VercelResponse, _user: User) {
  const token = getBearerToken(req);
  if (token) {
    await deleteSession(token);
  }
  return res.json({ success: true });
}

export async function handleAuthMe(req: VercelRequest, res: VercelResponse, user: User) {
  const siteSettings = await getSiteSettings();
  return res.json({
    user: toPublicUser(user),
    siteSettings,
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

  await updateUserPassword(user.id, hashPassword(newPassword));
  return res.json({ success: true, message: 'Пароль успішно змінено' });
}

export async function handleAuthUpdateProfile(req: VercelRequest, res: VercelResponse, user: User) {
  const body = parseJsonBody(req);
  const telegram = body.telegram;
  const themePreference = body.themePreference;
  const languagePreference = body.languagePreference;

  const updates: Partial<Pick<User, 'telegram' | 'themePreference' | 'languagePreference'>> = {};

  if (typeof telegram === 'string' && telegram) {
    let cleanTelegram = telegram.trim();
    if (!cleanTelegram.startsWith('@')) cleanTelegram = `@${cleanTelegram}`;
    if (!/^@[a-zA-Z0-9_]{3,32}$/.test(cleanTelegram)) {
      return res.status(400).json({ error: 'Некоректний формат Telegram' });
    }
    updates.telegram = cleanTelegram;
  }

  if (typeof themePreference === 'string' && ['light', 'navy'].includes(themePreference)) {
    updates.themePreference = themePreference as ThemePreference;
  }

  if (typeof languagePreference === 'string' && ['uk', 'ru', 'en'].includes(languagePreference)) {
    updates.languagePreference = languagePreference as LanguagePreference;
  }

  await updateUserProfile(user.id, updates);

  return res.json({
    success: true,
    user: toPublicUser({ ...user, ...updates }),
  });
}

export async function handleExchanges(req: VercelRequest, res: VercelResponse) {
  const exchanges = await getActiveExchanges();
  return res.json({ exchanges });
}

export async function handleSettingsPublic(req: VercelRequest, res: VercelResponse) {
  const settings = await getSiteSettings();
  return res.json({
    siteName: settings.siteName,
    curatorTelegram: settings.curatorTelegram,
    defaultLanguage: settings.defaultLanguage,
    defaultTheme: settings.defaultTheme,
    announcement: settings.announcement,
    allowRegistration: settings.allowRegistration,
  });
}
