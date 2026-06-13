import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { computeOrderSummary } from './checkout';
import { AnalyticsEvent, AnalyticsEventType, AuditLog, Discount, Order, OrderStatus, OwnerStatus, PlatformSettings, Product, ProductFlag, Role, ShopRequest, ShopRequestStatus, Store, StorePlan, StoreReviewStatus, StoreStatus, SupportTicket, TicketStatus, User } from './types';
import { BootstrapPayload, credentialsForRole, getBootstrap } from '@/api/bootstrap.api';
import { login, logout as logoutApi, refreshSession, changePassword as changePasswordApi } from '@/api/auth.api';
import { getPublicStore, placePublicOrder, trackAnalytics } from '@/api/storefront.api';
import { submitShopRequest as submitPublicShopRequest } from '@/api/shopRequests.api';
import * as adminApi from '@/api/admin.api';
import * as platformApi from '@/api/platform.api';
import { configureApiClient } from '@/api/client';
import { CartVariantLine } from './productOptions';

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
  storefrontTemplate: store.storefrontTemplate ?? 'editorial',
  themeOverrides: store.themeOverrides ?? undefined,
  isFeatured: store.isFeatured ?? false,
  welcomeDismissed: store.welcomeDismissed ?? false,
  paymentConfirmed: store.paymentConfirmed ?? true,
  plan: store.plan ?? 'STARTER',
  planStatus: store.planStatus ?? 'TRIAL',
});

