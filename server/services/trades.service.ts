import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { User } from '../schemas/auth.schema.js';
import type { Trade, CommissionType } from '../schemas/trades.schema.js';
import { calculateTrade } from '../lib/calculation.js';
import { parseJsonBody } from '../middlewares/helpers.js';
import { listTradesForUser } from '../utils/db/list-trades.js';
import {
  createTradeRecord,
  deleteTradeRecord,
  ensureBootstrapped,
  findTradeById,
  findUserBankForUser,
  getTradesForUser,
  decrementUserBankStatsFromTrade,
  incrementUserBankStatsFromTrade,
  replaceUserBankStatsForTradeUpdate,
  updateTradeRecord,
} from '../utils/db/store.js';
import { clampTradesPageSize } from '../../shared/trades-pagination.js';
import { normalizeTradeListFilters } from '../utils/db/trade-filters.js';
import { jsonError, jsonOkMessage, getRequestLanguage } from '../lib/i18n-response.js';
import { CSV_HEADER_KEYS } from '../../shared/i18n/locale-extra.js';
import {
  intlLocaleForLanguage,
  translateServer,
} from '../../shared/i18n/translate-server.js';

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

  const pageSize = clampTradesPageSize(
    normalizeTradeListFilters(req.query).limit,
  );
  if (pageSize) {
    const page = await listTradesForUser(targetUserId, req.query);
    return res.json({
      trades: page.trades,
      nextCursor: page.nextCursor,
      hasMore: page.hasMore,
    });
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
    return jsonError(res, req, 400, 'errTradeBuyFieldsRequired');
  }

  if (!sellExchange || !sellBankId || !sellRate) {
    return jsonError(res, req, 400, 'errTradeSellFieldsRequired');
  }

  const [buyBank, sellBank] = await Promise.all([
    findUserBankForUser(user.id, String(buyBankId)),
    findUserBankForUser(user.id, String(sellBankId)),
  ]);

  if (!buyBank || !sellBank) {
    return jsonError(res, req, 400, 'errTradeBankNotInList');
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
  await incrementUserBankStatsFromTrade(newTrade);
  return res.json({ success: true, trade: newTrade });
}

export async function handlePutTrade(req: VercelRequest, res: VercelResponse, user: User) {
  const existingTrade = await findTradeById(String(req.query.id));
  if (!existingTrade || (existingTrade.userId !== user.id && user.role !== 'admin')) {
    return jsonError(res, req, 404, 'errTradeNotFound');
  }

  const body = parseJsonBody(req);
  const ownerId = existingTrade.userId;
  const [buyBank, sellBank] = await Promise.all([
    findUserBankForUser(ownerId, String(body.buyBankId)),
    findUserBankForUser(ownerId, String(body.sellBankId)),
  ]);

  if (!buyBank || !sellBank) {
    return jsonError(res, req, 400, 'errBankNotFound');
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
  await replaceUserBankStatsForTradeUpdate(existingTrade, updatedTrade);
  return res.json({ success: true, trade: updatedTrade });
}

export async function handleDeleteTrade(req: VercelRequest, res: VercelResponse, user: User) {
  const existingTrade = await findTradeById(String(req.query.id));
  if (!existingTrade || (existingTrade.userId !== user.id && user.role !== 'admin')) {
    return jsonError(res, req, 404, 'errTradeNotFound');
  }

  await deleteTradeRecord(existingTrade.id);
  await decrementUserBankStatsFromTrade(existingTrade);
  return jsonOkMessage(res, req, { success: true }, 'msgTradeDeleted');
}

export async function handleTradesExportCsv(req: VercelRequest, res: VercelResponse, user: User) {
  const trades = await getTradesForUser(user.id);

  const lang = getRequestLanguage(req);
  const locale = intlLocaleForLanguage(lang);
  const headers = CSV_HEADER_KEYS.map((key) => translateServer(lang, key));

  const rows = trades.map((t) => [
    t.id,
    new Date(t.createdAt).toLocaleString(locale),
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
