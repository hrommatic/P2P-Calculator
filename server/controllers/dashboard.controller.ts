import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { User } from '../schemas/auth.schema.js';
import * as service from '../services/dashboard.service.js';

export async function handleDashboardStats(req: VercelRequest, res: VercelResponse, user: User) {
  return service.handleDashboardStats(req, res, user);
}

