import './env.js';
import { Prisma, PrismaClient } from '@prisma/client';

/**
 * Pin SQLite to a single pooled connection. This makes the busy_timeout/foreign_keys
 * PRAGMAs (set once in configureSqlite) apply to the connection that actually serves
 * every query, and serializes writers at the pool instead of hitting SQLITE_BUSY —
 * which is exactly what the conditional-UPDATE checkout guarantees rely on.
 *
 * We mutate the DATABASE_URL env var (rather than overriding datasources in code) so
 * Prisma keeps resolving relative `file:` paths against the schema directory.
 */
const dbUrl = process.env.DATABASE_URL ?? 'file:./dev.db';
if (dbUrl.startsWith('file:') && !dbUrl.includes('connection_limit')) {
  process.env.DATABASE_URL = `${dbUrl}${dbUrl.includes('?') ? '&' : '?'}connection_limit=1`;
}

export const prisma = new PrismaClient();

/**
 * SQLite integrity / concurrency tuning. Runs once at startup.
 *  - foreign_keys=ON enforces the relations Prisma declares (Prisma enables this
 *    per connection by default; we assert it so a stray connection can't skip it).
 *  - journal_mode=WAL lets readers run concurrently with a single writer and is the
 *    safe mode for a self-hosted server. WAL is persisted in the DB file header.
 *  - busy_timeout makes writers wait briefly for the lock instead of failing fast,
 *    which pairs with the BEGIN IMMEDIATE transactions used at checkout.
 *
 * Postgres swap note: these are SQLite-only PRAGMAs and live here, outside business
 * logic, so the future move to Postgres only touches this file.
 */
export async function configureSqlite() {
  if (!isSqlite()) return;
  // Some PRAGMAs (journal_mode, busy_timeout) return a row, which $executeRaw
  // rejects on SQLite — use $queryRawUnsafe which tolerates both.
  await prisma.$queryRawUnsafe('PRAGMA foreign_keys = ON;');
  await prisma.$queryRawUnsafe('PRAGMA journal_mode = WAL;');
  await prisma.$queryRawUnsafe('PRAGMA busy_timeout = 5000;');
  await prisma.$queryRawUnsafe('PRAGMA synchronous = NORMAL;');
}

function isSqlite() {
  return (process.env.DATABASE_URL ?? 'file:').startsWith('file:');
}

/**
 * Run a unit of work inside a serializable transaction. On SQLite this maps to a
 * single-writer transaction; with `foreign_keys` + conditional UPDATEs it gives us
 * the atomicity checkout/stock/discount need. Kept generic so the Postgres swap is local.
 */
export function withTransaction<T>(
  fn: (tx: Prisma.TransactionClient) => Promise<T>,
  options?: { timeout?: number; maxWait?: number },
): Promise<T> {
  return prisma.$transaction(fn, {
    timeout: options?.timeout ?? 10_000,
    maxWait: options?.maxWait ?? 10_000,
    isolationLevel: isSqlite() ? undefined : Prisma.TransactionIsolationLevel.Serializable,
  });
}
