import { AnalyticsEventType, Discount, Order, Product, Store } from '@/lib/types';
import { apiFetch } from './client';

export type PublicStorePayload = {
  store: Store;
  products: Product[];
  discounts: Discount[];
};

export type PublicOrderPayload = {
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  shippingAddress?: string;
  note?: string;
  discountCode?: string;
  // Optional client-generated key so a retried submit can't double-create an order.
  idempotencyKey?: string;
  items: { productId: string; variantId?: string; quantity: number }[];
};

export const getPublicStore = (slug: string) => apiFetch<PublicStorePayload>(`/public/stores/${slug}`);

export const getPublicProducts = (slug: string) => apiFetch<{ products: Product[] }>(`/public/stores/${slug}/products`);

export const trackAnalytics = (slug: string, payload: { type: Exclude<AnalyticsEventType, 'order'>; productId?: string; sessionId?: string; metadata?: Record<string, unknown> }) =>
  apiFetch('/public/stores/' + slug + '/analytics', { method: 'POST', body: JSON.stringify(payload) });

export const placePublicOrder = (slug: string, payload: PublicOrderPayload) =>
  apiFetch<{ order: Order }>(`/public/stores/${slug}/orders`, { method: 'POST', body: JSON.stringify(payload) });
