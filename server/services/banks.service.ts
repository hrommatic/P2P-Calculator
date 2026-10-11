import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { User } from '../schemas/auth.schema.js';
import type { UserBank } from '../schemas/banks.schema.js';
import { parseJsonBody } from '../middlewares/helpers.js';
import {
  archiveUserBankRecord,
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

  await syncUserBankStats(targetUserId);

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
    return res.status(400).json({ error: 'Вкажіть назву банку' });
  }

  const trimmedName = name.trim();
  if (await findDuplicateUserBankName(user.id, trimmedName)) {
    return res.status(409).json({ error: 'Банк з такою назвою вже існує' });
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
    isArchived: false,
    createdAt: now,
    updatedAt: now,
  };

  await createUserBank(newBank);
  return res.json({ success: true, bank: newBank });
}

export async function handlePutBank(req: VercelRequest, res: VercelResponse, user: User) {
  const bank = await findUserBankById(String(req.query.id));
  if (!bank || (bank.userId !== user.id && user.role !== 'admin')) {
    return res.status(404).json({ error: 'Банк не знайдено' });
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
      return res.status(409).json({ error: 'Банк з такою назвою вже існує' });
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
  const bank = await findUserBankById(String(req.query.id));
  if (!bank || (bank.userId !== user.id && user.role !== 'admin')) {
    return res.status(404).json({ error: 'Банк не знайдено' });
  }

  const updatedAt = new Date().toISOString();
  await archiveUserBankRecord(bank.id, updatedAt);
  return res.json({ success: true, message: 'Банк архівовано' });
}
