import bcrypt from 'bcrypt';

export type TestRequest = (
  path: string,
  init?: RequestInit,
) => Promise<{ response: Response; body: any }>;

// All application tables listed leaf-first so CASCADE handles FKs correctly.
const TRUNCATE_TABLES = [
  '"TicketMessage"',
  '"SupportTicket"',
  '"AnalyticsEvent"',
  '"OrderItem"',
  '"Order"',
  '"Discount"',
  '"ProductFlag"',
  '"Product"',
  '"ShopRequest"',
  '"PasswordResetToken"',
  '"AuditLog"',
  '"Store"',
  '"User"',
  '"PlatformSettings"',
].join(', ');

/**
 * Boot the real Express app against the shared PostgreSQL test database.
 * All application tables are truncated before the suite runs so each test
 * file starts from a clean slate.  The _testId parameter is kept for
 * call-site compatibility but no longer controls a file path.
 */
export async function setupTestApp(_testId: string) {
  process.env.JWT_SECRET = 'test-secret-at-least-24-characters';
  process.env.FRONTEND_ORIGIN = 'http://localhost:3000';
  process.env.NODE_ENV = 'test';
  // DATABASE_URL is not overridden — the real PostgreSQL DB is used as-is.

  const { app } = await import('../server/app.js');
  const { prisma } = await import('../server/db.js');

  // Wipe all rows so every suite starts from a clean slate.
  await prisma.$executeRawUnsafe(
    `TRUNCATE TABLE ${TRUNCATE_TABLES} RESTART IDENTITY CASCADE`,
  );

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
  };

  return { prisma, server, base, request, authed, teardown };
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
