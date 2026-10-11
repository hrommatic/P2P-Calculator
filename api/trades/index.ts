import type { VercelRequest, VercelResponse } from '@vercel/node';
import { tradesIndexHandler, tradesCreateHandler } from '../../server/routes/trades.routes.js';
import { methodNotAllowed } from '../../server/middlewares/helpers.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') return tradesIndexHandler(req, res);
  if (req.method === 'POST') return tradesCreateHandler(req, res);
  return methodNotAllowed(res, ['GET', 'POST']);
}
