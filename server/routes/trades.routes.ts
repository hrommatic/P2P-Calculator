import type { VercelRequest, VercelResponse } from '@vercel/node';
import { methodNotAllowed } from '../middlewares/helpers.js';
import { withAuth, withAdmin } from '../middlewares/withAuth.js';
import * as controller from '../controllers/trades.controller.js';

export const tradesIndexHandler = withAuth(async (req, res, user) => {
  if (req.method === 'GET') return controller.handleGetTrades(req, res, user);
  return methodNotAllowed(res, ['GET']);
});

export const tradesCreateHandler = withAuth(async (req, res, user) => {
  if (req.method === 'POST') return controller.handlePostTrade(req, res, user);
  return methodNotAllowed(res, ['POST']);
});

export const tradeUpdateHandler = withAuth(async (req, res, user) => {
  if (req.method === 'PUT') return controller.handlePutTrade(req, res, user);
  return methodNotAllowed(res, ['PUT']);
});

export const tradeDeleteHandler = withAuth(async (req, res, user) => {
  if (req.method === 'DELETE') return controller.handleDeleteTrade(req, res, user);
  return methodNotAllowed(res, ['DELETE']);
});

export const tradesExportCsvHandler = withAuth(async (req, res, user) => {
  if (req.method === 'GET') return controller.handleTradesExportCsv(req, res, user);
  return methodNotAllowed(res, ['GET']);
});

