import test from 'node:test';
import assert from 'node:assert/strict';
import { setupTestApp, seedPlatformOwner } from './helpers.ts';

const { request, authed, prisma, teardown } = await setupTestApp('test-product-catalog.db');

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
  const ownerToken = await login(username, password);
  return { store: approved.body.store as { id: string; slug: string }, ownerToken };
}

const createProduct = (token: string, storeId: string, body: Record<string, unknown>) =>
  request(`/admin/stores/${storeId}/products`, authed(token, { method: 'POST', body: JSON.stringify(body) }));

const baseProduct = (overrides: Record<string, unknown> = {}) => ({
  name: 'Test Product',
  description: '',
  collection: '',
  priceCents: 1500,
  stock: 10,
  isFeatured: false,
  isActive: true,
  ...overrides,
});

// Log in once and reuse a primary shop across tests — repeated logins would trip the
// per-IP login rate limiter (12/min) since every request comes from 127.0.0.1.
let platformToken: string;
let store: { id: string; slug: string };
let ownerToken: string;

test.before(async () => {
  await seedPlatformOwner(prisma);
  platformToken = await login('platform-admin', 'ChangeMe123!');
  const primary = await newShop(platformToken, 'Primary Catalog', 'primary@test.local');
  store = primary.store;
  ownerToken = primary.ownerToken;
});
test.after(teardown);

test('legacy product creation without a categoryKey still works', async () => {
  const res = await createProduct(ownerToken, store.id, baseProduct({ name: 'Legacy Item' }));
  assert.equal(res.response.status, 201);
  assert.equal(res.body.product.priceCents, 1500);
});

test('category required fields are enforced server-side', async () => {
  // Clothing requires `gender`. Missing it → 400.
  const missing = await createProduct(ownerToken, store.id, baseProduct({
    name: 'Linen Shirt',
    details: { categoryKey: 'clothing', attributes: { material: 'Linen' } },
  }));
  assert.equal(missing.response.status, 400);

  // With the required attribute present → 201, and it is persisted.
  const ok = await createProduct(ownerToken, store.id, baseProduct({
    name: 'Linen Shirt 2',
    details: { categoryKey: 'clothing', attributes: { gender: 'men', material: 'Linen' } },
  }));
  assert.equal(ok.response.status, 201);
  assert.equal(ok.body.product.details.categoryKey, 'clothing');
  assert.equal(ok.body.product.details.attributes.gender, 'men');
});

test('select attribute values must come from the schema options', async () => {
  const bad = await createProduct(ownerToken, store.id, baseProduct({
    name: 'Alien Shirt',
    details: { categoryKey: 'clothing', attributes: { gender: 'martian' } },
  }));
  assert.equal(bad.response.status, 400);

  // multi_select rejects out-of-vocabulary members too.
  const badMulti = await createProduct(ownerToken, store.id, baseProduct({
    name: 'Snack',
    category: 'Food',
    details: { categoryKey: 'food', attributes: { allergens: ['gluten', 'uranium'] } },
  }));
  assert.equal(badMulti.response.status, 400);
});

test('unknown categoryKey is rejected', async () => {
  const res = await createProduct(ownerToken, store.id, baseProduct({
    name: 'Mystery',
    details: { categoryKey: 'spaceships', attributes: {} },
  }));
  assert.equal(res.response.status, 400);
});

test('attributes outside the schema are normalized away', async () => {
  const res = await createProduct(ownerToken, store.id, baseProduct({
    name: 'Normalized Shelf',
    details: { categoryKey: 'home', attributes: { material: 'Oak', notARealField: 'junk' } },
  }));
  assert.equal(res.response.status, 201);
  assert.equal(res.body.product.details.attributes.material, 'Oak');
  assert.equal(res.body.product.details.attributes.notARealField, undefined);
});

