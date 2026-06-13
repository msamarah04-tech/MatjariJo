import { AuditLog, OwnerStatus, PlatformSettings, Product, ProductFlag, ShopRequest, Store, StorePlan, SupportTicket, TicketStatus, User } from '@/lib/types';
import { apiFetch } from './client';

export const getOverview = () => apiFetch('/platform/overview');

export const listShopRequests = () => apiFetch<{ shopRequests: ShopRequest[] }>('/platform/shop-requests');
export const approveShopRequest = (id: string) => apiFetch<{ request: ShopRequest; store: Store; owner: User; selfService?: boolean; credentials?: { email?: string; username: string; password?: string } }>(`/platform/shop-requests/${id}/approve`, { method: 'POST' });
export const rejectShopRequest = (id: string, reason: string) => apiFetch<{ request: ShopRequest }>(`/platform/shop-requests/${id}/reject`, { method: 'POST', body: JSON.stringify({ reason }) });

export const listStores = () => apiFetch<{ stores: Store[] }>('/platform/stores');
export const getStore = (storeId: string) => apiFetch<{ store: Store }>(`/platform/stores/${storeId}`);
export const updatePlatformStore = (storeId: string, payload: unknown) => apiFetch<{ store: Store }>(`/platform/stores/${storeId}`, { method: 'PATCH', body: JSON.stringify(payload) });
export const suspendStore = (storeId: string, reason = 'Suspended by platform owner') => apiFetch<{ store: Store }>(`/platform/stores/${storeId}/suspend`, { method: 'POST', body: JSON.stringify({ reason }) });
export const reactivateStore = (storeId: string) => apiFetch<{ store: Store }>(`/platform/stores/${storeId}/reactivate`, { method: 'POST' });
export const deleteStore = (storeId: string) => apiFetch<void>(`/platform/stores/${storeId}`, { method: 'DELETE' });
export const featureStore = (storeId: string) => apiFetch<{ store: Store }>(`/platform/stores/${storeId}/feature`, { method: 'POST' });
export const unfeatureStore = (storeId: string) => apiFetch<{ store: Store }>(`/platform/stores/${storeId}/unfeature`, { method: 'POST' });

export const setStorePlan = (storeId: string, plan: StorePlan) => apiFetch<{ store: Store }>(`/platform/stores/${storeId}/plan`, { method: 'PATCH', body: JSON.stringify({ plan }) });
export const confirmStorePayment = (storeId: string) => apiFetch<{ store: Store }>(`/platform/stores/${storeId}/confirm-payment`, { method: 'PATCH' });
export const recordStorePlanPayment = (storeId: string) => apiFetch<{ store: Store }>(`/platform/stores/${storeId}/plan/record-payment`, { method: 'POST' });
export const setOwnerStatus = (storeId: string, ownerStatus: OwnerStatus) => apiFetch<{ owner: User }>(`/platform/stores/${storeId}/owner-status`, { method: 'PATCH', body: JSON.stringify({ ownerStatus }) });

export const listPlatformOrders = () => apiFetch('/platform/orders');
// Order lifecycle transitions are owned by the store-scoped endpoints (single
// authority). Platform owners act through those via their oversight store access.

export const listFlags = () => apiFetch<{ productFlags: ProductFlag[] }>('/platform/moderation/flags');
export const dismissFlag = (flagId: string) => apiFetch<{ flag: ProductFlag }>(`/platform/moderation/flags/${flagId}/dismiss`, { method: 'POST' });
export const actionFlag = (flagId: string) => apiFetch<{ flag: ProductFlag }>(`/platform/moderation/flags/${flagId}/action`, { method: 'POST' });
export const unpublishFlaggedProduct = (flagId: string) => apiFetch<{ product: Product }>(`/platform/moderation/flags/${flagId}/unpublish-product`, { method: 'POST' });

export const listPlatformTickets = () => apiFetch<{ supportTickets: SupportTicket[] }>('/platform/support/tickets');
export const getPlatformTicket = (ticketId: string) => apiFetch<{ ticket: SupportTicket }>(`/platform/support/tickets/${ticketId}`);
export const replyToPlatformTicket = (ticketId: string, payload: { body: string; attachmentUrl?: string }) => apiFetch<{ ticket: SupportTicket }>(`/platform/support/tickets/${ticketId}/reply`, { method: 'POST', body: JSON.stringify(payload) });
export const updatePlatformTicketStatus = (ticketId: string, status: TicketStatus) => apiFetch<{ ticket: SupportTicket }>(`/platform/support/tickets/${ticketId}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
export const assignTicketToMe = (ticketId: string) => apiFetch<{ ticket: SupportTicket }>(`/platform/support/tickets/${ticketId}/assign-to-me`, { method: 'PATCH' });

export const getPlatformAnalytics = (range?: string) => apiFetch('/platform/analytics', { query: { range } });
export const listAuditLogs = (filters?: Record<string, string | number | undefined>) => apiFetch<{ auditLogs: AuditLog[]; page: number; pageSize: number; total: number }>('/platform/audit', { query: filters });
export const getPlatformSettings = () => apiFetch<{ platformSettings: PlatformSettings }>('/platform/settings');
export const updatePlatformSettings = (payload: Partial<PlatformSettings>) => apiFetch<{ platformSettings: PlatformSettings }>('/platform/settings', { method: 'PATCH', body: JSON.stringify(payload) });
export const resetStoreOwnerPassword = (storeId: string) => apiFetch<{ credentials: { email: string; username: string; password: string } }>(`/platform/stores/${storeId}/reset-owner-password`, { method: 'POST' });

export type RevenueStore = { storeId: string; name: string; ownerEmail: string; ownerName: string | null; plan: string; planPaidUntil: number; daysRemaining?: number; daysOverdue?: number | null };
export type RevenueSummary = { mrrJod: number; counts: { TRIAL: number; ACTIVE: number; PAST_DUE: number; SUSPENDED: number }; upcomingRenewals: RevenueStore[]; overdueStores: RevenueStore[] };
export const getRevenueSummary = () => apiFetch<RevenueSummary>('/platform/revenue');
export const sendAnnouncement = (payload: { subject: string; body: string }) => apiFetch<{ sent: number }>('/platform/announcements', { method: 'POST', body: JSON.stringify(payload) });
export const sendDirectMessage = (storeId: string, payload: { subject: string; body: string }) => apiFetch<{ ok: boolean }>(`/platform/stores/${storeId}/message`, { method: 'POST', body: JSON.stringify(payload) });

