import type { VercelRequest, VercelResponse } from '@vercel/node';
import { methodNotAllowed } from '../middlewares/helpers.js';
import { withAuth, withAdmin } from '../middlewares/withAuth.js';
import * as controller from '../controllers/admin.controller.js';

export const adminOverviewHandler = withAdmin(async (req, res, user) => {
  if (req.method === 'GET') return controller.handleAdminOverview(req, res, user);
  return methodNotAllowed(res, ['GET']);
});

export const adminUsersHandler = withAdmin(async (req, res, user) => {
  if (req.method === 'GET') return controller.handleAdminUsers(req, res, user);
  return methodNotAllowed(res, ['GET']);
});

export const adminUserStatusHandler = withAdmin(async (req, res, user) => {
  if (req.method === 'PUT') return controller.handleAdminUserStatus(req, res, user);
  return methodNotAllowed(res, ['PUT']);
});

export const adminUserProfileHandler = withAdmin(async (req, res, user) => {
  if (req.method === 'PUT') return controller.handleAdminUserProfile(req, res, user);
  return methodNotAllowed(res, ['PUT']);
});

export const adminUserResetPasswordHandler = withAdmin(async (req, res, user) => {
  if (req.method === 'POST') return controller.handleAdminUserResetPassword(req, res, user);
  return methodNotAllowed(res, ['POST']);
});

export const adminUserDeleteHandler = withAdmin(async (req, res, user) => {
  if (req.method === 'DELETE') return controller.handleAdminUserDelete(req, res, user);
  return methodNotAllowed(res, ['DELETE']);
});

export const adminStudentsStatsHandler = withAdmin(async (req, res, user) => {
  if (req.method === 'GET') return controller.handleAdminStudentsStats(req, res, user);
  return methodNotAllowed(res, ['GET']);
});

export const adminGlobalBanksGetHandler = withAdmin(async (req, res, user) => {
  if (req.method === 'GET') return controller.handleGetAdminGlobalBanks(req, res, user);
  return methodNotAllowed(res, ['GET']);
});

export const adminGlobalBanksPostHandler = withAdmin(async (req, res, user) => {
  if (req.method === 'POST') return controller.handlePostAdminGlobalBank(req, res, user);
  return methodNotAllowed(res, ['POST']);
});

export const adminGlobalBankUpdateHandler = withAdmin(async (req, res, user) => {
  if (req.method === 'PUT') return controller.handlePutAdminGlobalBank(req, res, user);
  return methodNotAllowed(res, ['PUT']);
});

export const adminGlobalBankDeleteHandler = withAdmin(async (req, res, user) => {
  if (req.method === 'DELETE') return controller.handleDeleteAdminGlobalBank(req, res, user);
  return methodNotAllowed(res, ['DELETE']);
});

export const adminExchangesGetHandler = withAdmin(async (req, res, user) => {
  if (req.method === 'GET') return controller.handleGetAdminExchanges(req, res, user);
  return methodNotAllowed(res, ['GET']);
});

export const adminExchangesPostHandler = withAdmin(async (req, res, user) => {
  if (req.method === 'POST') return controller.handlePostAdminExchange(req, res, user);
  return methodNotAllowed(res, ['POST']);
});

export const adminExchangeUpdateHandler = withAdmin(async (req, res, user) => {
  if (req.method === 'PUT') return controller.handlePutAdminExchange(req, res, user);
  return methodNotAllowed(res, ['PUT']);
});

export const adminSettingsGetHandler = withAdmin(async (req, res, user) => {
  if (req.method === 'GET') return controller.handleGetAdminSettings(req, res, user);
  return methodNotAllowed(res, ['GET']);
});

export const adminSettingsPutHandler = withAdmin(async (req, res, user) => {
  if (req.method === 'PUT') return controller.handlePutAdminSettings(req, res, user);
  return methodNotAllowed(res, ['PUT']);
});

export const adminAuditLogsHandler = withAdmin(async (req, res, user) => {
  if (req.method === 'GET') return controller.handleAdminAuditLogs(req, res, user);
  return methodNotAllowed(res, ['GET']);
});

export const adminBackupHandler = withAdmin(async (req, res, user) => {
  if (req.method === 'POST') return controller.handleAdminBackup(req, res, user);
  return methodNotAllowed(res, ['POST']);
});

export const adminBackupsHandler = withAdmin(async (req, res, user) => {
  if (req.method === 'GET') return controller.handleAdminBackups(req, res, user);
  return methodNotAllowed(res, ['GET']);
});

