import { AnalyticsEvent, AuditLog, Discount, Order, PlatformSettings, Product, ProductFlag, ShopRequest, Store, SupportTicket, User } from './types';

export const platformOwner: User = {
  id: 'user-platform-1',
  email: 'platform@matjari.demo',
  name: 'System Admin',
  role: 'PLATFORM_OWNER',
};

export const shopOwner: User = {
  id: 'user-shop-1',
  email: 'shop@matjari.demo',
  name: 'Demo Merchant',
  role: 'SHOP_OWNER',
};

export const seedStores: Store[] = [
  {
    id: 'store-1',
    slug: 'botanica',
    name: 'Botanica',
    tagline: 'Rare indoor plants and accessories',
    category: 'Home & Garden',
    announcement: 'Free local delivery on plant orders over $75.',
    about: 'Botanica curates hardy indoor plants, simple care tools, and vessels for homes that want a little more green. Orders are reviewed by the shop before fulfillment so every plant leaves in good condition.',
    shipping: { type: 'FREE_OVER', flatCents: 700, freeOverCents: 7500 },
    logoEmoji: '🪴',
    themeId: 'forest',
    currency: 'USD',
    status: 'ACTIVE',
    reviewStatus: 'APPROVED',
    ownerId: shopOwner.id,
    createdAt: Date.now() - 10000000,
  },
  {
    id: 'store-2',
    slug: 'arabica',
    name: 'Arabica Roasters',
    tagline: 'Single origin beans delivered',
    category: 'Food & Drink',
    announcement: 'Fresh roast drops every Friday.',
    about: 'Arabica Roasters sources small lots and roasts them in weekly batches. We focus on transparent sourcing, clear tasting notes, and coffee that arrives ready for your morning ritual.',
    shipping: { type: 'FLAT', flatCents: 500 },
    logoEmoji: '☕',
    themeId: 'mocha',
    currency: 'USD',
    status: 'ACTIVE',
    reviewStatus: 'APPROVED',
    ownerId: shopOwner.id,
    createdAt: Date.now() - 8000000,
  },
  {
    id: 'store-3',
    slug: 'minimal',
    name: 'MINIMAL',
    tagline: 'Essential everyday carry',
    category: 'Fashion',
    announcement: 'Summer capsule is now live.',
    about: 'MINIMAL makes durable everyday carry pieces with quiet materials and clean shapes. Our policies are simple: thoughtful production, careful packaging, and responsive order review.',
    shipping: { type: 'FLAT', flatCents: 900 },
    logoEmoji: '⬛',
    themeId: 'mono',
    currency: 'USD',
    status: 'ACTIVE',
    reviewStatus: 'APPROVED',
    ownerId: shopOwner.id,
    createdAt: Date.now() - 5000000,
  },
  {
    id: 'store-4',
    slug: 'midnight',
    name: 'Midnight Apothecary',
    tagline: 'Small batch fragrances',
    category: 'Beauty',
    announcement: 'Complimentary sample with every fragrance.',
    about: 'Midnight Apothecary blends small batch fragrances with moody botanicals and polished notes. Each order is approved before fulfillment to keep stock and batches accurate.',
    shipping: { type: 'PICKUP' },
    logoEmoji: '🌙',
    themeId: 'noir',
    currency: 'USD',
    status: 'ACTIVE',
    reviewStatus: 'APPROVED',
    ownerId: shopOwner.id,
    createdAt: Date.now() - 2000000,
  }
];

export const seedPlatformSettings: PlatformSettings = {
  platformName: 'Matjari Jordan',
  defaultCurrency: 'USD',
  categories: ['Home & Garden', 'Food & Drink', 'Fashion', 'Beauty', 'Art', 'Books'],
  globalAnnouncement: '',
  maintenanceMode: false,
  supportEmail: 'support@matjari.demo',
  auditCap: 200,
  autoFlagThreshold: 3,
};

export const seedOwnerStatuses: Record<string, 'ACTIVE' | 'RESTRICTED' | 'BANNED'> = {
  [shopOwner.id]: 'ACTIVE',
};

export const seedSupportTickets: SupportTicket[] = [
  {
    id: 'ticket-1',
    storeId: 'store-1',
    subject: 'Question about a large plant order',
    message: 'Customer asked whether local delivery is available for a large order this week.',
    status: 'OPEN',
    priority: 'MEDIUM',
    messages: [
      { id: 'tm-1', from: 'OWNER', body: 'Customer asked whether local delivery is available for a large order this week.', ts: Date.now() - 3600000 },
    ],
    createdAt: Date.now() - 3600000,
  },
  {
    id: 'ticket-2',
    storeId: 'store-2',
    subject: 'Payout timing for last week',
    message: 'When are commissions settled for orders fulfilled last Friday?',
    status: 'IN_PROGRESS',
    priority: 'HIGH',
    assignedTo: 'System Admin',
    messages: [
      { id: 'tm-2', from: 'OWNER', body: 'When are commissions settled for orders fulfilled last Friday?', ts: Date.now() - 7200000 },
      { id: 'tm-3', from: 'PLATFORM', body: 'Payouts settle on a weekly cycle — looking into the exact date for you.', ts: Date.now() - 5400000 },
    ],
    createdAt: Date.now() - 7200000,
  },
];

export const seedShopRequests: ShopRequest[] = [
  {
    id: 'shop-request-1',
    ownerName: 'Mira Lane',
    ownerEmail: 'mira@example.com',
    storeName: 'Mira Studio',
    category: 'Art',
    tagline: 'Small-batch prints and paper goods',
    notes: 'Needs a clean storefront with a soft editorial look.',
    plan: 'STARTER',
    status: 'PENDING',
    createdAt: Date.now() - 5400000,
  },
  {
    id: 'shop-request-2',
    ownerName: 'Theo Park',
    ownerEmail: 'theo@example.com',
    storeName: 'Park Cycles',
    category: 'Sports',
    tagline: 'Refurbished city bikes and parts',
    notes: 'Wants inventory-heavy catalog with pickup option.',
    plan: 'GROWTH',
    status: 'PENDING',
    createdAt: Date.now() - 9000000,
  },
];

