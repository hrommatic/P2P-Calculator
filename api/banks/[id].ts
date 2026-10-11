import type { VercelRequest, VercelResponse } from '@vercel/node';
import { bankUpdateHandler, bankDeleteHandler } from '../../server/routes/banks.routes.js';
import { methodNotAllowed } from '../../server/middlewares/helpers.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'PUT') return bankUpdateHandler(req, res);
  if (req.method === 'DELETE') return bankDeleteHandler(req, res);
  return methodNotAllowed(res, ['PUT', 'DELETE']);
}
