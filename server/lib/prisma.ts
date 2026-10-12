import { PrismaClient } from '@prisma/client';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set');
}

/** Neon pooler + Prisma: pgbouncer mode and sane pool limits (see prisma.io/docs/guides/database/neon). */
export function normalizeDatabaseUrl(raw: string): string {
  const [base, query = ''] = raw.split('?', 2);
  const params = new URLSearchParams(query);

  if (base.includes('-pooler.') && !params.has('pgbouncer')) {
    params.set('pgbouncer', 'true');
  }
  if (!params.has('sslmode')) {
    params.set('sslmode', 'require');
  }
  if (!params.has('connect_timeout')) {
    params.set('connect_timeout', '30');
  }
  if (!params.has('pool_timeout')) {
    params.set('pool_timeout', '30');
  }
  if (!params.has('connection_limit')) {
    params.set('connection_limit', '5');
  }

  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: {
      db: { url: normalizeDatabaseUrl(process.env.DATABASE_URL) },
    },
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });

globalForPrisma.prisma = prisma;
