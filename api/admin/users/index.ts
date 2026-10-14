import type { VercelRequest, VercelResponse } from '@vercel/node';
import { adminUsersHandler } from '../../../server/routes/admin.routes.js';
import { methodNotAllowed } from '../../../server/middlewares/helpers.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') return adminUsersHandler(req, res);
  return methodNotAllowed(res, ['GET']);
}
