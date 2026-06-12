import { Router } from 'express';
import bcrypt from 'bcrypt';
import { Prisma } from '@prisma/client';
import { prisma, withTransaction } from '../db.js';
import { audit, getSettings } from '../audit.js';
import { badRequest, conflict, notFound } from '../errors.js';
import { computeOrder } from '../commerce.js';
import { decrementVariantStock, productIsVariable, productPubliclyActive } from '../productDetails.js';
import { publicWriteRateLimiter } from '../security/rateLimit.js';
import { analyticsEventSchema, publicOrderSchema, shopRequestSchema } from '../validators.js';
import { asyncRoute, normalizeCode } from '../http.js';
import { notifyOrderPlaced } from '../services/notifications.js';
import {
  serializeAnalyticsEvent,
  serializeDiscount,
  serializeOrder,
  serializeProductForStorefront,
  serializePublicStore,
  serializeShopRequest,
} from '../serializers.js';

export const storefrontRouter = Router();

storefrontRouter.get('/public/stores', asyncRoute(async (req, res) => {
  const stores = await prisma.store.findMany({
    where: { status: 'ACTIVE' },
    orderBy: [{ isFeatured: 'desc' }, { createdAt: 'desc' }],
  });
  res.json({ stores: stores.map(serializePublicStore) });
}));

storefrontRouter.get('/public/stores/:slug', asyncRoute(async (req, res) => {
  const store = await prisma.store.findFirst({
    where: { slug: req.params.slug },
    include: {
      products: { where: { isActive: true }, orderBy: { createdAt: 'desc' } },
      discounts: { where: { active: true }, orderBy: { createdAt: 'desc' } },
    },
  });
  if (!store) throw notFound('Store not found.');
  const isActive = store.status === 'ACTIVE';
  res.json({
    store: serializePublicStore(store),
    products: isActive ? store.products.filter(productPubliclyActive).map(serializeProductForStorefront) : [],
    discounts: isActive ? store.discounts.map(serializeDiscount) : [],
  });
}));

storefrontRouter.get('/public/stores/:slug/products', asyncRoute(async (req, res) => {
  const store = await prisma.store.findFirst({ where: { slug: req.params.slug, status: 'ACTIVE' } });
  if (!store) throw notFound('Store not found.');
  const products = await prisma.product.findMany({ where: { storeId: store.id, isActive: true }, orderBy: { createdAt: 'desc' } });
  res.json({ products: products.filter(productPubliclyActive).map(serializeProductForStorefront) });
}));

storefrontRouter.post('/public/stores/:slug/analytics', publicWriteRateLimiter, asyncRoute(async (req, res) => {
  const input = analyticsEventSchema.parse(req.body);
  const store = await prisma.store.findFirst({ where: { slug: req.params.slug, status: 'ACTIVE' } });
  if (!store) throw notFound('Store not found.');
  if (input.productId) {
    const product = await prisma.product.findFirst({ where: { id: input.productId, storeId: store.id, isActive: true } });
    if (!product) throw badRequest('Product does not belong to this active storefront.');
  }
  const event = await prisma.analyticsEvent.create({
    data: {
      storeId: store.id,
      type: input.type,
      productId: input.productId,
      sessionId: input.sessionId,
      metadata: input.metadata ? JSON.stringify(input.metadata) : undefined,
    } satisfies Prisma.AnalyticsEventUncheckedCreateInput,
  });
  res.status(201).json({ event: serializeAnalyticsEvent(event) });
}));

