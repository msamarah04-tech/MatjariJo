import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { computeOrderSummary } from './checkout';
import { AnalyticsEvent, AnalyticsEventType, AuditLog, Discount, Order, OrderStatus, OwnerStatus, PlatformSettings, Product, ProductFlag, Role, ShopRequest, ShopRequestStatus, Store, StoreReviewStatus, StoreStatus, SupportTicket, TicketStatus, User } from './types';
import { platformOwner, seedAnalyticsEvents, seedAuditLogs, seedDiscounts, seedOrders, seedOwnerStatuses, seedPlatformSettings, seedProductFlags, seedProducts, seedShopRequests, seedStores, seedSupportTickets, shopOwner } from './seed';

const ANALYTICS_RETENTION_MS = 1000 * 60 * 60 * 24 * 180;
const ANALYTICS_MAX_EVENTS = 2500;

const normalizeStore = (store: Store): Store => ({
  ...store,
  announcement: store.announcement ?? '',
  about: store.about ?? '',
  shipping: store.shipping ?? { type: 'FLAT', flatCents: 0 },
  reviewStatus: store.reviewStatus ?? 'APPROVED',
  suspensionReason: store.suspensionReason ?? '',
  internalNote: store.internalNote ?? '',
});

const normalizeProduct = (product: Product): Product => ({
  ...product,
  collection: product.collection ?? '',
  isFeatured: product.isFeatured ?? false,
  compareAtCents: product.compareAtCents,
});

const normalizeOrder = (order: Order): Order => {
  const subtotalCents = order.subtotalCents ?? order.items.reduce((sum, item) => sum + item.priceCents * item.quantity, 0);
  const discountCents = order.discountCents ?? 0;
  const shippingCents = order.shippingCents ?? Math.max(0, order.totalCents - subtotalCents + discountCents);
  return {
    ...order,
    subtotalCents,
    discountCents,
    shippingCents,
    totalCents: order.totalCents ?? Math.max(0, subtotalCents - discountCents + shippingCents),
  };
};

const normalizeDiscount = (discount: Discount): Discount => ({
  ...discount,
  code: discount.code.toUpperCase().trim(),
  usedCount: discount.usedCount ?? 0,
  active: discount.active ?? true,
  createdAt: discount.createdAt ?? Date.now(),
});

const normalizeAnalyticsEvent = (event: AnalyticsEvent): AnalyticsEvent => ({
  ...event,
  id: event.id || crypto.randomUUID(),
  ts: event.ts || Date.now(),
});

const normalizePlatformSettings = (settings?: Partial<PlatformSettings>): PlatformSettings => ({
  commissionRateBps: settings?.commissionRateBps ?? seedPlatformSettings.commissionRateBps,
  defaultCurrency: settings?.defaultCurrency ?? seedPlatformSettings.defaultCurrency,
  categories: settings?.categories ?? seedPlatformSettings.categories,
  globalAnnouncement: settings?.globalAnnouncement ?? '',
  maintenanceMode: settings?.maintenanceMode ?? false,
  supportEmail: settings?.supportEmail ?? seedPlatformSettings.supportEmail,
});

const normalizeSupportTicket = (ticket: SupportTicket): SupportTicket => ({
  ...ticket,
  status: ticket.status ?? 'OPEN',
  priority: ticket.priority ?? 'MEDIUM',
  createdAt: ticket.createdAt ?? Date.now(),
});

const normalizeProductFlag = (flag: ProductFlag): ProductFlag => ({
  ...flag,
  status: flag.status ?? 'OPEN',
  createdAt: flag.createdAt ?? Date.now(),
});

const normalizeAuditLog = (log: AuditLog): AuditLog => ({
  ...log,
  id: log.id || crypto.randomUUID(),
  actor: log.actor || 'Website Owner',
  ts: log.ts || Date.now(),
});

const normalizeShopRequest = (request: ShopRequest): ShopRequest => ({
  ...request,
  status: request.status ?? 'PENDING',
  createdAt: request.createdAt ?? Date.now(),
});

const pruneAnalyticsEvents = (events: AnalyticsEvent[]) => {
  const cutoff = Date.now() - ANALYTICS_RETENTION_MS;
  return events
    .map(normalizeAnalyticsEvent)
    .filter((event) => event.ts >= cutoff)
    .sort((a, b) => b.ts - a.ts)
    .slice(0, ANALYTICS_MAX_EVENTS);
};

