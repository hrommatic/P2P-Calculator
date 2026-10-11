import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { User } from '../schemas/auth.schema.js';
import * as service from '../services/banks.service.js';

export async function handleGetBanks(req: VercelRequest, res: VercelResponse, user: User) {
  return service.handleGetBanks(req, res, user);
}

export async function handlePostBank(req: VercelRequest, res: VercelResponse, user: User) {
  return service.handlePostBank(req, res, user);
}

export async function handlePutBank(req: VercelRequest, res: VercelResponse, user: User) {
  return service.handlePutBank(req, res, user);
}

export async function handleDeleteBank(req: VercelRequest, res: VercelResponse, user: User) {
  return service.handleDeleteBank(req, res, user);
}

