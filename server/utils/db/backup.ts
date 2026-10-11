import { prisma } from '../../lib/prisma.js';
import { loadDatabase } from './repository.js';

export async function createBackup(): Promise<string> {
  const db = await loadDatabase();
  const filename = `p2p_backup_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
  await prisma.systemBackup.upsert({
    where: { filename },
    create: {
      filename,
      payload: db as object,
      createdAt: new Date(),
    },
    update: {
      payload: db as object,
      createdAt: new Date(),
    },
  });
  return filename;
}

export async function listBackups(): Promise<string[]> {
  const rows = await prisma.systemBackup.findMany({
    orderBy: { createdAt: 'desc' },
    select: { filename: true },
  });
  return rows.map((r) => r.filename);
}
