import test from 'node:test';
import assert from 'node:assert/strict';
import { setupTestApp, seedPlatformOwner } from './helpers.ts';

const { request, authed, prisma, teardown } = await setupTestApp('test-api.db');

async function login(username: string, password: string) {
  const { response, body } = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
  assert.equal(response.status, 200);
  return body.token as string;
}

// Owners now choose their own username + password when requesting the store, and
// sign in directly with them once approved (no one-time password, no forced change).
async function createAndApproveShop(
  platformToken: string,
  storeName: string,
  ownerEmail = 'same-owner@test.local',
  username = storeName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''),
  password = 'OwnerPass123',
) {
  const submitted = await request('/shop-requests', {
    method: 'POST',
    body: JSON.stringify({
      ownerName: 'Same Owner',
      ownerEmail,
      storeName,
      category: 'Home',
      tagline: 'Useful things',
      plan: 'STARTER',
      username,
      password,
    }),
  });
  assert.equal(submitted.response.status, 201);

  const approved = await request(`/platform/shop-requests/${submitted.body.request.id}/approve`, authed(platformToken, { method: 'POST' }));
  assert.equal(approved.response.status, 201);
  return {
    ...(approved.body as {
      store: { id: string; slug: string; name: string };
      credentials: { username: string; email: string; password?: string };
      selfService: boolean;
    }),
    chosenUsername: username,
    chosenPassword: password,
  };
}

test.before(async () => {
  await seedPlatformOwner(prisma);
});

test.after(teardown);

test('health and readiness endpoints report status', async () => {
  const health = await request('/health');
  assert.equal(health.response.status, 200);
  assert.equal(health.body.status, 'live');

  const ready = await request('/ready');
  assert.equal(ready.response.status, 200);
  assert.equal(ready.body.status, 'ready');
});

test('approved shops create isolated shop-owner accounts', async () => {
  const platformToken = await login('platform-admin', 'ChangeMe123!');
  const first = await createAndApproveShop(platformToken, 'Isolation A', 'same-owner@test.local', 'isolation-a');
  const second = await createAndApproveShop(platformToken, 'Isolation B', 'same-owner@test.local', 'isolation-b');

  assert.notEqual(first.credentials.username, second.credentials.username);
  assert.notEqual(first.credentials.email, second.credentials.email);
  assert.equal(first.selfService, true);
  assert.equal(first.credentials.password, undefined); // self-service: no password relayed

  const firstToken = await login(first.chosenUsername, first.chosenPassword);
  const firstBootstrap = await request('/bootstrap', authed(firstToken));

  assert.equal(firstBootstrap.response.status, 200);
  assert.equal(firstBootstrap.body.stores.length, 1);
  assert.equal(firstBootstrap.body.stores[0].id, first.store.id);

  const forbidden = await request(`/admin/stores/${second.store.id}`, authed(firstToken));
  assert.equal(forbidden.response.status, 403);
});

test('platform owner can delete a store; shop owners cannot', async () => {
  const platformToken = await login('platform-admin', 'ChangeMe123!');
  const shop = await createAndApproveShop(platformToken, 'Deletable Store', 'del@test.local', 'deletable-store');
  const ownerToken = await login(shop.chosenUsername, shop.chosenPassword);

  await request(`/admin/stores/${shop.store.id}/products`, authed(ownerToken, {
    method: 'POST',
    body: JSON.stringify({ name: 'Doomed', priceCents: 100, stock: 1, description: '', collection: '', isFeatured: false, isActive: true }),
  }));

  // A shop owner cannot reach the platform-only delete.
  const forbidden = await request(`/platform/stores/${shop.store.id}`, authed(ownerToken, { method: 'DELETE' }));
  assert.equal(forbidden.response.status, 403);

  // The platform owner deletes the store.
  const del = await request(`/platform/stores/${shop.store.id}`, authed(platformToken, { method: 'DELETE' }));
  assert.equal(del.response.status, 204);

  // Store, its products, and the orphaned owner account are gone.
  assert.equal((await request(`/platform/stores/${shop.store.id}`, authed(platformToken))).response.status, 404);
  assert.equal(await prisma.product.count({ where: { storeId: shop.store.id } }), 0);
  const relogin = await request('/auth/login', { method: 'POST', body: JSON.stringify({ username: shop.chosenUsername, password: shop.chosenPassword }) });
  assert.equal(relogin.response.status, 400);
});

test('public checkout recalculates totals from stored product prices', async () => {
  const platformToken = await login('platform-admin', 'ChangeMe123!');
  const approved = await createAndApproveShop(platformToken, 'Checkout Math', 'checkout@test.local', 'checkout-math');
  const ownerToken = await login(approved.chosenUsername, approved.chosenPassword);

  const createdProduct = await request(`/admin/stores/${approved.store.id}/products`, authed(ownerToken, {
    method: 'POST',
    body: JSON.stringify({
      name: 'Server Priced Item',
      priceCents: 1234,
      stock: 5,
      description: '',
      collection: '',
      isFeatured: false,
      isActive: true,
    }),
  }));
  assert.equal(createdProduct.response.status, 201);

  const order = await request(`/public/stores/${approved.store.slug}/orders`, {
    method: 'POST',
    body: JSON.stringify({
      customerName: 'Ada Customer',
      customerEmail: 'ada@example.com',
      items: [{ productId: createdProduct.body.product.id, quantity: 2, unitPriceCents: 1 }],
    }),
  });

  assert.equal(order.response.status, 201);
  // Subtotal is recomputed from the stored price (1234 minor units x 2).
  assert.equal(order.body.order.subtotalCents, 2468);
  // GST is added server-side on top of the subtotal (16% exclusive by default).
  assert.equal(order.body.order.taxCents, Math.round(2468 * 1600 / 10000));
  assert.equal(order.body.order.totalCents, 2468 + order.body.order.taxCents);
});
