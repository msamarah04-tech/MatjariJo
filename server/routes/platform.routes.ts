import { Router } from 'express';
import bcrypt from 'bcrypt';
import { Prisma } from '@prisma/client';
import { prisma, withTransaction } from '../db.js';
import { authenticate, blockIfMustChangePassword, requireRole } from '../auth.js';
import { audit, auditSecurity, getSettings } from '../audit.js';
import { badRequest, notFound } from '../errors.js';
import { parseRange, platformInsights } from '../analytics.js';
import { asyncRoute } from '../http.js';
import {
  adminEmailForShop,
  shopPassword,
  uniqueEmail,
  uniqueSlug,
  uniqueUsername,
  usernameFromShopSlug,
} from '../services/onboarding.js';
import { buildStoreDataExport, eraseStoreCustomerData } from '../services/dataPrivacy.js';
import { notifyAnnouncement, notifyDirectMessage, notifyPlanPayment, notifyShopApproved } from '../services/notifications.js';
import {
  announcementSchema,
  directMessageSchema,
  ownerStatusSchema,
  platformSettingsPatchSchema,
  platformStorePatchSchema,
  rejectSchema,
  storePlanSchema,
  ticketReplySchema,
  ticketStatusSchema,
} from '../validators.js';
import { TRIAL_DAYS, addOneMonth } from '../../shared/plans.js';
import {
  serializeAuditLog,
  serializeOrder,
  serializePlatformSettings,
  serializeProduct,
  serializeProductFlag,
  serializeShopRequest,
  serializeStore,
  serializeSupportTicket,
  serializeUser,
} from '../serializers.js';

export const platformRouter = Router();

// Every /platform route requires an authenticated, password-rotated platform owner.
platformRouter.use('/platform', authenticate, blockIfMustChangePassword, requireRole('PLATFORM_OWNER'));

platformRouter.get('/platform/overview', asyncRoute(async (_req, res) => {
  const [stores, orders, events, settings, requests, tickets, flags, auditLogs] = await Promise.all([
    prisma.store.findMany(),
    prisma.order.findMany(),
    prisma.analyticsEvent.findMany(),
    getSettings(),
    prisma.shopRequest.count({ where: { status: { in: ['PENDING', 'IN_REVIEW'] } } }),
    prisma.supportTicket.count({ where: { status: { in: ['OPEN', 'IN_PROGRESS'] } } }),
    prisma.productFlag.count({ where: { status: 'OPEN' } }),
    prisma.auditLog.findMany({ orderBy: { createdAt: 'desc' }, take: 12 }),
  ]);
  const insights = platformInsights(30, stores, orders, events);
  res.json({
    ...insights,
    kpis: { ...insights.kpis, pendingShopRequests: requests, openTickets: tickets, openFlags: flags },
    recentActivity: auditLogs.map(serializeAuditLog),
  });
}));

platformRouter.get('/platform/shop-requests', asyncRoute(async (_req, res) => {
  const requests = await prisma.shopRequest.findMany({ orderBy: { createdAt: 'desc' } });
  res.json({ shopRequests: requests.map(serializeShopRequest) });
}));

