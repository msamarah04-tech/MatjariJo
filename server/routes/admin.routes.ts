import { Router } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../db.js';
import { authenticate, blockIfMustChangePassword, requireStoreAccess } from '../auth.js';
import { auditSecurity } from '../audit.js';
import { conflict, forbidden, notFound } from '../errors.js';
import { PLAN_DEFS } from '../../shared/plans.js';
import type { StorePlan } from '../../shared/contract.js';
import { parseRange, storeInsights } from '../analytics.js';
import { asyncRoute, dateFromMs, shippingPatch } from '../http.js';
import { isPlatformOwner } from '../policies/roles.policy.js';
import { changeOrderStatus } from '../services/orders.js';
import { buildStoreDataExport } from '../services/dataPrivacy.js';
import { buildInvoiceModel, renderInvoiceHtml } from '../services/invoices.js';
import { notifyOrderApproved, notifyOrderFulfilled, notifyOrderRejected } from '../services/notifications.js';
import {
  adminStorePatchSchema,
  discountBaseSchema,
  discountIdParamSchema,
  discountPatchSchema,
  flagCreateSchema,
  orderIdParamSchema,
  productCreateSchema,
  productIdParamSchema,
  productPatchSchema,
  rejectSchema,
  supportTicketCreateSchema,
  ticketIdParamSchema,
  ticketReplySchema,
} from '../validators.js';
import {
  serializeDiscount,
  serializeOrder,
  serializeProduct,
  serializeProductFlag,
  serializeStore,
  serializeSupportTicket,
} from '../serializers.js';
import { normalizeProductDetails } from '../../shared/productCategorySchemas.js';

export const adminRouter = Router();

// Authenticated + password-rotated. Per-route requireStoreAccess enforces isolation.
adminRouter.use('/admin', authenticate, blockIfMustChangePassword);

adminRouter.get('/admin/stores', asyncRoute(async (req, res) => {
  const stores = await prisma.store.findMany({
    where: isPlatformOwner(req.user!) ? undefined : { ownerId: req.user!.id },
    orderBy: { createdAt: 'asc' },
  });
  res.json({ stores: (isPlatformOwner(req.user!) ? stores : stores.slice(0, 1)).map(serializeStore) });
}));

adminRouter.get('/admin/stores/:storeId', requireStoreAccess, asyncRoute(async (req, res) => {
  const store = await prisma.store.findUnique({ where: { id: req.params.storeId } });
  if (!store) throw notFound('Store not found.');
  res.json({ store: serializeStore(store) });
}));

adminRouter.patch('/admin/stores/:storeId', requireStoreAccess, asyncRoute(async (req, res) => {
  const input = adminStorePatchSchema.parse(req.body);
  const { shipping, themeOverrides, ...patch } = input;
  if (patch.slug) {
    const taken = await prisma.store.findUnique({ where: { slug: patch.slug }, select: { id: true } });
    if (taken && taken.id !== req.params.storeId) throw conflict('That store address is already taken.');
  }
  const store = await prisma.store.update({
    where: { id: req.params.storeId },
    data: {
      ...patch,
      themeOverrides: themeOverrides === undefined ? undefined : themeOverrides === null ? null : JSON.stringify(themeOverrides),
      ...shippingPatch(shipping),
    },
  });
  res.json({ store: serializeStore(store) });
}));

// Shop owners can export their own store's records (PDPL data-subject requests).
adminRouter.get('/admin/stores/:storeId/data-export', requireStoreAccess, asyncRoute(async (req, res) => {
  const data = await buildStoreDataExport(req.params.storeId);
  await auditSecurity(req.user!, 'Exported own store data', data.store.name, { targetType: 'Store', targetId: req.params.storeId, ip: req.ip });
  res.json(data);
}));

adminRouter.get('/admin/stores/:storeId/products', requireStoreAccess, asyncRoute(async (req, res) => {
  const products = await prisma.product.findMany({ where: { storeId: req.params.storeId }, orderBy: { createdAt: 'desc' } });
  res.json({ products: products.map(serializeProduct) });
}));

adminRouter.post('/admin/stores/:storeId/products', requireStoreAccess, asyncRoute(async (req, res) => {
  const input = productCreateSchema.parse(req.body);
  // Subscription plans cap the catalog size; this is the only plan-gated action.
  const store = await prisma.store.findUnique({ where: { id: req.params.storeId }, select: { plan: true } });
  // Fall back to STARTER for unknown plan values; null cap means unlimited (SCALE).
  const cap = (PLAN_DEFS[(store?.plan ?? 'STARTER') as StorePlan] ?? PLAN_DEFS.STARTER).maxProducts;
  if (cap !== null) {
    const count = await prisma.product.count({ where: { storeId: req.params.storeId } });
    if (count >= cap) {
      throw forbidden(`Product limit reached for the ${store?.plan ?? 'STARTER'} plan (${cap} products). Contact support to upgrade.`);
    }
  }
  const { tags, details, ...data } = input;
  const normalized = normalizeProductDetails(details.categoryKey, details);
  const product = await prisma.product.create({ data: { ...data, tags: JSON.stringify(tags), details: JSON.stringify(normalized), storeId: req.params.storeId } });
  res.status(201).json({ product: serializeProduct(product) });
}));

