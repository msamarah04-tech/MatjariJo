import type {
  AnalyticsEvent,
  AuditLog,
  Discount,
  Order,
  OrderItem,
  PlatformSettings,
  Product,
  ProductFlag,
  ShopRequest,
  Store,
  SupportTicket,
  TicketMessage,
  User,
} from '@prisma/client';
import type { PlanStatus, ProductAttributeValue } from '../shared/contract.js';
import { publicAttributes } from '../shared/productCategorySchemas.js';
import { derivePlanStatus } from '../shared/plans.js';

const ms = (date: Date | null | undefined) => date ? date.getTime() : undefined;

function parseJson(value: string | null | undefined) {
  if (!value) return undefined;
  try {
    return JSON.parse(value);
  } catch {
    return undefined;
  }
}

function parseThemeOverrides(value: string | null | undefined) {
  const parsed = parseJson(value);
  return parsed && typeof parsed === 'object' ? parsed : undefined;
}

function parseTags(value: string | null | undefined): string[] {
  const parsed = parseJson(value);
  return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [];
}

function parseProductDetails(value: string | null | undefined) {
  const parsed = parseJson(value);
  return parsed && typeof parsed === 'object' ? parsed : undefined;
}

export function serializeUser(user: Pick<User, 'id' | 'email' | 'username' | 'name' | 'role' | 'ownerStatus' | 'createdAt'> & { mustChangePassword?: boolean }) {
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    name: user.name ?? undefined,
    role: user.role,
    ownerStatus: user.ownerStatus,
    mustChangePassword: user.mustChangePassword ?? false,
    createdAt: ms(user.createdAt),
  };
}

export function serializeStore(store: Store) {
  return {
    id: store.id,
    slug: store.slug,
    name: store.name,
    tagline: store.tagline,
    category: store.category,
    logoUrl: store.logoUrl ?? undefined,
    logoEmoji: store.logoEmoji ?? undefined,
    announcement: store.announcement,
    about: store.about,
    shipping: {
      type: store.shippingType,
      flatCents: store.shippingFlatCents ?? undefined,
      freeOverCents: store.freeOverCents ?? undefined,
    },
    themeId: store.themeId,
    storefrontTemplate: store.storefrontTemplate,
    themeOverrides: parseThemeOverrides(store.themeOverrides),
    currency: store.currency,
    contactPhone: store.contactPhone ?? undefined,
    address: store.address ?? undefined,
    status: store.status,
    reviewStatus: store.reviewStatus,
    suspensionReason: store.suspensionReason,
    internalNote: store.internalNote,
    plan: store.plan,
    planStatus: derivePlanStatus(store.planStatus as PlanStatus, ms(store.planPaidUntil)),
    planPaidUntil: ms(store.planPaidUntil),
    isFeatured: store.isFeatured,
    ownerId: store.ownerId,
    createdAt: ms(store.createdAt)!,
  };
}

export function serializePublicStore(store: Store) {
  const serialized = serializeStore(store);
  const {
    internalNote: _internalNote,
    suspensionReason: _suspensionReason,
    ownerId: _ownerId,
    // Billing data never reaches the public storefront payload.
    plan: _plan,
    planStatus: _planStatus,
    planPaidUntil: _planPaidUntil,
    ...publicStore
  } = serialized;
  return publicStore;
}

export function serializeProduct(product: Product) {
  const details = parseProductDetails(product.details);
  return {
    id: product.id,
    storeId: product.storeId,
    name: product.name,
    description: product.description || undefined,
    details,
    category: product.category || undefined,
    collection: product.collection,
    tags: parseTags(product.tags),
    isFeatured: product.isFeatured,
    compareAtCents: product.compareAtCents ?? undefined,
    priceCents: product.priceCents,
    imageUrl: product.imageUrl ?? undefined,
    imageEmoji: product.imageEmoji ?? undefined,
    stock: product.stock,
    isActive: product.isActive,
    createdAt: ms(product.createdAt)!,
  };
}

/** Admin payload: the full product including private margin data. */
export const serializeProductForAdmin = serializeProduct;

/**
 * Public storefront payload. Strips private margin fields (cost prices) and any
 * category attributes flagged adminOnly in the shared registry, so internal data
 * never reaches the browser even though it lives in the same `details` blob.
 */
export function serializeProductForStorefront(product: Product) {
  const serialized = serializeProduct(product);
  const details = serialized.details as Record<string, unknown> | undefined;
  if (!details) return serialized;

  // Drop owner-only margin data wherever it can hide (top-level + per variant).
  const publicDetails: Record<string, unknown> = { ...details };
  delete publicDetails.costPriceCents;
  const categoryKey = typeof publicDetails.categoryKey === 'string' ? publicDetails.categoryKey : undefined;
  if (publicDetails.attributes) {
    publicDetails.attributes = publicAttributes(categoryKey, publicDetails.attributes as Record<string, ProductAttributeValue>);
  }
  if (Array.isArray(publicDetails.variants)) {
    publicDetails.variants = (publicDetails.variants as Array<Record<string, unknown>>).map((variant) => {
      const copy = { ...variant };
      delete copy.costPriceCents;
      return copy;
    });
  }
  return { ...serialized, details: publicDetails };
}