test('variants persist and variant selections must match declared options', async () => {
  const options = [
    { id: 'opt-size', name: 'Size', sortOrder: 0, values: [{ id: 'v-s', value: 'S', sortOrder: 0 }, { id: 'v-m', value: 'M', sortOrder: 1 }] },
    { id: 'opt-color', name: 'Color', sortOrder: 1, values: [{ id: 'v-blk', value: 'Black', sortOrder: 0 }] },
  ];
  const goodVariants = [
    { id: 'var-1', title: 'S / Black', priceCents: 1500, stock: 4, isActive: true, selections: { Size: 'S', Color: 'Black' } },
    { id: 'var-2', title: 'M / Black', priceCents: 1700, stock: 2, isActive: true, selections: { Size: 'M', Color: 'Black' } },
  ];

  const ok = await createProduct(ownerToken, store.id, baseProduct({
    name: 'Tee',
    details: { categoryKey: 'clothing', sellingType: 'VARIABLE', attributes: { gender: 'unisex' }, options, variants: goodVariants },
  }));
  assert.equal(ok.response.status, 201);
  assert.equal(ok.body.product.details.variants.length, 2);
  assert.equal(ok.body.product.details.variants[0].selections.Size, 'S');

  // A variant whose selection value is not a declared option value → 400.
  const bad = await createProduct(ownerToken, store.id, baseProduct({
    name: 'Bad Tee',
    details: {
      categoryKey: 'clothing', sellingType: 'VARIABLE', attributes: { gender: 'unisex' }, options,
      variants: [{ id: 'var-x', title: 'XL / Black', priceCents: 1500, stock: 1, isActive: true, selections: { Size: 'XL', Color: 'Black' } }],
    },
  }));
  assert.equal(bad.response.status, 400);
});

test('money stays in non-negative integer minor units', async () => {
  // Negative base price rejected.
  const negative = await createProduct(ownerToken, store.id, baseProduct({ priceCents: -100 }));
  assert.equal(negative.response.status, 400);

  // Negative variant price rejected.
  const negativeVariant = await createProduct(ownerToken, store.id, baseProduct({
    name: 'Bad Price',
    details: {
      categoryKey: 'clothing', sellingType: 'VARIABLE', attributes: { gender: 'men' },
      options: [{ id: 'o', name: 'Size', values: [{ id: 'v', value: 'S' }] }],
      variants: [{ id: 'var', title: 'S', priceCents: -1, stock: 1, isActive: true, selections: { Size: 'S' } }],
    },
  }));
  assert.equal(negativeVariant.response.status, 400);

  // A valid integer minor-unit price is stored exactly (JOD fils).
  const ok = await createProduct(ownerToken, store.id, baseProduct({ priceCents: 12500 }));
  assert.equal(ok.response.status, 201);
  assert.equal(ok.body.product.priceCents, 12500);
  assert.equal(Number.isInteger(ok.body.product.priceCents), true);
});

test('a shop owner cannot create products in another store', async () => {
  // A second shop owned by a different owner. Reuses the shared platform token so we
  // don't trip the login limiter.
  const other = await newShop(platformToken, 'Owner B Cat', 'owner-b-cat@test.local');
  const forbidden = await createProduct(ownerToken, other.store.id, baseProduct({ name: 'Trespasser' }));
  assert.equal(forbidden.response.status, 403);
});

test('storefront serialization hides admin-only fields and cost prices', async () => {
  const created = await createProduct(ownerToken, store.id, baseProduct({
    name: 'Oak Shelf',
    details: {
      categoryKey: 'home',
      costPriceCents: 800,
      attributes: { material: 'Oak', supplierName: 'Acme Wholesale' },
    },
  }));
  assert.equal(created.response.status, 201);
  // Admin payload keeps the private data.
  assert.equal(created.body.product.details.costPriceCents, 800);
  assert.equal(created.body.product.details.attributes.supplierName, 'Acme Wholesale');

  // Public storefront payload strips both the cost price and the admin-only attribute,
  // while keeping customer-facing attributes.
  const publicResp = await request(`/public/stores/${store.slug}`);
  assert.equal(publicResp.response.status, 200);
  const publicProduct = publicResp.body.products.find((p: { name: string }) => p.name === 'Oak Shelf');
  assert.ok(publicProduct, 'product should be in the public payload');
  assert.equal(publicProduct.details.costPriceCents, undefined);
  assert.equal(publicProduct.details.attributes.supplierName, undefined);
  assert.equal(publicProduct.details.attributes.material, 'Oak');
});
