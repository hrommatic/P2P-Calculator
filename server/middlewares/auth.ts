import type { VercelRequest, VercelResponse } from '@vercel/node';
import { prisma } from '../lib/prisma.js';
import type { User } from '../schemas/auth.schema.js';
import { mapUser } from '../utils/db/mappers.js';
import { deleteSession, ensureBootstrapped } from '../utils/db/store.js';
import { getBearerToken } from './helpers.js';
import { jsonError } from '../lib/i18n-response.js';

export async function authenticate(
  req: VercelRequest,
  res: VercelResponse,
): Promise<User | null> {
  const token = getBearerToken(req);
  if (!token) {
    jsonError(res, req, 401, 'errAuthRequired');
    return null;
  }

  await ensureBootstrapped();

  const session = await prisma.session.findUnique({
    where: { token },
    include: {
      user: {
        select: {
          id: true,
          nickname: true,
          telegram: true,
          role: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          lastLoginAt: true,
          themePreference: true,
          languagePreference: true,
        },
      },
    },
  });

  if (!session) {
    jsonError(res, req, 401, 'errInvalidSession');
    return null;
  }

  if (session.expiresAt.getTime() < Date.now()) {
    await deleteSession(token);
    jsonError(res, req, 401, 'errSessionExpired');
    return null;
  }

  const user = mapUser({ ...session.user, passwordHash: '' });

  if (user.status === 'blocked') {
    jsonError(res, req, 403, 'errAccountBlockedShort');
    return null;
  }

  return user;
}

export function requireAdmin(
  user: User | null,
  req: VercelRequest,
  res: VercelResponse,
): user is User {
  if (!user || user.role !== 'admin') {
    jsonError(res, req, 403, 'errAdminRequired');
    return false;
  }
  return true;
}
