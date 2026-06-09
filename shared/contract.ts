import { z } from 'zod';

/**
 * Shared domain contract — the single source of truth for domain enums and entity
 * shapes, imported by BOTH the frontend (`@shared/contract`) and the backend
 * (`../shared/contract.js`). The backend serializers are typed against these shapes
 * and the frontend consumes them, so a domain-shape change type-errors both sides
 * instead of silently drifting.
 *
 * Enums are zod schemas (so validators can reuse them) with their inferred TS types.
 */

export const roleEnum = z.enum(['PLATFORM_OWNER', 'SHOP_OWNER']);
export const storeStatusEnum = z.enum(['ACTIVE', 'SUSPENDED']);
export const orderStatusEnum = z.enum(['PENDING', 'APPROVED', 'REJECTED', 'FULFILLED']);
export const discountTypeEnum = z.enum(['PERCENT', 'FIXED', 'FREE_SHIPPING']);
export const shippingTypeEnum = z.enum(['FLAT', 'FREE_OVER', 'PICKUP']);
export const analyticsEventTypeEnum = z.enum(['view', 'add_to_cart', 'checkout_start', 'order']);
export const storeReviewStatusEnum = z.enum(['PENDING_REVIEW', 'APPROVED', 'NEEDS_CHANGES']);
export const ownerStatusEnum = z.enum(['ACTIVE', 'RESTRICTED', 'BANNED']);
export const ticketStatusEnum = z.enum(['OPEN', 'IN_PROGRESS', 'RESOLVED']);
export const ticketPriorityEnum = z.enum(['LOW', 'MEDIUM', 'HIGH']);
export const flagStatusEnum = z.enum(['OPEN', 'RESOLVED', 'DISMISSED', 'ACTIONED']);
export const flagSeverityEnum = z.enum(['LOW', 'MEDIUM', 'HIGH']);
export const ticketAuthorEnum = z.enum(['OWNER', 'PLATFORM', 'CUSTOMER']);
export const shopRequestStatusEnum = z.enum(['PENDING', 'IN_REVIEW', 'APPROVED', 'REJECTED']);
export const shopRequestPlanEnum = z.enum(['STARTER', 'GROWTH', 'SCALE']);
export const paymentMethodEnum = z.enum(['COD']);
export const storefrontTemplateEnum = z.enum(['editorial', 'boutique', 'market', 'lookbook']);

export type Role = z.infer<typeof roleEnum>;
export type StoreStatus = z.infer<typeof storeStatusEnum>;
export type OrderStatus = z.infer<typeof orderStatusEnum>;
export type DiscountType = z.infer<typeof discountTypeEnum>;
export type ShippingType = z.infer<typeof shippingTypeEnum>;
export type AnalyticsEventType = z.infer<typeof analyticsEventTypeEnum>;
export type StoreReviewStatus = z.infer<typeof storeReviewStatusEnum>;
export type OwnerStatus = z.infer<typeof ownerStatusEnum>;
export type TicketStatus = z.infer<typeof ticketStatusEnum>;
export type TicketPriority = z.infer<typeof ticketPriorityEnum>;
export type FlagStatus = z.infer<typeof flagStatusEnum>;
export type FlagSeverity = z.infer<typeof flagSeverityEnum>;
export type TicketAuthor = z.infer<typeof ticketAuthorEnum>;
export type ShopRequestStatus = z.infer<typeof shopRequestStatusEnum>;
export type ShopRequestPlan = z.infer<typeof shopRequestPlanEnum>;
export type PaymentMethod = z.infer<typeof paymentMethodEnum>;
export type StorefrontTemplate = z.infer<typeof storefrontTemplateEnum>;

export interface ThemeOverrides {
  bg?: string;
  surface?: string;
  text?: string;
  primary?: string;
  accent?: string;
  soft?: string;
  line?: string;
  radius?: string;
}

export interface User {
  id: string;
  email: string;
  username?: string;
  name?: string;
  role: Role;
  ownerStatus?: OwnerStatus;
  mustChangePassword?: boolean;
}

export interface Store {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  category: string;
  logoUrl?: string;
  logoEmoji?: string;
  announcement?: string;
  about?: string;
  shipping?: {
    type: ShippingType;
    flatCents?: number;
    freeOverCents?: number;
  };
  themeId: string;
  storefrontTemplate?: StorefrontTemplate;
  themeOverrides?: ThemeOverrides | null;
  currency: string;
  // Jordan tax / invoice seller details.
  taxRateBpsOverride?: number;
  // Effective GST rate, included only in the public storefront payload for tax preview.
  taxRateBps?: number;
  pricesIncludeTax?: boolean;
  taxRegistrationNumber?: string;
  contactPhone?: string;
  address?: string;
  status: StoreStatus;
  reviewStatus?: StoreReviewStatus;
  suspensionReason?: string;
  internalNote?: string;
  commissionOverrideBps?: number;
  isFeatured?: boolean;
  ownerId: string;
  createdAt: number;
}

