import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { User } from '../schemas/auth.schema.js';
import * as service from '../services/trades.service.js';

export async function handleGetTrades(req: VercelRequest, res: VercelResponse, user: User) {
  return service.handleGetTrades(req, res, user);
}

export async function handlePostTrade(req: VercelRequest, res: VercelResponse, user: User) {
  return service.handlePostTrade(req, res, user);
}

export async function handlePutTrade(req: VercelRequest, res: VercelResponse, user: User) {
  return service.handlePutTrade(req, res, user);
}

export async function handleDeleteTrade(req: VercelRequest, res: VercelResponse, user: User) {
  return service.handleDeleteTrade(req, res, user);
}

export async function handleTradesExportCsv(req: VercelRequest, res: VercelResponse, user: User) {
  return service.handleTradesExportCsv(req, res, user);
}

