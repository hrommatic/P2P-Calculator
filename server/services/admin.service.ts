import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { User, UserStatus, UserRole } from '../schemas/auth.schema.js';
import type { GlobalBank, Exchange } from '../schemas/banks.schema.js';
import { hashPassword, generateTemporaryPassword } from '../lib/crypto.js';
import { parseJsonBody } from '../middlewares/helpers.js';
import { jsonError, jsonOkMessage } from '../lib/i18n-response.js';
import { getNbuUsdUahRate } from '../lib/nbu-rate.js';
import type { TradeListFilters } from '../utils/db/trade-filters.js';
import {
  createExchangeRecord,
  createGlobalBank,
  deleteGlobalBank,
  deleteUserAndData,
  findUserById,
  getAdminOverviewData,
  getAdminUsers,
  getAllExchanges,
  getAllGlobalBanks,
  getStudentsStats,
  insertAuditLog,
  nicknameTaken,
  resetUserPassword,
  updateExchangeRecord,
  updateGlobalBank,
  updateUserAdminProfile,
  updateUserStatus,
} from '../utils/db/store.js';

export async function logAdminAction(admin: User, actionType: string, details: string, targetUserId?: string) {
  await insertAuditLog({
    id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    timestamp: new Date().toISOString(),
    actionType,
    adminId: admin.id,
    adminNickname: admin.nickname,
    targetUserId,
    details,
  });
}

export async function handleAdminOverview(req: VercelRequest, res: VercelResponse, _user: User) {
  const filters = req.query as TradeListFilters;
  const [overview, usdUahRate] = await Promise.all([
    getAdminOverviewData(filters),
    getNbuUsdUahRate().catch(() => null),
  ]);
  return res.json({ ...overview, usdUahRate });
}

export async function handleAdminUsers(req: VercelRequest, res: VercelResponse, _user: User) {
  const { search, status } = req.query;
  const users = await getAdminUsers(
    typeof search === 'string' ? search : undefined,
    typeof status === 'string' ? status : undefined,
  );
  return res.json({ users });
}

export async function handleAdminUserStatus(req: VercelRequest, res: VercelResponse, user: User) {
  const targetUser = await findUserById(String(req.query.id));
  if (!targetUser) {
    return jsonError(res, req, 404, 'errUserNotFound');
  }

  if (targetUser.id === user.id) {
    return jsonError(res, req, 400, 'errCannotChangeOwnStatus');
  }

  const body = parseJsonBody(req);
  const status = body.status;
  if (typeof status !== 'string' || !['active', 'blocked'].includes(status)) {
    return jsonError(res, req, 400, 'errInvalidStatus');
  }

  await updateUserStatus(targetUser.id, status as UserStatus);
  await logAdminAction(user, 'USER_STATUS_CHANGE', `User ${targetUser.nickname} status changed to ${status}`, targetUser.id);

  return res.json({ success: true, user: { ...targetUser, status: status as UserStatus } });
}

export async function handleAdminUserProfile(req: VercelRequest, res: VercelResponse, user: User) {
  const targetUser = await findUserById(String(req.query.id));
  if (!targetUser) {
    return jsonError(res, req, 404, 'errUserNotFound');
  }

  const body = parseJsonBody(req);
  const nickname = body.nickname;
  const telegram = body.telegram;
  const role = body.role;

  const updates: Partial<Pick<User, 'nickname' | 'telegram' | 'role'>> = {};

  if (typeof nickname === 'string' && nickname.trim()) {
    const cleanNick = nickname.trim().toLowerCase();
    if (await nicknameTaken(cleanNick, targetUser.id)) {
      return jsonError(res, req, 400, 'errNicknameTaken');
    }
    updates.nickname = cleanNick;
  }

  if (typeof telegram === 'string' && telegram.trim()) {
    let cleanTg = telegram.trim();
    if (!cleanTg.startsWith('@')) cleanTg = `@${cleanTg}`;
    updates.telegram = cleanTg;
  }

  if (typeof role === 'string' && ['student', 'admin'].includes(role)) {
    updates.role = role as UserRole;
  }

  await updateUserAdminProfile(targetUser.id, updates);
  await logAdminAction(user, 'USER_PROFILE_UPDATE', `Updated profile of ${targetUser.nickname}`, targetUser.id);

  return res.json({ success: true, user: { ...targetUser, ...updates } });
}

export async function handleAdminUserResetPassword(req: VercelRequest, res: VercelResponse, user: User) {
  const targetUser = await findUserById(String(req.query.id));
  if (!targetUser) {
    return jsonError(res, req, 404, 'errUserNotFound');
  }

  const tempPassword = generateTemporaryPassword();
  await resetUserPassword(targetUser.id, hashPassword(tempPassword));
  await logAdminAction(user, 'PASSWORD_RESET', `Admin generated temporary password for ${targetUser.nickname}`, targetUser.id);

  return jsonOkMessage(
    res,
    req,
    { success: true, temporaryPassword: tempPassword },
    'msgTempPasswordGenerated',
    { telegram: targetUser.telegram },
  );
}

