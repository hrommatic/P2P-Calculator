import type { VercelRequest, VercelResponse } from '@vercel/node';
import { methodNotAllowed } from '../middlewares/helpers.js';
import { withAuth } from '../middlewares/withAuth.js';
import * as controller from '../controllers/catalog.controller.js';

export const catalogGetHandler = withAuth(async (req, res, user) => {
  if (req.method === 'GET') return controller.handleGetCatalog(req, res, user);
  return methodNotAllowed(res, ['GET']);
});
