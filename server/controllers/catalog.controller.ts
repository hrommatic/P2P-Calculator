import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { User } from '../schemas/auth.schema.js';
import * as service from '../services/catalog.service.js';

export async function handleGetCatalog(req: VercelRequest, res: VercelResponse, user: User) {
  return service.handleGetCatalog(req, res, user);
}