const slugify = (value: string) => {
  const slug = value.toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/[\s_-]+/g, '-').replace(/^-+|-+$/g, '');
  return slug || 'store';
};

export type ShopApprovalSetup = {
  logoEmoji: string;
  themeId: string;
  announcement?: string;
  about: string;
  shipping: Store['shipping'];
  products?: Omit<Product, 'id' | 'storeId' | 'createdAt'>[];
};

interface CartItem {
  productId: string;
  quantity: number;
}

interface AppState {
  currentUser: User | null;
  signInAs: (role: Role, email?: string, name?: string) => void;
  signOut: () => void;

  stores: Store[];
  products: Product[];
  orders: Order[];
  discounts: Discount[];
  analyticsEvents: AnalyticsEvent[];
  platformSettings: PlatformSettings;
  supportTickets: SupportTicket[];
  productFlags: ProductFlag[];
  shopRequests: ShopRequest[];
  auditLogs: AuditLog[];
  ownerStatuses: Record<string, OwnerStatus>;
  carts: Record<string, CartItem[]>;

  updateCart: (storeId: string, items: CartItem[]) => void;
  clearCart: (storeId: string) => void;

  // store CRUD
  createStore: (input: Omit<Store, 'id' | 'slug' | 'createdAt' | 'status' | 'ownerId'> & { products?: Omit<Product, 'id' | 'storeId' | 'createdAt'>[] }) => string;
  updateStore: (id: string, patch: Partial<Store>) => void;
  setStoreStatus: (id: string, status: StoreStatus) => void;
  reviewStore: (id: string, reviewStatus: StoreReviewStatus, note?: string) => void;
  suspendStore: (id: string, reason: string) => void;

  // product CRUD
  addProduct: (storeId: string, p: Omit<Product, 'id' | 'storeId' | 'createdAt'>) => void;
  updateProduct: (id: string, patch: Partial<Product>) => void;
  deleteProduct: (id: string) => void;

  // discount CRUD
  addDiscount: (storeId: string, discount: Omit<Discount, 'id' | 'storeId' | 'createdAt' | 'usedCount'>) => void;
  updateDiscount: (id: string, patch: Partial<Discount>) => void;
  deleteDiscount: (id: string) => void;

  // analytics
  recordEvent: (storeId: string, type: AnalyticsEventType, productId?: string) => void;

  // platform controls
  updatePlatformSettings: (patch: Partial<PlatformSettings>) => void;
  setOwnerStatus: (ownerId: string, status: OwnerStatus) => void;
  addSupportTicket: (ticket: Omit<SupportTicket, 'id' | 'createdAt'>) => void;
  updateSupportTicket: (id: string, patch: Partial<SupportTicket>) => void;
  addProductFlag: (flag: Omit<ProductFlag, 'id' | 'createdAt' | 'status'>) => void;
  resolveProductFlag: (id: string) => void;
  submitShopRequest: (request: Omit<ShopRequest, 'id' | 'status' | 'createdAt'>) => string;
  updateShopRequestStatus: (id: string, status: ShopRequestStatus) => void;
  approveShopRequest: (id: string, setup: ShopApprovalSetup) => string | undefined;
  addAuditLog: (action: string, target: string, detail?: string) => void;

  // orders
  placeOrder: (o: { storeId: string; customerName: string; customerEmail: string; items?: CartItem[]; discountCode?: string; note?: string }) => string;
  approveOrder: (id: string) => void;
  rejectOrder: (id: string) => void;
  fulfillOrder: (id: string) => void;

  resetDemo: () => void;
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      currentUser: null,
      stores: seedStores.map(normalizeStore),
      products: seedProducts.map(normalizeProduct),
      orders: seedOrders.map(normalizeOrder),
      discounts: seedDiscounts.map(normalizeDiscount),
      analyticsEvents: pruneAnalyticsEvents(seedAnalyticsEvents),
      platformSettings: normalizePlatformSettings(seedPlatformSettings),
      supportTickets: seedSupportTickets.map(normalizeSupportTicket),
      productFlags: seedProductFlags.map(normalizeProductFlag),
      shopRequests: seedShopRequests.map(normalizeShopRequest),
      auditLogs: seedAuditLogs.map(normalizeAuditLog),
      ownerStatuses: seedOwnerStatuses,
      carts: {},

