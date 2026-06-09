import { AnalyticsEvent, AuditLog, Discount, Order, OwnerStatus, PlatformSettings, Product, ProductFlag, ShopRequest, Store, SupportTicket, User } from '@/lib/types';
import { apiFetch } from './client';

export type BootstrapPayload = {
  currentUser: User;
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
};

export const getBootstrap = (token?: string | null) => apiFetch<BootstrapPayload>('/bootstrap', { token });

export const credentialsForRole = (role: 'PLATFORM_OWNER' | 'SHOP_OWNER') => role === 'PLATFORM_OWNER'
  ? { identifier: 'platform-admin', password: 'ChangeMe123!' }
  : { identifier: 'botanica-admin', password: '' };

