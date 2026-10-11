import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDb, saveDatabase } from '../utils/db/index.js';
import type { User } from '../schemas/auth.schema.js';
import type { UserBank, GlobalBank } from '../schemas/banks.schema.js';
import type { Trade } from '../schemas/trades.schema.js';
import { parseJsonBody } from '../middlewares/helpers.js';

function normalizeBankName(name: string): string {
  return name.trim().toLowerCase();
}

function findDuplicateBankName(
  db: Awaited<ReturnType<typeof getDb>>,
  userId: string,
  name: string,
  excludeBankId?: string,
): UserBank | undefined {
  const normalized = normalizeBankName(name);
  return db.userBanks.find(
    (b) =>
      b.userId === userId &&
      !b.isArchived &&
      b.id !== excludeBankId &&
      normalizeBankName(b.name) === normalized,
  );
}

export async function syncUserBankStats(userId: string, existingDb?: Awaited<ReturnType<typeof getDb>>) {
  const db = existingDb ?? await getDb();
  const userTrades = db.trades.filter(t => t.userId === userId);
  const userBanks = db.userBanks.filter(b => b.userId === userId);
  userBanks.forEach(bank => {
    let buyTurnover = 0, sellTurnover = 0, netProfit = 0, count = 0;
    userTrades.forEach(trade => {
      let involved = false;
      if (trade.buyBankId === bank.id) { buyTurnover += trade.buyAmountUah; involved = true; }
      if (trade.sellBankId === bank.id) { sellTurnover += trade.sellAmountUah; involved = true; }
      if (involved) {
        count += 1;
        if (trade.sellBankId === bank.id && trade.buyBankId === bank.id) netProfit += trade.netProfitUah;
        else if (trade.sellBankId === bank.id) netProfit += trade.netProfitUah;
      }
    });
    bank.buyTurnoverUah = Math.round((buyTurnover + Number.EPSILON) * 100) / 100;
    bank.sellTurnoverUah = Math.round((sellTurnover + Number.EPSILON) * 100) / 100;
    bank.netProfitUah = Math.round((netProfit + Number.EPSILON) * 100) / 100;
    bank.tradesCount = count;
    bank.updatedAt = new Date().toISOString();
  });
  if (!existingDb) {
    await saveDatabase(db);
  }
}

export async function handleGetBanks(req: VercelRequest, res: VercelResponse, user: User) {
const db = await getDb();
  let targetUserId = user.id;
  if (user.role === 'admin' && req.query.targetUserId) {
    targetUserId = String(req.query.targetUserId);
  }

  const banks = db.userBanks.filter(b => b.userId === targetUserId && !b.isArchived);
  const globalBanks = db.globalBanks.filter(b => b.isActive);

  return res.json({ banks, globalBanks });
}

export async function handlePostBank(req: VercelRequest, res: VercelResponse, user: User) {
const db = await getDb();
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
  if (findDuplicateBankName(db, user.id, trimmedName)) {
    return res.status(409).json({ error: 'Банк з такою назвою вже існує' });
  }

  const limit = Math.max(1000, Number(turnoverLimitUah) || 100000);
  const initial = Math.max(0, Number(initialTurnoverUah) || 0);

  const matchedGlobal = typeof globalBankId === 'string'
    ? db.globalBanks.find(g => g.id === globalBankId)
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

  db.userBanks.push(newBank);
  await saveDatabase(db);

  return res.json({ success: true, bank: newBank });
}

export async function handlePutBank(req: VercelRequest, res: VercelResponse, user: User) {
const db = await getDb();
  const bank = db.userBanks.find(b => b.id === String(req.query.id) && (b.userId === user.id || user.role === 'admin'));

  if (!bank) {
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
    if (findDuplicateBankName(db, bank.userId, trimmedName, bank.id)) {
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

  await saveDatabase(db);
  return res.json({ success: true, bank });
}

export async function handleDeleteBank(req: VercelRequest, res: VercelResponse, user: User) {
const db = await getDb();
  const bank = db.userBanks.find(b => b.id === String(req.query.id) && (b.userId === user.id || user.role === 'admin'));

  if (!bank) {
    return res.status(404).json({ error: 'Банк не знайдено' });
  }

  // Safe soft archive so historical trades preserve data integrity!
  bank.isArchived = true;
  bank.updatedAt = new Date().toISOString();
  await saveDatabase(db);

  return res.json({ success: true, message: 'Банк архівовано' });
}

