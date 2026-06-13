import test from 'node:test';
import assert from 'node:assert/strict';
import bcrypt from 'bcrypt';
import { setupTestApp, seedPlatformOwner } from './helpers.ts';

const { prisma, teardown } = await setupTestApp('test-policy.db');

const { hasRole, isPlatformOwner, isShopOwner } = await import('../server/policies/roles.policy.ts');
const { assertStoreAccess, canAccessStore } = await import('../server/policies/storeAccess.policy.ts');

async function makeOwner(email: string, ownerStatus = 'ACTIVE') {
  return prisma.user.create({
    data: { email, username: email.split('@')[0], role: 'SHOP_OWNER', ownerStatus, passwordHash: await bcrypt.hash('x', 4) },
  });
}

test.before(async () => { await seedPlatformOwner(prisma); });
test.after(teardown);

test('role policy decisions', () => {
  const platform = { role: 'PLATFORM_OWNER', ownerStatus: 'ACTIVE' } as any;
  const shop = { role: 'SHOP_OWNER', ownerStatus: 'ACTIVE' } as any;
  assert.equal(isPlatformOwner(platform), true);
  assert.equal(isShopOwner(shop), true);
  assert.equal(hasRole(shop, ['PLATFORM_OWNER']), false);
  assert.equal(hasRole(shop, ['SHOP_OWNER', 'PLATFORM_OWNER']), true);
});

test('store access policy enforces per-store isolation', async () => {
  const platform = await prisma.user.findFirstOrThrow({ where: { role: 'PLATFORM_OWNER' } });
  const ownerA = await makeOwner('owner-a@test.local');
  const ownerB = await makeOwner('owner-b@test.local');
  const storeA = await prisma.store.create({ data: { ownerId: ownerA.id, slug: 'store-a', name: 'A' } });
  const storeB = await prisma.store.create({ data: { ownerId: ownerB.id, slug: 'store-b', name: 'B' } });

  // Platform owners operate through /platform routes only — assertStoreAccess
  // intentionally denies them at the shop-content layer.
  assert.equal(await canAccessStore(platform, storeA.id), false);
  assert.equal(await canAccessStore(platform, storeB.id), false);
  await assert.rejects(() => assertStoreAccess(platform, storeA.id), /do not have access/);

  // Owner A reaches only their store.
  assert.equal(await assertStoreAccess(ownerA, storeA.id), true);
  assert.equal(await canAccessStore(ownerA, storeB.id), false);
  await assert.rejects(() => assertStoreAccess(ownerA, storeB.id), /do not have access/);
});

test('restricted owners are denied store access', async () => {
  const restricted = await makeOwner('restricted@test.local', 'RESTRICTED');
  const store = await prisma.store.create({ data: { ownerId: restricted.id, slug: 'store-r', name: 'R' } });
  await assert.rejects(() => assertStoreAccess(restricted, store.id), /not active/);
});
