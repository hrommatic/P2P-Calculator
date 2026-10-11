import type { VercelRequest, VercelResponse } from '@vercel/node';
import { banksIndexGetHandler, banksIndexPostHandler } from '../../server/routes/banks.routes.js';
import { methodNotAllowed } from '../../server/middlewares/helpers.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') return banksIndexGetHandler(req, res);
  if (req.method === 'POST') return banksIndexPostHandler(req, res);
  return methodNotAllowed(res, ['GET', 'POST']);
}