adminRouter.get('/admin/stores/:storeId/products/:productId', requireStoreAccess, asyncRoute(async (req, res) => {
  productIdParamSchema.parse(req.params);
  const product = await prisma.product.findFirst({ where: { id: req.params.productId, storeId: req.params.storeId } });
  if (!product) throw notFound('Product not found in this store.');
  res.json({ product: serializeProduct(product) });
}));

adminRouter.patch('/admin/stores/:storeId/products/:productId', requireStoreAccess, asyncRoute(async (req, res) => {
  const params = productIdParamSchema.parse(req.params);
  const input = productPatchSchema.parse(req.body);
  const product = await prisma.product.findFirst({ where: { id: params.productId, storeId: params.storeId } });
  if (!product) throw notFound('Product not found in this store.');
  const { tags, details, ...data } = input;
  const updated = await prisma.product.update({
    where: { id: product.id },
    data: {
      ...data,
      tags: tags === undefined ? undefined : JSON.stringify(tags),
      details: details === undefined ? undefined : JSON.stringify(normalizeProductDetails(details.categoryKey, details)),
    },
  });
  res.json({ product: serializeProduct(updated) });
}));

// Bulk product import — respects plan cap; processes rows one-by-one so partial success is possible.
adminRouter.post('/admin/stores/:storeId/products/bulk', requireStoreAccess, asyncRoute(async (req, res) => {
  const products: unknown[] = Array.isArray(req.body?.products) ? req.body.products : [];
  if (products.length === 0) return res.json({ imported: 0, skipped: 0, errors: [] });
  if (products.length > 500) throw forbidden('Maximum 500 products per import batch.');

  const store = await prisma.store.findUnique({ where: { id: req.params.storeId }, select: { plan: true } });
  const cap = (PLAN_DEFS[(store?.plan ?? 'STARTER') as StorePlan] ?? PLAN_DEFS.STARTER).maxProducts;

  let imported = 0;
  let skipped = 0;
  const errors: { row: number; message: string }[] = [];

  for (let i = 0; i < products.length; i++) {
    const rowNum = i + 3; // +3 because row 1=header, row 2=hint
    try {
      if (cap !== null) {
        const count = await prisma.product.count({ where: { storeId: req.params.storeId } });
        if (count >= cap) { skipped++; continue; }
      }
      const input = productCreateSchema.parse(products[i]);
      const { tags, details, ...data } = input;
      const normalized = normalizeProductDetails(details.categoryKey, details);
      await prisma.product.create({ data: { ...data, tags: JSON.stringify(tags), details: JSON.stringify(normalized), storeId: req.params.storeId } });
      imported++;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Invalid row';
      errors.push({ row: rowNum, message: msg.slice(0, 200) });
    }
  }

  res.status(201).json({ imported, skipped, errors });
}));

adminRouter.delete('/admin/stores/:storeId/products/:productId', requireStoreAccess, asyncRoute(async (req, res) => {
  const params = productIdParamSchema.parse(req.params);
  const product = await prisma.product.findFirst({ where: { id: params.productId, storeId: params.storeId } });
  if (!product) throw notFound('Product not found in this store.');
  await prisma.product.delete({ where: { id: product.id } });
  res.status(204).end();
}));

adminRouter.get('/admin/stores/:storeId/orders', requireStoreAccess, asyncRoute(async (req, res) => {
  const orders = await prisma.order.findMany({ where: { storeId: req.params.storeId }, include: { items: true }, orderBy: { createdAt: 'desc' } });
  res.json({ orders: orders.map(serializeOrder) });
}));

adminRouter.get('/admin/stores/:storeId/orders/:orderId', requireStoreAccess, asyncRoute(async (req, res) => {
  const params = orderIdParamSchema.parse(req.params);
  const order = await prisma.order.findFirst({ where: { id: params.orderId, storeId: params.storeId }, include: { items: true } });
  if (!order) throw notFound('Order not found in this store.');
  res.json({ order: serializeOrder(order) });
}));

