import { AnalyticsEvent, Order, Product, Store } from './types';

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
