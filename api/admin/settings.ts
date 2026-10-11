import type { VercelRequest, VercelResponse } from '@vercel/node';
import { adminSettingsGetHandler, adminSettingsPutHandler } from '../../server/routes/admin.routes.js';
import { methodNotAllowed } from '../../server/middlewares/helpers.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') return adminSettingsGetHandler(req, res);
  if (req.method === 'PUT') return adminSettingsPutHandler(req, res);
  return methodNotAllowed(res, ['GET', 'PUT']);
}
