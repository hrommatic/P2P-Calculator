import type { VercelRequest, VercelResponse } from '@vercel/node';
import { methodNotAllowed } from '../middlewares/helpers.js';
import { withAuth, withAdmin } from '../middlewares/withAuth.js';
import * as controller from '../controllers/banks.controller.js';

export const banksIndexGetHandler = withAuth(async (req, res, user) => {
  if (req.method === 'GET') return controller.handleGetBanks(req, res, user);
  return methodNotAllowed(res, ['GET']);
});

export const banksIndexPostHandler = withAuth(async (req, res, user) => {
  if (req.method === 'POST') return controller.handlePostBank(req, res, user);
  return methodNotAllowed(res, ['POST']);
});

export const bankUpdateHandler = withAuth(async (req, res, user) => {
  if (req.method === 'PUT') return controller.handlePutBank(req, res, user);
  return methodNotAllowed(res, ['PUT']);
});

export const bankDeleteHandler = withAuth(async (req, res, user) => {
  if (req.method === 'DELETE') return controller.handleDeleteBank(req, res, user);
  return methodNotAllowed(res, ['DELETE']);
});

