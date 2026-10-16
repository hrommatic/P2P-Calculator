import { methodNotAllowed } from '../middlewares/helpers.js';
import { withAuth, withPublic } from '../middlewares/withAuth.js';
import * as controller from '../controllers/auth.controller.js';

export const registerHandler = withPublic(async (req, res) => {
  if (req.method === 'POST') return controller.handleAuthRegister(req, res);
  return methodNotAllowed(req, res, ['POST']);
});

export const loginHandler = withPublic(async (req, res) => {
  if (req.method === 'POST') return controller.handleAuthLogin(req, res);
  return methodNotAllowed(req, res, ['POST']);
});

export const resetPasswordHandler = withPublic(async (req, res) => {
  if (req.method === 'POST') return controller.handleAuthResetPassword(req, res);
  return methodNotAllowed(req, res, ['POST']);
});

export const logoutHandler = withAuth(async (req, res, user) => {
  if (req.method === 'POST') return controller.handleAuthLogout(req, res, user);
  return methodNotAllowed(req, res, ['POST']);
});

export const meHandler = withAuth(async (req, res, user) => {
  if (req.method === 'GET') return controller.handleAuthMe(req, res, user);
  return methodNotAllowed(req, res, ['GET']);
});

export const changePasswordHandler = withAuth(async (req, res, user) => {
  if (req.method === 'POST') return controller.handleAuthChangePassword(req, res, user);
  return methodNotAllowed(req, res, ['POST']);
});

export const updateProfileHandler = withAuth(async (req, res, user) => {
  if (req.method === 'POST') return controller.handleAuthUpdateProfile(req, res, user);
  return methodNotAllowed(req, res, ['POST']);
});

export const exchangesHandler = withPublic(async (req, res) => {
  if (req.method === 'GET') return controller.handleExchanges(req, res);
  return methodNotAllowed(req, res, ['GET']);
});

export const settingsPublicHandler = withPublic(async (req, res) => {
  if (req.method === 'GET') return controller.handleSettingsPublic(req, res);
  return methodNotAllowed(req, res, ['GET']);
});

