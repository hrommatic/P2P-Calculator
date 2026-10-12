import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { User } from '../schemas/auth.schema.js';
import { getNbuUsdUahRate } from '../lib/nbu-rate.js';
import { getDashboardStats } from '../utils/db/store.js';

export async function handleDashboardStats(req: VercelRequest, res: VercelResponse, user: User) {
  let targetUserId = user.id;
  if (user.role === 'admin' && req.query.targetUserId) {
    targetUserId = String(req.query.targetUserId);
  }

  const stats = await getDashboardStats(targetUserId);
  let usdUahRate: number | null = null;
  try {
    usdUahRate = await getNbuUsdUahRate();
  } catch {
    usdUahRate = null;
  }

  return res.json({ ...stats, usdUahRate });
}
