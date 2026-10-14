import type { VercelRequest, VercelResponse } from '@vercel/node';
import { adminUserDeleteHandler } from '../../../server/routes/admin.routes.js';
import { methodNotAllowed } from '../../../server/middlewares/helpers.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'DELETE') return adminUserDeleteHandler(req, res);
  return methodNotAllowed(res, ['DELETE']);
}
