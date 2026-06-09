import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { setupTestApp, seedPlatformOwner } from './helpers.ts';

const { request, authed, prisma, teardown } = await setupTestApp('test-security.db');

async function login(username: string, password: string) {
  const { response, body } = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
  return { status: response.status, body };
}

async function approveShop(platformToken: string, storeName: string, ownerEmail: string, username: string, password = 'OwnerPass123') {
  const submitted = await request('/shop-requests', {
    method: 'POST',
    body: JSON.stringify({ ownerName: 'Owner', ownerEmail, storeName, category: 'Home', tagline: 't', plan: 'STARTER', username, password }),
  });
  const approved = await request(`/platform/shop-requests/${submitted.body.request.id}/approve`, authed(platformToken, { method: 'POST' }));
  return approved.body as { store: { id: string } };
}

test.before(async () => {
  await seedPlatformOwner(prisma);
});

test.after(teardown);

test('logout revokes the access token (server-side revocation)', async () => {
  const { body } = await login('platform-admin', 'ChangeMe123!');
  const token = body.token as string;

  const before = await request('/auth/me', authed(token));
  assert.equal(before.response.status, 200);

  const out = await request('/auth/logout', authed(token, { method: 'POST' }));
  assert.equal(out.response.status, 200);

  const after = await request('/auth/me', authed(token));
  assert.equal(after.response.status, 401, 'old token must stop working after logout');
});

test('changing password revokes previously issued tokens', async () => {
  const { body } = await login('platform-admin', 'ChangeMe123!');
  const oldToken = body.token as string;

  const changed = await request('/auth/change-password', authed(oldToken, {
    method: 'POST',
    body: JSON.stringify({ currentPassword: 'ChangeMe123!', newPassword: 'BrandNewPass99' }),
  }));
  assert.equal(changed.response.status, 200);
  const newToken = changed.body.token as string;

  const oldAfter = await request('/auth/me', authed(oldToken));
  assert.equal(oldAfter.response.status, 401, 'old token must be revoked after password change');

  const newAfter = await request('/auth/me', authed(newToken));
  assert.equal(newAfter.response.status, 200, 'the session that changed the password stays signed in');

  // Restore the seeded password for other tests in this file.
  await request('/auth/change-password', authed(newToken, {
    method: 'POST',
    body: JSON.stringify({ currentPassword: 'BrandNewPass99', newPassword: 'ChangeMe123!' }),
  }));
});

test('repeated failed logins lock the account', async () => {
  await prisma.user.create({
    data: {
      email: 'locktest@test.local',
      username: 'lock-target',
      role: 'PLATFORM_OWNER',
      ownerStatus: 'ACTIVE',
      passwordChangedAt: new Date(),
      passwordHash: await (await import('bcrypt')).default.hash('CorrectHorse9', 12),
    },
  });

  for (let i = 0; i < 5; i += 1) {
    const wrong = await login('lock-target', 'wrong-password');
    assert.equal(wrong.status, 400);
  }

  // 6th attempt, even with the correct password, is rejected because the account is locked.
  const locked = await login('lock-target', 'CorrectHorse9');
  assert.equal(locked.status, 429);
  assert.equal(locked.body.error.code, 'ACCOUNT_LOCKED');
});

test('self-service owners sign in directly; a platform reset forces a one-time change', async () => {
  const platform = await login('platform-admin', 'ChangeMe123!');
  const shop = await approveShop(platform.body.token, 'Gate Store', 'gate@test.local', 'gate-store', 'OwnerPass123');

  // Self-service: the owner signs in with the credentials they chose, no forced change.
  const direct = await login('gate-store', 'OwnerPass123');
  assert.equal(direct.status, 200);
  assert.equal(direct.body.user.mustChangePassword, false);
  assert.equal((await request('/bootstrap', authed(direct.body.token))).response.status, 200);

  // A platform-owner password reset issues a one-time password and forces a change.
  const reset = await request(`/platform/stores/${shop.store.id}/reset-owner-password`, authed(platform.body.token, { method: 'POST' }));
  assert.equal(reset.response.status, 200);
  const otp = reset.body.credentials.password as string;

  const otpLogin = await login('gate-store', otp);
  assert.equal(otpLogin.body.user.mustChangePassword, true);
  assert.equal((await request('/bootstrap', authed(otpLogin.body.token))).response.status, 403);

  const rotated = await request('/auth/change-password', authed(otpLogin.body.token, {
    method: 'POST',
    body: JSON.stringify({ currentPassword: otp, newPassword: 'RotatedPass12' }),
  }));
  assert.equal(rotated.response.status, 200);
  assert.equal((await request('/bootstrap', authed(rotated.body.token))).response.status, 200);
});

test('production refuses to boot with the default JWT secret (fail-closed)', () => {
  let threw = false;
  try {
    execFileSync('node', ['--import', 'tsx', '-e', "import('./server/env.ts')"], {
      env: {
        ...process.env,
        NODE_ENV: 'production',
        JWT_SECRET: 'dev-only-change-this-jwt-secret-before-production',
        COOKIE_SECRET: 'a-very-long-cookie-secret-value',
        INITIAL_PLATFORM_PASSWORD: 'something-else-1',
        FRONTEND_ORIGIN: 'https://shop.example.com',
      },
      stdio: ['ignore', 'ignore', 'pipe'],
    });
  } catch {
    threw = true;
  }
  assert.equal(threw, true, 'env loading must throw in production with an insecure JWT secret');
});
