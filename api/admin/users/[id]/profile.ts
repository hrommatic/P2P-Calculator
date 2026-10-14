import type { VercelRequest, VercelResponse } from '@vercel/node';
import { adminUserProfileHandler } from '../../../../server/routes/admin.routes.js';
import { methodNotAllowed } from '../../../../server/middlewares/helpers.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'PUT') return adminUserProfileHandler(req, res);
  return methodNotAllowed(res, ['PUT']);
}
