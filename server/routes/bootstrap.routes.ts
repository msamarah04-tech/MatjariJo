import { Router } from 'express';
import { prisma } from '../db.js';
import { authenticate, blockIfMustChangePassword } from '../auth.js';
import { getSettings } from '../audit.js';
import { asyncRoute } from '../http.js';
import { isPlatformOwner } from '../policies/roles.policy.js';
import {
  serializeAnalyticsEvent,
  serializeAuditLog,
  serializeDiscount,
  serializeOrder,
  serializePlatformSettings,
  serializeProduct,
  serializeProductFlag,
  serializeShopRequest,
  serializeStore,
  serializeSupportTicket,
  serializeUser,
} from '../serializers.js';

export const bootstrapRouter = Router();

bootstrapRouter.get('/bootstrap', authenticate, blockIfMustChangePassword, asyncRoute(async (req, res) => {
  const settings = await getSettings();
  const platform = isPlatformOwner(req.user!);
  const storeWhere = platform ? undefined : { ownerId: req.user!.id };
  const allStores = await prisma.store.findMany({ where: storeWhere, orderBy: { createdAt: 'asc' } });
  const stores = platform ? allStores : allStores.slice(0, 1);
  const storeIds = stores.map((store) => store.id);
  const scoped = platform ? undefined : { storeId: { in: storeIds } };
  const [
    products,
    orders,
    discounts,
    events,
    supportTickets,
    productFlags,
    shopRequests,
    auditLogs,
    users,
  ] = await Promise.all([
    prisma.product.findMany({ where: scoped, orderBy: { createdAt: 'desc' } }),
    prisma.order.findMany({ where: scoped, include: { items: true }, orderBy: { createdAt: 'desc' } }),
    prisma.discount.findMany({ where: scoped, orderBy: { createdAt: 'desc' } }),
    prisma.analyticsEvent.findMany({ where: scoped, orderBy: { createdAt: 'desc' }, take: 2500 }),
    prisma.supportTicket.findMany({ where: scoped, include: { messages: { orderBy: { createdAt: 'asc' } } }, orderBy: { createdAt: 'desc' } }),
    prisma.productFlag.findMany({ where: scoped, orderBy: { createdAt: 'desc' } }),
    platform ? prisma.shopRequest.findMany({ orderBy: { createdAt: 'desc' } }) : Promise.resolve([]),
    platform ? prisma.auditLog.findMany({ orderBy: { createdAt: 'desc' }, take: settings.auditCap }) : Promise.resolve([]),
    prisma.user.findMany({ select: { id: true, ownerStatus: true } }),
  ]);

  res.json({
    currentUser: serializeUser(req.user!),
    stores: stores.map(serializeStore),
    products: products.map(serializeProduct),
    orders: orders.map(serializeOrder),
    discounts: discounts.map(serializeDiscount),
    analyticsEvents: events.map(serializeAnalyticsEvent),
    platformSettings: serializePlatformSettings(settings),
    supportTickets: supportTickets.map(serializeSupportTicket),
    productFlags: productFlags.map(serializeProductFlag),
    shopRequests: shopRequests.map(serializeShopRequest),
    auditLogs: auditLogs.map(serializeAuditLog),
    ownerStatuses: Object.fromEntries(users.map((user) => [user.id, user.ownerStatus])),
  });
}));