platformRouter.post('/platform/shop-requests/:id/approve', asyncRoute(async (req, res) => {
  const request = await prisma.shopRequest.findUnique({ where: { id: req.params.id } });
  if (!request) throw notFound('Shop request not found.');
  if (request.status === 'APPROVED') throw badRequest('Shop request is already approved.');
  const slug = await uniqueSlug(request.storeName);
  const adminEmail = await uniqueEmail(adminEmailForShop(request.ownerEmail, slug));

  // Self-service: the requester chose their own username + password. Reuse them so
  // the owner can sign in directly. Legacy requests (no stored credentials) fall back
  // to a generated one-time password the platform owner relays.
  const selfService = !!request.passwordHash && !!request.desiredUsername;
  const username = await uniqueUsername(selfService ? request.desiredUsername! : usernameFromShopSlug(slug));
  let passwordHash: string;
  let tempPassword: string | undefined;
  if (selfService) {
    passwordHash = request.passwordHash!;
  } else {
    tempPassword = shopPassword(slug);
    passwordHash = await bcrypt.hash(tempPassword, 12);
  }

  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email: adminEmail,
        username,
        name: request.ownerName,
        role: 'SHOP_OWNER',
        passwordHash,
        ownerStatus: 'ACTIVE',
        // Self-service owners already know their password; only generated ones must rotate.
        mustChangePassword: !selfService,
        passwordChangedAt: selfService ? new Date() : null,
      },
    });
    const store = await tx.store.create({
      data: {
        ownerId: user.id,
        slug,
        name: request.storeName,
        tagline: request.tagline,
        category: request.category,
        logoEmoji: '🛍️',
        status: 'ACTIVE',
        reviewStatus: 'APPROVED',
        // Subscription: requested tier (default STARTER) with a free trial window.
        plan: request.plan ?? 'STARTER',
        planStatus: 'TRIAL',
        planPaidUntil: new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000),
      },
    });
    const updatedRequest = await tx.shopRequest.update({
      where: { id: request.id },
      // Clear the stored hash once it's been transferred to the user account.
      data: { status: 'APPROVED', storeId: store.id, reviewedAt: new Date(), passwordHash: null },
    });
    return { user, store, request: updatedRequest };
  });
  await auditSecurity(req.user!, selfService ? 'Approved website request (owner self-set credentials)' : 'Approved website request and issued shop-owner credentials', result.store.name, { targetType: 'ShopRequest', targetId: request.id, ip: req.ip });
  notifyShopApproved(result.store, result.user);
  res.status(201).json({
    request: serializeShopRequest(result.request),
    store: serializeStore(result.store),
    owner: serializeUser(result.user),
    selfService,
    ...(tempPassword ? { temporaryPassword: tempPassword } : {}),
    credentials: {
      email: result.user.email,
      username: result.user.username,
      // Only present for the generated (legacy) path; self-service owners use their own password.
      ...(tempPassword ? { password: tempPassword } : {}),
    },
  });
}));

platformRouter.post('/platform/shop-requests/:id/reject', asyncRoute(async (req, res) => {
  const input = rejectSchema.parse(req.body);
  const request = await prisma.shopRequest.update({
    where: { id: req.params.id },
    data: { status: 'REJECTED', rejectionReason: input.reason, reviewedAt: new Date() },
  });
  await audit(req.user!, 'Rejected website request', request.storeName, { targetType: 'ShopRequest', targetId: request.id, detail: input.reason });
  res.json({ request: serializeShopRequest(request) });
}));

platformRouter.get('/platform/stores', asyncRoute(async (_req, res) => {
  const stores = await prisma.store.findMany({ orderBy: { createdAt: 'desc' } });
  res.json({ stores: stores.map(serializeStore) });
}));

platformRouter.get('/platform/stores/:storeId', asyncRoute(async (req, res) => {
  const store = await prisma.store.findUnique({ where: { id: req.params.storeId } });
  if (!store) throw notFound('Store not found.');
  res.json({ store: serializeStore(store) });
}));

platformRouter.patch('/platform/stores/:storeId', asyncRoute(async (req, res) => {
  const input = platformStorePatchSchema.parse(req.body);
  const store = await prisma.store.update({ where: { id: req.params.storeId }, data: input });
  await audit(req.user!, 'Updated platform store controls', store.name, { targetType: 'Store', targetId: store.id, detail: input });
  res.json({ store: serializeStore(store) });
}));

platformRouter.post('/platform/stores/:storeId/suspend', asyncRoute(async (req, res) => {
  const input = rejectSchema.parse(req.body);
  const store = await prisma.store.update({ where: { id: req.params.storeId }, data: { status: 'SUSPENDED', suspensionReason: input.reason } });
  await audit(req.user!, 'Suspended store', store.name, { targetType: 'Store', targetId: store.id, detail: input.reason });
  res.json({ store: serializeStore(store) });
}));

platformRouter.post('/platform/stores/:storeId/reactivate', asyncRoute(async (req, res) => {
  const store = await prisma.store.update({ where: { id: req.params.storeId }, data: { status: 'ACTIVE', suspensionReason: '' } });
  await audit(req.user!, 'Reactivated store', store.name, { targetType: 'Store', targetId: store.id });
  res.json({ store: serializeStore(store) });
}));

platformRouter.post('/platform/stores/:storeId/feature', asyncRoute(async (req, res) => {
  const store = await prisma.store.update({ where: { id: req.params.storeId }, data: { isFeatured: true } });
  await audit(req.user!, 'Featured store', store.name, { targetType: 'Store', targetId: store.id });
  res.json({ store: serializeStore(store) });
}));

platformRouter.post('/platform/stores/:storeId/unfeature', asyncRoute(async (req, res) => {
  const store = await prisma.store.update({ where: { id: req.params.storeId }, data: { isFeatured: false } });
  await audit(req.user!, 'Unfeatured store', store.name, { targetType: 'Store', targetId: store.id });
  res.json({ store: serializeStore(store) });
}));


