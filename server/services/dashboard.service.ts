import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { User } from '../schemas/auth.schema.js';
import { getNbuUsdUahRate } from '../lib/nbu-rate.js';
import { countActiveUserBanks, getTradesForUser } from '../utils/db/store.js';

export async function handleDashboardStats(req: VercelRequest, res: VercelResponse, user: User) {
  let targetUserId = user.id;
  if (user.role === 'admin' && req.query.targetUserId) {
    targetUserId = String(req.query.targetUserId);
  }

  const [trades, banksCount, usdUahRate] = await Promise.all([
    getTradesForUser(targetUserId, req.query),
    countActiveUserBanks(targetUserId),
    getNbuUsdUahRate().catch(() => null),
  ]);

  return res.json({
    profitToday: 0,
    profitMonth: 0,
    spreadTodayPercent: 0,
    roiTodayPercent: 0,
    buyTurnoverToday: 0,
    sellTurnoverToday: 0,
    totalTurnoverToday: 0,
    tradesCountToday: 0,
    banksCount,
    recentTrades: [],
    trades,
    usdUahRate,
  });
}
