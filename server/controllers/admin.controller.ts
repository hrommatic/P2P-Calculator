import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { User } from '../schemas/auth.schema.js';
import * as service from '../services/admin.service.js';

export async function handleAdminOverview(req: VercelRequest, res: VercelResponse, user: User) {
  return service.handleAdminOverview(req, res, user);
}

export async function handleAdminUsers(req: VercelRequest, res: VercelResponse, user: User) {
  return service.handleAdminUsers(req, res, user);
}

export async function handleAdminUserStatus(req: VercelRequest, res: VercelResponse, user: User) {
  return service.handleAdminUserStatus(req, res, user);
}

export async function handleAdminUserProfile(req: VercelRequest, res: VercelResponse, user: User) {
  return service.handleAdminUserProfile(req, res, user);
}

export async function handleAdminUserResetPassword(req: VercelRequest, res: VercelResponse, user: User) {
  return service.handleAdminUserResetPassword(req, res, user);
}

export async function handleAdminUserDelete(req: VercelRequest, res: VercelResponse, user: User) {
  return service.handleAdminUserDelete(req, res, user);
}

export async function handleAdminStudentsStats(req: VercelRequest, res: VercelResponse, user: User) {
  return service.handleAdminStudentsStats(req, res, user);
}

export async function handleGetAdminGlobalBanks(req: VercelRequest, res: VercelResponse, user: User) {
  return service.handleGetAdminGlobalBanks(req, res, user);
}

export async function handlePostAdminGlobalBank(req: VercelRequest, res: VercelResponse, user: User) {
  return service.handlePostAdminGlobalBank(req, res, user);
}

export async function handlePutAdminGlobalBank(req: VercelRequest, res: VercelResponse, user: User) {
  return service.handlePutAdminGlobalBank(req, res, user);
}

export async function handleDeleteAdminGlobalBank(req: VercelRequest, res: VercelResponse, user: User) {
  return service.handleDeleteAdminGlobalBank(req, res, user);
}

export async function handleGetAdminExchanges(req: VercelRequest, res: VercelResponse, user: User) {
  return service.handleGetAdminExchanges(req, res, user);
}

export async function handlePostAdminExchange(req: VercelRequest, res: VercelResponse, user: User) {
  return service.handlePostAdminExchange(req, res, user);
}

export async function handlePutAdminExchange(req: VercelRequest, res: VercelResponse, user: User) {
  return service.handlePutAdminExchange(req, res, user);
}

export async function handleGetAdminSettings(req: VercelRequest, res: VercelResponse, user: User) {
  return service.handleGetAdminSettings(req, res, user);
}

export async function handlePutAdminSettings(req: VercelRequest, res: VercelResponse, user: User) {
  return service.handlePutAdminSettings(req, res, user);
}

export async function handleAdminAuditLogs(req: VercelRequest, res: VercelResponse, user: User) {
  return service.handleAdminAuditLogs(req, res, user);
}

export async function handleAdminBackup(req: VercelRequest, res: VercelResponse, user: User) {
  return service.handleAdminBackup(req, res, user);
}

export async function handleAdminBackups(req: VercelRequest, res: VercelResponse, user: User) {
  return service.handleAdminBackups(req, res, user);
}

