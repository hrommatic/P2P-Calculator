import type { VercelRequest, VercelResponse } from '@vercel/node';
import { adminGlobalBanksGetHandler, adminGlobalBanksPostHandler } from '../../../server/routes/admin.routes.js';
import { methodNotAllowed } from '../../../server/middlewares/helpers.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') return adminGlobalBanksGetHandler(req, res);
  if (req.method === 'POST') return adminGlobalBanksPostHandler(req, res);
  return methodNotAllowed(res, ['GET', 'POST']);
}
