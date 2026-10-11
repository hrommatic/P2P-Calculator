import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDb, saveDatabase } from '../utils/db/index.js';
import type { User } from '../schemas/auth.schema.js';
import type { UserBank } from '../schemas/banks.schema.js';
import type { Trade, CommissionType } from '../schemas/trades.schema.js';
import { calculateTrade } from '../lib/calculation.js';
import { parseJsonBody } from '../middlewares/helpers.js';

import { syncUserBankStats } from './banks.service.js';

function asCommissionType(value: unknown, fallback: CommissionType = 'percent'): CommissionType {
  if (value === 'percent' || value === 'fixed_uah' || value === 'fixed_usdt') {
    return value;
  }
  return fallback;
}

export async function handleGetTrades(req: VercelRequest, res: VercelResponse, user: User) {
const db = await getDb();

  // If admin passes targetUserId query param, let admin inspect that student's trades
  let targetUserId = user.id;
  if (user.role === 'admin' && req.query.targetUserId) {
    targetUserId = String(req.query.targetUserId);
  }

  let trades = db.trades.filter(t => t.userId === targetUserId);

  // Filters
  const { dateRange, bankId, exchange, search, sort } = req.query;

  if (dateRange) {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const yesterdayStart = todayStart - 86400000;
    const weekStart = todayStart - 7 * 86400000;
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

    if (dateRange === 'today') {
      trades = trades.filter(t => new Date(t.createdAt).getTime() >= todayStart);
    } else if (dateRange === 'yesterday') {
      trades = trades.filter(t => {
        const time = new Date(t.createdAt).getTime();
        return time >= yesterdayStart && time < todayStart;
      });
    } else if (dateRange === 'week') {
      trades = trades.filter(t => new Date(t.createdAt).getTime() >= weekStart);
    } else if (dateRange === 'month') {
      trades = trades.filter(t => new Date(t.createdAt).getTime() >= monthStart);
    }
  }

  if (bankId && bankId !== 'all') {
    trades = trades.filter(t => t.buyBankId === bankId || t.sellBankId === bankId);
  }

  if (exchange && exchange !== 'all') {
    trades = trades.filter(t => t.buyExchange === exchange || t.sellExchange === exchange);
  }

  if (search && typeof search === 'string' && search.trim()) {
    const q = search.trim().toLowerCase();
    trades = trades.filter(t =>
      (t.notes && t.notes.toLowerCase().includes(q)) ||
      t.buyBankName.toLowerCase().includes(q) ||
      t.sellBankName.toLowerCase().includes(q) ||
      t.buyExchange.toLowerCase().includes(q) ||
      t.sellExchange.toLowerCase().includes(q)
    );
  }

  // Sorting
  if (sort === 'profit_desc') {
    trades.sort((a, b) => b.netProfitUah - a.netProfitUah);
  } else if (sort === 'profit_asc') {
    trades.sort((a, b) => a.netProfitUah - b.netProfitUah);
  } else if (sort === 'spread_desc') {
    trades.sort((a, b) => b.spreadPercent - a.spreadPercent);
  } else {
    // Default newest first
    trades.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  return res.json({ trades });
}

export async function handlePostTrade(req: VercelRequest, res: VercelResponse, user: User) {
const db = await getDb();
  const body = parseJsonBody(req);
  const buyExchange = body.buyExchange;
  const buyBankId = body.buyBankId;
  const buyRate = body.buyRate;
  const buyAmountUah = body.buyAmountUah;
  const buyUsdtAmount = body.buyUsdtAmount;
  const buyCommission = body.buyCommission;
  const buyCommissionType = body.buyCommissionType;
  const sellExchange = body.sellExchange;
  const sellBankId = body.sellBankId;
  const sellRate = body.sellRate;
  const sellUsdtAmount = body.sellUsdtAmount;
  const sellAmountUah = body.sellAmountUah;
  const sellCommission = body.sellCommission;
  const sellCommissionType = body.sellCommissionType;
  const extraExpensesUah = body.extraExpensesUah;
  const notes = body.notes;
  const customDate = body.createdAt;

  if (!buyExchange || !buyBankId || !buyRate) {
    return res.status(400).json({ error: 'Вкажіть біржу покупки, банк та курс покупки' });
  }

  if (!sellExchange || !sellBankId || !sellRate) {
    return res.status(400).json({ error: 'Вкажіть біржу продажу, банк та курс продажу' });
  }

  const buyBank = db.userBanks.find(b => b.id === String(buyBankId) && b.userId === user.id);
  const sellBank = db.userBanks.find(b => b.id === String(sellBankId) && b.userId === user.id);

  if (!buyBank || !sellBank) {
    return res.status(400).json({ error: 'Один із обраних банків не знайдено у вашому списку' });
  }

  const calc = calculateTrade({
    buyRate: Number(buyRate),
    buyAmountUah: Number(buyAmountUah) || undefined,
    buyUsdtAmount: Number(buyUsdtAmount) || undefined,
    buyCommission: Number(buyCommission) || 0,
    buyCommissionType: asCommissionType(buyCommissionType),
    sellRate: Number(sellRate),
    sellUsdtAmount: Number(sellUsdtAmount) || undefined,
    sellAmountUah: Number(sellAmountUah) || undefined,
    sellCommission: Number(sellCommission) || 0,
    sellCommissionType: asCommissionType(sellCommissionType),
    extraExpensesUah: Number(extraExpensesUah) || 0,
  });

  const tradeId = `trade_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const now = customDate != null && String(customDate)
    ? new Date(String(customDate)).toISOString()
    : new Date().toISOString();

  const newTrade: Trade = {
    id: tradeId,
    userId: user.id,
    createdAt: now,
    buyExchange: String(buyExchange),
    buyBankId: buyBank.id,
    buyBankName: buyBank.name,
    buyRate: calc.buyRate,
    buyAmountUah: calc.buyAmountUah,
    buyCommission: Number(buyCommission) || 0,
    buyCommissionType: asCommissionType(buyCommissionType),
    buyUsdtAmount: calc.buyUsdtAmount,
    sellExchange: String(sellExchange),
    sellBankId: sellBank.id,
    sellBankName: sellBank.name,
    sellRate: calc.sellRate,
    sellUsdtAmount: calc.sellUsdtAmount,
    sellAmountUah: calc.sellAmountUah,
    sellCommission: Number(sellCommission) || 0,
    sellCommissionType: asCommissionType(sellCommissionType),
    extraExpensesUah: calc.extraExpensesUah,
    totalCostUah: calc.totalCostUah,
    grossRevenueUah: calc.grossRevenueUah,
    totalCommissionsUah: calc.totalCommissionsUah,
    grossProfitUah: calc.grossProfitUah,
    netProfitUah: calc.netProfitUah,
    roiPercent: calc.roiPercent,
    spreadPerUnit: calc.spreadPerUnit,
    spreadPercent: calc.spreadPercent,
    notes: notes ? String(notes).trim() : undefined,
  };

  db.trades.push(newTrade);
  await syncUserBankStats(user.id, db);
  await saveDatabase(db);

  return res.json({ success: true, trade: newTrade });
}

export async function handlePutTrade(req: VercelRequest, res: VercelResponse, user: User) {
const db = await getDb();
  const tradeIndex = db.trades.findIndex(t => t.id === String(req.query.id) && (t.userId === user.id || user.role === 'admin'));

  if (tradeIndex === -1) {
    return res.status(404).json({ error: 'Сделка не знайдена' });
  }

  const existingTrade = db.trades[tradeIndex];
  const body = parseJsonBody(req);
  const buyExchange = body.buyExchange;
  const buyBankId = body.buyBankId;
  const buyRate = body.buyRate;
  const buyAmountUah = body.buyAmountUah;
  const buyUsdtAmount = body.buyUsdtAmount;
  const buyCommission = body.buyCommission;
  const buyCommissionType = body.buyCommissionType;
  const sellExchange = body.sellExchange;
  const sellBankId = body.sellBankId;
  const sellRate = body.sellRate;
  const sellUsdtAmount = body.sellUsdtAmount;
  const sellAmountUah = body.sellAmountUah;
  const sellCommission = body.sellCommission;
  const sellCommissionType = body.sellCommissionType;
  const extraExpensesUah = body.extraExpensesUah;
  const notes = body.notes;

  const buyBank = db.userBanks.find(b => b.id === String(buyBankId) && b.userId === existingTrade.userId);
  const sellBank = db.userBanks.find(b => b.id === String(sellBankId) && b.userId === existingTrade.userId);

  if (!buyBank || !sellBank) {
    return res.status(400).json({ error: 'Банк не знайдено' });
  }

  const calc = calculateTrade({
    buyRate: Number(buyRate),
    buyAmountUah: Number(buyAmountUah) || undefined,
    buyUsdtAmount: Number(buyUsdtAmount) || undefined,
    buyCommission: Number(buyCommission) || 0,
    buyCommissionType: asCommissionType(buyCommissionType),
    sellRate: Number(sellRate),
    sellUsdtAmount: Number(sellUsdtAmount) || undefined,
    sellAmountUah: Number(sellAmountUah) || undefined,
    sellCommission: Number(sellCommission) || 0,
    sellCommissionType: asCommissionType(sellCommissionType),
    extraExpensesUah: Number(extraExpensesUah) || 0,
  });

  const updatedTrade: Trade = {
    ...existingTrade,
    updatedAt: new Date().toISOString(),
    buyExchange: String(buyExchange),
    buyBankId: buyBank.id,
    buyBankName: buyBank.name,
    buyRate: calc.buyRate,
    buyAmountUah: calc.buyAmountUah,
    buyCommission: Number(buyCommission) || 0,
    buyCommissionType: asCommissionType(buyCommissionType),
    buyUsdtAmount: calc.buyUsdtAmount,
    sellExchange: String(sellExchange),
    sellBankId: sellBank.id,
    sellBankName: sellBank.name,
    sellRate: calc.sellRate,
    sellUsdtAmount: calc.sellUsdtAmount,
    sellAmountUah: calc.sellAmountUah,
    sellCommission: Number(sellCommission) || 0,
    sellCommissionType: asCommissionType(sellCommissionType),
    extraExpensesUah: calc.extraExpensesUah,
    totalCostUah: calc.totalCostUah,
    grossRevenueUah: calc.grossRevenueUah,
    totalCommissionsUah: calc.totalCommissionsUah,
    grossProfitUah: calc.grossProfitUah,
    netProfitUah: calc.netProfitUah,
    roiPercent: calc.roiPercent,
    spreadPerUnit: calc.spreadPerUnit,
    spreadPercent: calc.spreadPercent,
    notes: notes ? String(notes).trim() : undefined,
  };

  db.trades[tradeIndex] = updatedTrade;
  await syncUserBankStats(existingTrade.userId, db);
  await saveDatabase(db);

  return res.json({ success: true, trade: updatedTrade });
}

export async function handleDeleteTrade(req: VercelRequest, res: VercelResponse, user: User) {
const db = await getDb();
  const tradeIndex = db.trades.findIndex(t => t.id === String(req.query.id) && (t.userId === user.id || user.role === 'admin'));

  if (tradeIndex === -1) {
    return res.status(404).json({ error: 'Сделку не знайдено' });
  }

  const tradeUserId = db.trades[tradeIndex].userId;
  db.trades.splice(tradeIndex, 1);
  await syncUserBankStats(tradeUserId, db);
  await saveDatabase(db);

  return res.json({ success: true, message: 'Сделка видалена' });
}

export async function handleTradesExportCsv(req: VercelRequest, res: VercelResponse, user: User) {
const db = await getDb();
  const trades = db.trades.filter(t => t.userId === user.id);

  trades.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const headers = [
    'ID',
    'Дата і час',
    'Біржа покупки',
    'Банк покупки',
    'Курс покупки (UAH/USDT)',
    'Сума покупки (UAH)',
    'Куплено USDT',
    'Біржа продажу',
    'Банк продажу',
    'Курс продажу (UAH/USDT)',
    'Сума продажу (UAH)',
    'Продано USDT',
    'Комісії (UAH)',
    'Чистий прибуток (UAH)',
    'Рентабельність ROI (%)',
    'Спред (%)',
    'Коментар',
  ];

  const rows = trades.map(t => [
    t.id,
    new Date(t.createdAt).toLocaleString('uk-UA'),
    t.buyExchange,
    t.buyBankName,
    t.buyRate.toFixed(2),
    t.buyAmountUah.toFixed(2),
    t.buyUsdtAmount.toFixed(4),
    t.sellExchange,
    t.sellBankName,
    t.sellRate.toFixed(2),
    t.sellAmountUah.toFixed(2),
    t.sellUsdtAmount.toFixed(4),
    t.totalCommissionsUah.toFixed(2),
    t.netProfitUah.toFixed(2),
    t.roiPercent.toFixed(2) + '%',
    t.spreadPercent.toFixed(2) + '%',
    `"${(t.notes || '').replace(/"/g, '""')}"`,
  ]);

  // Include UTF-8 BOM so Excel opens Cyrillic without garbled text
  const bom = '\uFEFF';
  const csvContent = bom + [headers.join(';'), ...rows.map(r => r.join(';'))].join('\r\n');

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="p2p_trades_${user.nickname}_${Date.now()}.csv"`);
  return res.send(csvContent);
}

