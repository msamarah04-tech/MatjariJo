import { Discount, Order, Product, ShopRequest, Store, SupportTicket } from '@/lib/types';
import { apiFetch } from './client';

export const listAdminStores = () => apiFetch<{ stores: Store[] }>('/admin/stores');
export const getAdminStore = (storeId: string) => apiFetch<{ store: Store }>(`/admin/stores/${storeId}`);
export const updateAdminStore = (storeId: string, payload: unknown) => apiFetch<{ store: Store }>(`/admin/stores/${storeId}`, { method: 'PATCH', body: JSON.stringify(payload) });
// Onboarding gate: read the store's own request (status + proof preview), and submit a proof.
export const getPaymentProof = (storeId: string) => apiFetch<{ request: ShopRequest }>(`/admin/stores/${storeId}/payment-proof`);
export const submitPaymentProof = (storeId: string, payload: { dataUrl: string }) => apiFetch<{ request: ShopRequest }>(`/admin/stores/${storeId}/payment-proof`, { method: 'POST', body: JSON.stringify(payload) });

export const listProducts = (storeId: string) => apiFetch<{ products: Product[] }>(`/admin/stores/${storeId}/products`);
export const createProduct = (storeId: string, payload: unknown) => apiFetch<{ product: Product }>(`/admin/stores/${storeId}/products`, { method: 'POST', body: JSON.stringify(payload) });
export const updateProduct = (storeId: string, productId: string, payload: unknown) => apiFetch<{ product: Product }>(`/admin/stores/${storeId}/products/${productId}`, { method: 'PATCH', body: JSON.stringify(payload) });
export const deleteProduct = (storeId: string, productId: string) => apiFetch(`/admin/stores/${storeId}/products/${productId}`, { method: 'DELETE' });

export const listOrders = (storeId: string) => apiFetch<{ orders: Order[] }>(`/admin/stores/${storeId}/orders`);
export const getOrder = (storeId: string, orderId: string) => apiFetch<{ order: Order }>(`/admin/stores/${storeId}/orders/${orderId}`);
export const approveOrder = (storeId: string, orderId: string) => apiFetch<{ order: Order }>(`/admin/stores/${storeId}/orders/${orderId}/approve`, { method: 'POST' });
export const rejectOrder = (storeId: string, orderId: string, reason: string) => apiFetch<{ order: Order }>(`/admin/stores/${storeId}/orders/${orderId}/reject`, { method: 'POST', body: JSON.stringify({ reason }) });
export const fulfillOrder = (storeId: string, orderId: string) => apiFetch<{ order: Order }>(`/admin/stores/${storeId}/orders/${orderId}/fulfill`, { method: 'POST' });

export const listDiscounts = (storeId: string) => apiFetch<{ discounts: Discount[] }>(`/admin/stores/${storeId}/discounts`);
export const createDiscount = (storeId: string, payload: unknown) => apiFetch<{ discount: Discount }>(`/admin/stores/${storeId}/discounts`, { method: 'POST', body: JSON.stringify(payload) });
export const updateDiscount = (storeId: string, discountId: string, payload: unknown) => apiFetch<{ discount: Discount }>(`/admin/stores/${storeId}/discounts/${discountId}`, { method: 'PATCH', body: JSON.stringify(payload) });
export const deleteDiscount = (storeId: string, discountId: string) => apiFetch(`/admin/stores/${storeId}/discounts/${discountId}`, { method: 'DELETE' });

export const getAdminAnalytics = (storeId: string, range?: string) => apiFetch(`/admin/stores/${storeId}/analytics`, { query: { range } });

// PDPL data-subject export: everything the platform stores about this shop.
export const getStoreDataExport = (storeId: string) => apiFetch<Record<string, unknown>>(`/admin/stores/${storeId}/data-export`);

export const dismissWelcome = (storeId: string) => apiFetch<{ store: Store }>(`/admin/stores/${storeId}/dismiss-welcome`, { method: 'POST' });

export const listSupportTickets = (storeId: string) => apiFetch<{ supportTickets: SupportTicket[] }>(`/admin/stores/${storeId}/support/tickets`);
export const createSupportTicket = (storeId: string, payload: unknown) => apiFetch<{ ticket: SupportTicket }>(`/admin/stores/${storeId}/support/tickets`, { method: 'POST', body: JSON.stringify(payload) });
export const replyToSupportTicket = (storeId: string, ticketId: string, payload: { body: string; attachmentUrl?: string }) => apiFetch<{ ticket: SupportTicket }>(`/admin/stores/${storeId}/support/tickets/${ticketId}/reply`, { method: 'POST', body: JSON.stringify(payload) });
export const markSupportTicketRead = (storeId: string, ticketId: string) => apiFetch<{ ticket: SupportTicket }>(`/admin/stores/${storeId}/support/tickets/${ticketId}/read`, { method: 'POST' });

