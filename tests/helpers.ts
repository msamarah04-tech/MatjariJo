import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import path from 'node:path';
import bcrypt from 'bcrypt';

export type TestRequest = (
  path: string,
  init?: RequestInit,
) => Promise<{ response: Response; body: any }>;

/**
 * Boot the real Express app against a throwaway SQLite DB built from the actual
 * Prisma migrations. Each test file passes a unique dbFile so files stay isolated.
 */
export async function setupTestApp(dbFile: string) {
  const dbPath = path.resolve('prisma', dbFile);
  process.env.DATABASE_URL = `file:${dbPath}`;
  process.env.JWT_SECRET = 'test-secret-at-least-24-characters';
  process.env.FRONTEND_ORIGIN = 'http://localhost:3000';
  process.env.NODE_ENV = 'test';

  for (const suffix of ['', '-wal', '-shm']) rmSync(`${dbPath}${suffix}`, { force: true });

  const migrationsDir = path.resolve('prisma/migrations');
  for (const name of readdirSync(migrationsDir).sort()) {
    const migration = path.join(migrationsDir, name, 'migration.sql');
    if (existsSync(migration)) {
      execFileSync('sqlite3', [dbPath], { input: readFileSync(migration), stdio: ['pipe', 'ignore', 'inherit'] });
    }
  }

  const { app } = await import('../server/app.js');
  const { prisma, configureSqlite } = await import('../server/db.js');
  await configureSqlite();

  const server = app.listen(0);
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Could not start test server.');
  const base = `http://127.0.0.1:${address.port}/api`;

  const request: TestRequest = async (p, init = {}) => {
    const response = await fetch(`${base}${p}`, {
      ...init,
      headers: { 'content-type': 'application/json', ...(init.headers || {}) },
    });
    const text = await response.text();
    let body: any = {};
    if (text) {
      try { body = JSON.parse(text); } catch { body = text; } // non-JSON (e.g. invoice HTML)
    }
    return { response, body };
  };

  const authed = (token: string, init: RequestInit = {}): RequestInit => ({
    ...init,
    headers: { authorization: `Bearer ${token}`, ...(init.headers || {}) },
  });

  const teardown = async () => {
    server.close();
    await prisma.$disconnect();
    for (const suffix of ['', '-wal', '-shm']) rmSync(`${dbPath}${suffix}`, { force: true });
  };

  return { dbPath, prisma, server, base, request, authed, teardown };
}

export async function seedPlatformOwner(prisma: any, password = 'ChangeMe123!') {
  await prisma.user.create({
    data: {
      email: 'platform@test.local',
      username: 'platform-admin',
      name: 'Platform Owner',
      role: 'PLATFORM_OWNER',
      ownerStatus: 'ACTIVE',
      passwordChangedAt: new Date(),
      passwordHash: await bcrypt.hash(password, 12),
    },
  });
  await prisma.platformSettings.create({ data: { id: 'platform', categories: JSON.stringify(['Home']) } });
}
