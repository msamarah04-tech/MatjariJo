import './env.js';
import { Prisma, PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient();

/**
 * No-op kept for call-site compatibility. SQLite PRAGMAs are not needed
 * with PostgreSQL — foreign keys, WAL, and serializable isolation are
 * handled natively by the engine.
 */
export async function configureSqlite() {
  // PostgreSQL: nothing to configure here.
}

/**
 * Run a unit of work inside a serializable transaction.
 */
export function withTransaction<T>(
  fn: (tx: Prisma.TransactionClient) => Promise<T>,
  options?: { timeout?: number; maxWait?: number },
): Promise<T> {
  return prisma.$transaction(fn, {
    timeout: options?.timeout ?? 10_000,
    maxWait: options?.maxWait ?? 10_000,
    isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
  });
}
