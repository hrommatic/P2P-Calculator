import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { User } from '../schemas/auth.schema.js';
import { getNbuUsdUahRate } from '../lib/nbu-rate.js';
import { countActiveUserBanks, ensureBootstrapped } from '../utils/db/store.js';
import { getDashboardTradePayload } from '../utils/db/dashboard-trades.js';

export async function handleDashboardStats(req: VercelRequest, res: VercelResponse, user: User) {
  await ensureBootstrapped();
  let targetUserId = user.id;
  if (user.role === 'admin' && req.query.targetUserId) {
    targetUserId = String(req.query.targetUserId);
  }

  const [payload, banksCount, usdUahRate] = await Promise.all([
    getDashboardTradePayload(targetUserId, req.query),
    countActiveUserBanks(targetUserId),
    getNbuUsdUahRate().catch(() => null),
  ]);

  return res.json({
    periodStats: payload.periodStats,
    recentTrades: payload.recentTrades,
    banksCount,
    usdUahRate,
  });
}
