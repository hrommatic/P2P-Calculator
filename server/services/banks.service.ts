import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { User } from '../schemas/auth.schema.js';
import type { UserBank } from '../schemas/banks.schema.js';
import { parseJsonBody } from '../middlewares/helpers.js';
import { jsonError, jsonOkMessage } from '../lib/i18n-response.js';
import {
  deleteUserBankRecord,
  createUserBank,
  findDuplicateUserBankName,
  findUserBankById,
  getActiveGlobalBanks,
  getUserBanks,
  syncUserBankStats,
  updateUserBankRecord,
} from '../utils/db/store.js';

export { syncUserBankStats };

export async function handleGetBanks(req: VercelRequest, res: VercelResponse, user: User) {
  let targetUserId = user.id;
  if (user.role === 'admin' && req.query.targetUserId) {
    targetUserId = String(req.query.targetUserId);
  }

  const sync = req.query.sync === '1' || req.query.sync === 'true';
  if (sync) {
    await syncUserBankStats(targetUserId);
  }

  const [banks, globalBanks] = await Promise.all([
    getUserBanks(targetUserId),
    getActiveGlobalBanks(),
  ]);

  return res.json({ banks, globalBanks });
}

export async function handlePostBank(req: VercelRequest, res: VercelResponse, user: User) {
  const body = parseJsonBody(req);
  const name = body.name;
  const turnoverLimitUah = body.turnoverLimitUah;
  const initialTurnoverUah = body.initialTurnoverUah;
  const globalBankId = body.globalBankId;
  const color = body.color;
  const notes = body.notes;

  if (!name || typeof name !== 'string' || !name.trim()) {
    return jsonError(res, req, 400, 'errBankNameRequired');
  }

  const trimmedName = name.trim();
  if (await findDuplicateUserBankName(user.id, trimmedName)) {
    return jsonError(res, req, 409, 'errBankNameDuplicate');
  }

  const limit = Math.max(1000, Number(turnoverLimitUah) || 100000);
  const initial = Math.max(0, Number(initialTurnoverUah) || 0);
  const globalBanks = await getActiveGlobalBanks();
  const matchedGlobal = typeof globalBankId === 'string'
    ? globalBanks.find((g) => g.id === globalBankId)
    : null;
  const now = new Date().toISOString();

  const newBank: UserBank = {
    id: `ub_${user.id}_${Date.now().toString(36)}`,
    userId: user.id,
    globalBankId: matchedGlobal?.id,
    name: trimmedName,
    turnoverLimitUah: limit,
    initialTurnoverUah: initial,
    buyTurnoverUah: 0,
    sellTurnoverUah: 0,
    netProfitUah: 0,
    tradesCount: 0,
    notes: notes ? String(notes).trim() : undefined,
    color: (typeof color === 'string' ? color : undefined) || matchedGlobal?.color || '#3B82F6',
    logoSvg: matchedGlobal?.logoSvg,
    isArchived: false,
    createdAt: now,
    updatedAt: now,
  };

  await createUserBank(newBank);
  return res.json({ success: true, bank: newBank });
}

function resolveRouteId(req: VercelRequest): string {
  const raw = req.query.id;
  if (raw === undefined || raw === null) return '';
  const id = Array.isArray(raw) ? raw[0] : raw;
  try {
    return decodeURIComponent(String(id));
  } catch {
    return String(id);
  }
}

export async function handlePutBank(req: VercelRequest, res: VercelResponse, user: User) {
  const bank = await findUserBankById(resolveRouteId(req));
  if (!bank || (bank.userId !== user.id && user.role !== 'admin')) {
    return jsonError(res, req, 404, 'errBankNotFound');
  }

  const body = parseJsonBody(req);
  const name = body.name;
  const turnoverLimitUah = body.turnoverLimitUah;
  const initialTurnoverUah = body.initialTurnoverUah;
  const notes = body.notes;
  const color = body.color;

  if (name && typeof name === 'string' && name.trim()) {
    const trimmedName = name.trim();
    if (await findDuplicateUserBankName(bank.userId, trimmedName, bank.id)) {
      return jsonError(res, req, 409, 'errBankNameDuplicate');
    }
    bank.name = trimmedName;
  }
  if (turnoverLimitUah !== undefined) {
    bank.turnoverLimitUah = Math.max(1000, Number(turnoverLimitUah) || 0);
  }
  if (initialTurnoverUah !== undefined) {
    bank.initialTurnoverUah = Math.max(0, Number(initialTurnoverUah) || 0);
  }
  if (notes !== undefined) {
    bank.notes = String(notes).trim();
  }
  if (typeof color === 'string' && color) {
    bank.color = color;
  }
  bank.updatedAt = new Date().toISOString();

  await updateUserBankRecord(bank);
  return res.json({ success: true, bank });
}

export async function handleDeleteBank(req: VercelRequest, res: VercelResponse, user: User) {
  const bank = await findUserBankById(resolveRouteId(req));
  if (!bank || (bank.userId !== user.id && user.role !== 'admin')) {
    return jsonError(res, req, 404, 'errBankNotFound');
  }

  await deleteUserBankRecord(bank.id);
  return jsonOkMessage(res, req, { success: true }, 'msgBankDeleted');
}