platformRouter.patch('/platform/stores/:storeId/plan', asyncRoute(async (req, res) => {
  const input = storePlanSchema.parse(req.body);
  const store = await prisma.store.update({ where: { id: req.params.storeId }, data: { plan: input.plan } });
  await audit(req.user!, `Changed subscription plan to ${input.plan}`, store.name, { targetType: 'Store', targetId: store.id, detail: input });
  res.json({ store: serializeStore(store) });
}));

// Manual billing: the platform owner records an off-platform payment (CliQ/bank
// transfer) which activates the store and extends paid-until by one month.
// Extending from max(now, paidUntil) lets back-to-back payments stack months
// while a PAST_DUE store restarts from today rather than its lapsed date.
platformRouter.post('/platform/stores/:storeId/plan/record-payment', asyncRoute(async (req, res) => {
  const existing = await prisma.store.findUnique({ where: { id: req.params.storeId } });
  if (!existing) throw notFound('Store not found.');
  const now = new Date();
  const base = existing.planPaidUntil && existing.planPaidUntil > now ? existing.planPaidUntil : now;
  const store = await prisma.store.update({
    where: { id: existing.id },
    data: { planStatus: 'ACTIVE', planPaidUntil: addOneMonth(base) },
  });
  await auditSecurity(req.user!, `Recorded subscription payment (${store.plan})`, store.name, { targetType: 'Store', targetId: store.id, ip: req.ip });
  notifyPlanPayment(store);
  res.json({ store: serializeStore(store) });
}));

platformRouter.patch('/platform/stores/:storeId/owner-status', asyncRoute(async (req, res) => {
  const input = ownerStatusSchema.parse(req.body);
  const store = await prisma.store.findUnique({ where: { id: req.params.storeId } });
  if (!store) throw notFound('Store not found.');
  // Banning or restricting an owner revokes their active sessions immediately.
  const revoke = input.ownerStatus !== 'ACTIVE';
  const owner = await prisma.user.update({
    where: { id: store.ownerId },
    data: { ownerStatus: input.ownerStatus, ...(revoke ? { tokenVersion: { increment: 1 } } : {}) },
  });
  await auditSecurity(req.user!, `Set owner status to ${input.ownerStatus}`, owner.email, { targetType: 'User', targetId: owner.id, ip: req.ip });
  res.json({ owner: serializeUser(owner) });
}));

platformRouter.post('/platform/stores/:storeId/reset-owner-password', asyncRoute(async (req, res) => {
  const store = await prisma.store.findUnique({ where: { id: req.params.storeId }, include: { owner: true } });
  if (!store) throw notFound('Store not found.');
  const password = shopPassword(store.slug);
  const passwordHash = await bcrypt.hash(password, 12);
  // Reset forces a first-login change and revokes the owner's existing sessions
  // (tokenVersion bump) so any old/leaked token stops working immediately.
  const owner = await prisma.user.update({
    where: { id: store.ownerId },
    data: { passwordHash, ownerStatus: 'ACTIVE', mustChangePassword: true, tokenVersion: { increment: 1 }, failedLoginCount: 0, lockedUntil: null },
  });
  await auditSecurity(req.user!, 'Reset shop owner password (one-time)', store.name, { targetType: 'User', targetId: owner.id, detail: { storeId: store.id }, ip: req.ip });
  res.json({
    owner: serializeUser(owner),
    credentials: { email: owner.email, username: owner.username, password },
  });
}));

// Permanently delete a store and all its data (products, orders, discounts, tickets,
// flags, analytics cascade via FKs). Also removes the orphaned shop-owner account if
// it no longer owns any store. Destructive + security-audited.
platformRouter.delete('/platform/stores/:storeId', asyncRoute(async (req, res) => {
  const store = await prisma.store.findUnique({ where: { id: req.params.storeId }, include: { owner: true } });
  if (!store) throw notFound('Store not found.');
  const owner = store.owner;

  await withTransaction(async (tx) => {
    await tx.store.delete({ where: { id: store.id } });
    if (owner.role === 'SHOP_OWNER') {
      const remaining = await tx.store.count({ where: { ownerId: owner.id } });
      if (remaining === 0) await tx.user.delete({ where: { id: owner.id } });
    }
  });

  await auditSecurity(req.user!, 'Deleted store', store.name, {
    targetType: 'Store',
    targetId: store.id,
    detail: { slug: store.slug, ownerEmail: owner.email },
    ip: req.ip,
  });
  res.status(204).end();
}));