      updateCart: (storeId, items) => set((state) => ({ carts: { ...state.carts, [storeId]: items } })),
      clearCart: (storeId) => set((state) => ({ carts: { ...state.carts, [storeId]: [] } })),

      signInAs: (role, email, name) => {
        let user: User;
        if (role === 'PLATFORM_OWNER') {
          user = { ...platformOwner, email: email || platformOwner.email, name: name || platformOwner.name };
        } else {
          user = { ...shopOwner, email: email || shopOwner.email, name: name || shopOwner.name };
        }
        set({ currentUser: user });
      },

      signOut: () => set({ currentUser: null }),

      createStore: (input) => {
        const id = crypto.randomUUID();
        
        const baseSlug = slugify(input.name);
        
        const stores = get().stores;
        let slug = baseSlug;
        while (stores.some(s => s.slug === slug)) {
           slug = `${baseSlug}-${Math.random().toString(36).substring(2, 6)}`;
        }

        const newStore: Store = {
          ...input,
          id,
          slug,
          status: 'SUSPENDED',
          reviewStatus: 'PENDING_REVIEW',
          suspensionReason: 'Awaiting website owner review',
          ownerId: get().currentUser!.id,
          createdAt: Date.now(),
          category: input.category || 'General',
          announcement: input.announcement || '',
          about: input.about || '',
          shipping: input.shipping || { type: 'FLAT', flatCents: 0 },
          currency: input.currency || 'USD',
          themeId: input.themeId || 'mono',
        };
        
        let newProducts: Product[] = [];
        if (input.products) {
           newProducts = input.products.map(p => ({
             ...p,
             id: crypto.randomUUID(),
             storeId: id,
             createdAt: Date.now(),
             isActive: true,
             collection: p.collection ?? '',
             isFeatured: p.isFeatured ?? false,
           }));
        }

        set((state) => ({
          stores: [...state.stores, newStore],
          products: [...state.products, ...newProducts],
          auditLogs: [normalizeAuditLog({
            id: crypto.randomUUID(),
            actor: get().currentUser?.name || 'Shop Owner',
            action: 'Created store pending review',
            target: newStore.name,
            detail: 'New shop submitted for website owner approval.',
            ts: Date.now(),
          }), ...state.auditLogs].slice(0, 200),
        }));

        return id;
      },
      updateStore: (id, patch) => {
        set((state) => ({
          stores: state.stores.map((s) => (s.id === id ? { ...s, ...patch } : s)),
        }));
      },
      setStoreStatus: (id, status) => {
        set((state) => ({
          stores: state.stores.map((s) => (s.id === id ? { ...s, status } : s)),
          auditLogs: [normalizeAuditLog({
            id: crypto.randomUUID(),
            actor: get().currentUser?.name || 'Website Owner',
            action: `${status === 'ACTIVE' ? 'Activated' : 'Suspended'} store`,
            target: state.stores.find((s) => s.id === id)?.name || id,
            ts: Date.now(),
          }), ...state.auditLogs].slice(0, 200),
        }));
      },
      reviewStore: (id, reviewStatus, note) => {
        set((state) => ({
          stores: state.stores.map((s) => (s.id === id ? {
            ...s,
            reviewStatus,
            internalNote: note ?? s.internalNote,
            status: reviewStatus === 'APPROVED' ? 'ACTIVE' : 'SUSPENDED',
            suspensionReason: reviewStatus === 'APPROVED' ? '' : note || s.suspensionReason || 'Needs website owner review',
          } : s)),
          auditLogs: [normalizeAuditLog({
            id: crypto.randomUUID(),
            actor: get().currentUser?.name || 'Website Owner',
            action: `Set store review to ${reviewStatus}`,
            target: state.stores.find((s) => s.id === id)?.name || id,
            detail: note,
            ts: Date.now(),
          }), ...state.auditLogs].slice(0, 200),
        }));
      },
      suspendStore: (id, reason) => {
        set((state) => ({
          stores: state.stores.map((s) => (s.id === id ? { ...s, status: 'SUSPENDED', suspensionReason: reason } : s)),
          auditLogs: [normalizeAuditLog({
            id: crypto.randomUUID(),
            actor: get().currentUser?.name || 'Website Owner',
            action: 'Suspended store with reason',
            target: state.stores.find((s) => s.id === id)?.name || id,
            detail: reason,
            ts: Date.now(),
          }), ...state.auditLogs].slice(0, 200),
        }));
      },