// Internal GST tax invoice. ?format=json returns the model; otherwise printable HTML.
// ?lang=ar renders the Arabic RTL invoice.
adminRouter.get('/admin/stores/:storeId/orders/:orderId/invoice', requireStoreAccess, asyncRoute(async (req, res) => {
  const params = orderIdParamSchema.parse(req.params);
  const order = await prisma.order.findFirst({ where: { id: params.orderId, storeId: params.storeId }, select: { id: true } });
  if (!order) throw notFound('Order not found in this store.');
  const model = await buildInvoiceModel(order.id);
  if (req.query.format === 'json') return res.json({ invoice: model });
  const lang = req.query.lang === 'ar' ? 'ar' : 'en';
  res.type('html').send(renderInvoiceHtml(model, lang));
}));

adminRouter.post('/admin/stores/:storeId/orders/:orderId/approve', requireStoreAccess, asyncRoute(async (req, res) => {
  const order = await changeOrderStatus(req.user!, req.params.orderId, 'APPROVED', undefined, req.params.storeId);
  const store = await prisma.store.findUnique({ where: { id: req.params.storeId } });
  // Fire-and-forget: the customer gets the approval email with the bill attached (EN + AR).
  if (store) notifyOrderApproved(store, order);
  res.json({ order: serializeOrder(order) });
}));
adminRouter.post('/admin/stores/:storeId/orders/:orderId/reject', requireStoreAccess, asyncRoute(async (req, res) => {
  const input = rejectSchema.parse(req.body);
  const order = await changeOrderStatus(req.user!, req.params.orderId, 'REJECTED', input.reason, req.params.storeId);
  const store = await prisma.store.findUnique({ where: { id: req.params.storeId } });
  if (store) notifyOrderRejected(store, order);
  res.json({ order: serializeOrder(order) });
}));
adminRouter.post('/admin/stores/:storeId/orders/:orderId/fulfill', requireStoreAccess, asyncRoute(async (req, res) => {
  const order = await changeOrderStatus(req.user!, req.params.orderId, 'FULFILLED', undefined, req.params.storeId);
  const store = await prisma.store.findUnique({ where: { id: req.params.storeId } });
  if (store) notifyOrderFulfilled(store, order);
  res.json({ order: serializeOrder(order) });
}));

adminRouter.get('/admin/stores/:storeId/discounts', requireStoreAccess, asyncRoute(async (req, res) => {
  const discounts = await prisma.discount.findMany({ where: { storeId: req.params.storeId }, orderBy: { createdAt: 'desc' } });
  res.json({ discounts: discounts.map(serializeDiscount) });
}));

adminRouter.post('/admin/stores/:storeId/discounts', requireStoreAccess, asyncRoute(async (req, res) => {
  const input = discountBaseSchema.parse(req.body);
  const discount = await prisma.discount.create({
    data: {
      storeId: req.params.storeId,
      name: input.name ?? null,
      imageUrl: input.imageUrl ?? null,
      details: input.details ?? null,
      code: input.code,
      type: input.type,
      value: input.value,
      minSubtotalCents: input.minSubtotalCents ?? null,
      usageLimit: input.usageLimit ?? null,
      active: input.active,
      expiresAt: dateFromMs(input.expiresAt),
    } satisfies Prisma.DiscountUncheckedCreateInput,
  }).catch((error: unknown) => {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') throw conflict('Discount code already exists for this store.');
    throw error;
  });
  res.status(201).json({ discount: serializeDiscount(discount) });
}));

adminRouter.get('/admin/stores/:storeId/discounts/:discountId', requireStoreAccess, asyncRoute(async (req, res) => {
  const params = discountIdParamSchema.parse(req.params);
  const discount = await prisma.discount.findFirst({ where: { id: params.discountId, storeId: params.storeId } });
  if (!discount) throw notFound('Discount not found in this store.');
  res.json({ discount: serializeDiscount(discount) });
}));

adminRouter.patch('/admin/stores/:storeId/discounts/:discountId', requireStoreAccess, asyncRoute(async (req, res) => {
  const params = discountIdParamSchema.parse(req.params);
  const input = discountPatchSchema.parse(req.body);
  const discount = await prisma.discount.findFirst({ where: { id: params.discountId, storeId: params.storeId } });
  if (!discount) throw notFound('Discount not found in this store.');
  const validated = discountBaseSchema.parse({
    name: input.name === undefined ? discount.name : input.name,
    imageUrl: input.imageUrl === undefined ? discount.imageUrl : input.imageUrl,
    details: input.details === undefined ? discount.details : input.details,
    code: input.code ?? discount.code,
    type: input.type ?? discount.type,
    value: input.value ?? discount.value,
    minSubtotalCents: input.minSubtotalCents === undefined ? discount.minSubtotalCents : input.minSubtotalCents,
    usageLimit: input.usageLimit === undefined ? discount.usageLimit : input.usageLimit,
    active: input.active ?? discount.active,
    expiresAt: input.expiresAt === undefined ? discount.expiresAt?.getTime() : input.expiresAt,
  });
  const updated = await prisma.discount.update({
    where: { id: discount.id },
    data: {
      name: validated.name ?? null,
      imageUrl: validated.imageUrl ?? null,
      details: validated.details ?? null,
      code: validated.code,
      type: validated.type,
      value: validated.value,
      minSubtotalCents: validated.minSubtotalCents ?? null,
      usageLimit: validated.usageLimit ?? null,
      active: validated.active,
      expiresAt: validated.expiresAt === undefined ? null : dateFromMs(validated.expiresAt) ?? null,
    },
  }).catch((error: unknown) => {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') throw conflict('Discount code already exists for this store.');
    throw error;
  });
  res.json({ discount: serializeDiscount(updated) });
}));