export const seedProductFlags: ProductFlag[] = [
  {
    id: 'flag-1',
    storeId: 'store-3',
    productId: 'prod-4',
    reason: 'Review product photography and policy fit before featuring.',
    reporter: 'Customer report',
    severity: 'MEDIUM',
    status: 'OPEN',
    createdAt: Date.now() - 7200000,
  },
];

export const seedAuditLogs: AuditLog[] = [
  {
    id: 'audit-1',
    actor: platformOwner.name || 'Website Owner',
    action: 'Seeded platform workspace',
    target: 'Platform',
    detail: 'Initial demo data loaded for owner controls.',
    ts: Date.now() - 900000,
  },
];

export const seedDiscounts: Discount[] = [
  {
    id: 'disc-1',
    storeId: 'store-1',
    code: 'GREEN10',
    type: 'PERCENT',
    value: 10,
    minSubtotalCents: 3000,
    usedCount: 0,
    active: true,
    createdAt: Date.now() - 500000,
  },
  {
    id: 'disc-2',
    storeId: 'store-1',
    code: 'FREESHIP',
    type: 'FREE_SHIPPING',
    value: 0,
    usageLimit: 25,
    usedCount: 0,
    active: true,
    createdAt: Date.now() - 400000,
  },
];

export const seedProducts: Product[] = [
  {
    id: 'prod-1', storeId: 'store-1', name: 'Monstera Deliciosa', 
    description: 'A classic indoor plant with dramatic split leaves and easy care needs.', collection: 'Plants', isFeatured: true, compareAtCents: 5500, priceCents: 4500, stock: 10, isActive: true, createdAt: Date.now(), imageEmoji: '🌿'
  },
  {
    id: 'prod-2', storeId: 'store-1', name: 'Ceramic Pot', 
    description: 'Minimalist white ceramic pot sized for tabletop plants.', collection: 'Accessories', isFeatured: true, priceCents: 2000, stock: 50, isActive: true, createdAt: Date.now(), imageEmoji: '🏺'
  },
  {
    id: 'prod-3', storeId: 'store-2', name: 'Ethiopia Yirgacheffe', 
    description: 'Light roast with floral notes, lemon zest, and a soft tea-like finish.', collection: 'Whole Bean', isFeatured: true, compareAtCents: 2600, priceCents: 2200, stock: 100, isActive: true, createdAt: Date.now(), imageEmoji: '🫘'
  },
  {
    id: 'prod-4', storeId: 'store-3', name: 'Slim Wallet', 
    description: 'Black leather cardholder with a slim pocket profile.', collection: 'Wallets', isFeatured: true, priceCents: 6500, stock: 20, isActive: true, createdAt: Date.now(), imageEmoji: '💳'
  }
];

export const seedOrders: Order[] = [
  {
    id: 'order-1', storeId: 'store-1', customerName: 'Alice Smith', customerEmail: 'alice@example.com',
    status: 'PENDING', subtotalCents: 4500, discountCents: 0, shippingCents: 700, totalCents: 5200, items: [{ productId: 'prod-1', productName: 'Monstera Deliciosa', priceCents: 4500, quantity: 1 }],
    createdAt: Date.now() - 86400000,
  },
  {
    id: 'order-2', storeId: 'store-1', customerName: 'Bob Jones', customerEmail: 'bob@example.com',
    status: 'APPROVED', subtotalCents: 6500, discountCents: 0, shippingCents: 700, totalCents: 7200, note: 'Please include plant care instructions.', items: [{ productId: 'prod-1', productName: 'Monstera Deliciosa', priceCents: 4500, quantity: 1 }, { productId: 'prod-2', productName: 'Ceramic Pot', priceCents: 2000, quantity: 1 }],
    createdAt: Date.now() - 172800000,
  }
];

const day = 86400000;

function makeEvent(id: string, storeId: string, type: AnalyticsEvent['type'], daysAgo: number, productId?: string): AnalyticsEvent {
  return {
    id,
    storeId,
    type,
    productId,
    ts: Date.now() - daysAgo * day,
  };
}

export const seedAnalyticsEvents: AnalyticsEvent[] = [
  ...seedProducts.flatMap((product, productIndex) => {
    const events: AnalyticsEvent[] = [];
    for (let offset = 2; offset <= 88; offset += 6 + productIndex) {
      events.push(makeEvent(`evt-view-${product.id}-${offset}`, product.storeId, 'view', offset, product.id));
      if (offset % 2 === 0) events.push(makeEvent(`evt-cart-${product.id}-${offset}`, product.storeId, 'add_to_cart', Math.max(1, offset - 1), product.id));
      if (offset % 3 === 0) events.push(makeEvent(`evt-checkout-${product.id}-${offset}`, product.storeId, 'checkout_start', Math.max(1, offset - 1)));
    }
    return events;
  }),
  ...seedOrders.map((order, index) => makeEvent(`evt-order-seed-${order.id}`, order.storeId, 'order', index === 0 ? 1 : 2)),
  makeEvent('evt-order-store-2-1', 'store-2', 'order', 11, 'prod-3'),
  makeEvent('evt-checkout-store-2-1', 'store-2', 'checkout_start', 11),
  makeEvent('evt-order-store-3-1', 'store-3', 'order', 24, 'prod-4'),
  makeEvent('evt-checkout-store-3-1', 'store-3', 'checkout_start', 24),
];