      addProduct: (storeId, p) => {
        const id = crypto.randomUUID();
        const newProduct: Product = {
          ...p,
          id,
          storeId,
          createdAt: Date.now(),
          isActive: p.isActive ?? true,
          collection: p.collection ?? '',
          isFeatured: p.isFeatured ?? false,
        };
        set((state) => ({ products: [newProduct, ...state.products] }));
      },
      updateProduct: (id, patch) => {
        set((state) => ({
          products: state.products.map((p) => (p.id === id ? { ...p, ...patch } : p)),
        }));
      },
      deleteProduct: (id) => {
        set((state) => ({
          products: state.products.filter((p) => p.id !== id),
        }));
      },

      addDiscount: (storeId, discount) => {
        const normalized = normalizeDiscount({
          ...discount,
          id: crypto.randomUUID(),
          storeId,
          usedCount: 0,
          createdAt: Date.now(),
        });
        set((state) => ({ discounts: [normalized, ...state.discounts] }));
      },
      updateDiscount: (id, patch) => {
        set((state) => ({
          discounts: state.discounts.map((d) => (d.id === id ? normalizeDiscount({ ...d, ...patch }) : d)),
        }));
      },
      deleteDiscount: (id) => {
        set((state) => ({
          discounts: state.discounts.filter((d) => d.id !== id),
        }));
      },

      recordEvent: (storeId, type, productId) => {
        const event: AnalyticsEvent = {
          id: crypto.randomUUID(),
          storeId,
          type,
          productId,
          ts: Date.now(),
        };
        set((state) => ({ analyticsEvents: pruneAnalyticsEvents([event, ...state.analyticsEvents]) }));
      },

