import { useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useStore } from '@/lib/store';
import { Discount, Order, Product, Store } from '@/lib/types';

// ---------------------------------------------------------------------------
// Admin-area shared context + derived selectors. The shell threads the active
// store to every page through the router Outlet so pages never re-resolve it.
// ---------------------------------------------------------------------------

export interface AdminContextValue {
  storeId: string;
  store: Store;
  /** Stores the signed-in user may switch between (all stores for a platform viewer). */
  userStores: Store[];
  /** True when a PLATFORM_OWNER is viewing a store they don't own. */
  isPlatformViewer: boolean;
}

export function useAdminContext() {
  return useOutletContext<AdminContextValue>();
}

/** A product at or below this stock count surfaces a low-stock badge. */
export const LOW_STOCK_THRESHOLD = 5;

export interface StoreBadges {
  orders: number;
  lowStock: number;
}

/** Pending-count badges for the admin sidebar nav, scoped to one store. */
export function useStoreBadges(storeId: string): StoreBadges {
  const orders = useStore((s) => s.orders);
  const products = useStore((s) => s.products);
  return useMemo(
    () => ({
      orders: orders.filter((o) => o.storeId === storeId && o.status === 'PENDING').length,
      lowStock: products.filter((p) => p.storeId === storeId && p.isActive && p.stock <= LOW_STOCK_THRESHOLD).length,
    }),
    [orders, products, storeId]
  );
}

// ---------------------------------------------------------------------------
// Store-scoped selectors. These are the ONLY way admin pages read collections —
// each returns just the records belonging to the active store, so no screen can
// surface another store's data.
// ---------------------------------------------------------------------------

export function useStoreProducts(storeId: string): Product[] {
  const products = useStore((s) => s.products);
  return useMemo(() => products.filter((p) => p.storeId === storeId), [products, storeId]);
}

export function useStoreOrders(storeId: string): Order[] {
  const orders = useStore((s) => s.orders);
  return useMemo(() => orders.filter((o) => o.storeId === storeId), [orders, storeId]);
}

export function useStoreDiscounts(storeId: string): Discount[] {
  const discounts = useStore((s) => s.discounts);
  return useMemo(() => discounts.filter((d) => d.storeId === storeId), [discounts, storeId]);
}

export const ownerDisplayName = (ownerId: string) => ownerId;
