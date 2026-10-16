import type { VercelRequest, VercelResponse } from '@vercel/node';
import { jsonError, jsonOkMessage } from '../lib/i18n-response.js';
import type { User, ThemePreference, LanguagePreference } from '../schemas/auth.schema.js';
import { hashPassword, verifyPassword, generateToken } from '../lib/crypto.js';
import { parseJsonBody, getClientIp, getBearerToken } from '../middlewares/helpers.js';
import {
  createSession,
  deleteFailedAttempt,
  deleteSession,
  findUserByNickname,
  getActiveExchanges,
  getFailedAttempt,
  getSiteSettings,
  registerUserWithBanks,
  toPublicUser,
  updateUserLastLogin,
  updateUserPassword,
  updateUserProfile,
  upsertFailedAttempt,
  deleteSessionsForUser,
} from '../utils/db/store.js';

function normalizeTelegramHandle(value: string): string | null {
  let clean = value.trim();
  if (!clean) return null;
  if (!clean.startsWith('@')) clean = `@${clean}`;
  if (!/^@[a-zA-Z0-9_]{3,32}$/.test(clean)) return null;
  return clean.toLowerCase();
}

export async function handleAuthRegister(req: VercelRequest, res: VercelResponse) {
  const body = parseJsonBody(req);
  const nickname = body.nickname;
  const telegram = body.telegram;
  const password = body.password;
  const confirmPassword = body.confirmPassword;
  const siteSettings = await getSiteSettings();

  if (!siteSettings.allowRegistration) {
    return jsonError(res, req, 403, 'errRegistrationSuspended');
  }

  if (!nickname || typeof nickname !== 'string' || nickname.trim().length < 3) {
    return jsonError(res, req, 400, 'errNicknameMinLength');
  }

  const cleanNickname = nickname.trim().toLowerCase();
  if (!/^[a-zA-Z0-9_]{3,24}$/.test(cleanNickname)) {
    return jsonError(res, req, 400, 'errNicknameFormat');
  }

  if (!telegram || typeof telegram !== 'string') {
    return jsonError(res, req, 400, 'errTelegramFormatRequired');
  }

  let cleanTelegram = telegram.trim();
  if (!cleanTelegram.startsWith('@')) {
    cleanTelegram = `@${cleanTelegram}`;
  }
  if (!/^@[a-zA-Z0-9_]{3,32}$/.test(cleanTelegram)) {
    return jsonError(res, req, 400, 'errTelegramInvalid');
  }

  if (!password || typeof password !== 'string' || password.length < 6) {
    return jsonError(res, req, 400, 'errPasswordMin6');
  }

  if (password !== confirmPassword) {
    return jsonError(res, req, 400, 'errPasswordsNoMatch');
  }

  const existing = await findUserByNickname(cleanNickname);
  if (existing) {
    return jsonError(res, req, 400, 'errNicknameTaken');
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
    themePreference: 'navy',
    languagePreference: siteSettings.defaultLanguage || 'uk',
  };

  const token = generateToken();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  await registerUserWithBanks(newUser, [], {
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
    return jsonError(res, req, 429, 'errLoginRateLimit', {
      seconds: remainingSeconds,
    });
  }

  if (!nickname || typeof password !== 'string') {
    return jsonError(res, req, 400, 'errLoginCredentialsRequired');
  }

  const cleanNickname = String(nickname).trim().toLowerCase();
  const user = await findUserByNickname(cleanNickname);
  const siteSettings = await getSiteSettings();

  if (!user || !verifyPassword(password, user.passwordHash)) {
    const count = (attemptInfo?.count || 0) + 1;
    const lockedUntil = count >= 5 ? Date.now() + 5 * 60 * 1000 : undefined;
    await upsertFailedAttempt(rateLimitKey, count, lockedUntil);
    return jsonError(res, req, 401, 'errLoginInvalid');
  }

  if (user.status === 'blocked') {
    return jsonError(res, req, 403, 'errAccountBlockedCurator', {
      curator: siteSettings.curatorTelegram,
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

export async function handleAuthResetPassword(req: VercelRequest, res: VercelResponse) {
  const body = parseJsonBody(req);
  const nickname = body.nickname;
  const telegram = body.telegram;
  const newPassword = body.newPassword;
  const confirmNewPassword = body.confirmNewPassword;
  const ip = getClientIp(req);
  const rateLimitKey = `reset_${ip}`;

  const attemptInfo = await getFailedAttempt(rateLimitKey);
  if (attemptInfo?.lockedUntil && attemptInfo.lockedUntil > Date.now()) {
    const remainingSeconds = Math.ceil((attemptInfo.lockedUntil - Date.now()) / 1000);
    return jsonError(res, req, 429, 'errResetRateLimit', {
      seconds: remainingSeconds,
    });
  }

  if (!nickname || typeof nickname !== 'string' || !telegram || typeof telegram !== 'string') {
    return jsonError(res, req, 400, 'errFillAllFields');
  }

  const cleanNickname = nickname.trim().toLowerCase();
  if (!/^[a-zA-Z0-9_]{3,24}$/.test(cleanNickname)) {
    return jsonError(res, req, 400, 'errResetPasswordGeneric');
  }

  const cleanTelegram = normalizeTelegramHandle(telegram);
  if (!cleanTelegram) {
    return jsonError(res, req, 400, 'errResetTelegramInvalid');
  }

  if (typeof newPassword !== 'string' || newPassword.length < 6) {
    return jsonError(res, req, 400, 'errNewPasswordMinLength');
  }

  if (newPassword !== confirmNewPassword) {
    return jsonError(res, req, 400, 'errPasswordsNoMatch');
  }

  const user = await findUserByNickname(cleanNickname);
  const siteSettings = await getSiteSettings();

  if (!user || normalizeTelegramHandle(user.telegram) !== cleanTelegram) {
    const count = (attemptInfo?.count || 0) + 1;
    const lockedUntil = count >= 5 ? Date.now() + 5 * 60 * 1000 : undefined;
    await upsertFailedAttempt(rateLimitKey, count, lockedUntil);
    return jsonError(res, req, 400, 'errResetPasswordGeneric');
  }

  if (user.status === 'blocked') {
    return jsonError(res, req, 403, 'errAccountBlockedCurator', {
      curator: siteSettings.curatorTelegram,
    });
  }

  await deleteFailedAttempt(rateLimitKey);
  await updateUserPassword(user.id, hashPassword(newPassword));
  await deleteSessionsForUser(user.id);

  return jsonOkMessage(res, req, { success: true }, 'msgPasswordChangedLogin');
}

export async function handleAuthChangePassword(req: VercelRequest, res: VercelResponse, user: User) {
  const body = parseJsonBody(req);
  const currentPassword = body.currentPassword;
  const newPassword = body.newPassword;
  const confirmNewPassword = body.confirmNewPassword;
  if (!currentPassword || !newPassword) {
    return jsonError(res, req, 400, 'errFillAllFields');
  }

  if (typeof currentPassword !== 'string' || !verifyPassword(currentPassword, user.passwordHash)) {
    return jsonError(res, req, 400, 'errCurrentPasswordWrong');
  }

  if (typeof newPassword !== 'string' || newPassword.length < 6) {
    return jsonError(res, req, 400, 'errNewPasswordMinLength');
  }

  if (newPassword !== confirmNewPassword) {
    return jsonError(res, req, 400, 'errNewPasswordsMismatch');
  }

  await updateUserPassword(user.id, hashPassword(newPassword));
  return jsonOkMessage(res, req, { success: true }, 'msgPasswordChangedOk');
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
      return jsonError(res, req, 400, 'errTelegramProfileInvalid');
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