      updatePlatformSettings: (patch) => {
        set((state) => ({
          platformSettings: normalizePlatformSettings({ ...state.platformSettings, ...patch }),
          auditLogs: [normalizeAuditLog({
            id: crypto.randomUUID(),
            actor: get().currentUser?.name || 'Website Owner',
            action: 'Updated platform settings',
            target: 'Platform settings',
            ts: Date.now(),
          }), ...state.auditLogs].slice(0, 200),
        }));
      },
      setOwnerStatus: (ownerId, status) => {
        set((state) => ({
          ownerStatuses: { ...state.ownerStatuses, [ownerId]: status },
          auditLogs: [normalizeAuditLog({
            id: crypto.randomUUID(),
            actor: get().currentUser?.name || 'Website Owner',
            action: `Set owner status to ${status}`,
            target: ownerId,
            ts: Date.now(),
          }), ...state.auditLogs].slice(0, 200),
        }));
      },
      addSupportTicket: (ticket) => {
        const newTicket = normalizeSupportTicket({ ...ticket, id: crypto.randomUUID(), createdAt: Date.now() });
        set((state) => ({
          supportTickets: [newTicket, ...state.supportTickets],
          auditLogs: [normalizeAuditLog({
            id: crypto.randomUUID(),
            actor: get().currentUser?.name || 'Website Owner',
            action: 'Created support ticket',
            target: newTicket.subject,
            ts: Date.now(),
          }), ...state.auditLogs].slice(0, 200),
        }));
      },
      updateSupportTicket: (id, patch) => {
        set((state) => ({
          supportTickets: state.supportTickets.map((ticket) => (ticket.id === id ? normalizeSupportTicket({ ...ticket, ...patch }) : ticket)),
          auditLogs: [normalizeAuditLog({
            id: crypto.randomUUID(),
            actor: get().currentUser?.name || 'Website Owner',
            action: 'Updated support ticket',
            target: state.supportTickets.find((ticket) => ticket.id === id)?.subject || id,
            ts: Date.now(),
          }), ...state.auditLogs].slice(0, 200),
        }));
      },
      addProductFlag: (flag) => {
        const newFlag = normalizeProductFlag({ ...flag, id: crypto.randomUUID(), status: 'OPEN', createdAt: Date.now() });
        set((state) => ({
          productFlags: [newFlag, ...state.productFlags],
          auditLogs: [normalizeAuditLog({
            id: crypto.randomUUID(),
            actor: get().currentUser?.name || 'Website Owner',
            action: 'Flagged product',
            target: state.products.find((p) => p.id === newFlag.productId)?.name || newFlag.productId,
            detail: newFlag.reason,
            ts: Date.now(),
          }), ...state.auditLogs].slice(0, 200),
        }));
      },
      resolveProductFlag: (id) => {
        set((state) => ({
          productFlags: state.productFlags.map((flag) => (flag.id === id ? { ...flag, status: 'RESOLVED' } : flag)),
          auditLogs: [normalizeAuditLog({
            id: crypto.randomUUID(),
            actor: get().currentUser?.name || 'Website Owner',
            action: 'Resolved product flag',
            target: state.productFlags.find((flag) => flag.id === id)?.productId || id,
            ts: Date.now(),
          }), ...state.auditLogs].slice(0, 200),
        }));
      },
      submitShopRequest: (request) => {
        const id = crypto.randomUUID();
        const newRequest = normalizeShopRequest({
          ...request,
          id,
          status: 'PENDING',
          createdAt: Date.now(),
        });
        set((state) => ({
          shopRequests: [newRequest, ...state.shopRequests],
          auditLogs: [normalizeAuditLog({
            id: crypto.randomUUID(),
            actor: newRequest.ownerName,
            action: 'Submitted website request',
            target: newRequest.storeName,
            detail: newRequest.ownerEmail,
            ts: Date.now(),
          }), ...state.auditLogs].slice(0, 200),
        }));
        return id;
      },
      updateShopRequestStatus: (id, status) => {
        set((state) => ({
          shopRequests: state.shopRequests.map((request) => (request.id === id ? { ...request, status, reviewedAt: Date.now() } : request)),
          auditLogs: [normalizeAuditLog({
            id: crypto.randomUUID(),
            actor: get().currentUser?.name || 'Website Owner',
            action: `Set website request to ${status}`,
            target: state.shopRequests.find((request) => request.id === id)?.storeName || id,
            ts: Date.now(),
          }), ...state.auditLogs].slice(0, 200),
        }));
      },
      approveShopRequest: (id, setup) => {
        const state = get();
        const request = state.shopRequests.find((item) => item.id === id);
        if (!request) return undefined;
        if (request.status !== 'IN_REVIEW') return undefined;
        if (!setup.logoEmoji.trim() || !setup.themeId.trim() || !setup.about.trim()) return undefined;

        const baseSlug = slugify(request.storeName);
        let slug = baseSlug;
        while (state.stores.some((store) => store.slug === slug)) {
          slug = `${baseSlug}-${Math.random().toString(36).substring(2, 6)}`;
        }

        const storeId = crypto.randomUUID();
        const newStore: Store = normalizeStore({
          id: storeId,
          slug,
          name: request.storeName,
          tagline: request.tagline,
          category: request.category,
          logoEmoji: setup.logoEmoji.trim(),
          announcement: setup.announcement || '',
          about: setup.about.trim(),
          shipping: setup.shipping,
          themeId: setup.themeId.trim(),
          currency: 'USD',
          status: 'ACTIVE',
          reviewStatus: 'APPROVED',
          ownerId: shopOwner.id,
          createdAt: Date.now(),
        });
        const newProducts = (setup.products || []).map((item, index) => normalizeProduct({
          ...item,
          id: crypto.randomUUID(),
          storeId,
          createdAt: Date.now() - index,
        }));

        set((state) => ({
          stores: [newStore, ...state.stores],
          products: [...newProducts, ...state.products],
          ownerStatuses: { ...state.ownerStatuses, [shopOwner.id]: 'ACTIVE' },
          shopRequests: state.shopRequests.map((item) => (item.id === id ? { ...item, status: 'APPROVED', storeId, reviewedAt: Date.now() } : item)),
          auditLogs: [normalizeAuditLog({
            id: crypto.randomUUID(),
            actor: get().currentUser?.name || 'Website Owner',
            action: 'Approved website request and created standard storefront',
            target: newStore.name,
            detail: `${request.ownerEmail} · ${newStore.themeId} theme · ${newProducts.length} team-added products`,
            ts: Date.now(),
          }), ...state.auditLogs].slice(0, 200),
        }));
        return storeId;
      },
      addAuditLog: (action, target, detail) => {
        set((state) => ({
          auditLogs: [normalizeAuditLog({
            id: crypto.randomUUID(),
            actor: get().currentUser?.name || 'Website Owner',
            action,
            target,
            detail,
            ts: Date.now(),
          }), ...state.auditLogs].slice(0, 200),
        }));
      },

