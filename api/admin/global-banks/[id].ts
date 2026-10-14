import type { VercelRequest, VercelResponse } from '@vercel/node';
import { adminGlobalBankUpdateHandler, adminGlobalBankDeleteHandler } from '../../../server/routes/admin.routes.js';
import { methodNotAllowed } from '../../../server/middlewares/helpers.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'PUT') return adminGlobalBankUpdateHandler(req, res);
  if (req.method === 'DELETE') return adminGlobalBankDeleteHandler(req, res);
  return methodNotAllowed(res, ['PUT', 'DELETE']);
}
