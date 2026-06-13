import test from 'node:test';
import assert from 'node:assert/strict';
import { setupTestApp, seedPlatformOwner } from './helpers.ts';

const { request, authed, prisma, teardown } = await setupTestApp('test-invoices.db');

async function login(username: string, password: string) {
  const { body } = await request('/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) });
  return body.token as string;
}
let ownerToken = '';
let store: { id: string; slug: string };
let productId = '';

test.before(async () => {
  await seedPlatformOwner(prisma);
  const platform = await login('platform-admin', 'ChangeMe123!');
  const submitted = await request('/shop-requests', {
    method: 'POST', body: JSON.stringify({ ownerName: 'O', ownerEmail: 'inv@test.local', storeName: 'Invoice Store', category: 'Home', tagline: 't', plan: 'STARTER', username: 'invoice-store', password: 'OwnerPass123' }),
  });
  const approved = await request(`/platform/shop-requests/${submitted.body.request.id}/approve`, authed(platform, { method: 'POST' }));
  store = approved.body.store;
  ownerToken = await login('invoice-store', 'OwnerPass123'); // self-service sign-in
  const product = await request(`/admin/stores/${store.id}/products`, authed(ownerToken, {
    method: 'POST', body: JSON.stringify({ name: 'Boxed Item', priceCents: 10_000, stock: 50, description: '', collection: '', isFeatured: false, isActive: true }),
  }));
  productId = product.body.product.id;
});

test.after(teardown);

async function placeAndApprove() {
  const placed = await request(`/public/stores/${store.slug}/orders`, {
    method: 'POST', body: JSON.stringify({ customerName: 'Buyer', customerEmail: 'buyer@example.com', customerPhone: '0791234567', items: [{ productId, quantity: 1 }] }),
  });
  assert.equal(placed.response.status, 201);
  const approved = await request(`/admin/stores/${store.id}/orders/${placed.body.order.id}/approve`, authed(ownerToken, { method: 'POST' }));
  assert.equal(approved.response.status, 200);
  return approved.body.order as { id: string; invoiceNumber?: string };
}

test('approving an order assigns a sequential invoice number', async () => {
  const first = await placeAndApprove();
  const second = await placeAndApprove();
  assert.ok(first.invoiceNumber, 'first order gets an invoice number on approval');
  assert.ok(second.invoiceNumber, 'second order gets an invoice number on approval');
  assert.notEqual(first.invoiceNumber, second.invoiceNumber);

  // Numbers are sequential per store: the trailing counters differ by one.
  const seqOf = (n: string) => Number(n.split('-').pop());
  assert.equal(seqOf(second.invoiceNumber!), seqOf(first.invoiceNumber!) + 1);
});

test('invoice JSON includes subtotal and totals', async () => {
  const order = await placeAndApprove();
  const { response, body } = await request(`/admin/stores/${store.id}/orders/${order.id}/invoice?format=json`, authed(ownerToken));
  assert.equal(response.status, 200);
  const inv = body.invoice;
  assert.equal(inv.number, order.invoiceNumber);
  assert.equal(inv.subtotalMinor, 10_000);
  assert.equal(inv.totalMinor, 10_000);
  assert.equal(inv.lines.length, 1);
});

test('invoice renders printable HTML (and Arabic RTL)', async () => {
  const order = await placeAndApprove();
  const en = await request(`/admin/stores/${store.id}/orders/${order.id}/invoice`, authed(ownerToken));
  assert.equal(en.response.status, 200);
  assert.match(en.response.headers.get('content-type') ?? '', /text\/html/);
  assert.match(en.body as string, /Invoice/);

  const ar = await request(`/admin/stores/${store.id}/orders/${order.id}/invoice?lang=ar`, authed(ownerToken));
  assert.match(ar.response.headers.get('content-type') ?? '', /text\/html/);
  assert.match(ar.body as string, /dir="rtl"/);
  assert.match(ar.body as string, /فاتورة/);
});

test('invoice is unavailable for a pending order', async () => {
  const placed = await request(`/public/stores/${store.slug}/orders`, {
    method: 'POST', body: JSON.stringify({ customerName: 'Pending', customerEmail: 'p@example.com', items: [{ productId, quantity: 1 }] }),
  });
  const res = await request(`/admin/stores/${store.id}/orders/${placed.body.order.id}/invoice?format=json`, authed(ownerToken));
  assert.equal(res.response.status, 400);
});
