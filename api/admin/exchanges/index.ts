import type { VercelRequest, VercelResponse } from '@vercel/node';
import { adminExchangesGetHandler, adminExchangesPostHandler } from '../../../server/routes/admin.routes.js';
import { methodNotAllowed } from '../../../server/middlewares/helpers.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') return adminExchangesGetHandler(req, res);
  if (req.method === 'POST') return adminExchangesPostHandler(req, res);
  return methodNotAllowed(res, ['GET', 'POST']);
}
