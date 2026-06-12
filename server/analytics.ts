import type { AnalyticsEvent, Discount, Order, OrderItem, Product, Store } from '@prisma/client';

type Range = 7 | 30 | 90 | 'all';
type OrderWithItems = Order & { items: OrderItem[] };

const DAY_MS = 24 * 60 * 60 * 1000;

export function parseRange(value: string | undefined): Range {
  if (value === '7' || value === '30' || value === '90') return Number(value) as 7 | 30 | 90;
  return value === 'all' ? 'all' : 30;
}

export function rangeStart(range: Range, dates: Date[]) {
  if (range !== 'all') return new Date(Date.now() - (range - 1) * DAY_MS);
  const oldest = dates.map((date) => date.getTime()).filter(Boolean).sort((a, b) => a - b)[0];
  return oldest ? new Date(oldest) : new Date(Date.now() - 29 * DAY_MS);
}

export function bucketKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function buildSeries(start: Date, orders: Order[], events: AnalyticsEvent[]) {
  const days = Math.max(1, Math.ceil((Date.now() - start.getTime()) / DAY_MS) + 1);
  const buckets = new Map<string, { date: string; gmvCents: number; orders: number; views: number; cart: number; checkout: number }>();
  for (let i = 0; i < Math.min(days, 180); i += 1) {
    const date = new Date(start.getTime() + i * DAY_MS);
    const key = bucketKey(date);
    buckets.set(key, { date: key, gmvCents: 0, orders: 0, views: 0, cart: 0, checkout: 0 });
  }
  for (const order of orders) {
    const bucket = buckets.get(bucketKey(order.createdAt));
    if (bucket) {
      bucket.gmvCents += order.totalCents;
      bucket.orders += 1;
    }
  }
  for (const event of events) {
    const bucket = buckets.get(bucketKey(event.createdAt));
    if (!bucket) continue;
    if (event.type === 'view') bucket.views += 1;
    if (event.type === 'add_to_cart') bucket.cart += 1;
    if (event.type === 'checkout_start') bucket.checkout += 1;
  }
  return Array.from(buckets.values());
}


export function platformInsights(range: Range, stores: Store[], orders: Order[], events: AnalyticsEvent[]) {
  const start = rangeStart(range, [...orders.map((o) => o.createdAt), ...events.map((e) => e.createdAt), ...stores.map((s) => s.createdAt)]);
  const scopedOrders = orders.filter((order) => order.createdAt >= start);
  const scopedEvents = events.filter((event) => event.createdAt >= start);
  const storeById = new Map(stores.map((store) => [store.id, store]));
  const gmvCents = scopedOrders.reduce((sum, order) => sum + order.totalCents, 0);
  const views = scopedEvents.filter((event) => event.type === 'view').length;
  const checkout = scopedEvents.filter((event) => event.type === 'checkout_start').length;
  const cart = scopedEvents.filter((event) => event.type === 'add_to_cart').length;

  const ordersByStore = stores.map((store) => {
    const storeOrders = scopedOrders.filter((order) => order.storeId === store.id);
    const storeGmv = storeOrders.reduce((sum, order) => sum + order.totalCents, 0);
    return { storeId: store.id, name: store.name, orders: storeOrders.length, gmvCents: storeGmv };
  }).filter((row) => row.orders > 0 || row.gmvCents > 0).sort((a, b) => b.gmvCents - a.gmvCents);

  const categoryMix = stores.map((store) => {
    const storeOrders = scopedOrders.filter((order) => order.storeId === store.id);
    return { category: store.category, gmvCents: storeOrders.reduce((sum, order) => sum + order.totalCents, 0), orders: storeOrders.length };
  }).reduce((acc, row) => {
    const existing = acc.find((item) => item.category === row.category);
    if (existing) {
      existing.gmvCents += row.gmvCents;
      existing.orders += row.orders;
    } else {
      acc.push({ ...row });
    }
    return acc;
  }, [] as { category: string; gmvCents: number; orders: number }[]).sort((a, b) => b.gmvCents - a.gmvCents);

  return {
    kpis: {
      gmvCents,
      activeStores: stores.filter((store) => store.status === 'ACTIVE').length,
      totalOrders: scopedOrders.length,
      pendingOrders: scopedOrders.filter((order) => order.status === 'PENDING').length,
      conversionRate: views ? scopedOrders.length / views : 0,
    },
    series: buildSeries(start, scopedOrders, scopedEvents),
    revenueSeries: buildSeries(start, scopedOrders, scopedEvents),
    ordersByStore,
    categoryMix,
    statusCounts: ['PENDING', 'APPROVED', 'REJECTED', 'FULFILLED'].map((status) => ({
      status,
      count: scopedOrders.filter((order) => order.status === status).length,
    })),
    funnel: { views, cart, checkout, orders: scopedOrders.length },
  };
}

export function storeInsights(range: Range, store: Store, orders: OrderWithItems[], products: Product[], events: AnalyticsEvent[], discounts: Discount[]) {
  const start = rangeStart(range, [...orders.map((o) => o.createdAt), ...events.map((e) => e.createdAt), store.createdAt]);
  const scopedOrders = orders.filter((order) => order.createdAt >= start);
  const scopedEvents = events.filter((event) => event.createdAt >= start);
  const revenueCents = scopedOrders.reduce((sum, order) => sum + order.totalCents, 0);
  const views = scopedEvents.filter((event) => event.type === 'view').length;
  const checkout = scopedEvents.filter((event) => event.type === 'checkout_start').length;
  const cart = scopedEvents.filter((event) => event.type === 'add_to_cart').length;
  const productSales = new Map<string, { productId?: string; productName: string; quantity: number; revenueCents: number }>();

  for (const order of scopedOrders) {
    for (const item of order.items) {
      const key = item.productId ?? item.productNameSnapshot;
      const existing = productSales.get(key) ?? { productId: item.productId ?? undefined, productName: item.productNameSnapshot, quantity: 0, revenueCents: 0 };
      existing.quantity += item.quantity;
      existing.revenueCents += item.lineTotalCents;
      productSales.set(key, existing);
    }
  }

  const series = buildSeries(start, scopedOrders, scopedEvents);
  return {
    kpis: {
      revenueCents,
      ordersCount: scopedOrders.length,
      pendingOrders: scopedOrders.filter((order) => order.status === 'PENDING').length,
      productsCount: products.length,
      activeProducts: products.filter((product) => product.isActive).length,
      discountsCount: discounts.length,
      conversionRate: views ? scopedOrders.length / views : 0,
      aovCents: scopedOrders.length ? Math.round(revenueCents / scopedOrders.length) : 0,
    },
    series,
    aovSeries: series.map((row) => ({ date: row.date, aovCents: row.orders ? Math.round(row.gmvCents / row.orders) : 0 })),
    topProducts: Array.from(productSales.values()).sort((a, b) => b.revenueCents - a.revenueCents).slice(0, 10),
    statusCounts: ['PENDING', 'APPROVED', 'REJECTED', 'FULFILLED'].map((status) => ({
      status,
      count: scopedOrders.filter((order) => order.status === status).length,
    })),
    funnel: { views, cart, checkout, orders: scopedOrders.length },
  };
}

