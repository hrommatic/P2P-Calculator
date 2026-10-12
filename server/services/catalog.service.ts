import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { User } from '../schemas/auth.schema.js';
import {
  getActiveExchanges,
  getActiveGlobalBanks,
  getUserBanks,
  syncUserBankStats,
} from '../utils/db/store.js';

export async function handleGetCatalog(req: VercelRequest, res: VercelResponse, user: User) {
  let targetUserId = user.id;
  if (user.role === 'admin' && req.query.targetUserId) {
    targetUserId = String(req.query.targetUserId);
  }

  const sync = req.query.sync === '1' || req.query.sync === 'true';
  if (sync) {
    await syncUserBankStats(targetUserId);
  }

  const [banks, globalBanks, exchanges] = await Promise.all([
    getUserBanks(targetUserId),
    getActiveGlobalBanks(),
    getActiveExchanges(),
  ]);

  return res.json({ banks, globalBanks, exchanges });
}
