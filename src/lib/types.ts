export type Role = 'PLATFORM_OWNER' | 'SHOP_OWNER';
export type StoreStatus = 'ACTIVE' | 'SUSPENDED';
export type OrderStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'FULFILLED';
export type DiscountType = 'PERCENT' | 'FIXED' | 'FREE_SHIPPING';
export type ShippingType = 'FLAT' | 'FREE_OVER' | 'PICKUP';
export type AnalyticsEventType = 'view' | 'add_to_cart' | 'checkout_start' | 'order';
export type StoreReviewStatus = 'PENDING_REVIEW' | 'APPROVED' | 'NEEDS_CHANGES';
export type OwnerStatus = 'ACTIVE' | 'RESTRICTED' | 'BANNED';
export type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED';
export type TicketPriority = 'LOW' | 'MEDIUM' | 'HIGH';
export type FlagStatus = 'OPEN' | 'RESOLVED';
export type ShopRequestStatus = 'PENDING' | 'IN_REVIEW' | 'APPROVED' | 'REJECTED';

export interface User {
  id: string;
  email: string;
  name?: string;
  role: Role;
}

export interface Store {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  category: string;
  logoUrl?: string; // optional client upload (data URL); emoji is the default
  logoEmoji?: string;
  announcement?: string;
  about?: string;
  shipping?: {
    type: ShippingType;
    flatCents?: number;
    freeOverCents?: number;
  };
  themeId: string;
  currency: string;
  status: StoreStatus;
  reviewStatus?: StoreReviewStatus;
  suspensionReason?: string;
  internalNote?: string;
  ownerId: string;
  createdAt: number;
}

export interface Product {
  id: string;
  storeId: string;
  name: string;
  description?: string;
  collection?: string;
  isFeatured?: boolean;
  compareAtCents?: number;
  priceCents: number;
  imageUrl?: string;
  imageEmoji?: string;
  stock: number;
  isActive: boolean;
  createdAt: number;
}

export interface Discount {
  id: string;
  storeId: string;
  code: string;
  type: DiscountType;
  value: number;
  minSubtotalCents?: number;
  usageLimit?: number;
  usedCount: number;
  active: boolean;
  expiresAt?: number;
  createdAt: number;
}

export interface AnalyticsEvent {
  id: string;
  storeId: string;
  type: AnalyticsEventType;
  productId?: string;
  ts: number;
}

export interface PlatformSettings {
  commissionRateBps: number;
  defaultCurrency: string;
  categories: string[];
  globalAnnouncement?: string;
  maintenanceMode: boolean;
  supportEmail: string;
}

export interface SupportTicket {
  id: string;
  storeId?: string;
  subject: string;
  message: string;
  status: TicketStatus;
  priority: TicketPriority;
  createdAt: number;
}

export interface ProductFlag {
  id: string;
  storeId: string;
  productId: string;
  reason: string;
  status: FlagStatus;
  createdAt: number;
}

export interface ShopRequest {
  id: string;
  ownerName: string;
  ownerEmail: string;
  storeName: string;
  category: string;
  tagline: string;
  notes?: string;
  status: ShopRequestStatus;
  storeId?: string;
  reviewedAt?: number;
  createdAt: number;
}

export interface AuditLog {
  id: string;
  actor: string;
  action: string;
  target: string;
  detail?: string;
  ts: number;
}

export interface OrderItem {
  productId?: string;
  productName: string;
  priceCents: number;
  quantity: number;
}

export interface Order {
  id: string;
  storeId: string;
  customerName: string;
  customerEmail: string;
  status: OrderStatus;
  subtotalCents: number;
  discountCents?: number;
  shippingCents?: number;
  discountCode?: string;
  note?: string;
  totalCents: number;
  items: OrderItem[];
  createdAt: number;
}