// PDPL data hygiene: export and erase a store's customer/owner records. Both are
// security-audited (access to sensitive data is logged).
platformRouter.get('/platform/stores/:storeId/data-export', asyncRoute(async (req, res) => {
  const data = await buildStoreDataExport(req.params.storeId);
  await auditSecurity(req.user!, 'Exported store customer/owner data', data.store.name, { targetType: 'Store', targetId: req.params.storeId, ip: req.ip });
  res.json(data);
}));

platformRouter.post('/platform/stores/:storeId/erase-customer-data', asyncRoute(async (req, res) => {
  const store = await prisma.store.findUnique({ where: { id: req.params.storeId } });
  if (!store) throw notFound('Store not found.');
  const result = await eraseStoreCustomerData(req.params.storeId);
  await auditSecurity(req.user!, 'Erased store customer PII', store.name, { targetType: 'Store', targetId: store.id, detail: result, ip: req.ip });
  res.json(result);
}));

platformRouter.get('/platform/orders', asyncRoute(async (_req, res) => {
  const orders = await prisma.order.findMany({ include: { items: true }, orderBy: { createdAt: 'desc' } });
  res.json({ orders: orders.map(serializeOrder) });
}));

// NOTE: order lifecycle transitions (approve/reject/fulfill) have a single authority —
// the store-scoped endpoints under /admin/stores/:storeId/orders. Platform owners act
// through those via their oversight store access. The platform keeps read-only orders.

platformRouter.get('/platform/moderation/flags', asyncRoute(async (_req, res) => {
  const flags = await prisma.productFlag.findMany({ orderBy: { createdAt: 'desc' } });
  res.json({ productFlags: flags.map(serializeProductFlag) });
}));

platformRouter.post('/platform/moderation/flags/:flagId/dismiss', asyncRoute(async (req, res) => {
  const flag = await prisma.productFlag.update({ where: { id: req.params.flagId }, data: { status: 'DISMISSED' } });
  await audit(req.user!, 'Dismissed product flag', flag.productId, { targetType: 'ProductFlag', targetId: flag.id });
  res.json({ flag: serializeProductFlag(flag) });
}));

platformRouter.post('/platform/moderation/flags/:flagId/action', asyncRoute(async (req, res) => {
  const flag = await prisma.productFlag.update({ where: { id: req.params.flagId }, data: { status: 'ACTIONED' } });
  await audit(req.user!, 'Actioned product flag', flag.productId, { targetType: 'ProductFlag', targetId: flag.id });
  res.json({ flag: serializeProductFlag(flag) });
}));

platformRouter.post('/platform/moderation/flags/:flagId/unpublish-product', asyncRoute(async (req, res) => {
  const flag = await prisma.productFlag.findUnique({ where: { id: req.params.flagId } });
  if (!flag) throw notFound('Flag not found.');
  const product = await prisma.product.update({ where: { id: flag.productId }, data: { isActive: false } });
  await prisma.productFlag.update({ where: { id: flag.id }, data: { status: 'ACTIONED' } });
  await audit(req.user!, 'Unpublished product from moderation', product.name, { targetType: 'Product', targetId: product.id });
  res.json({ product: serializeProduct(product) });
}));

platformRouter.get('/platform/support/tickets', asyncRoute(async (_req, res) => {
  const tickets = await prisma.supportTicket.findMany({ include: { messages: { orderBy: { createdAt: 'asc' } } }, orderBy: { createdAt: 'desc' } });
  res.json({ supportTickets: tickets.map(serializeSupportTicket) });
}));

platformRouter.get('/platform/support/tickets/:ticketId', asyncRoute(async (req, res) => {
  const ticket = await prisma.supportTicket.findUnique({ where: { id: req.params.ticketId }, include: { messages: { orderBy: { createdAt: 'asc' } } } });
  if (!ticket) throw notFound('Ticket not found.');
  res.json({ ticket: serializeSupportTicket(ticket) });
}));

platformRouter.post('/platform/support/tickets/:ticketId/reply', asyncRoute(async (req, res) => {
  const input = ticketReplySchema.parse(req.body);
  const ticket = await prisma.supportTicket.update({
    where: { id: req.params.ticketId },
    data: {
      status: 'IN_PROGRESS',
      messages: { create: { from: 'PLATFORM', body: input.body, authorId: req.user!.id } },
    },
    include: { messages: { orderBy: { createdAt: 'asc' } } },
  });
  await audit(req.user!, 'Replied to support ticket', ticket.subject, { targetType: 'SupportTicket', targetId: ticket.id });
  res.json({ ticket: serializeSupportTicket(ticket) });
}));

