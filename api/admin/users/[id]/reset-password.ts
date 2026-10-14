import type { VercelRequest, VercelResponse } from '@vercel/node';
import { adminUserResetPasswordHandler } from '../../../../server/routes/admin.routes.js';
import { methodNotAllowed } from '../../../../server/middlewares/helpers.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'POST') return adminUserResetPasswordHandler(req, res);
  return methodNotAllowed(res, ['POST']);
}
