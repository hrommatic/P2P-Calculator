import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { User } from '../schemas/auth.schema.js';
import type { Trade, CommissionType } from '../schemas/trades.schema.js';
import { calculateTrade } from '../lib/calculation.js';
import { parseJsonBody } from '../middlewares/helpers.js';
import {
  createTradeRecord,
  deleteTradeRecord,
  findTradeById,
  findUserBankById,
  getTradesForUser,
  syncUserBankStats,
  updateTradeRecord,
} from '../utils/db/store.js';

function asCommissionType(value: unknown, fallback: CommissionType = 'percent'): CommissionType {
  if (value === 'percent' || value === 'fixed_uah' || value === 'fixed_usdt') {
    return value;
  }
  return fallback;
}

export async function handleGetTrades(req: VercelRequest, res: VercelResponse, user: User) {
  let targetUserId = user.id;
  if (user.role === 'admin' && req.query.targetUserId) {
    targetUserId = String(req.query.targetUserId);
  }

  const trades = await getTradesForUser(targetUserId, req.query);
  return res.json({ trades });
}

export async function handlePostTrade(req: VercelRequest, res: VercelResponse, user: User) {
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

  const buyBank = await findUserBankById(String(buyBankId));
  const sellBank = await findUserBankById(String(sellBankId));

  if (!buyBank || buyBank.userId !== user.id || !sellBank || sellBank.userId !== user.id) {
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

  await createTradeRecord(newTrade);
  await syncUserBankStats(user.id);
  return res.json({ success: true, trade: newTrade });
}

export async function handlePutTrade(req: VercelRequest, res: VercelResponse, user: User) {
  const existingTrade = await findTradeById(String(req.query.id));
  if (!existingTrade || (existingTrade.userId !== user.id && user.role !== 'admin')) {
    return res.status(404).json({ error: 'Сделка не знайдена' });
  }

  const body = parseJsonBody(req);
  const buyBank = await findUserBankById(String(body.buyBankId));
  const sellBank = await findUserBankById(String(body.sellBankId));

  if (!buyBank || buyBank.userId !== existingTrade.userId || !sellBank || sellBank.userId !== existingTrade.userId) {
    return res.status(400).json({ error: 'Банк не знайдено' });
  }

  const calc = calculateTrade({
    buyRate: Number(body.buyRate),
    buyAmountUah: Number(body.buyAmountUah) || undefined,
    buyUsdtAmount: Number(body.buyUsdtAmount) || undefined,
    buyCommission: Number(body.buyCommission) || 0,
    buyCommissionType: asCommissionType(body.buyCommissionType),
    sellRate: Number(body.sellRate),
    sellUsdtAmount: Number(body.sellUsdtAmount) || undefined,
    sellAmountUah: Number(body.sellAmountUah) || undefined,
    sellCommission: Number(body.sellCommission) || 0,
    sellCommissionType: asCommissionType(body.sellCommissionType),
    extraExpensesUah: Number(body.extraExpensesUah) || 0,
  });

  const updatedTrade: Trade = {
    ...existingTrade,
    updatedAt: new Date().toISOString(),
    buyExchange: String(body.buyExchange),
    buyBankId: buyBank.id,
    buyBankName: buyBank.name,
    buyRate: calc.buyRate,
    buyAmountUah: calc.buyAmountUah,
    buyCommission: Number(body.buyCommission) || 0,
    buyCommissionType: asCommissionType(body.buyCommissionType),
    buyUsdtAmount: calc.buyUsdtAmount,
    sellExchange: String(body.sellExchange),
    sellBankId: sellBank.id,
    sellBankName: sellBank.name,
    sellRate: calc.sellRate,
    sellUsdtAmount: calc.sellUsdtAmount,
    sellAmountUah: calc.sellAmountUah,
    sellCommission: Number(body.sellCommission) || 0,
    sellCommissionType: asCommissionType(body.sellCommissionType),
    extraExpensesUah: calc.extraExpensesUah,
    totalCostUah: calc.totalCostUah,
    grossRevenueUah: calc.grossRevenueUah,
    totalCommissionsUah: calc.totalCommissionsUah,
    grossProfitUah: calc.grossProfitUah,
    netProfitUah: calc.netProfitUah,
    roiPercent: calc.roiPercent,
    spreadPerUnit: calc.spreadPerUnit,
    spreadPercent: calc.spreadPercent,
    notes: body.notes ? String(body.notes).trim() : undefined,
  };

  await updateTradeRecord(updatedTrade);
  await syncUserBankStats(existingTrade.userId);
  return res.json({ success: true, trade: updatedTrade });
}

export async function handleDeleteTrade(req: VercelRequest, res: VercelResponse, user: User) {
  const existingTrade = await findTradeById(String(req.query.id));
  if (!existingTrade || (existingTrade.userId !== user.id && user.role !== 'admin')) {
    return res.status(404).json({ error: 'Сделку не знайдено' });
  }

  await deleteTradeRecord(existingTrade.id);
  await syncUserBankStats(existingTrade.userId);
  return res.json({ success: true, message: 'Сделка видалена' });
}

export async function handleTradesExportCsv(req: VercelRequest, res: VercelResponse, user: User) {
  const trades = await getTradesForUser(user.id);

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

  const rows = trades.map((t) => [
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
    `${t.roiPercent.toFixed(2)}%`,
    `${t.spreadPercent.toFixed(2)}%`,
    `"${(t.notes || '').replace(/"/g, '""')}"`,
  ]);

  const bom = '\uFEFF';
  const csvContent = bom + [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\r\n');

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="p2p_trades_${user.nickname}_${Date.now()}.csv"`);
  return res.send(csvContent);
}