storefrontRouter.post('/public/stores/:slug/orders', publicWriteRateLimiter, asyncRoute(async (req, res) => {
  const input = publicOrderSchema.parse(req.body);
  const headerKey = req.header('Idempotency-Key');
  const idempotencyKey = input.idempotencyKey ?? (headerKey && headerKey.length >= 8 ? headerKey : undefined);

  const store = await prisma.store.findFirst({ where: { slug: req.params.slug, status: 'ACTIVE' } });
  if (!store) throw notFound('Store not found.');

  // Idempotent replay: a retried POST with the same key returns the original order
  // and performs no side effects (no extra stock decrement / discount usage).
  if (idempotencyKey) {
    const existing = await prisma.order.findUnique({
      where: { storeId_idempotencyKey: { storeId: store.id, idempotencyKey } },
      include: { items: true },
    });
    if (existing) return res.status(200).json({ order: serializeOrder(existing), idempotent: true });
  }

  try {
    const order = await withTransaction(async (tx) => {
      const productIds = [...new Set(input.items.map((item) => item.productId))];
      const products = await tx.product.findMany({ where: { id: { in: productIds }, storeId: store.id, isActive: true } });
      const discountCode = normalizeCode(input.discountCode);
      const discount = discountCode
        ? await tx.discount.findUnique({ where: { storeId_code: { storeId: store.id, code: discountCode } } })
        : undefined;

      // Server-authoritative recompute (subtotal -> discount -> shipping -> total).
      const summary = computeOrder(store, products, input.items, discount ?? undefined);

      // Atomic conditional stock decrement: only succeeds if enough stock remains and
      // the product is still active. count === 0 means another order won the race.
      for (const line of input.items) {
        const product = products.find((item) => item.id === line.productId);
        if (!product) throw conflict('Insufficient stock for one or more items.');
        if (productIsVariable(product)) {
          if (!line.variantId) throw conflict('Choose an option before checkout.');
          let updatedDetails: string;
          try {
            updatedDetails = decrementVariantStock(product, line.variantId, line.quantity);
          } catch (error) {
            throw conflict(error instanceof Error ? error.message : 'Insufficient stock for one or more items.');
          }
          const updated = await tx.product.updateMany({
            where: { id: line.productId, storeId: store.id, isActive: true },
            data: { details: updatedDetails },
          });
          if (updated.count === 0) throw conflict('Insufficient stock for one or more items.');
        } else {
          const updated = await tx.product.updateMany({
            where: { id: line.productId, storeId: store.id, isActive: true, stock: { gte: line.quantity } },
            data: { stock: { decrement: line.quantity } },
          });
          if (updated.count === 0) throw conflict('Insufficient stock for one or more items.');
        }
      }

      // Atomic discount usage enforcement. Raw UPDATE compares usedCount < usageLimit
      // (a column-to-column check Prisma can't express) so a usage cap can't be
      // over-spent under concurrency. Expiry/minimum were validated during recompute.
      if (summary.discountCode) {
        const claimed = await tx.$executeRaw`
          UPDATE "Discount" SET "usedCount" = "usedCount" + 1
          WHERE "storeId" = ${store.id} AND "code" = ${summary.discountCode}
            AND "active" = TRUE AND ("usageLimit" IS NULL OR "usedCount" < "usageLimit")`;
        if (claimed === 0) throw conflict('This discount is no longer available.');
      }

      const created = await tx.order.create({
        data: {
          storeId: store.id,
          customerName: input.customerName,
          customerEmail: input.customerEmail,
          customerPhone: input.customerPhone,
          shippingAddress: input.shippingAddress,
          note: input.note,
          currency: summary.currency,
          subtotalCents: summary.subtotalCents,
          discountCents: summary.discountCents,
          shippingCents: summary.shippingCents,
          totalCents: summary.totalCents,
          paymentMethod: 'COD',
          discountCode: summary.discountCode,
          idempotencyKey,
          items: { create: summary.items },
        },
        include: { items: true },
      });
      await tx.analyticsEvent.create({ data: { storeId: store.id, type: 'order', orderId: created.id } });
      return created;
    });
    // Fire-and-forget: customer confirmation + owner alert never block the order.
    notifyOrderPlaced(store, order);
    res.status(201).json({ order: serializeOrder(order) });
  } catch (error) {
    // Concurrent request with the same idempotency key won the unique constraint —
    // return the order it created instead of surfacing the conflict.
    if (idempotencyKey && error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      const existing = await prisma.order.findUnique({
        where: { storeId_idempotencyKey: { storeId: store.id, idempotencyKey } },
        include: { items: true },
      });
      if (existing) return res.status(200).json({ order: serializeOrder(existing), idempotent: true });
    }
    throw error;
  }
}));

storefrontRouter.post('/shop-requests', publicWriteRateLimiter, asyncRoute(async (req, res) => {
  const { username, password, ...rest } = shopRequestSchema.parse(req.body);

  // Reject usernames already taken by a user or a still-open request, so the
  // requester's chosen username is very likely to survive to approval.
  const taken = (await prisma.user.findUnique({ where: { username } }))
    || (await prisma.shopRequest.findFirst({ where: { desiredUsername: username, status: { in: ['PENDING', 'IN_REVIEW'] } } }));
  if (taken) throw conflict('That username is taken. Please choose another.');

  const passwordHash = await bcrypt.hash(password, 12);
  const request = await prisma.shopRequest.create({
    data: { ...rest, desiredUsername: username, passwordHash },
  });
  await audit(null, 'Submitted website request', request.storeName, { targetType: 'ShopRequest', targetId: request.id, detail: request.ownerEmail });
  res.status(201).json({ request: serializeShopRequest(request) });
}));
