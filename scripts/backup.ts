import path from 'node:path';
import { mkdirSync } from 'node:fs';
import { prisma, configureSqlite } from '../server/db.js';
import { logger } from '../server/logger.js';

/**
 * Consistent SQLite backup. `VACUUM INTO` writes a single-file, transactionally
 * consistent snapshot even while the DB is in WAL mode and serving traffic — no
 * need to stop the server or copy -wal/-shm files by hand.
 *
 * Usage:  npm run db:backup            (writes ./backups/matjari-<timestamp>.db)
 *         BACKUP_DIR=/mnt/x npm run db:backup
 *
 * Restore: stop the API, replace the live DB file (and remove stale -wal/-shm),
 * then start the API. See OPERATIONS.md for the full runbook.
 */
async function main() {
  await configureSqlite();
  const dir = process.env.BACKUP_DIR || path.resolve('backups');
  mkdirSync(dir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const dest = path.join(dir, `matjari-${stamp}.db`);
  await prisma.$executeRawUnsafe(`VACUUM INTO '${dest.replace(/'/g, "''")}'`);
  logger.info({ dest }, 'SQLite backup written');
  // eslint-disable-next-line no-console
  console.log(dest);
  await prisma.$disconnect();
}

main().catch(async (error) => {
  logger.error({ err: error }, 'Backup failed');
  await prisma.$disconnect().catch(() => undefined);
  process.exit(1);
});