export async function handleAdminUserDelete(req: VercelRequest, res: VercelResponse, user: User) {
  const targetUser = await findUserById(String(req.query.id));
  if (!targetUser) {
    return jsonError(res, req, 404, 'errUserNotFound');
  }

  if (targetUser.id === user.id) {
    return jsonError(res, req, 400, 'errCannotDeleteSelfAdmin');
  }

  await deleteUserAndData(targetUser.id);
  await logAdminAction(user, 'USER_DELETE', `Deleted user ${targetUser.nickname} and associated data`, targetUser.id);

  return jsonOkMessage(res, req, { success: true }, 'msgUserDeleted');
}

export async function handleAdminStudentsStats(req: VercelRequest, res: VercelResponse, _user: User) {
  const results = await getStudentsStats();
  return res.json({ results });
}

export async function handleGetAdminGlobalBanks(req: VercelRequest, res: VercelResponse, _user: User) {
  const banks = await getAllGlobalBanks();
  return res.json({ banks });
}

export async function handlePostAdminGlobalBank(req: VercelRequest, res: VercelResponse, user: User) {
  const body = parseJsonBody(req);
  const name = body.name;
  const code = body.code;
  const defaultLimitUah = body.defaultLimitUah;
  const color = body.color;
  const logoSvg = body.logoSvg;

  if (typeof name !== 'string' || typeof code !== 'string' || !name || !code) {
    return jsonError(res, req, 400, 'errBankNameCodeRequired');
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

  await createGlobalBank(newBank);
  await logAdminAction(user, 'BANK_CREATE', `Created global bank ${newBank.name}`);

  return res.json({ success: true, bank: newBank });
}

export async function handlePutAdminGlobalBank(req: VercelRequest, res: VercelResponse, user: User) {
  const banks = await getAllGlobalBanks();
  const bank = banks.find((b) => b.id === String(req.query.id));
  if (!bank) return jsonError(res, req, 404, 'errBankNotFound');

  const body = parseJsonBody(req);
  if (typeof body.name === 'string' && body.name) bank.name = body.name.trim();
  if (body.defaultLimitUah !== undefined) bank.defaultLimitUah = Number(body.defaultLimitUah);
  if (typeof body.color === 'string' && body.color) bank.color = body.color;
  if (body.logoSvg !== undefined) {
    const raw = typeof body.logoSvg === 'string' ? body.logoSvg.trim() : '';
    bank.logoSvg = raw || undefined;
  }
  if (body.isActive !== undefined) bank.isActive = Boolean(body.isActive);

  await updateGlobalBank(bank);
  await logAdminAction(user, 'BANK_UPDATE', `Updated global bank ${bank.name}`);

  return res.json({ success: true, bank });
}

export async function handleDeleteAdminGlobalBank(req: VercelRequest, res: VercelResponse, user: User) {
  const banks = await getAllGlobalBanks();
  const bank = banks.find((b) => b.id === String(req.query.id));
  if (!bank) return jsonError(res, req, 404, 'errBankNotFound');

  await deleteGlobalBank(bank.id);
  await logAdminAction(user, 'BANK_DELETE', `Deleted global bank ${bank.name}`);

  return jsonOkMessage(res, req, { success: true }, 'msgBankDeleted');
}

export async function handleGetAdminExchanges(req: VercelRequest, res: VercelResponse, _user: User) {
  const exchanges = await getAllExchanges();
  return res.json({ exchanges });
}

export async function handlePostAdminExchange(req: VercelRequest, res: VercelResponse, user: User) {
  const body = parseJsonBody(req);
  const name = body.name;
  const code = body.code;

  if (typeof name !== 'string' || typeof code !== 'string' || !name || !code) {
    return jsonError(res, req, 400, 'errExchangeNameCodeRequired');
  }

  const newExchange: Exchange = {
    id: `ex_${code.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${Date.now().toString(36)}`,
    name: name.trim(),
    code: code.trim().toLowerCase(),
    isActive: true,
    createdAt: new Date().toISOString(),
  };

  await createExchangeRecord(newExchange);
  await logAdminAction(user, 'EXCHANGE_CREATE', `Created exchange ${newExchange.name}`);

  return res.json({ success: true, exchange: newExchange });
}

export async function handlePutAdminExchange(req: VercelRequest, res: VercelResponse, user: User) {
  const exchanges = await getAllExchanges();
  const ex = exchanges.find((e) => e.id === String(req.query.id));
  if (!ex) return jsonError(res, req, 404, 'errExchangeNotFound');

  const body = parseJsonBody(req);
  if (typeof body.name === 'string' && body.name) ex.name = body.name.trim();
  if (body.isActive !== undefined) ex.isActive = Boolean(body.isActive);

  await updateExchangeRecord(ex);
  await logAdminAction(user, 'EXCHANGE_UPDATE', `Updated exchange ${ex.name}`);

  return res.json({ success: true, exchange: ex });
}