platformRouter.patch('/platform/support/tickets/:ticketId/status', asyncRoute(async (req, res) => {
  const input = ticketStatusSchema.parse(req.body);
  const ticket = await prisma.supportTicket.update({ where: { id: req.params.ticketId }, data: { status: input.status }, include: { messages: true } });
  await audit(req.user!, `Set ticket status to ${input.status}`, ticket.subject, { targetType: 'SupportTicket', targetId: ticket.id });
  res.json({ ticket: serializeSupportTicket(ticket) });
}));

platformRouter.patch('/platform/support/tickets/:ticketId/assign-to-me', asyncRoute(async (req, res) => {
  const ticket = await prisma.supportTicket.update({ where: { id: req.params.ticketId }, data: { assignedToId: req.user!.id }, include: { messages: true } });
  await audit(req.user!, 'Assigned support ticket', ticket.subject, { targetType: 'SupportTicket', targetId: ticket.id });
  res.json({ ticket: serializeSupportTicket(ticket) });
}));

// Resolve ticket with optional reply email to the shop owner.
platformRouter.patch('/platform/support/tickets/:ticketId/resolve', asyncRoute(async (req, res) => {
  const replyBody: string | undefined = req.body?.replyBody?.trim() || undefined;
  const ticket = await prisma.supportTicket.update({
    where: { id: req.params.ticketId },
    data: {
      status: 'RESOLVED',
      ...(replyBody ? { messages: { create: { from: 'PLATFORM', body: replyBody, authorId: req.user!.id } } } : {}),
    },
    include: { messages: { orderBy: { createdAt: 'asc' } }, store: { include: { owner: { select: { email: true, name: true } } } } },
  });
  if (replyBody && ticket.store?.owner?.email) {
    notifyDirectMessage(
      `Re: ${ticket.subject}`,
      replyBody,
      { email: ticket.store.owner.email, name: ticket.store.owner.name },
      ticket.store.name,
    );
  }
  await audit(req.user!, 'Resolved support ticket', ticket.subject, {
    targetType: 'SupportTicket',
    targetId: ticket.id,
    detail: replyBody ? 'with reply' : 'no reply sent',
  });
  res.json({ ticket: serializeSupportTicket(ticket) });
}));

// Revenue summary: MRR, plan status counts, upcoming renewals, overdue stores.
platformRouter.get('/platform/revenue', asyncRoute(async (_req, res) => {
  const now = new Date();
  const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const stores = await prisma.store.findMany({
    include: { owner: { select: { email: true, name: true } } },
    orderBy: { planPaidUntil: 'asc' },
  });

  const { PLAN_DEFS, derivePlanStatus } = await import('../../shared/plans.js');

  let mrrJod = 0;
  const counts = { TRIAL: 0, ACTIVE: 0, PAST_DUE: 0, SUSPENDED: 0 };
  const upcomingRenewals: unknown[] = [];
  const overdueStores: unknown[] = [];

  for (const store of stores) {
    if (store.status === 'SUSPENDED') { counts.SUSPENDED += 1; continue; }
    const planStatus = derivePlanStatus(store.planStatus as any, store.planPaidUntil?.getTime());
    if (planStatus === 'ACTIVE') {
      counts.ACTIVE += 1;
      const planDef = PLAN_DEFS[store.plan as keyof typeof PLAN_DEFS];
      if (planDef) mrrJod += planDef.priceMonthlyJod;
      if (store.planPaidUntil && store.planPaidUntil <= in30Days) {
        const daysRemaining = Math.ceil((store.planPaidUntil.getTime() - now.getTime()) / 86400000);
        upcomingRenewals.push({ storeId: store.id, name: store.name, ownerEmail: store.owner.email, ownerName: store.owner.name, plan: store.plan, planPaidUntil: store.planPaidUntil.getTime(), daysRemaining });
      }
    } else if (planStatus === 'TRIAL') {
      counts.TRIAL += 1;
    } else if (planStatus === 'PAST_DUE') {
      counts.PAST_DUE += 1;
      const daysOverdue = store.planPaidUntil ? Math.floor((now.getTime() - store.planPaidUntil.getTime()) / 86400000) : null;
      overdueStores.push({ storeId: store.id, name: store.name, ownerEmail: store.owner.email, ownerName: store.owner.name, plan: store.plan, planPaidUntil: store.planPaidUntil?.getTime(), daysOverdue });
    }
  }

  upcomingRenewals.sort((a: any, b: any) => a.daysRemaining - b.daysRemaining);

  res.json({ mrrJod, counts, upcomingRenewals, overdueStores });
}));