adminRouter.delete('/admin/stores/:storeId/discounts/:discountId', requireStoreAccess, asyncRoute(async (req, res) => {
  const params = discountIdParamSchema.parse(req.params);
  const discount = await prisma.discount.findFirst({ where: { id: params.discountId, storeId: params.storeId } });
  if (!discount) throw notFound('Discount not found in this store.');
  await prisma.discount.delete({ where: { id: discount.id } });
  res.status(204).end();
}));

adminRouter.get('/admin/stores/:storeId/analytics', requireStoreAccess, asyncRoute(async (req, res) => {
  const range = parseRange(String(req.query.range ?? '30'));
  const [store, products, orders, events, discounts] = await Promise.all([
    prisma.store.findUnique({ where: { id: req.params.storeId } }),
    prisma.product.findMany({ where: { storeId: req.params.storeId } }),
    prisma.order.findMany({ where: { storeId: req.params.storeId }, include: { items: true } }),
    prisma.analyticsEvent.findMany({ where: { storeId: req.params.storeId } }),
    prisma.discount.findMany({ where: { storeId: req.params.storeId } }),
  ]);
  if (!store) throw notFound('Store not found.');
  res.json(storeInsights(range, store, orders, products, events, discounts));
}));

adminRouter.get('/admin/stores/:storeId/support/tickets', requireStoreAccess, asyncRoute(async (req, res) => {
  const tickets = await prisma.supportTicket.findMany({ where: { storeId: req.params.storeId }, include: { messages: { orderBy: { createdAt: 'asc' } } }, orderBy: { createdAt: 'desc' } });
  res.json({ supportTickets: tickets.map(serializeSupportTicket) });
}));

adminRouter.post('/admin/stores/:storeId/support/tickets', requireStoreAccess, asyncRoute(async (req, res) => {
  const input = supportTicketCreateSchema.parse(req.body);
  const ticket = await prisma.supportTicket.create({
    data: {
      ...input,
      storeId: req.params.storeId,
      createdById: req.user!.id,
      messages: { create: { from: 'OWNER', body: input.message, authorId: req.user!.id } },
    },
    include: { messages: true },
  });
  res.status(201).json({ ticket: serializeSupportTicket(ticket) });
}));

adminRouter.get('/admin/stores/:storeId/support/tickets/:ticketId', requireStoreAccess, asyncRoute(async (req, res) => {
  const params = ticketIdParamSchema.parse(req.params);
  const ticket = await prisma.supportTicket.findFirst({ where: { id: params.ticketId, storeId: params.storeId }, include: { messages: { orderBy: { createdAt: 'asc' } } } });
  if (!ticket) throw notFound('Ticket not found in this store.');
  res.json({ ticket: serializeSupportTicket(ticket) });
}));

adminRouter.post('/admin/stores/:storeId/support/tickets/:ticketId/reply', requireStoreAccess, asyncRoute(async (req, res) => {
  const params = ticketIdParamSchema.parse(req.params);
  const input = ticketReplySchema.parse(req.body);
  const existing = await prisma.supportTicket.findFirst({ where: { id: params.ticketId, storeId: params.storeId } });
  if (!existing) throw notFound('Ticket not found in this store.');
  const ticket = await prisma.supportTicket.update({
    where: { id: existing.id },
    data: { messages: { create: { from: 'OWNER', body: input.body, authorId: req.user!.id } } },
    include: { messages: { orderBy: { createdAt: 'asc' } } },
  });
  res.json({ ticket: serializeSupportTicket(ticket) });
}));

adminRouter.post('/admin/stores/:storeId/products/:productId/flags', requireStoreAccess, asyncRoute(async (req, res) => {
  const params = productIdParamSchema.parse(req.params);
  const input = flagCreateSchema.parse(req.body);
  const product = await prisma.product.findFirst({ where: { id: params.productId, storeId: params.storeId } });
  if (!product) throw notFound('Product not found in this store.');
  const flag = await prisma.productFlag.create({ data: { ...input, productId: product.id, storeId: params.storeId } });
  res.status(201).json({ flag: serializeProductFlag(flag) });
}));