export interface Product {
  id: string;
  storeId: string;
  name: string;
  description?: string;
  details?: ProductDetails;
  category?: string;
  collection?: string;
  tags?: string[];
  isFeatured?: boolean;
  compareAtCents?: number;
  priceCents: number;
  imageUrl?: string;
  imageEmoji?: string;
  stock: number;
  isActive: boolean;
  createdAt: number;
}

/** A category attribute value: scalar, multi-select list, or absent. Never a float-as-money. */
export type ProductAttributeValue = string | number | boolean | string[] | null;

export interface ProductDetails {
  sku?: string;
  barcode?: string;
  brand?: string;
  productType?: string;
  sellingType?: ProductSellingType;
  status?: ProductCatalogStatus;
  /**
   * Category taxonomy (shared/productCategorySchemas.ts). `categoryKey` selects the
   * schema; `attributes` holds its validated, structured fields. Additive layer on top
   * of the legacy flat fields below — commerce/variant shape is unchanged.
   */
  categoryKey?: string;
  attributes?: Record<string, ProductAttributeValue>;
  subtitle?: string;
  slug?: string;
  shortDescription?: string;
  vendor?: string;
  highlights?: string[];
  specifications?: string[];
  detailsRows?: ProductDetailRow[];
  images?: ProductImageAsset[];
  options?: ProductOption[];
  variants?: ProductVariant[];
  costPriceCents?: number;
  trackInventory?: boolean;
  lowStockThreshold?: number;
  shippingRequired?: boolean;
  packageDimensions?: string;
  materials?: string;
  dimensions?: string;
  weightGrams?: number;
  countryOfOrigin?: string;
  careInstructions?: string;
  warranty?: string;
  returnPolicy?: string;
  shippingNote?: string;
  seoTitle?: string;
  seoDescription?: string;
  sizeOptions?: string[];
  colorOptions?: string[];
  fit?: string;
  gender?: string;
  ageGroup?: string;
  sizeGuide?: string;
  skinType?: string;
  scent?: string;
  concentration?: string;
  topNotes?: string;
  middleNotes?: string;
  baseNotes?: string;
  volumeMl?: number;
  ingredients?: string;
  allergens?: string[];
  expiryDate?: string;
  storageInstructions?: string;
  nutrition?: string;
  modelNumber?: string;
  power?: string;
  compatibility?: string;
  includedItems?: string[];
  room?: string;
  assemblyRequired?: string;
  author?: string;
  isbn?: string;
  pages?: number;
  language?: string;
}

export type ProductSellingType = 'SIMPLE' | 'VARIABLE';
export type ProductCatalogStatus = 'DRAFT' | 'ACTIVE' | 'ARCHIVED';

export interface ProductImageAsset {
  id: string;
  url: string;
  altText?: string;
  sortOrder?: number;
  variantId?: string;
}

export interface ProductOptionValue {
  id: string;
  value: string;
  displayValue?: string;
  colorHex?: string;
  sortOrder?: number;
}

export interface ProductOption {
  id: string;
  name: string;
  sortOrder?: number;
  values: ProductOptionValue[];
}

export interface ProductVariant {
  id: string;
  title: string;
  sku?: string;
  barcode?: string;
  priceCents: number;
  compareAtCents?: number;
  costPriceCents?: number;
  stock: number;
  lowStockThreshold?: number;
  imageUrl?: string;
  imageId?: string;
  imageEmoji?: string;
  weightGrams?: number;
  isActive: boolean;
  sortOrder?: number;
  selections: Record<string, string>;
}

export interface ProductDetailRow {
  id: string;
  name: string;
  value: string;
  sortOrder?: number;
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

export interface OrderItem {
  productId?: string;
  variantId?: string;
  productName: string;
  variantTitle?: string;
  sku?: string;
  imageUrl?: string;
  priceCents: number;
  quantity: number;
}

export interface Order {
  id: string;
  storeId: string;
  customerName: string;
  customerEmail: string;
  status: OrderStatus;
  currency?: string;
  subtotalCents: number;
  discountCents?: number;
  taxCents?: number;
  taxRateBps?: number;
  pricesIncludeTax?: boolean;
  shippingCents?: number;
  commissionCents?: number;
  paymentMethod?: string;
  discountCode?: string;
  invoiceNumber?: string;
  note?: string;
  totalCents: number;
  items: OrderItem[];
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
  platformName: string;
  commissionRateBps: number;
  defaultCurrency: string;
  categories: string[];
  globalAnnouncement?: string;
  maintenanceMode: boolean;
  supportEmail: string;
  auditCap: number;
  autoFlagThreshold: number;
  taxRateBps?: number;
  pricesIncludeTax?: boolean;
  taxLabel?: string;
}

export interface TicketMessage {
  id: string;
  from: TicketAuthor;
  body: string;
  ts: number;
}

export interface SupportTicket {
  id: string;
  storeId?: string;
  subject: string;
  message: string;
  status: TicketStatus;
  priority: TicketPriority;
  assignedTo?: string;
  messages?: TicketMessage[];
  createdAt: number;
}

export interface ProductFlag {
  id: string;
  storeId: string;
  productId: string;
  reason: string;
  reporter?: string;
  severity?: FlagSeverity;
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
  plan?: ShopRequestPlan;
  desiredUsername?: string;
  rejectionReason?: string;
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