// Broadcast announcement to all active + trial plan store owners via email.
platformRouter.post('/platform/announcements', asyncRoute(async (req, res) => {
  const input = announcementSchema.parse(req.body);
  const { derivePlanStatus } = await import('../../shared/plans.js');
  const stores = await prisma.store.findMany({
    where: { status: 'ACTIVE' },
    include: { owner: { select: { email: true, name: true } } },
  });
  const recipients = stores
    .filter((s) => {
      const ps = derivePlanStatus(s.planStatus as any, s.planPaidUntil?.getTime());
      return ps === 'ACTIVE' || ps === 'TRIAL';
    })
    .map((s) => ({ email: s.owner.email, name: s.owner.name }));
  notifyAnnouncement(input.subject, input.body, recipients);
  await audit(req.user!, 'Sent platform announcement', input.subject, {
    targetType: 'PlatformSettings',
    targetId: 'platform',
    detail: `${recipients.length} recipients`,
  });
  res.json({ sent: recipients.length });
}));

// Send a direct message to a specific store owner and log it.
platformRouter.post('/platform/stores/:storeId/message', asyncRoute(async (req, res) => {
  const input = directMessageSchema.parse(req.body);
  const store = await prisma.store.findUnique({ where: { id: req.params.storeId }, include: { owner: { select: { email: true, name: true } } } });
  if (!store) throw notFound('Store not found.');
  notifyDirectMessage(input.subject, input.body, { email: store.owner.email, name: store.owner.name }, store.name);
  await audit(req.user!, 'Sent direct message to store owner', store.name, {
    targetType: 'Store',
    targetId: store.id,
    detail: input.subject,
  });
  res.json({ ok: true });
}));

platformRouter.get('/platform/analytics', asyncRoute(async (req, res) => {
  const range = parseRange(String(req.query.range ?? '30'));
  const [stores, orders, events, settings] = await Promise.all([
    prisma.store.findMany(),
    prisma.order.findMany(),
    prisma.analyticsEvent.findMany(),
    getSettings(),
  ]);
  res.json(platformInsights(range, stores, orders, events));
}));

platformRouter.get('/platform/audit', asyncRoute(async (req, res) => {
  const page = Math.max(1, Number(req.query.page ?? 1));
  const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize ?? 25)));
  const q = typeof req.query.q === 'string' ? req.query.q : undefined;
  const actor = typeof req.query.actor === 'string' ? req.query.actor : undefined;
  const targetType = typeof req.query.targetType === 'string' ? req.query.targetType : undefined;
  const targetId = typeof req.query.targetId === 'string' ? req.query.targetId : undefined;
  const from = typeof req.query.from === 'string' ? new Date(req.query.from) : undefined;
  const to = typeof req.query.to === 'string' ? new Date(req.query.to) : undefined;
  const where: Prisma.AuditLogWhereInput = {
    ...(actor ? { OR: [{ actorEmail: { contains: actor } }, { actorName: { contains: actor } }] } : {}),
    ...(q ? { OR: [{ action: { contains: q } }, { target: { contains: q } }] } : {}),
    ...(targetType ? { targetType } : {}),
    ...(targetId ? { targetId } : {}),
    ...(from || to ? { createdAt: { gte: from, lte: to } } : {}),
  };
  const [total, logs] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * pageSize, take: pageSize }),
  ]);
  res.json({ auditLogs: logs.map(serializeAuditLog), page, pageSize, total });
}));

platformRouter.get('/platform/settings', asyncRoute(async (_req, res) => res.json({ platformSettings: serializePlatformSettings(await getSettings()) })));
platformRouter.patch('/platform/settings', asyncRoute(async (req, res) => {
  const input = platformSettingsPatchSchema.parse(req.body);
  const settings = await prisma.platformSettings.update({
    where: { id: 'platform' },
    data: { ...input, categories: input.categories ? JSON.stringify(input.categories) : undefined },
  });
  await audit(req.user!, 'Updated platform settings', 'Platform settings', { targetType: 'PlatformSettings', targetId: 'platform', detail: input });
  res.json({ platformSettings: serializePlatformSettings(settings) });
}));