      placeOrder: (o) => {
        const id = crypto.randomUUID();
        const state = get();
        const store = state.stores.find((s) => s.id === o.storeId);
        if (!store) throw new Error('Store not found');
        const cartItems = o.items ?? state.carts[o.storeId] ?? [];
        const discountCode = o.discountCode?.trim().toUpperCase();
        const discount = discountCode ? state.discounts.find((d) => d.storeId === o.storeId && d.code === discountCode) : undefined;
        const summary = computeOrderSummary(store, state.products, cartItems, discount);
        if (summary.items.length === 0) throw new Error('No order items');

        const order: Order = {
          id,
          storeId: o.storeId,
          customerName: o.customerName,
          customerEmail: o.customerEmail,
          status: 'PENDING',
          items: summary.items,
          subtotalCents: summary.subtotalCents,
          discountCents: summary.discountCents,
          shippingCents: summary.shippingCents,
          discountCode: summary.discountCode,
          note: o.note?.trim() || undefined,
          totalCents: summary.totalCents,
          createdAt: Date.now(),
        };

        set((state) => ({
          orders: [order, ...state.orders],
          analyticsEvents: pruneAnalyticsEvents([
            { id: crypto.randomUUID(), storeId: o.storeId, type: 'order', ts: Date.now() },
            ...state.analyticsEvents,
          ]),
          discounts: summary.discountCode
            ? state.discounts.map((d) => (d.storeId === o.storeId && d.code === summary.discountCode ? { ...d, usedCount: d.usedCount + 1 } : d))
            : state.discounts,
          carts: { ...state.carts, [o.storeId]: [] },
        }));
        return id;
      },
      approveOrder: (id) => {
        set((state) => ({
          orders: state.orders.map((o) => (o.id === id ? { ...o, status: 'APPROVED' } : o)),
        }));
      },
      rejectOrder: (id) => {
        set((state) => ({
          orders: state.orders.map((o) => (o.id === id ? { ...o, status: 'REJECTED' } : o)),
        }));
      },
      fulfillOrder: (id) => {
        set((state) => ({
          orders: state.orders.map((o) => (o.id === id ? { ...o, status: 'FULFILLED' } : o)),
        }));
      },

      resetDemo: () => {
        set({
          stores: seedStores.map(normalizeStore),
          products: seedProducts.map(normalizeProduct),
          orders: seedOrders.map(normalizeOrder),
          discounts: seedDiscounts.map(normalizeDiscount),
          analyticsEvents: pruneAnalyticsEvents(seedAnalyticsEvents),
          platformSettings: normalizePlatformSettings(seedPlatformSettings),
          supportTickets: seedSupportTickets.map(normalizeSupportTicket),
          productFlags: seedProductFlags.map(normalizeProductFlag),
          shopRequests: seedShopRequests.map(normalizeShopRequest),
          auditLogs: seedAuditLogs.map(normalizeAuditLog),
          ownerStatuses: seedOwnerStatuses,
          carts: {},
          currentUser: null,
        });
      },
    }),
    {
      name: 'plinth-v1',
      version: 6,
      migrate: (persisted: any) => {
        const state = persisted?.state ? persisted.state : persisted;
        return {
          ...state,
          stores: (state?.stores || seedStores).map(normalizeStore),
          products: (state?.products || seedProducts).map(normalizeProduct),
          orders: (state?.orders || seedOrders).map(normalizeOrder),
          discounts: (state?.discounts || seedDiscounts).map(normalizeDiscount),
          analyticsEvents: pruneAnalyticsEvents(state?.analyticsEvents || seedAnalyticsEvents),
          platformSettings: normalizePlatformSettings(state?.platformSettings || seedPlatformSettings),
          supportTickets: (state?.supportTickets || seedSupportTickets).map(normalizeSupportTicket),
          productFlags: (state?.productFlags || seedProductFlags).map(normalizeProductFlag),
          shopRequests: (state?.shopRequests || seedShopRequests).map(normalizeShopRequest),
          auditLogs: (state?.auditLogs || seedAuditLogs).map(normalizeAuditLog),
          ownerStatuses: state?.ownerStatuses || seedOwnerStatuses,
          carts: state?.carts || {},
          currentUser: state?.currentUser ?? null,
        };
      },
    }
  )
);
