import test from 'node:test';
import assert from 'node:assert/strict';
import { setupTestApp, seedPlatformOwner } from './helpers.ts';

const { request, authed, prisma, teardown } = await setupTestApp('test-commerce.db');

async function login(username: string, password: string) {
  const { body } = await request('/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) });
  return body.token as string;
}

async function newShop(platformToken: string, name: string, email: string) {
  const username = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  const password = 'OwnerPass123';
  const submitted = await request('/shop-requests', {
    method: 'POST',
    body: JSON.stringify({ ownerName: 'Owner', ownerEmail: email, storeName: name, category: 'Home', tagline: 't', plan: 'STARTER', username, password }),
  });
  const approved = await request(`/platform/shop-requests/${submitted.body.request.id}/approve`, authed(platformToken, { method: 'POST' }));
  const ownerToken = await login(username, password); // self-service: sign in directly
  return { store: approved.body.store as { id: string; slug: string }, ownerToken };
}

async function addProduct(ownerToken: string, storeId: string, priceCents: number, stock: number) {
  const { body } = await request(`/admin/stores/${storeId}/products`, authed(ownerToken, {
    method: 'POST',
    body: JSON.stringify({ name: 'Widget', priceCents, stock, description: '', collection: '', isFeatured: false, isActive: true }),
  }));
  return body.product as { id: string };
}

test.before(async () => { await seedPlatformOwner(prisma); });
test.after(teardown);

test('concurrent checkouts never oversell limited stock', async () => {
  const platform = await login('platform-admin', 'ChangeMe123!');
  const { store, ownerToken } = await newShop(platform, 'Stock Race', 'stockrace@test.local');
  const product = await addProduct(ownerToken, store.id, 1000, 1); // only 1 in stock

  const attempts = 8;
  const results = await Promise.all(
    Array.from({ length: attempts }, () =>
      request(`/public/stores/${store.slug}/orders`, {
        method: 'POST',
        body: JSON.stringify({
          customerName: 'Racer', customerEmail: 'racer@example.com',
          items: [{ productId: product.id, quantity: 1 }],
        }),
      }),
    ),
  );

  const created = results.filter((r) => r.response.status === 201);
  // Losers are rejected either by the in-transaction stock pre-check (400) or the
  // conditional-UPDATE race backstop (409) — both prevent overselling.
  const rejected = results.filter((r) => r.response.status === 400 || r.response.status === 409);
  assert.equal(created.length, 1, 'exactly one order should win the single unit');
  assert.equal(rejected.length, attempts - 1, 'the rest must be rejected, not oversold');
  assert.ok(results.every((r) => r.response.status < 500), 'no server errors / lock failures');

  const after = await prisma.product.findUnique({ where: { id: product.id } });
  assert.equal(after?.stock, 0, 'stock must never go negative');
});

test('concurrent checkouts never exceed a discount usage limit', async () => {
  const platform = await login('platform-admin', 'ChangeMe123!');
  const { store, ownerToken } = await newShop(platform, 'Discount Race', 'discountrace@test.local');
  const product = await addProduct(ownerToken, store.id, 5000, 100); // plenty of stock

  await request(`/admin/stores/${store.id}/discounts`, authed(ownerToken, {
    method: 'POST',
    body: JSON.stringify({ code: 'ONEUSE', type: 'PERCENT', value: 10, usageLimit: 1, active: true }),
  }));

  const attempts = 8;
  const results = await Promise.all(
    Array.from({ length: attempts }, () =>
      request(`/public/stores/${store.slug}/orders`, {
        method: 'POST',
        body: JSON.stringify({
          customerName: 'Racer', customerEmail: 'racer@example.com',
          discountCode: 'ONEUSE',
          items: [{ productId: product.id, quantity: 1 }],
        }),
      }),
    ),
  );

  // Stock is ample, so every order is accepted — but the limited discount must be
  // applied to at most one of them, and usedCount must never exceed the limit.
  const created = results.filter((r) => r.response.status === 201);
  const discounted = created.filter((r) => (r.body.order.discountCents ?? 0) > 0);
  assert.equal(discounted.length, 1, 'exactly one order may receive the single-use discount');

  const discount = await prisma.discount.findFirst({ where: { storeId: store.id, code: 'ONEUSE' } });
  assert.equal(discount?.usedCount, 1, 'usedCount must not exceed the usage limit');
});

test('idempotency key prevents duplicate orders on retry', async () => {
  const platform = await login('platform-admin', 'ChangeMe123!');
  const { store, ownerToken } = await newShop(platform, 'Idem Store', 'idem@test.local');
  const product = await addProduct(ownerToken, store.id, 2000, 10);

  const payload = JSON.stringify({
    customerName: 'Retry', customerEmail: 'retry@example.com',
    idempotencyKey: 'checkout-key-12345',
    items: [{ productId: product.id, quantity: 2 }],
  });

  const first = await request(`/public/stores/${store.slug}/orders`, { method: 'POST', body: payload });
  const second = await request(`/public/stores/${store.slug}/orders`, { method: 'POST', body: payload });

  assert.equal(first.response.status, 201);
  assert.equal(second.response.status, 200, 'a retry returns the original order, not a new one');
  assert.equal(first.body.order.id, second.body.order.id);

  const orders = await prisma.order.count({ where: { storeId: store.id } });
  assert.equal(orders, 1, 'only one order should exist');
  const after = await prisma.product.findUnique({ where: { id: product.id } });
  assert.equal(after?.stock, 8, 'stock decremented once (10 - 2), not twice');
});

test('GST is computed server-side on top of the recomputed subtotal', async () => {
  const platform = await login('platform-admin', 'ChangeMe123!');
  const { store, ownerToken } = await newShop(platform, 'Tax Store', 'tax@test.local');
  const product = await addProduct(ownerToken, store.id, 10_000, 10);

  const { response, body } = await request(`/public/stores/${store.slug}/orders`, {
    method: 'POST',
    body: JSON.stringify({
      customerName: 'Taxed', customerEmail: 'taxed@example.com',
      items: [{ productId: product.id, quantity: 3 }],
    }),
  });
  assert.equal(response.status, 201);
  const subtotal = 30_000;
  const expectedTax = Math.round(subtotal * 1600 / 10000); // 16% GST, exclusive
  assert.equal(body.order.subtotalCents, subtotal);
  assert.equal(body.order.taxCents, expectedTax);
  assert.equal(body.order.taxRateBps, 1600);
  assert.equal(body.order.totalCents, subtotal + expectedTax);
  assert.equal(body.order.currency, 'JOD');
});
