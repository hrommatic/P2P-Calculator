import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDb } from '../utils/db/index.js';
import type { User } from '../schemas/auth.schema.js';

export async function handleDashboardStats(req: VercelRequest, res: VercelResponse, user: User) {
const db = await getDb();

  let targetUserId = user.id;
  if (user.role === 'admin' && req.query.targetUserId) {
    targetUserId = String(req.query.targetUserId);
  }

  const userTrades = db.trades.filter(t => t.userId === targetUserId);
  const userBanks = db.userBanks.filter(b => b.userId === targetUserId && !b.isArchived);

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const yesterdayStart = todayStart - 86400000;
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

  let profitToday = 0;
  let profitYesterday = 0;
  let profitMonth = 0;
  let profitAllTime = 0;

  let buyTurnover = 0;
  let sellTurnover = 0;

  userTrades.forEach(t => {
    const time = new Date(t.createdAt).getTime();
    profitAllTime += t.netProfitUah;
    buyTurnover += t.buyAmountUah;
    sellTurnover += t.sellAmountUah;

    if (time >= todayStart) {
      profitToday += t.netProfitUah;
    }
    if (time >= yesterdayStart && time < todayStart) {
      profitYesterday += t.netProfitUah;
    }
    if (time >= monthStart) {
      profitMonth += t.netProfitUah;
    }
  });

  const recentTrades = [...userTrades]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 10);

  return res.json({
    profitToday: Math.round((profitToday + Number.EPSILON) * 100) / 100,
    profitYesterday: Math.round((profitYesterday + Number.EPSILON) * 100) / 100,
    profitMonth: Math.round((profitMonth + Number.EPSILON) * 100) / 100,
    profitAllTime: Math.round((profitAllTime + Number.EPSILON) * 100) / 100,
    buyTurnover: Math.round((buyTurnover + Number.EPSILON) * 100) / 100,
    sellTurnover: Math.round((sellTurnover + Number.EPSILON) * 100) / 100,
    totalTurnover: Math.round(((buyTurnover + sellTurnover) + Number.EPSILON) * 100) / 100,
    tradesCount: userTrades.length,
    banksCount: userBanks.length,
    recentTrades,
  });
}

