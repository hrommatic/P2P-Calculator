import type { VercelRequest, VercelResponse } from '@vercel/node';
import { methodNotAllowed } from '../middlewares/helpers.js';
import { withAuth, withAdmin } from '../middlewares/withAuth.js';
import * as controller from '../controllers/dashboard.controller.js';

export const dashboardStatsHandler = withAuth(async (req, res, user) => {
  if (req.method === 'GET') return controller.handleDashboardStats(req, res, user);
  return methodNotAllowed(res, ['GET']);
});

