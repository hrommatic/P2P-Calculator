import type { VercelRequest, VercelResponse } from '@vercel/node';
import { prisma } from '../lib/prisma.js';
import type { User } from '../schemas/auth.schema.js';
import { mapUser } from '../utils/db/mappers.js';
import { deleteSession, ensureBootstrapped } from '../utils/db/store.js';
import { getBearerToken } from './helpers.js';

export async function authenticate(
  req: VercelRequest,
  res: VercelResponse,
): Promise<User | null> {
  const token = getBearerToken(req);
  if (!token) {
    res
      .status(401)
      .json({ error: 'Потрібна авторизація (Authorization required)' });
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
    res.status(401).json({ error: 'Недійсний токен сесії (Invalid session)' });
    return null;
  }

  if (session.expiresAt.getTime() < Date.now()) {
    await deleteSession(token);
    res.status(401).json({ error: 'Сесія закінчилася (Session expired)' });
    return null;
  }

  const user = mapUser({ ...session.user, passwordHash: '' });

  if (user.status === 'blocked') {
    res.status(403).json({
      error:
        'Ваш акаунт заблоковано. Зверніться до куратора (Account is blocked)',
    });
    return null;
  }

  return user;
}

export function requireAdmin(
  user: User | null,
  res: VercelResponse,
): user is User {
  if (!user || user.role !== 'admin') {
    res.status(403).json({
      error:
        'Доступ заборонено: потрібні права адміністратора (Admin rights required)',
    });
    return false;
  }
  return true;
}
