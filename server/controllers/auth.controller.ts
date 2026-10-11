import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { User } from '../schemas/auth.schema.js';
import * as service from '../services/auth.service.js';

export async function handleAuthRegister(req: VercelRequest, res: VercelResponse) {
  return service.handleAuthRegister(req, res);
}

export async function handleAuthLogin(req: VercelRequest, res: VercelResponse) {
  return service.handleAuthLogin(req, res);
}

export async function handleAuthLogout(req: VercelRequest, res: VercelResponse, user: User) {
  return service.handleAuthLogout(req, res, user);
}

export async function handleAuthMe(req: VercelRequest, res: VercelResponse, user: User) {
  return service.handleAuthMe(req, res, user);
}

export async function handleAuthChangePassword(req: VercelRequest, res: VercelResponse, user: User) {
  return service.handleAuthChangePassword(req, res, user);
}

export async function handleAuthUpdateProfile(req: VercelRequest, res: VercelResponse, user: User) {
  return service.handleAuthUpdateProfile(req, res, user);
}

export async function handleExchanges(req: VercelRequest, res: VercelResponse) {
  return service.handleExchanges(req, res);
}

export async function handleSettingsPublic(req: VercelRequest, res: VercelResponse) {
  return service.handleSettingsPublic(req, res);
}