export function serializeDiscount(discount: Discount) {
  let parsedDetails: unknown = undefined;
  if (discount.details) {
    try { parsedDetails = JSON.parse(discount.details); } catch { /* ignore malformed */ }
  }
  let parsedProductIds: string[] | undefined = undefined;
  if (discount.productIds) {
    try { parsedProductIds = JSON.parse(discount.productIds); } catch { /* ignore */ }
  }
  return {
    id: discount.id,
    storeId: discount.storeId,
    name: discount.name ?? undefined,
    imageUrl: discount.imageUrl ?? undefined,
    details: parsedDetails,
    productIds: parsedProductIds?.length ? parsedProductIds : undefined,
    code: discount.code,
    type: discount.type,
    value: discount.value,
    minSubtotalCents: discount.minSubtotalCents ?? undefined,
    usageLimit: discount.usageLimit ?? undefined,
    usedCount: discount.usedCount,
    active: discount.active,
    expiresAt: ms(discount.expiresAt),
    createdAt: ms(discount.createdAt)!,
  };
}

export function serializeOrderItem(item: OrderItem) {
  return {
    productId: item.productId ?? undefined,
    variantId: item.variantId ?? undefined,
    productName: item.productNameSnapshot,
    variantTitle: item.variantTitleSnapshot ?? undefined,
    sku: item.variantSkuSnapshot ?? undefined,
    imageUrl: item.variantImageUrlSnapshot ?? undefined,
    priceCents: item.unitPriceCents,
    quantity: item.quantity,
  };
}

export type OrderWithItems = Order & { items: OrderItem[] };

export function serializeOrder(order: OrderWithItems) {
  return {
    id: order.id,
    storeId: order.storeId,
    customerName: order.customerName,
    customerEmail: order.customerEmail,
    customerPhone: order.customerPhone ?? undefined,
    shippingAddress: order.shippingAddress ?? undefined,
    status: order.status,
    currency: order.currency,
    subtotalCents: order.subtotalCents,
    discountCents: order.discountCents,
    shippingCents: order.shippingCents,
    paymentMethod: order.paymentMethod,
    discountCode: order.discountCode ?? undefined,
    invoiceNumber: order.invoiceNumber ?? undefined,
    note: order.note ?? undefined,
    rejectionReason: order.rejectionReason ?? undefined,
    totalCents: order.totalCents,
    items: order.items.map(serializeOrderItem),
    createdAt: ms(order.createdAt)!,
  };
}

export function serializeAnalyticsEvent(event: AnalyticsEvent) {
  return {
    id: event.id,
    storeId: event.storeId,
    type: event.type,
    productId: event.productId ?? undefined,
    orderId: event.orderId ?? undefined,
    sessionId: event.sessionId ?? undefined,
    metadata: parseJson(event.metadata),
    ts: ms(event.createdAt)!,
  };
}

export function serializeTicketMessage(message: TicketMessage) {
  return {
    id: message.id,
    from: message.from,
    body: message.body,
    ts: ms(message.createdAt)!,
  };
}

export type TicketWithMessages = SupportTicket & { messages: TicketMessage[] };

export function serializeSupportTicket(ticket: TicketWithMessages) {
  return {
    id: ticket.id,
    storeId: ticket.storeId ?? undefined,
    subject: ticket.subject,
    category: ticket.category ?? 'OTHER',
    message: ticket.message,
    status: ticket.status,
    priority: ticket.priority,
    assignedTo: ticket.assignedToId ?? undefined,
    messages: ticket.messages.map(serializeTicketMessage),
    createdAt: ms(ticket.createdAt)!,
  };
}

export function serializeProductFlag(flag: ProductFlag) {
  return {
    id: flag.id,
    storeId: flag.storeId,
    productId: flag.productId,
    reason: flag.reason,
    reporter: flag.reporter ?? undefined,
    severity: flag.severity,
    status: flag.status,
    createdAt: ms(flag.createdAt)!,
  };
}

export function serializeShopRequest(request: ShopRequest) {
  return {
    id: request.id,
    ownerName: request.ownerName,
    ownerEmail: request.ownerEmail,
    storeName: request.storeName,
    category: request.category,
    tagline: request.tagline,
    notes: request.notes ?? undefined,
    plan: request.plan ?? undefined,
    desiredUsername: request.desiredUsername ?? undefined,
    rejectionReason: request.rejectionReason ?? undefined,
    status: request.status,
    storeId: request.storeId ?? undefined,
    reviewedAt: ms(request.reviewedAt),
    createdAt: ms(request.createdAt)!,
  };
}

export function serializeAuditLog(log: AuditLog) {
  return {
    id: log.id,
    actor: log.actorName || log.actorEmail || 'System',
    action: log.action,
    target: log.target,
    detail: log.detail ?? undefined,
    targetType: log.targetType ?? undefined,
    targetId: log.targetId ?? undefined,
    ts: ms(log.createdAt)!,
  };
}

export function serializePlatformSettings(settings: PlatformSettings) {
  const parsedCategories = parseJson(settings.categories);
  const categories = Array.isArray(parsedCategories) ? parsedCategories : [];
  return {
    platformName: settings.platformName,
    defaultCurrency: settings.defaultCurrency,
    categories: categories.filter((item): item is string => typeof item === 'string'),
    globalAnnouncement: settings.globalAnnouncement,
    maintenanceMode: settings.maintenanceMode,
    supportEmail: settings.supportEmail,
    auditCap: settings.auditCap,
    autoFlagThreshold: settings.autoFlagThreshold,
    lastSeenNotificationsAt: ms(settings.lastSeenNotificationsAt) ?? 0,
  };
}

export function jsonDetail(value?: unknown): string | undefined {
  if (value === undefined) return undefined;
  return typeof value === 'string' ? value : JSON.stringify(value);
}