const normalizeProduct = (product: Product): Product => ({
  ...product,
  details: product.details ?? {},
  category: product.category ?? '',
  collection: product.collection ?? '',
  tags: product.tags ?? [],
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

const DEFAULT_PLATFORM_SETTINGS: PlatformSettings = {
  platformName: 'Matjari Jordan',
  defaultCurrency: 'USD',
  categories: ['Apparel', 'Home', 'Beauty', 'Food', 'Electronics'],
  globalAnnouncement: '',
  maintenanceMode: false,
  supportEmail: 'support@example.com',
  auditCap: 500,
  autoFlagThreshold: 3,
};

const normalizePlatformSettings = (settings?: Partial<PlatformSettings>): PlatformSettings => ({
  platformName: settings?.platformName ?? DEFAULT_PLATFORM_SETTINGS.platformName,
  defaultCurrency: settings?.defaultCurrency ?? DEFAULT_PLATFORM_SETTINGS.defaultCurrency,
  categories: settings?.categories ?? DEFAULT_PLATFORM_SETTINGS.categories,
  globalAnnouncement: settings?.globalAnnouncement ?? '',
  maintenanceMode: settings?.maintenanceMode ?? false,
  supportEmail: settings?.supportEmail ?? DEFAULT_PLATFORM_SETTINGS.supportEmail,
  auditCap: settings?.auditCap ?? DEFAULT_PLATFORM_SETTINGS.auditCap,
  autoFlagThreshold: settings?.autoFlagThreshold ?? DEFAULT_PLATFORM_SETTINGS.autoFlagThreshold,
});

const normalizeSupportTicket = (ticket: SupportTicket): SupportTicket => ({
  ...ticket,
  status: ticket.status ?? 'OPEN',
  priority: ticket.priority ?? 'MEDIUM',
  // Backfill a thread from the original single message for tickets saved before threads existed.
  messages: ticket.messages && ticket.messages.length > 0
    ? ticket.messages
    : [{ id: crypto.randomUUID(), from: 'OWNER', body: ticket.message, ts: ticket.createdAt ?? Date.now() }],
  createdAt: ticket.createdAt ?? Date.now(),
});

const normalizeProductFlag = (flag: ProductFlag): ProductFlag => ({
  ...flag,
  status: flag.status ?? 'OPEN',
  severity: flag.severity ?? 'MEDIUM',
  reporter: flag.reporter ?? 'Platform review',
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

/**
 * Per-store authorization guard. A mutation may proceed only when the current
 * user owns the target store, or is a platform owner. Returns false when there
 * is no user, so admin actions are inert before sign-in.
 */
const canManage = (currentUser: User | null, stores: Store[], storeId: string) => {
  if (!currentUser) return false;
  if (currentUser.role === 'PLATFORM_OWNER') return true;
  return stores.some((store) => store.id === storeId && store.ownerId === currentUser.id);
};

/** Keys a shop owner must never change through an admin store edit (scope / ownership / platform-controlled). */
const PROTECTED_STORE_KEYS = ['id', 'ownerId', 'createdAt', 'status', 'reviewStatus', 'suspensionReason', 'internalNote', 'isFeatured'];

/**
 * Store update payload. The listed fields accept null meaning "clear the stored
 * value" — undefined keys are dropped from JSON, so null is the only way to
 * erase a previously saved value through the PATCH API.
 */
export type StorePatch = Omit<Partial<Store>, 'logoUrl' | 'logoEmoji' | 'contactPhone' | 'address'> & {
  logoUrl?: string | null;
  logoEmoji?: string | null;
  contactPhone?: string | null;
  address?: string | null;
};

export type ShopApprovalSetup = {
  logoEmoji?: string;
  themeId?: string;
  announcement?: string;
  about?: string;
  shipping?: Store['shipping'];
  products?: Omit<Product, 'id' | 'storeId' | 'createdAt'>[];
};

export type ShopCredentials = {
  storeName: string;
  email: string;
  username: string;
  // Present only for the legacy generated-password path; self-service owners use
  // the password they chose at request time.
  password?: string;
  selfService?: boolean;
};

const defaultAbout = (request: ShopRequest) => [
  `${request.storeName} is a ${request.category.toLowerCase()} shop built around ${request.tagline.toLowerCase()}.`,
  request.notes ? `Customer request: ${request.notes}` : '',
  'Orders are reviewed before fulfillment so inventory, delivery details, and customer notes stay accurate.',
].filter(Boolean).join('\n\n');

const emptyPlatformSettings = normalizePlatformSettings(DEFAULT_PLATFORM_SETTINGS);

const stateFromBootstrap = (payload: BootstrapPayload) => ({
  currentUser: payload.currentUser,
  stores: payload.stores.map(normalizeStore),
  products: payload.products.map(normalizeProduct),
  orders: payload.orders.map(normalizeOrder),
  discounts: payload.discounts.map(normalizeDiscount),
  analyticsEvents: pruneAnalyticsEvents(payload.analyticsEvents),
  platformSettings: normalizePlatformSettings(payload.platformSettings),
  supportTickets: payload.supportTickets.map(normalizeSupportTicket),
  productFlags: payload.productFlags.map(normalizeProductFlag),
  shopRequests: payload.shopRequests.map(normalizeShopRequest),
  auditLogs: payload.auditLogs.map(normalizeAuditLog),
  ownerStatuses: payload.ownerStatuses,
});

type CartItem = CartVariantLine;

interface AppState {
  currentUser: User | null;
  token: string | null;
  refreshToken: string | null;
  isHydrating: boolean;
  apiError: string | null;
  shopCredentials: ShopCredentials | null;
  clearShopCredentials: () => void;
  initializeBackend: () => Promise<void>;
  loadBootstrap: () => Promise<void>;
  loadPublicStore: (slug: string) => Promise<void>;
  signIn: (identifier: string, password: string) => Promise<User>;
  signInAs: (role: Role, email?: string, name?: string) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  refreshAccessToken: () => Promise<string | null>;
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
  // Timestamp the operator last opened the notifications panel; anything newer is "unread".
  lastSeenNotificationsAt: number;

  updateCart: (storeId: string, items: CartItem[]) => void;
  clearCart: (storeId: string) => void;

  // store CRUD
  createStore: (input: Omit<Store, 'id' | 'slug' | 'createdAt' | 'status' | 'ownerId'> & { products?: Omit<Product, 'id' | 'storeId' | 'createdAt'>[] }) => string;
  // Resolves true when persisted; false when the API rejected the update (details in apiError).
  updateStore: (id: string, patch: StorePatch) => Promise<boolean>;
  setStoreStatus: (id: string, status: StoreStatus) => void;
  reviewStore: (id: string, reviewStatus: StoreReviewStatus, note?: string) => void;
  suspendStore: (id: string, reason: string) => void;
  deletePlatformStore: (id: string) => Promise<void>;

  // product CRUD — scoped to a store; each verifies ownership + record↔store match
  addProduct: (storeId: string, p: Omit<Product, 'id' | 'storeId' | 'createdAt'>) => Promise<void>;
  updateProduct: (storeId: string, id: string, patch: Partial<Product>) => Promise<void>;
  deleteProduct: (storeId: string, id: string) => void;

  // discount CRUD — scoped to a store
  addDiscount: (storeId: string, discount: Omit<Discount, 'id' | 'storeId' | 'createdAt' | 'usedCount'>) => void;
  updateDiscount: (storeId: string, id: string, patch: Partial<Discount>) => void;
  deleteDiscount: (storeId: string, id: string) => void;

  // analytics
  recordEvent: (storeId: string, type: AnalyticsEventType, productId?: string) => void;

  // platform controls
  updatePlatformSettings: (patch: Partial<PlatformSettings>) => void;
  setOwnerStatus: (ownerId: string, status: OwnerStatus) => void;
  addSupportTicket: (ticket: Omit<SupportTicket, 'id' | 'createdAt'>) => void;
  updateSupportTicket: (id: string, patch: Partial<SupportTicket>) => void;
  addProductFlag: (flag: Omit<ProductFlag, 'id' | 'createdAt' | 'status'>) => void;
  resolveProductFlag: (id: string) => void;
  submitShopRequest: (request: Omit<ShopRequest, 'id' | 'status' | 'createdAt'> & { username: string; password: string }) => Promise<string>;
  updateShopRequestStatus: (id: string, status: ShopRequestStatus) => void;
  approveShopRequest: (id: string, setup?: ShopApprovalSetup) => string | undefined;
  rejectShopRequest: (id: string, reason: string) => void;
  addAuditLog: (action: string, target: string, detail?: string) => void;

  // Subscription billing (manual): change tier / record an off-platform payment.
  setStorePlan: (id: string, plan: StorePlan) => Promise<boolean>;
  recordPlanPayment: (id: string) => Promise<boolean>;
  /** Onboarding gate: upload a payment-proof image (data URL). Returns the updated request. */
  submitPaymentProof: (storeId: string, dataUrl: string) => Promise<ShopRequest>;
  /** Re-fetch the owner's store(s) so paymentConfirmed flips to true once the platform approves. */
  refreshStores: () => Promise<void>;
  toggleFeatured: (id: string) => void;

  // moderation
  resolveFlag: (id: string, resolution: 'DISMISSED' | 'ACTIONED') => void;
  unpublishProduct: (id: string) => void;

  // support inbox
  replyToTicket: (id: string, body: string, attachmentUrl?: string) => void;
  setTicketStatus: (id: string, status: TicketStatus) => void;
  assignTicket: (id: string, assignee: string) => void;
  /** Upsert a ticket received from an SSE event — add or replace without a full bootstrap. */
  applyTicketUpdate: (ticket: SupportTicket) => void;
  /** Mark a ticket as read by the store owner (clears the unread badge). */
  markTicketAsRead: (storeId: string, ticketId: string) => void;
  /** Dismiss the first-login welcome banner for a store (persisted to backend). */
  dismissWelcome: (storeId: string) => Promise<void>;
  /** Upsert a shop request received via SSE — add or replace without a full bootstrap. */
  applyShopRequestUpdate: (request: ShopRequest) => void;

  // notifications
  markNotificationsSeen: () => void;

  // orders
  placeOrder: (o: { storeId: string; slug?: string; customerName: string; customerEmail?: string; customerPhone?: string; shippingAddress?: string; items?: CartItem[]; discountCode?: string; note?: string; idempotencyKey?: string }) => Promise<string>;
  approveOrder: (storeId: string, id: string) => void;
  rejectOrder: (storeId: string, id: string) => void;
  fulfillOrder: (storeId: string, id: string) => void;

  clearSession: () => void;
}

// One-time storage-key rename (Plinth → Matjari rebrand): move the persisted
// state so existing sessions and carts survive. Runs before the store hydrates.
if (typeof localStorage !== 'undefined') {
  try {
    const legacy = localStorage.getItem('plinth-v1');
    if (legacy && !localStorage.getItem('matjari-v1')) {
      localStorage.setItem('matjari-v1', legacy);
      localStorage.removeItem('plinth-v1');
    }
  } catch { /* storage unavailable — start fresh */ }
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      currentUser: null,
      token: null,
      refreshToken: null,
      isHydrating: false,
      apiError: null,
      shopCredentials: null,
      stores: [],
      products: [],
      orders: [],
      discounts: [],
      analyticsEvents: [],
      platformSettings: emptyPlatformSettings,
      supportTickets: [],
      productFlags: [],
      shopRequests: [],
      auditLogs: [],
      ownerStatuses: {},
      carts: {},
      lastSeenNotificationsAt: 0,

      updateCart: (storeId, items) => set((state) => ({ carts: { ...state.carts, [storeId]: items } })),
      clearCart: (storeId) => set((state) => ({ carts: { ...state.carts, [storeId]: [] } })),

      initializeBackend: async () => {
        const token = get().token;
        if (!token) return;
        // A shop owner with a pending one-time-password change can't load app data
        // yet; the UI shows the change-password screen instead.
        if (get().currentUser?.mustChangePassword) return;
        set({ isHydrating: true, apiError: null });
        try {
          await get().loadBootstrap();
        } catch (error) {
          console.error(error);
          set({ currentUser: null, token: null, refreshToken: null, apiError: error instanceof Error ? error.message : 'Could not connect to backend.' });
        } finally {
          set({ isHydrating: false });
        }
      },

      loadBootstrap: async () => {
        const token = get().token;
        if (!token) return;
        const payload = await getBootstrap(token);
        set({ ...stateFromBootstrap(payload), apiError: null });
      },

      loadPublicStore: async (slug) => {
        const payload = await getPublicStore(slug);
        set((state) => ({
          stores: [normalizeStore(payload.store), ...state.stores.filter((store) => store.id !== payload.store.id)],
          products: [
            ...payload.products.map(normalizeProduct),
            ...state.products.filter((product) => product.storeId !== payload.store.id),
          ],
          discounts: [
            ...payload.discounts.map(normalizeDiscount),
            ...state.discounts.filter((discount) => discount.storeId !== payload.store.id),
          ],
        }));
      },

      signIn: async (identifier, password) => {
        const auth = await login(identifier, password);
        set({ token: auth.token, refreshToken: auth.refreshToken, currentUser: auth.user, apiError: null });
        // Defer data load until any forced password change is completed.
        if (!auth.user.mustChangePassword) await get().loadBootstrap();
        return auth.user;
      },

      signInAs: async (role) => {
        const credentials = credentialsForRole(role);
        if (!credentials.password) throw new Error('Use the generated shop-admin password from the approval response.');
        await get().signIn(credentials.identifier, credentials.password);
      },

      changePassword: async (currentPassword, newPassword) => {
        const auth = await changePasswordApi(currentPassword, newPassword);
        set({ token: auth.token, refreshToken: auth.refreshToken, currentUser: auth.user, apiError: null });
        await get().loadBootstrap();
      },

      // Called transparently by the API client on a 401. Returns a fresh access token
      // or null when the session is truly gone.
      refreshAccessToken: async () => {
        const refreshToken = get().refreshToken;
        try {
          const auth = await refreshSession(refreshToken);
          set({ token: auth.token, refreshToken: auth.refreshToken, currentUser: auth.user });
          return auth.token;
        } catch {
          set({ currentUser: null, token: null, refreshToken: null });
          return null;
        }
      },

      signOut: () => {
        void logoutApi().catch(() => undefined);
        get().clearSession();
      },

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
          storefrontTemplate: input.storefrontTemplate || 'editorial',
          themeOverrides: input.themeOverrides,
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
          }), ...state.auditLogs].slice(0, state.platformSettings.auditCap),
        }));

        return id;
      },
      updateStore: async (id, patch) => {
        const token = get().token;
        if (token) {
          const { shipping, ...rest } = patch;
          try {
            await adminApi.updateAdminStore(id, { ...rest, shipping });
            await get().loadBootstrap();
            return true;
          } catch (error) {
            set({ apiError: error instanceof Error ? error.message : 'Could not update store.' });
            return false;
          }
        }
        set((state) => {
          if (!canManage(state.currentUser, state.stores, id)) return state;
          // null means "clear" — map to undefined so the local Store shape stays consistent.
          const safePatch = Object.fromEntries(
            Object.entries(patch).map(([key, value]) => [key, value === null ? undefined : value]),
          ) as Partial<Store>;
          PROTECTED_STORE_KEYS.forEach((key) => delete (safePatch as Record<string, unknown>)[key]);
          return { stores: state.stores.map((s) => (s.id === id ? { ...s, ...safePatch } : s)) };
        });
        return true;
      },
      setStoreStatus: (id, status) => {
        const token = get().token;
        if (token) {
          (status === 'ACTIVE' ? platformApi.reactivateStore(id) : platformApi.suspendStore(id))
            .then(() => get().loadBootstrap())
            .catch((error) => set({ apiError: error instanceof Error ? error.message : 'Could not update store status.' }));
          return;
        }
        set((state) => ({
          stores: state.stores.map((s) => (s.id === id ? { ...s, status } : s)),
          auditLogs: [normalizeAuditLog({
            id: crypto.randomUUID(),
            actor: get().currentUser?.name || 'Website Owner',
            action: `${status === 'ACTIVE' ? 'Activated' : 'Suspended'} store`,
            target: state.stores.find((s) => s.id === id)?.name || id,
            ts: Date.now(),
          }), ...state.auditLogs].slice(0, state.platformSettings.auditCap),
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
          }), ...state.auditLogs].slice(0, state.platformSettings.auditCap),
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
          }), ...state.auditLogs].slice(0, state.platformSettings.auditCap),
        }));
      },

      // Permanently delete a store (and its data) on the backend, then refresh.
      deletePlatformStore: async (id) => {
        await platformApi.deleteStore(id);
        await get().loadBootstrap();
      },

      addProduct: async (storeId, p) => {
        const token = get().token;
        if (token) {
          // Surface failures to the caller so the UI can show a real error instead
          // of an optimistic "success" toast, and keep the edit form open.
          try {
            await adminApi.createProduct(storeId, p);
            await get().loadBootstrap();
          } catch (error) {
            set({ apiError: error instanceof Error ? error.message : 'Could not add product.' });
            throw error;
          }
          return;
        }
        if (!canManage(get().currentUser, get().stores, storeId)) return;
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
      updateProduct: async (storeId, id, patch) => {
        const token = get().token;
        if (token) {
          try {
            await adminApi.updateProduct(storeId, id, patch);
            await get().loadBootstrap();
          } catch (error) {
            set({ apiError: error instanceof Error ? error.message : 'Could not update product.' });
            throw error;
          }
          return;
        }
        set((state) => {
          const product = state.products.find((p) => p.id === id);
          if (!product || product.storeId !== storeId || !canManage(state.currentUser, state.stores, storeId)) return state;
          const { id: _id, storeId: _storeId, ...safePatch } = patch;
          return { products: state.products.map((p) => (p.id === id ? { ...p, ...safePatch } : p)) };
        });
      },
      deleteProduct: (storeId, id) => {
        const token = get().token;
        if (token) {
          adminApi.deleteProduct(storeId, id)
            .then(() => get().loadBootstrap())
            .catch((error) => set({ apiError: error instanceof Error ? error.message : 'Could not delete product.' }));
          return;
        }
        set((state) => {
          const product = state.products.find((p) => p.id === id);
          if (!product || product.storeId !== storeId || !canManage(state.currentUser, state.stores, storeId)) return state;
          return { products: state.products.filter((p) => p.id !== id) };
        });
      },

      addDiscount: (storeId, discount) => {
        const token = get().token;
        if (token) {
          adminApi.createDiscount(storeId, discount)
            .then(() => get().loadBootstrap())
            .catch((error) => set({ apiError: error instanceof Error ? error.message : 'Could not add discount.' }));
          return;
        }
        if (!canManage(get().currentUser, get().stores, storeId)) return;
        const normalized = normalizeDiscount({
          ...discount,
          id: crypto.randomUUID(),
          storeId,
          usedCount: 0,
          createdAt: Date.now(),
        });
        set((state) => ({ discounts: [normalized, ...state.discounts] }));
      },
      updateDiscount: (storeId, id, patch) => {
        const token = get().token;
        if (token) {
          adminApi.updateDiscount(storeId, id, patch)
            .then(() => get().loadBootstrap())
            .catch((error) => set({ apiError: error instanceof Error ? error.message : 'Could not update discount.' }));
          return;
        }
        set((state) => {
          const discount = state.discounts.find((d) => d.id === id);
          if (!discount || discount.storeId !== storeId || !canManage(state.currentUser, state.stores, storeId)) return state;
          const { id: _id, storeId: _storeId, ...safePatch } = patch;
          return { discounts: state.discounts.map((d) => (d.id === id ? normalizeDiscount({ ...d, ...safePatch }) : d)) };
        });
      },
      deleteDiscount: (storeId, id) => {
        const token = get().token;
        if (token) {
          adminApi.deleteDiscount(storeId, id)
            .then(() => get().loadBootstrap())
            .catch((error) => set({ apiError: error instanceof Error ? error.message : 'Could not delete discount.' }));
          return;
        }
        set((state) => {
          const discount = state.discounts.find((d) => d.id === id);
          if (!discount || discount.storeId !== storeId || !canManage(state.currentUser, state.stores, storeId)) return state;
          return { discounts: state.discounts.filter((d) => d.id !== id) };
        });
      },

      recordEvent: (storeId, type, productId) => {
        const store = get().stores.find((item) => item.id === storeId);
        if (store && type !== 'order') {
          trackAnalytics(store.slug, { type, productId }).catch(() => undefined);
        }
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
        const token = get().token;
        if (token) {
          platformApi.updatePlatformSettings(patch)
            .then(() => get().loadBootstrap())
            .catch((error) => set({ apiError: error instanceof Error ? error.message : 'Could not update platform settings.' }));
          return;
        }
        set((state) => ({
          platformSettings: normalizePlatformSettings({ ...state.platformSettings, ...patch }),
          auditLogs: [normalizeAuditLog({
            id: crypto.randomUUID(),
            actor: get().currentUser?.name || 'Website Owner',
            action: 'Updated platform settings',
            target: 'Platform settings',
            ts: Date.now(),
          }), ...state.auditLogs].slice(0, state.platformSettings.auditCap),
        }));
      },
      setOwnerStatus: (ownerId, status) => {
        const token = get().token;
        if (token) {
          const store = get().stores.find((item) => item.ownerId === ownerId);
          if (store) {
            platformApi.setOwnerStatus(store.id, status)
              .then(() => get().loadBootstrap())
              .catch((error) => set({ apiError: error instanceof Error ? error.message : 'Could not update owner status.' }));
            return;
          }
        }
        set((state) => ({
          ownerStatuses: { ...state.ownerStatuses, [ownerId]: status },
          auditLogs: [normalizeAuditLog({
            id: crypto.randomUUID(),
            actor: get().currentUser?.name || 'Website Owner',
            action: `Set owner status to ${status}`,
            target: ownerId,
            ts: Date.now(),
          }), ...state.auditLogs].slice(0, state.platformSettings.auditCap),
        }));
      },
      addSupportTicket: (ticket) => {
        const token = get().token;
        if (token && ticket.storeId) {
          adminApi.createSupportTicket(ticket.storeId, ticket)
            .then(() => get().loadBootstrap())
            .catch((error) => set({ apiError: error instanceof Error ? error.message : 'Could not create support ticket.' }));
          return;
        }
        const newTicket = normalizeSupportTicket({ ...ticket, id: crypto.randomUUID(), createdAt: Date.now() });
        set((state) => ({
          supportTickets: [newTicket, ...state.supportTickets],
          auditLogs: [normalizeAuditLog({
            id: crypto.randomUUID(),
            actor: get().currentUser?.name || 'Website Owner',
            action: 'Created support ticket',
            target: newTicket.subject,
            ts: Date.now(),
          }), ...state.auditLogs].slice(0, state.platformSettings.auditCap),
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
          }), ...state.auditLogs].slice(0, state.platformSettings.auditCap),
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
          }), ...state.auditLogs].slice(0, state.platformSettings.auditCap),
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
          }), ...state.auditLogs].slice(0, state.platformSettings.auditCap),
        }));
      },
      submitShopRequest: async (request) => {
        const { request: created } = await submitPublicShopRequest(request);
        set((state) => ({ shopRequests: [normalizeShopRequest(created), ...state.shopRequests.filter((item) => item.id !== created.id)] }));
        return created.id;
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
          }), ...state.auditLogs].slice(0, state.platformSettings.auditCap),
        }));
      },
      approveShopRequest: (id, setup = {}) => {
        const token = get().token;
        if (token) {
          platformApi.approveShopRequest(id)
            .then(({ store, owner, credentials, selfService }) => {
              if (credentials) {
                set({
                  shopCredentials: {
                    storeName: store.name,
                    email: owner.email,
                    username: credentials.username,
                    password: credentials.password,
                    selfService,
                  },
                });
              }
              return get().loadBootstrap();
            })
            .catch((error) => set({ apiError: error instanceof Error ? error.message : 'Could not approve shop request.' }));
          return undefined;
        }
        const state = get();
        const request = state.shopRequests.find((item) => item.id === id);
        if (!request) return undefined;

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
          logoEmoji: setup.logoEmoji || '🛍️',
          announcement: setup.announcement || '',
          about: setup.about || defaultAbout(request),
          shipping: setup.shipping || { type: 'FLAT', flatCents: 0 },
          themeId: setup.themeId || 'mono',
          storefrontTemplate: 'editorial',
          currency: 'USD',
          status: 'ACTIVE',
          reviewStatus: 'APPROVED',
          ownerId: get().currentUser?.id || 'local-shop-owner',
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
          ownerStatuses: { ...state.ownerStatuses, [get().currentUser?.id || 'local-shop-owner']: 'ACTIVE' },
          shopRequests: state.shopRequests.map((item) => (item.id === id ? { ...item, status: 'APPROVED', storeId, reviewedAt: Date.now() } : item)),
          auditLogs: [normalizeAuditLog({
            id: crypto.randomUUID(),
            actor: get().currentUser?.name || 'Website Owner',
            action: 'Approved website request and created standard storefront',
            target: newStore.name,
            detail: `${request.ownerEmail} · ${newStore.themeId} theme · ${newProducts.length} team-added products`,
            ts: Date.now(),
          }), ...state.auditLogs].slice(0, state.platformSettings.auditCap),
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
          }), ...state.auditLogs].slice(0, state.platformSettings.auditCap),
        }));
      },

      rejectShopRequest: (id, reason) => {
        const token = get().token;
        if (token) {
          platformApi.rejectShopRequest(id, reason)
            .then(() => get().loadBootstrap())
            .catch((error) => set({ apiError: error instanceof Error ? error.message : 'Could not reject shop request.' }));
          return;
        }
        set((state) => ({
          shopRequests: state.shopRequests.map((request) => (request.id === id ? { ...request, status: 'REJECTED', rejectionReason: reason, reviewedAt: Date.now() } : request)),
          auditLogs: [normalizeAuditLog({
            id: crypto.randomUUID(),
            actor: get().currentUser?.name || 'Website Owner',
            action: 'Rejected website request',
            target: state.shopRequests.find((request) => request.id === id)?.storeName || id,
            detail: reason,
            ts: Date.now(),
          }), ...state.auditLogs].slice(0, state.platformSettings.auditCap),
        }));
      },

      setStorePlan: async (id, plan) => {
        const token = get().token;
        if (token) {
          try {
            await platformApi.setStorePlan(id, plan);
            await get().loadBootstrap();
            return true;
          } catch (error) {
            set({ apiError: error instanceof Error ? error.message : 'Could not change the plan.' });
            return false;
          }
        }
        set((state) => ({ stores: state.stores.map((store) => (store.id === id ? { ...store, plan } : store)) }));
        return true;
      },

      recordPlanPayment: async (id) => {
        const token = get().token;
        if (token) {
          try {
            await platformApi.recordStorePlanPayment(id);
            await get().loadBootstrap();
            return true;
          } catch (error) {
            set({ apiError: error instanceof Error ? error.message : 'Could not record the payment.' });
            return false;
          }
        }
        set((state) => ({
          stores: state.stores.map((store) => (store.id === id
            ? { ...store, planStatus: 'ACTIVE', planPaidUntil: Date.now() + 30 * 24 * 60 * 60 * 1000 }
            : store)),
        }));
        return true;
      },


      submitPaymentProof: async (storeId, dataUrl) => {
        const { request } = await adminApi.submitPaymentProof(storeId, { dataUrl });
        return request;
      },
      refreshStores: async () => {
        const { stores } = await adminApi.listAdminStores();
        const normalized = stores.map(normalizeStore);
        const ids = new Set(normalized.map((s) => s.id));
        set((state) => ({ stores: [...normalized, ...state.stores.filter((s) => !ids.has(s.id))] }));
      },

      toggleFeatured: (id) => {
        const token = get().token;
        if (token) {
          const store = get().stores.find((item) => item.id === id);
          (store?.isFeatured ? platformApi.unfeatureStore(id) : platformApi.featureStore(id))
            .then(() => get().loadBootstrap())
            .catch((error) => set({ apiError: error instanceof Error ? error.message : 'Could not update featured state.' }));
          return;
        }
        set((state) => {
          const store = state.stores.find((item) => item.id === id);
          const next = !store?.isFeatured;
          return {
            stores: state.stores.map((item) => (item.id === id ? { ...item, isFeatured: next } : item)),
            auditLogs: [normalizeAuditLog({
              id: crypto.randomUUID(),
              actor: get().currentUser?.name || 'Website Owner',
              action: next ? 'Featured store' : 'Unfeatured store',
              target: store?.name || id,
              ts: Date.now(),
            }), ...state.auditLogs].slice(0, state.platformSettings.auditCap),
          };
        });
      },

      resolveFlag: (id, resolution) => {
        const token = get().token;
        if (token) {
          (resolution === 'DISMISSED' ? platformApi.dismissFlag(id) : platformApi.actionFlag(id))
            .then(() => get().loadBootstrap())
            .catch((error) => set({ apiError: error instanceof Error ? error.message : 'Could not update flag.' }));
          return;
        }
        set((state) => ({
          productFlags: state.productFlags.map((flag) => (flag.id === id ? { ...flag, status: resolution } : flag)),
          auditLogs: [normalizeAuditLog({
            id: crypto.randomUUID(),
            actor: get().currentUser?.name || 'Website Owner',
            action: resolution === 'DISMISSED' ? 'Dismissed product flag' : 'Actioned product flag',
            target: (() => {
              const flag = state.productFlags.find((item) => item.id === id);
              return state.products.find((p) => p.id === flag?.productId)?.name || flag?.productId || id;
            })(),
            ts: Date.now(),
          }), ...state.auditLogs].slice(0, state.platformSettings.auditCap),
        }));
      },

      unpublishProduct: (id) => {
        const token = get().token;
        const flag = get().productFlags.find((item) => item.productId === id && item.status === 'OPEN');
        if (token && flag) {
          platformApi.unpublishFlaggedProduct(flag.id)
            .then(() => get().loadBootstrap())
            .catch((error) => set({ apiError: error instanceof Error ? error.message : 'Could not unpublish product.' }));
          return;
        }
        set((state) => ({
          products: state.products.map((product) => (product.id === id ? { ...product, isActive: false } : product)),
          auditLogs: [normalizeAuditLog({
            id: crypto.randomUUID(),
            actor: get().currentUser?.name || 'Website Owner',
            action: 'Unpublished product',
            target: state.products.find((product) => product.id === id)?.name || id,
            ts: Date.now(),
          }), ...state.auditLogs].slice(0, state.platformSettings.auditCap),
        }));
      },

      replyToTicket: (id, body, attachmentUrl) => {
        const token = get().token;
        if (token) {
          const ticket = get().supportTickets.find((item) => item.id === id);
          (get().currentUser?.role === 'PLATFORM_OWNER'
            ? platformApi.replyToPlatformTicket(id, { body, attachmentUrl })
            : adminApi.replyToSupportTicket(ticket!.storeId!, id, { body, attachmentUrl }))
            .then(() => get().loadBootstrap())
            .catch((error) => set({ apiError: error instanceof Error ? error.message : 'Could not reply to ticket.' }));
          return;
        }
        const message = { id: crypto.randomUUID(), from: 'PLATFORM' as const, body, attachmentUrl, ts: Date.now() };
        set((state) => ({
          supportTickets: state.supportTickets.map((ticket) => (ticket.id === id
            ? normalizeSupportTicket({ ...ticket, status: ticket.status === 'OPEN' ? 'IN_PROGRESS' : ticket.status, messages: [...(ticket.messages || []), message] })
            : ticket)),
          auditLogs: [normalizeAuditLog({
            id: crypto.randomUUID(),
            actor: get().currentUser?.name || 'Website Owner',
            action: 'Replied to support ticket',
            target: state.supportTickets.find((ticket) => ticket.id === id)?.subject || id,
            ts: Date.now(),
          }), ...state.auditLogs].slice(0, state.platformSettings.auditCap),
        }));
      },

      applyTicketUpdate: (ticket) => {
        const normalized = normalizeSupportTicket(ticket);
        set((state) => {
          const exists = state.supportTickets.some((t) => t.id === normalized.id);
          return {
            supportTickets: exists
              ? state.supportTickets.map((t) => (t.id === normalized.id ? normalized : t))
              : [normalized, ...state.supportTickets],
          };
        });
      },

      markTicketAsRead: (storeId, ticketId) => {
        const now = Date.now();
        set((state) => ({
          supportTickets: state.supportTickets.map((t) =>
            t.id === ticketId ? normalizeSupportTicket({ ...t, ownerLastReadAt: now }) : t,
          ),
        }));
        adminApi.markSupportTicketRead(storeId, ticketId).catch(() => {});
      },

      setTicketStatus: (id, status) => {
        const token = get().token;
        if (token) {
          platformApi.updatePlatformTicketStatus(id, status)
            .then(() => get().loadBootstrap())
            .catch((error) => set({ apiError: error instanceof Error ? error.message : 'Could not update ticket status.' }));
          return;
        }
        set((state) => ({
          supportTickets: state.supportTickets.map((ticket) => (ticket.id === id ? normalizeSupportTicket({ ...ticket, status }) : ticket)),
          auditLogs: [normalizeAuditLog({
            id: crypto.randomUUID(),
            actor: get().currentUser?.name || 'Website Owner',
            action: `Set ticket status to ${status}`,
            target: state.supportTickets.find((ticket) => ticket.id === id)?.subject || id,
            ts: Date.now(),
          }), ...state.auditLogs].slice(0, state.platformSettings.auditCap),
        }));
      },

      assignTicket: (id, assignee) => {
        const token = get().token;
        if (token) {
          platformApi.assignTicketToMe(id)
            .then(() => get().loadBootstrap())
            .catch((error) => set({ apiError: error instanceof Error ? error.message : 'Could not assign ticket.' }));
          return;
        }
        set((state) => ({
          supportTickets: state.supportTickets.map((ticket) => (ticket.id === id ? normalizeSupportTicket({ ...ticket, assignedTo: assignee }) : ticket)),
          auditLogs: [normalizeAuditLog({
            id: crypto.randomUUID(),
            actor: get().currentUser?.name || 'Website Owner',
            action: 'Assigned support ticket',
            target: state.supportTickets.find((ticket) => ticket.id === id)?.subject || id,
            detail: assignee,
            ts: Date.now(),
          }), ...state.auditLogs].slice(0, state.platformSettings.auditCap),
        }));
      },

      dismissWelcome: async (storeId) => {
        set((state) => ({ stores: state.stores.map((s) => s.id === storeId ? { ...s, welcomeDismissed: true } : s) }));
        const token = get().token;
        if (token) {
          try {
            await adminApi.dismissWelcome(storeId);
          } catch {
            // best-effort — state is already updated optimistically
          }
        }
      },

      applyShopRequestUpdate: (request) => {
        const normalized = normalizeShopRequest(request);
        set((state) => {
          const exists = state.shopRequests.some((r) => r.id === normalized.id);
          return {
            shopRequests: exists
              ? state.shopRequests.map((r) => r.id === normalized.id ? normalized : r)
              : [normalized, ...state.shopRequests],
          };
        });
      },

      markNotificationsSeen: () => set({ lastSeenNotificationsAt: Date.now() }),
      clearShopCredentials: () => set({ shopCredentials: null }),

      placeOrder: async (o) => {
        const storeSlug = o.slug ?? get().stores.find((s) => s.id === o.storeId)?.slug;
        if (storeSlug) {
          const cartItems = o.items ?? get().carts[o.storeId] ?? [];
          const { order } = await placePublicOrder(storeSlug, {
            customerName: o.customerName,
            customerEmail: o.customerEmail,
            customerPhone: o.customerPhone,
            shippingAddress: o.shippingAddress,
            discountCode: o.discountCode,
            note: o.note,
            // Idempotency: a retried submit (double-click / network retry) reuses this key.
            idempotencyKey: o.idempotencyKey ?? crypto.randomUUID(),
            items: cartItems,
          });
          set((state) => ({
            orders: [normalizeOrder(order), ...state.orders.filter((item) => item.id !== order.id)],
            carts: { ...state.carts, [o.storeId]: [] },
          }));
          return order.id;
        }
        const id = crypto.randomUUID();
        const state = get();
        const fallbackStore = state.stores.find((s) => s.id === o.storeId);
        if (!fallbackStore) throw new Error('Store not found');
        const cartItems = o.items ?? state.carts[o.storeId] ?? [];
        const discountCode = o.discountCode?.trim().toUpperCase();
        const discount = discountCode ? state.discounts.find((d) => d.storeId === o.storeId && d.code === discountCode) : undefined;
        const summary = computeOrderSummary(fallbackStore, state.products, cartItems, discount);
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
      approveOrder: (storeId, id) => {
        const token = get().token;
        if (token) {
          // Single authority: the store-scoped endpoint. Platform owners reach it via
          // their oversight store access.
          adminApi.approveOrder(storeId, id)
            .then(() => get().loadBootstrap())
            .catch((error) => set({ apiError: error instanceof Error ? error.message : 'Could not approve order.' }));
          return;
        }
        set((state) => {
          const order = state.orders.find((o) => o.id === id);
          if (!order || order.storeId !== storeId || !canManage(state.currentUser, state.stores, storeId)) return state;
          return { orders: state.orders.map((o) => (o.id === id ? { ...o, status: 'APPROVED' } : o)) };
        });
      },
      rejectOrder: (storeId, id) => {
        const token = get().token;
        if (token) {
          adminApi.rejectOrder(storeId, id, 'Rejected by admin')
            .then(() => get().loadBootstrap())
            .catch((error) => set({ apiError: error instanceof Error ? error.message : 'Could not reject order.' }));
          return;
        }
        set((state) => {
          const order = state.orders.find((o) => o.id === id);
          if (!order || order.storeId !== storeId || !canManage(state.currentUser, state.stores, storeId)) return state;
          return { orders: state.orders.map((o) => (o.id === id ? { ...o, status: 'REJECTED' } : o)) };
        });
      },
      fulfillOrder: (storeId, id) => {
        const token = get().token;
        if (token) {
          adminApi.fulfillOrder(storeId, id)
            .then(() => get().loadBootstrap())
            .catch((error) => set({ apiError: error instanceof Error ? error.message : 'Could not fulfill order.' }));
          return;
        }
        set((state) => {
          const order = state.orders.find((o) => o.id === id);
          if (!order || order.storeId !== storeId || !canManage(state.currentUser, state.stores, storeId)) return state;
          return { orders: state.orders.map((o) => (o.id === id ? { ...o, status: 'FULFILLED' } : o)) };
        });
      },

      clearSession: () => {
        set({
          stores: [],
          products: [],
          orders: [],
          discounts: [],
          analyticsEvents: [],
          platformSettings: emptyPlatformSettings,
          supportTickets: [],
          productFlags: [],
          shopRequests: [],
          auditLogs: [],
          ownerStatuses: {},
          carts: {},
          lastSeenNotificationsAt: 0,
          currentUser: null,
          token: null,
          refreshToken: null,
          apiError: null,
        });
      },
    }),
    {
      name: 'matjari-v1',
      version: 8,
      migrate: (persisted: any) => {
        // v8 moves runtime entities to the backend. Keep auth/cart state only.
        const state = persisted?.state ? persisted.state : persisted;
        return {
          ...state,
          stores: [],
          products: [],
          orders: [],
          discounts: [],
          analyticsEvents: [],
          platformSettings: emptyPlatformSettings,
          supportTickets: [],
          productFlags: [],
          shopRequests: [],
          auditLogs: [],
          ownerStatuses: {},
          carts: state?.carts || {},
          lastSeenNotificationsAt: state?.lastSeenNotificationsAt ?? 0,
          currentUser: state?.currentUser ?? null,
          token: state?.token ?? null,
          refreshToken: state?.refreshToken ?? null,
          apiError: null,
        };
      },
      partialize: (state) => ({
        token: state.token,
        refreshToken: state.refreshToken,
        currentUser: state.currentUser,
        carts: state.carts,
        lastSeenNotificationsAt: state.lastSeenNotificationsAt,
      }),
    }
  )
);

configureApiClient({
  getToken: () => useStore.getState().token,
  onUnauthorized: () => useStore.getState().clearSession(),
  onRefresh: () => useStore.getState().refreshAccessToken(),
});
