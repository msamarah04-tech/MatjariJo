import { AnalyticsEvent, Order, PlatformSettings, Product, Store } from './types';

const DAY_MS = 86400000;

export type DateRangeDays = 7 | 30 | 90;

export function startOfDay(ts: number) {
  const date = new Date(ts);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

export function formatDay(ts: number) {
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(ts);
}

export function getRangeStart(days: DateRangeDays) {
  return startOfDay(Date.now() - (days - 1) * DAY_MS);
}

export function makeDayBuckets(days: DateRangeDays) {
  const start = getRangeStart(days);
  return Array.from({ length: days }, (_, index) => {
    const ts = start + index * DAY_MS;
    return { ts, day: formatDay(ts) };
  });
}

export function inRange(ts: number, days: DateRangeDays) {
  return ts >= getRangeStart(days);
}

export function getOwnerAnalytics(storeId: string, currency: string, days: DateRangeDays, orders: Order[], products: Product[], events: AnalyticsEvent[]) {
  const storeOrders = orders.filter((order) => order.storeId === storeId && inRange(order.createdAt, days));
  const revenueOrders = storeOrders.filter((order) => order.status === 'APPROVED' || order.status === 'FULFILLED');
  const rangeEvents = events.filter((event) => event.storeId === storeId && inRange(event.ts, days));
  const views = rangeEvents.filter((event) => event.type === 'view').length;
  const addToCart = rangeEvents.filter((event) => event.type === 'add_to_cart').length;
  const checkoutStarts = rangeEvents.filter((event) => event.type === 'checkout_start').length;
  const orderEvents = rangeEvents.filter((event) => event.type === 'order').length || storeOrders.length;
  const revenueCents = revenueOrders.reduce((sum, order) => sum + order.totalCents, 0);
  const ordersCount = storeOrders.length;
  const avgOrderValueCents = ordersCount ? Math.round(storeOrders.reduce((sum, order) => sum + order.totalCents, 0) / ordersCount) : 0;
  const conversionRate = views ? orderEvents / views : 0;

  const salesByDay = makeDayBuckets(days).map((bucket) => {
    const dayOrders = revenueOrders.filter((order) => startOfDay(order.createdAt) === bucket.ts);
    return {
      ...bucket,
      revenueCents: dayOrders.reduce((sum, order) => sum + order.totalCents, 0),
      orders: dayOrders.length,
    };
  });

  const productMap = new Map<string, { product: string; units: number; revenueCents: number }>();
  storeOrders.forEach((order) => {
    order.items.forEach((item) => {
      const key = item.productId || item.productName;
      const current = productMap.get(key) || { product: item.productName, units: 0, revenueCents: 0 };
      current.units += item.quantity;
      current.revenueCents += item.priceCents * item.quantity;
      productMap.set(key, current);
    });
  });
  const topProducts = Array.from(productMap.values()).sort((a, b) => b.units - a.units || b.revenueCents - a.revenueCents).slice(0, 6);

  const statusCounts = ['PENDING', 'APPROVED', 'REJECTED', 'FULFILLED'].map((status) => ({
    name: status,
    value: storeOrders.filter((order) => order.status === status).length,
  }));

  const funnel = [
    { name: 'Views', value: views },
    { name: 'Add to cart', value: addToCart },
    { name: 'Checkout', value: checkoutStarts },
    { name: 'Orders', value: orderEvents },
  ];

  return {
    currency,
    kpis: { revenueCents, ordersCount, avgOrderValueCents, conversionRate },
    salesByDay,
    topProducts,
    statusCounts,
    funnel,
    hasData: storeOrders.length > 0 || rangeEvents.length > 0,
  };
}

export function getPlatformAnalytics(days: DateRangeDays, stores: Store[], orders: Order[]) {
  const rangeOrders = orders.filter((order) => inRange(order.createdAt, days));
  const revenueOrders = rangeOrders.filter((order) => order.status === 'APPROVED' || order.status === 'FULFILLED');
  const totalGmvCents = revenueOrders.reduce((sum, order) => sum + order.totalCents, 0);
  const pendingApprovals = orders.filter((order) => order.status === 'PENDING').length;
  const activeStores = stores.filter((store) => store.status === 'ACTIVE').length;

  const gmvByDay = makeDayBuckets(days).map((bucket) => {
    const dayOrders = revenueOrders.filter((order) => startOfDay(order.createdAt) === bucket.ts);
    return {
      ...bucket,
      gmvCents: dayOrders.reduce((sum, order) => sum + order.totalCents, 0),
      orders: dayOrders.length,
    };
  });

  const ordersByStore = stores
    .map((store) => ({
      store: store.name,
      orders: rangeOrders.filter((order) => order.storeId === store.id).length,
      gmvCents: revenueOrders.filter((order) => order.storeId === store.id).reduce((sum, order) => sum + order.totalCents, 0),
    }))
    .filter((row) => row.orders > 0 || row.gmvCents > 0)
    .sort((a, b) => b.orders - a.orders || b.gmvCents - a.gmvCents)
    .slice(0, 8);

  const newStoresByDay = makeDayBuckets(days).map((bucket) => ({
    ...bucket,
    stores: stores.filter((store) => startOfDay(store.createdAt) === bucket.ts).length,
  }));

  const statusCounts = [
    { name: 'PENDING', value: rangeOrders.filter((order) => order.status === 'PENDING').length },
    { name: 'APPROVED', value: rangeOrders.filter((order) => order.status === 'APPROVED').length },
    { name: 'REJECTED', value: rangeOrders.filter((order) => order.status === 'REJECTED').length },
    { name: 'FULFILLED', value: rangeOrders.filter((order) => order.status === 'FULFILLED').length },
  ];

  return {
    kpis: {
      totalGmvCents,
      totalOrders: rangeOrders.length,
      pendingApprovals,
      activeStores,
    },
    gmvByDay,
    ordersByStore,
    newStoresByDay,
    statusCounts,
    hasData: rangeOrders.length > 0 || stores.some((store) => inRange(store.createdAt, days)),
  };
}

// ---------------------------------------------------------------------------
// Enhanced platform insights — used by the redesigned platform dashboard.
// Adds commission earnings, a cross-store conversion funnel, category and
// revenue-vs-commission breakdowns, KPI sparklines, and an "all" date range.
// ---------------------------------------------------------------------------

export type PlatformRange = 7 | 30 | 90 | 'all';

const REVENUE_STATUSES: ReadonlyArray<Order['status']> = ['APPROVED', 'FULFILLED'];

/** Effective commission rate for a store in basis points (per-store override beats platform default). */
export function effectiveCommissionBps(store: Store | undefined, settings: PlatformSettings) {
  return store?.commissionOverrideBps ?? settings.commissionRateBps;
}

export function commissionForOrder(order: Order, store: Store | undefined, settings: PlatformSettings) {
  return Math.round(order.totalCents * (effectiveCommissionBps(store, settings) / 10000));
}

function platformRangeStart(range: PlatformRange, stores: Store[], orders: Order[]) {
  if (range !== 'all') return getRangeStart(range);
  const stamps = [...stores.map((s) => s.createdAt), ...orders.map((o) => o.createdAt)];
  const earliest = stamps.length ? Math.min(...stamps) : Date.now();
  return startOfDay(earliest);
}

/** Build evenly spaced time buckets; widens to weekly steps once the span is large. */
function buildBuckets(startTs: number, endTs: number) {
  const startDay = startOfDay(startTs);
  const endDay = startOfDay(endTs);
  const dayCount = Math.max(1, Math.floor((endDay - startDay) / DAY_MS) + 1);
  const stepDays = dayCount > 120 ? 7 : 1;
  const buckets: { ts: number; end: number; day: string }[] = [];
  for (let t = startDay; t <= endDay; t += stepDays * DAY_MS) {
    buckets.push({ ts: t, end: t + stepDays * DAY_MS, day: formatDay(t) });
  }
  return buckets;
}

export function getPlatformInsights(
  range: PlatformRange,
  stores: Store[],
  orders: Order[],
  events: AnalyticsEvent[],
  settings: PlatformSettings,
) {
  const now = Date.now();
  const startTs = platformRangeStart(range, stores, orders);
  const inWindow = (ts: number) => ts >= startTs;
  const storeById = new Map(stores.map((store) => [store.id, store]));

  const rangeOrders = orders.filter((order) => inWindow(order.createdAt));
  const revenueOrders = rangeOrders.filter((order) => REVENUE_STATUSES.includes(order.status));
  const rangeEvents = events.filter((event) => inWindow(event.ts));

  const totalGmvCents = revenueOrders.reduce((sum, order) => sum + order.totalCents, 0);
  const commissionCents = revenueOrders.reduce((sum, order) => sum + commissionForOrder(order, storeById.get(order.storeId), settings), 0);

  const buckets = buildBuckets(startTs, now);
  const series = buckets.map((bucket) => {
    const bucketOrders = revenueOrders.filter((order) => order.createdAt >= bucket.ts && order.createdAt < bucket.end);
    const gmvCents = bucketOrders.reduce((sum, order) => sum + order.totalCents, 0);
    const commission = bucketOrders.reduce((sum, order) => sum + commissionForOrder(order, storeById.get(order.storeId), settings), 0);
    return {
      day: bucket.day,
      gmvCents,
      commissionCents: commission,
      netCents: gmvCents - commission,
      orders: bucketOrders.length,
      stores: stores.filter((store) => store.createdAt >= bucket.ts && store.createdAt < bucket.end).length,
    };
  });

  const ordersByStore = stores
    .map((store) => ({
      store: store.name,
      orders: rangeOrders.filter((order) => order.storeId === store.id).length,
      gmvCents: revenueOrders.filter((order) => order.storeId === store.id).reduce((sum, order) => sum + order.totalCents, 0),
    }))
    .filter((row) => row.orders > 0 || row.gmvCents > 0)
    .sort((a, b) => b.gmvCents - a.gmvCents || b.orders - a.orders)
    .slice(0, 8);

  const categoryMap = new Map<string, number>();
  revenueOrders.forEach((order) => {
    const category = storeById.get(order.storeId)?.category || 'Uncategorized';
    categoryMap.set(category, (categoryMap.get(category) || 0) + order.totalCents);
  });
  const categoryBreakdown = Array.from(categoryMap.entries())
    .map(([name, gmvCents]) => ({ name, gmvCents }))
    .sort((a, b) => b.gmvCents - a.gmvCents);

  const statusCounts = (['PENDING', 'APPROVED', 'REJECTED', 'FULFILLED'] as const).map((status) => ({
    name: status,
    value: rangeOrders.filter((order) => order.status === status).length,
  }));

  const eventCount = (type: AnalyticsEvent['type']) => rangeEvents.filter((event) => event.type === type).length;
  const orderEvents = eventCount('order') || revenueOrders.length;
  const funnel = [
    { name: 'Views', value: eventCount('view') },
    { name: 'Add to cart', value: eventCount('add_to_cart') },
    { name: 'Checkout', value: eventCount('checkout_start') },
    { name: 'Orders', value: orderEvents },
  ];

  return {
    range,
    kpis: {
      totalGmvCents,
      commissionCents,
      netToStoresCents: totalGmvCents - commissionCents,
      totalOrders: rangeOrders.length,
      activeStores: stores.filter((store) => store.status === 'ACTIVE').length,
      totalStores: stores.length,
      pendingApprovals: orders.filter((order) => order.status === 'PENDING').length,
    },
    series,
    gmvSpark: series.map((point) => point.gmvCents),
    ordersSpark: series.map((point) => point.orders),
    commissionSpark: series.map((point) => point.commissionCents),
    ordersByStore,
    categoryBreakdown,
    statusCounts,
    funnel,
    hasData: rangeOrders.length > 0 || rangeEvents.length > 0 || stores.some((store) => inWindow(store.createdAt)),
  };
}

// ---------------------------------------------------------------------------
// Store-scoped insights for the rebuilt shop-owner dashboard. Mirrors the shape
// of getPlatformInsights (buckets, sparklines, an "all" range) but scoped to a
// single store, and adds an AOV trend the merchant analytics view needs.
// ---------------------------------------------------------------------------

export function getStoreInsights(
  range: PlatformRange,
  storeId: string,
  currency: string,
  orders: Order[],
  products: Product[],
  events: AnalyticsEvent[],
  storeCreatedAt?: number,
) {
  const now = Date.now();
  const storeOrders = orders.filter((order) => order.storeId === storeId);
  const storeEvents = events.filter((event) => event.storeId === storeId);

  let startTs: number;
  if (range === 'all') {
    const stamps = [...storeOrders.map((o) => o.createdAt), ...storeEvents.map((e) => e.ts)];
    if (storeCreatedAt) stamps.push(storeCreatedAt);
    startTs = startOfDay(stamps.length ? Math.min(...stamps) : now);
  } else {
    startTs = getRangeStart(range);
  }
  const inWindow = (ts: number) => ts >= startTs;

  const rangeOrders = storeOrders.filter((order) => inWindow(order.createdAt));
  const revenueOrders = rangeOrders.filter((order) => REVENUE_STATUSES.includes(order.status));
  const rangeEvents = storeEvents.filter((event) => inWindow(event.ts));

  const series = buildBuckets(startTs, now).map((bucket) => {
    const bucketOrders = rangeOrders.filter((order) => order.createdAt >= bucket.ts && order.createdAt < bucket.end);
    const revenueCents = bucketOrders.filter((order) => REVENUE_STATUSES.includes(order.status)).reduce((sum, order) => sum + order.totalCents, 0);
    const grossCents = bucketOrders.reduce((sum, order) => sum + order.totalCents, 0);
    return {
      day: bucket.day,
      revenueCents,
      orders: bucketOrders.length,
      aovCents: bucketOrders.length ? Math.round(grossCents / bucketOrders.length) : 0,
    };
  });

  const views = rangeEvents.filter((event) => event.type === 'view').length;
  const addToCart = rangeEvents.filter((event) => event.type === 'add_to_cart').length;
  const checkoutStarts = rangeEvents.filter((event) => event.type === 'checkout_start').length;
  const orderEvents = rangeEvents.filter((event) => event.type === 'order').length || rangeOrders.length;

  const ordersCount = rangeOrders.length;
  const grossCents = rangeOrders.reduce((sum, order) => sum + order.totalCents, 0);

  const productMap = new Map<string, { product: string; units: number; revenueCents: number }>();
  rangeOrders.forEach((order) => {
    order.items.forEach((item) => {
      const key = item.productId || item.productName;
      const current = productMap.get(key) || { product: item.productName, units: 0, revenueCents: 0 };
      current.units += item.quantity;
      current.revenueCents += item.priceCents * item.quantity;
      productMap.set(key, current);
    });
  });
  const topProducts = Array.from(productMap.values()).sort((a, b) => b.units - a.units || b.revenueCents - a.revenueCents).slice(0, 6);

  const statusCounts = (['PENDING', 'APPROVED', 'REJECTED', 'FULFILLED'] as const).map((status) => ({
    name: status,
    value: rangeOrders.filter((order) => order.status === status).length,
  }));

  const funnel = [
    { name: 'Views', value: views },
    { name: 'Add to cart', value: addToCart },
    { name: 'Checkout', value: checkoutStarts },
    { name: 'Orders', value: orderEvents },
  ];

  return {
    range,
    currency,
    kpis: {
      revenueCents: revenueOrders.reduce((sum, order) => sum + order.totalCents, 0),
      ordersCount,
      avgOrderValueCents: ordersCount ? Math.round(grossCents / ordersCount) : 0,
      conversionRate: views ? orderEvents / views : 0,
      productCount: products.filter((product) => product.storeId === storeId).length,
    },
    series,
    revenueSpark: series.map((point) => point.revenueCents),
    ordersSpark: series.map((point) => point.orders),
    aovSpark: series.map((point) => point.aovCents),
    topProducts,
    statusCounts,
    funnel,
    hasData: rangeOrders.length > 0 || rangeEvents.length > 0,
  };
}
