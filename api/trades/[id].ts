import type { VercelRequest, VercelResponse } from '@vercel/node';
import { tradeUpdateHandler, tradeDeleteHandler } from '../../server/routes/trades.routes.js';
import { methodNotAllowed } from '../../server/middlewares/helpers.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'PUT') return tradeUpdateHandler(req, res);
  if (req.method === 'DELETE') return tradeDeleteHandler(req, res);
  return methodNotAllowed(res, ['PUT', 'DELETE']);
}
