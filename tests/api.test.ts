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

// The login rate limiter allows 12/min per IP; tests share one process/IP, so the
// platform owner signs in once and every test reuses the token.
let cachedPlatformToken: string | undefined;
async function platformLogin() {
  cachedPlatformToken ??= await login('platform-admin', 'ChangeMe123!');
  return cachedPlatformToken;
}

// Owners now choose their own username + password when requesting the store, and
// sign in directly with them once approved (no one-time password, no forced change).
async function createAndApproveShop(
  platformToken: string,
  storeName: string,
  ownerEmail = 'same-owner@test.local',
  username = storeName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''),
  password = 'OwnerPass123',
  plan = 'STARTER',
) {
  const submitted = await request('/shop-requests', {
    method: 'POST',
    body: JSON.stringify({
      ownerName: 'Same Owner',
      ownerEmail,
      storeName,
      category: 'Home',
      tagline: 'Useful things',
      plan,
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
  const platformToken = await platformLogin();
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

// Regression: the Appearance form sends buttonStyle/headingFont/socials inside
// themeOverrides; the strict schema used to reject the whole PATCH, so logo
// changes silently never saved.
test('store appearance PATCH persists the logo alongside extended theme overrides', async () => {
  const platformToken = await platformLogin();
  const shop = await createAndApproveShop(platformToken, 'Logo Store', 'logo@test.local', 'logo-store');
  const ownerToken = await login(shop.chosenUsername, shop.chosenPassword);

  const logoUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUg==';
  const updated = await request(`/admin/stores/${shop.store.id}`, authed(ownerToken, {
    method: 'PATCH',
    body: JSON.stringify({
      name: 'Logo Store',
      tagline: 'Useful things',
      logoUrl,
      logoEmoji: null,
      themeOverrides: {
        bg: '#ffffff', surface: '#fafafa', text: '#111111', primary: '#222222',
        accent: '#333333', soft: '#444444', line: '#555555', radius: '12px',
        buttonStyle: 'pill', headingFont: 'Fraunces', instagram: 'logostore',
      },
      shipping: { type: 'FLAT', flatCents: 300 },
    }),
  }));
  assert.equal(updated.response.status, 200);
  assert.equal(updated.body.store.logoUrl, logoUrl);
  assert.equal(updated.body.store.logoEmoji, undefined);
  assert.equal(updated.body.store.themeOverrides.buttonStyle, 'pill');

  // Persisted, not just echoed.
  const fetched = await request(`/admin/stores/${shop.store.id}`, authed(ownerToken));
  assert.equal(fetched.body.store.logoUrl, logoUrl);

  // Switching back to an emoji clears the stored image.
  const toEmoji = await request(`/admin/stores/${shop.store.id}`, authed(ownerToken, {
    method: 'PATCH',
    body: JSON.stringify({ logoUrl: null, logoEmoji: '☕' }),
  }));
  assert.equal(toEmoji.response.status, 200);
  assert.equal(toEmoji.body.store.logoUrl, undefined);
  assert.equal(toEmoji.body.store.logoEmoji, '☕');
});

test('subscription lifecycle: trial on approval, manual payments, lazy PAST_DUE, product caps', async () => {
  const platformToken = await platformLogin();
  const shop = await createAndApproveShop(platformToken, 'Billing Shop', 'billing@test.local', 'billing-shop', 'OwnerPass123', 'GROWTH');
  const ownerToken = await login(shop.chosenUsername, shop.chosenPassword);

  // Requested plan carries over and the trial window is ~14 days.
  const fetched = await request(`/platform/stores/${shop.store.id}`, authed(platformToken));
  assert.equal(fetched.body.store.plan, 'GROWTH');
  assert.equal(fetched.body.store.planStatus, 'TRIAL');
  const trialEnd = fetched.body.store.planPaidUntil as number;
  assert.ok(trialEnd > Date.now() + 13 * 24 * 60 * 60 * 1000, 'trial ends at least 13 days out');
  assert.ok(trialEnd < Date.now() + 15 * 24 * 60 * 60 * 1000, 'trial ends at most 15 days out');

  // Plan changes are validated.
  const changed = await request(`/platform/stores/${shop.store.id}/plan`, authed(platformToken, { method: 'PATCH', body: JSON.stringify({ plan: 'STARTER' }) }));
  assert.equal(changed.response.status, 200);
  assert.equal(changed.body.store.plan, 'STARTER');
  const invalid = await request(`/platform/stores/${shop.store.id}/plan`, authed(platformToken, { method: 'PATCH', body: JSON.stringify({ plan: 'MEGA' }) }));
  assert.equal(invalid.response.status, 400);
  // Shop owners cannot reach platform billing routes.
  const forbiddenPlan = await request(`/platform/stores/${shop.store.id}/plan`, authed(ownerToken, { method: 'PATCH', body: JSON.stringify({ plan: 'SCALE' }) }));
  assert.equal(forbiddenPlan.response.status, 403);

  // Recording a payment activates and extends by one month; a second payment stacks.
  const paid = await request(`/platform/stores/${shop.store.id}/plan/record-payment`, authed(platformToken, { method: 'POST' }));
  assert.equal(paid.response.status, 200);
  assert.equal(paid.body.store.planStatus, 'ACTIVE');
  const firstPaidUntil = paid.body.store.planPaidUntil as number;
  assert.ok(firstPaidUntil > trialEnd, 'payment extends beyond the trial window');
  const paidAgain = await request(`/platform/stores/${shop.store.id}/plan/record-payment`, authed(platformToken, { method: 'POST' }));
  assert.ok((paidAgain.body.store.planPaidUntil as number) > firstPaidUntil, 'back-to-back payments stack');

  // PAST_DUE is derived on read — the stored status stays ACTIVE.
  await prisma.store.update({ where: { id: shop.store.id }, data: { planPaidUntil: new Date(Date.now() - 24 * 60 * 60 * 1000) } });
  const lapsed = await request(`/platform/stores/${shop.store.id}`, authed(platformToken));
  assert.equal(lapsed.body.store.planStatus, 'PAST_DUE');
  const storedStatus = await prisma.store.findUnique({ where: { id: shop.store.id }, select: { planStatus: true } });
  assert.equal(storedStatus?.planStatus, 'ACTIVE');
  // Paying a lapsed store restarts from today, not from the lapsed date.
  const revived = await request(`/platform/stores/${shop.store.id}/plan/record-payment`, authed(platformToken, { method: 'POST' }));
  assert.equal(revived.body.store.planStatus, 'ACTIVE');
  assert.ok((revived.body.store.planPaidUntil as number) > Date.now(), 'revived paid-until is in the future');

  // STARTER caps the catalog at 25 products; SCALE lifts the cap.
  await prisma.product.createMany({
    data: Array.from({ length: 25 }, (_, i) => ({
      storeId: shop.store.id,
      name: `Bulk ${i}`,
      priceCents: 100,
      stock: 1,
      collection: '',
      tags: '[]',
      details: '{}',
    })),
  });
  const overCap = await request(`/admin/stores/${shop.store.id}/products`, authed(ownerToken, {
    method: 'POST',
    body: JSON.stringify({ name: 'One too many', priceCents: 100, stock: 1, description: '', collection: '', isFeatured: false, isActive: true }),
  }));
  assert.equal(overCap.response.status, 403);
  assert.match(overCap.body.error.message, /Product limit reached/);
  await request(`/platform/stores/${shop.store.id}/plan`, authed(platformToken, { method: 'PATCH', body: JSON.stringify({ plan: 'SCALE' }) }));
  const afterUpgrade = await request(`/admin/stores/${shop.store.id}/products`, authed(ownerToken, {
    method: 'POST',
    body: JSON.stringify({ name: 'Fits now', priceCents: 100, stock: 1, description: '', collection: '', isFeatured: false, isActive: true }),
  }));
  assert.equal(afterUpgrade.response.status, 201);

  // Billing data never leaks into the public storefront payload.
  const publicStore = await request(`/public/stores/${shop.store.slug}`);
  assert.equal(publicStore.response.status, 200);
  assert.equal(publicStore.body.store.plan, undefined);
  assert.equal(publicStore.body.store.planStatus, undefined);
  assert.equal(publicStore.body.store.planPaidUntil, undefined);
});

test('shop owner can change the store address (slug) with guardrails', async () => {
  const platformToken = await platformLogin();
  const shop = await createAndApproveShop(platformToken, 'Sluggy Shop', 'sluggy@test.local', 'sluggy-shop');
  const other = await createAndApproveShop(platformToken, 'Other Sluggy', 'sluggy2@test.local', 'other-sluggy');
  const ownerToken = await login(shop.chosenUsername, shop.chosenPassword);

  const renamed = await request(`/admin/stores/${shop.store.id}`, authed(ownerToken, {
    method: 'PATCH',
    body: JSON.stringify({ slug: 'borz' }),
  }));
  assert.equal(renamed.response.status, 200);
  assert.equal(renamed.body.store.slug, 'borz');

  // The storefront is reachable at the new address; the old one is gone.
  assert.equal((await request('/public/stores/borz')).response.status, 200);
  assert.equal((await request(`/public/stores/${shop.store.slug}`)).response.status, 404);

  // Another store's address cannot be taken over.
  const dup = await request(`/admin/stores/${shop.store.id}`, authed(ownerToken, {
    method: 'PATCH',
    body: JSON.stringify({ slug: other.store.slug }),
  }));
  assert.equal(dup.response.status, 409);

  // Reserved subdomains and malformed slugs are rejected.
  for (const bad of ['www', 'admin', 'Bad Slug!', '-leading', 'a']) {
    const res = await request(`/admin/stores/${shop.store.id}`, authed(ownerToken, {
      method: 'PATCH',
      body: JSON.stringify({ slug: bad }),
    }));
    assert.equal(res.response.status, 400, `expected 400 for slug "${bad}"`);
  }

  // Re-saving the current slug is a no-op, not a conflict.
  const noop = await request(`/admin/stores/${shop.store.id}`, authed(ownerToken, {
    method: 'PATCH',
    body: JSON.stringify({ slug: 'borz' }),
  }));
  assert.equal(noop.response.status, 200);
});

test('platform owner can delete a store; shop owners cannot', async () => {
  const platformToken = await platformLogin();
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
  const platformToken = await platformLogin();
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

  // Customer email is required at checkout — order-lifecycle emails (confirmation,
  // approval with the invoice attached, fulfillment) are sent to it.
  const noEmail = await request(`/public/stores/${approved.store.slug}/orders`, {
    method: 'POST',
    body: JSON.stringify({
      customerName: 'No Email',
      items: [{ productId: createdProduct.body.product.id, quantity: 1 }],
    }),
  });
  assert.equal(noEmail.response.status, 400);
});
