import { z } from 'zod';
import { normalizeJordanMobile } from '../shared/phone.js';
import {
  discountTypeEnum,
  flagSeverityEnum,
  ownerStatusEnum,
  shippingTypeEnum,
  shopRequestPlanEnum,
  storeReviewStatusEnum,
  storeStatusEnum,
  ticketPriorityEnum,
  ticketStatusEnum,
  storefrontTemplateEnum,
} from '../shared/contract.js';
import { validateProductDetails } from '../shared/productCategorySchemas.js';

export const emailSchema = z.string().trim().toLowerCase().email();

/** Accepts common Jordanian mobile formats and stores the canonical +962 form. */
export const jordanPhoneSchema = z.string().trim().min(1).max(40).transform((value, ctx) => {
  const normalized = normalizeJordanMobile(value);
  if (!normalized) {
    ctx.addIssue({ code: 'custom', message: 'Enter a valid Jordanian mobile number (07[789] xxxxxxx).' });
    return z.NEVER;
  }
  return normalized;
});
export const usernameSchema = z.string().trim().toLowerCase().min(3).max(60).regex(/^[a-z0-9][a-z0-9-]*[a-z0-9]$/, 'Use lowercase letters, numbers, and hyphens.');
export const idParamSchema = z.object({ id: z.string().min(1) });
export const storeIdParamSchema = z.object({ storeId: z.string().min(1) });
export const productIdParamSchema = storeIdParamSchema.extend({ productId: z.string().min(1) });
export const orderIdParamSchema = storeIdParamSchema.extend({ orderId: z.string().min(1) });
export const discountIdParamSchema = storeIdParamSchema.extend({ discountId: z.string().min(1) });
export const ticketIdParamSchema = storeIdParamSchema.extend({ ticketId: z.string().min(1) });

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(10, 'Password must be at least 10 characters.'),
});

export const loginSchema = z.object({
  email: emailSchema.optional(),
  username: usernameSchema.optional(),
  identifier: z.string().trim().toLowerCase().min(1).optional(),
  password: z.string().min(1),
}).superRefine((value, ctx) => {
  if (!value.email && !value.username && !value.identifier) {
    ctx.addIssue({ code: 'custom', path: ['identifier'], message: 'Email or username is required.' });
  }
});

/** Self-hosted password policy: length + at least one letter and one digit. */
export const strongPasswordSchema = z.string()
  .min(10, 'Use at least 10 characters.')
  .max(200)
  .regex(/[A-Za-z]/, 'Include at least one letter.')
  .regex(/[0-9]/, 'Include at least one number.');

export const registerOwnerSchema = z.object({
  email: emailSchema,
  username: usernameSchema.optional(),
  password: strongPasswordSchema,
  name: z.string().trim().min(1).max(120),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: strongPasswordSchema,
}).superRefine((value, ctx) => {
  if (value.currentPassword === value.newPassword) {
    ctx.addIssue({ code: 'custom', path: ['newPassword'], message: 'Choose a password different from the current one.' });
  }
});

export const shopRequestSchema = z.object({
  ownerName: z.string().trim().min(1).max(120),
  ownerEmail: emailSchema,
  storeName: z.string().trim().min(1).max(120),
  category: z.string().trim().min(1).max(80),
  tagline: z.string().trim().max(180).default(''),
  notes: z.string().trim().max(2000).optional(),
  plan: shopRequestPlanEnum.optional(),
  // Self-service admin credentials the requester chooses. The password is hashed
  // immediately and never stored in readable form.
  username: usernameSchema,
  password: strongPasswordSchema,
});

export const shippingSchema = z.object({
  type: shippingTypeEnum,
  flatCents: z.number().int().min(0).optional(),
  freeOverCents: z.number().int().min(0).optional(),
});

/** Category attribute value: scalar, multi-select list, or null. Bounded for safety. */
const attributeValueSchema = z.union([
  z.string().trim().max(2000),
  z.number(),
  z.boolean(),
  z.array(z.string().trim().min(1).max(200)).max(50),
  z.null(),
]);

const productDetailsObject = z.object({
  sku: z.string().trim().max(80).optional(),
  barcode: z.string().trim().max(80).optional(),
  brand: z.string().trim().max(120).optional(),
  productType: z.string().trim().max(120).optional(),
  sellingType: z.enum(['SIMPLE', 'VARIABLE']).optional(),
  status: z.enum(['DRAFT', 'ACTIVE', 'ARCHIVED']).optional(),
  // Category taxonomy (shared/productCategorySchemas). categoryKey selects the schema;
  // attributes carries its structured fields. Cross-validated in the superRefine below.
  categoryKey: z.string().trim().max(80).optional(),
  attributes: z.record(z.string().trim().min(1).max(80), attributeValueSchema).optional(),
  subtitle: z.string().trim().max(180).optional(),
  slug: z.string().trim().max(180).optional(),
  vendor: z.string().trim().max(120).optional(),
  shortDescription: z.string().trim().max(240).optional(),
  highlights: z.array(z.string().trim().min(1).max(140)).max(12).optional(),
  specifications: z.array(z.string().trim().min(1).max(180)).max(24).optional(),
  detailsRows: z.array(z.object({
    id: z.string().trim().min(1).max(80),
    name: z.string().trim().min(1).max(80),
    value: z.string().trim().min(1).max(800),
    sortOrder: z.number().int().min(0).max(9999).optional(),
  }).strict()).max(40).optional(),
  images: z.array(z.object({
    id: z.string().trim().min(1).max(80),
    url: z.string().trim().min(1).max(1200000),
    altText: z.string().trim().max(180).optional(),
    sortOrder: z.number().int().min(0).max(9999).optional(),
    variantId: z.string().trim().max(80).optional(),
  }).strict()).max(12).optional(),
  options: z.array(z.object({
    id: z.string().trim().min(1).max(80),
    name: z.string().trim().min(1).max(40),
    sortOrder: z.number().int().min(0).max(9999).optional(),
    values: z.array(z.object({
      id: z.string().trim().min(1).max(80),
      value: z.string().trim().min(1).max(60),
      displayValue: z.string().trim().max(80).optional(),
      colorHex: z.string().trim().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
      sortOrder: z.number().int().min(0).max(9999).optional(),
    }).strict()).min(1).max(40),
  }).strict()).max(3).optional(),
  variants: z.array(z.object({
    id: z.string().trim().min(1).max(80),
    title: z.string().trim().min(1).max(180),
    sku: z.string().trim().max(80).optional(),
    barcode: z.string().trim().max(80).optional(),
    priceCents: z.number().int().min(0),
    compareAtCents: z.number().int().min(0).optional(),
    costPriceCents: z.number().int().min(0).optional(),
    stock: z.number().int().min(0).max(1_000_000),
    lowStockThreshold: z.number().int().min(0).max(1_000_000).optional(),
    imageUrl: z.string().trim().max(1200000).optional(),
    imageId: z.string().trim().max(80).optional(),
    imageEmoji: z.string().trim().max(16).optional(),
    weightGrams: z.number().int().min(0).max(1_000_000).optional(),
    isActive: z.boolean(),
    sortOrder: z.number().int().min(0).max(9999).optional(),
    selections: z.record(z.string().trim().min(1).max(40), z.string().trim().min(1).max(60)),
  }).strict()).max(300).optional(),
  costPriceCents: z.number().int().min(0).optional(),
  trackInventory: z.boolean().optional(),
  lowStockThreshold: z.number().int().min(0).max(1_000_000).optional(),
  shippingRequired: z.boolean().optional(),
  packageDimensions: z.string().trim().max(160).optional(),
  materials: z.string().trim().max(800).optional(),
  dimensions: z.string().trim().max(160).optional(),
  weightGrams: z.number().int().min(0).max(1_000_000).optional(),
  countryOfOrigin: z.string().trim().max(120).optional(),
  careInstructions: z.string().trim().max(1200).optional(),
  warranty: z.string().trim().max(800).optional(),
  returnPolicy: z.string().trim().max(1000).optional(),
  shippingNote: z.string().trim().max(800).optional(),
  seoTitle: z.string().trim().max(120).optional(),
  seoDescription: z.string().trim().max(240).optional(),
  sizeOptions: z.array(z.string().trim().min(1).max(40)).max(30).optional(),
  colorOptions: z.array(z.string().trim().min(1).max(40)).max(30).optional(),
  fit: z.string().trim().max(80).optional(),
  gender: z.string().trim().max(80).optional(),
  ageGroup: z.string().trim().max(80).optional(),
  sizeGuide: z.string().trim().max(1600).optional(),
  skinType: z.string().trim().max(160).optional(),
  scent: z.string().trim().max(160).optional(),
  concentration: z.string().trim().max(120).optional(),
  topNotes: z.string().trim().max(300).optional(),
  middleNotes: z.string().trim().max(300).optional(),
  baseNotes: z.string().trim().max(300).optional(),
  volumeMl: z.number().int().min(0).max(100000).optional(),
  ingredients: z.string().trim().max(2000).optional(),
  allergens: z.array(z.string().trim().min(1).max(80)).max(30).optional(),
  expiryDate: z.string().trim().max(80).optional(),
  storageInstructions: z.string().trim().max(1200).optional(),
  nutrition: z.string().trim().max(2000).optional(),
  modelNumber: z.string().trim().max(120).optional(),
  power: z.string().trim().max(160).optional(),
  compatibility: z.string().trim().max(1200).optional(),
  includedItems: z.array(z.string().trim().min(1).max(140)).max(30).optional(),
  room: z.string().trim().max(120).optional(),
  assemblyRequired: z.string().trim().max(120).optional(),
  author: z.string().trim().max(160).optional(),
  isbn: z.string().trim().max(80).optional(),
  pages: z.number().int().min(0).max(100000).optional(),
  language: z.string().trim().max(80).optional(),
}).strict();

/**
 * Full product-details guard: the base shape plus the shared category taxonomy rules
 * (category must exist, required attributes present, select values allowed, variant
 * selections match declared options). The category logic lives in one shared module
 * so the frontend and backend can't drift.
 */
export const productDetailsSchema = productDetailsObject.superRefine((details, ctx) => {
  for (const error of validateProductDetails(details.categoryKey, details)) {
    ctx.addIssue({
      code: 'custom',
      path: error.key === 'categoryKey' ? ['categoryKey'] : error.key === 'variants' ? ['variants'] : ['attributes', error.key],
      message: error.message,
    });
  }
});

const hexColorSchema = z.string().trim().regex(/^#[0-9A-Fa-f]{6}$/, 'Use a 6-digit hex color.');
const radiusSchema = z.string().trim().regex(/^(0|[1-9]\d?)(px)$/, 'Use a pixel radius from 0px to 99px.');
const heroSlideSchema = z.object({
  id: z.string().max(80),
  type: z.enum(['offer', 'product', 'custom']),
  enabled: z.boolean(),
  discountCode: z.string().trim().max(80).optional(),
  productId: z.string().trim().max(80).optional(),
  title: z.string().trim().max(200).optional(),
  subtitle: z.string().trim().max(400).optional(),
  ctaLabel: z.string().trim().max(80).optional(),
  ctaUrl: z.string().trim().max(500).optional(),
  bgColor: z.string().trim().max(20).optional(),
  imageUrl: z.string().trim().max(2000).optional(),
});

export const themeOverridesSchema = z.object({
  bg: hexColorSchema.optional(),
  surface: hexColorSchema.optional(),
  text: hexColorSchema.optional(),
  primary: hexColorSchema.optional(),
  accent: hexColorSchema.optional(),
  soft: hexColorSchema.optional(),
  line: hexColorSchema.optional(),
  radius: radiusSchema.optional(),
  buttonStyle: z.enum(['solid', 'outline', 'pill']).optional(),
  headingFont: z.string().trim().max(120).optional(),
  instagram: z.string().trim().max(200).optional(),
  whatsapp: z.string().trim().max(200).optional(),
  tiktok: z.string().trim().max(200).optional(),
  heroSlides: z.array(heroSlideSchema).max(20).optional(),
}).strict();

// Subdomains that can never be claimed as a store address (kept in sync with
// the frontend list in src/lib/tenant.ts).
export const RESERVED_STORE_SLUGS = new Set(['www', 'api', 'app', 'admin', 'platform', 'staging']);

// One DNS label: the slug doubles as the store's subdomain (<slug>.matjari.jo).
export const storeSlugSchema = z.string().trim().toLowerCase()
  .min(2, 'Use at least 2 characters.')
  .max(63, 'Keep it under 64 characters.')
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use lowercase letters, numbers, and single hyphens.')
  .refine((value) => !RESERVED_STORE_SLUGS.has(value), 'This address is reserved.');

export const storePlanSchema = z.object({ plan: shopRequestPlanEnum }).strict();

export const adminStorePatchSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  slug: storeSlugSchema.optional(),
  tagline: z.string().trim().max(180).optional(),
  category: z.string().trim().min(1).max(80).optional(),
  logoUrl: z.string().trim().max(1200000).optional().nullable(),
  logoEmoji: z.string().trim().max(16).optional().nullable(),
  announcement: z.string().trim().max(300).optional(),
  about: z.string().trim().max(4000).optional(),
  themeId: z.string().trim().min(1).max(80).optional(),
  storefrontTemplate: storefrontTemplateEnum.optional(),
  themeOverrides: themeOverridesSchema.optional().nullable(),
  currency: z.string().trim().min(3).max(3).optional(),
  shipping: shippingSchema.optional(),
  contactPhone: jordanPhoneSchema.optional().nullable(),
  address: z.string().trim().max(300).optional().nullable(),
}).strict();

// Payment proof the shop owner uploads from the dashboard gate. Accepts a base64
// image data URL only; re-validated server-side (the client also compresses it).
export const PAYMENT_PROOF_MIME = ['image/jpeg', 'image/png', 'image/webp'];
export const PAYMENT_PROOF_MAX_BYTES = 3 * 1024 * 1024;

export const paymentProofSchema = z.object({
  // ~3MB of binary becomes ~4MB of base64; cap the raw string generously.
  dataUrl: z.string().trim().min(1).max(4_500_000),
}).strict().transform((value, ctx) => {
  const match = /^data:([a-z0-9.+/-]+);base64,([A-Za-z0-9+/=]+)$/i.exec(value.dataUrl);
  if (!match) {
    ctx.addIssue({ code: 'custom', path: ['dataUrl'], message: 'Upload a valid image file.' });
    return z.NEVER;
  }
  const mime = match[1].toLowerCase();
  if (!PAYMENT_PROOF_MIME.includes(mime)) {
    ctx.addIssue({ code: 'custom', path: ['dataUrl'], message: 'Use a JPG, PNG, or WebP image.' });
    return z.NEVER;
  }
  const base64 = match[2];
  const padding = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0;
  const sizeBytes = Math.floor((base64.length * 3) / 4) - padding;
  if (sizeBytes > PAYMENT_PROOF_MAX_BYTES) {
    ctx.addIssue({ code: 'custom', path: ['dataUrl'], message: 'Image must be 3MB or smaller.' });
    return z.NEVER;
  }
  return { dataUrl: value.dataUrl, mime, sizeBytes };
});

export const productCreateSchema = z.object({
  name: z.string().trim().min(1).max(160),
  description: z.string().trim().max(4000).default(''),
  details: productDetailsSchema.default({}),
  category: z.string().trim().max(80).default(''),
  collection: z.string().trim().max(80).default(''),
  tags: z.array(z.string().trim().min(1).max(32)).max(12).default([]),
  isFeatured: z.boolean().default(false),
  compareAtCents: z.number().int().min(0).optional().nullable(),
  priceCents: z.number().int().min(0),
  imageUrl: z.string().trim().max(1200000).optional().nullable(),
  imageEmoji: z.string().trim().max(16).optional().nullable(),
  stock: z.number().int().min(0),
  isActive: z.boolean().default(true),
}).strict();

export const productPatchSchema = productCreateSchema.partial().strict();

const discountFieldsSchema = z.object({
  name: z.string().trim().max(80).optional().nullable(),
  imageUrl: z.string().max(2000).optional().nullable(),
  details: z.string().max(4000).optional().nullable(),
  productIds: z.string().max(8000).optional().nullable(),
  code: z.string().trim().min(1).max(40).transform((value) => value.toUpperCase()),
  type: discountTypeEnum,
  value: z.number().int().min(0),
  minSubtotalCents: z.number().int().min(0).optional().nullable(),
  usageLimit: z.number().int().min(1).optional().nullable(),
  active: z.boolean().default(true),
  expiresAt: z.number().int().positive().optional().nullable(),
}).strict();

export const discountBaseSchema = discountFieldsSchema.superRefine((value, ctx) => {
  if (value.type === 'PERCENT' && (value.value < 1 || value.value > 100)) {
    ctx.addIssue({ code: 'custom', path: ['value'], message: 'Percent discounts must be 1-100.' });
  }
  if (value.type === 'FIXED' && value.value < 0) {
    ctx.addIssue({ code: 'custom', path: ['value'], message: 'Set-price offers must have a price of 0 or more.' });
  }
  if (value.type === 'FREE_SHIPPING' && value.value !== 0) {
    ctx.addIssue({ code: 'custom', path: ['value'], message: 'Free shipping discounts must use value 0.' });
  }
  if (value.type === 'BXGY') {
    try {
      const d = JSON.parse(value.details ?? '{}');
      if (!d.buyQty || d.buyQty < 2) ctx.addIssue({ code: 'custom', path: ['details'], message: 'Buy quantity must be at least 2.' });
      if (d.priceCents == null || d.priceCents < 0) ctx.addIssue({ code: 'custom', path: ['details'], message: 'Price per unit must be 0 or more.' });
    } catch { ctx.addIssue({ code: 'custom', path: ['details'], message: 'Invalid BXGY configuration.' }); }
  }
  if (value.type === 'TIERED') {
    try {
      const d = JSON.parse(value.details ?? '{}');
      if (!Array.isArray(d.tiers) || d.tiers.length === 0) ctx.addIssue({ code: 'custom', path: ['details'], message: 'At least one tier is required.' });
    } catch { ctx.addIssue({ code: 'custom', path: ['details'], message: 'Invalid TIERED configuration.' }); }
  }
});

export const discountPatchSchema = discountFieldsSchema.partial().strict();

export const publicOrderSchema = z.object({
  customerName: z.string().trim().min(1).max(120),
  // Required: order-lifecycle emails (confirmation, approval + invoice, fulfillment) go here.
  customerEmail: emailSchema,
  customerPhone: jordanPhoneSchema.optional(),
  shippingAddress: z.string().trim().max(1000).optional(),
  note: z.string().trim().max(1000).optional(),
  discountCode: z.string().trim().max(40).optional(),
  // Optional client-supplied idempotency key so retried POSTs don't double-create.
  idempotencyKey: z.string().trim().min(8).max(200).optional(),
  items: z.array(z.object({
    productId: z.string().min(1),
    variantId: z.string().min(1).optional(),
    quantity: z.number().int().min(1).max(999),
  })).min(1),
});

export const analyticsEventSchema = z.object({
  type: z.enum(['view', 'add_to_cart', 'checkout_start']),
  productId: z.string().min(1).optional(),
  sessionId: z.string().trim().max(200).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const ticketCategoryEnum = z.enum(['BILLING', 'TECHNICAL', 'ACCOUNT', 'FEATURE_REQUEST', 'OTHER']);

export const supportTicketCreateSchema = z.object({
  subject: z.string().trim().min(1).max(180),
  category: ticketCategoryEnum.default('OTHER'),
  message: z.string().trim().min(1).max(4000),
  priority: ticketPriorityEnum.default('MEDIUM'),
}).strict();

export const announcementSchema = z.object({
  subject: z.string().trim().min(1).max(200),
  body: z.string().trim().min(1).max(8000),
}).strict();

export const directMessageSchema = z.object({
  subject: z.string().trim().min(1).max(200),
  body: z.string().trim().min(1).max(8000),
}).strict();

export const ticketReplySchema = z.object({
  body: z.string().trim().max(4000).default(''),
  attachmentUrl: z.string().max(500).optional(),
}).refine((d) => d.body.length > 0 || !!d.attachmentUrl, {
  message: 'Message body or attachment is required.',
});

export const ticketStatusSchema = z.object({
  status: ticketStatusEnum,
});

export const flagCreateSchema = z.object({
  reason: z.string().trim().min(1).max(1000),
  reporter: z.string().trim().max(160).optional(),
  severity: flagSeverityEnum.default('MEDIUM'),
}).strict();

export const rejectSchema = z.object({
  reason: z.string().trim().min(1).max(1000),
});

export const ownerStatusSchema = z.object({
  ownerStatus: ownerStatusEnum,
});

export const platformStorePatchSchema = z.object({
  status: storeStatusEnum.optional(),
  reviewStatus: storeReviewStatusEnum.optional(),
  suspensionReason: z.string().trim().max(1000).optional(),
  internalNote: z.string().trim().max(2000).optional(),
  isFeatured: z.boolean().optional(),
}).strict();

export const platformSettingsPatchSchema = z.object({
  platformName: z.string().trim().min(1).max(120).optional(),
  defaultCurrency: z.string().trim().min(3).max(3).optional(),
  categories: z.array(z.string().trim().min(1).max(80)).min(1).max(100).optional(),
  globalAnnouncement: z.string().trim().max(300).optional(),
  maintenanceMode: z.boolean().optional(),
  supportEmail: emailSchema.optional(),
  auditCap: z.number().int().min(50).max(10000).optional(),
  autoFlagThreshold: z.number().int().min(1).max(100).optional(),
}).strict();

export const rangeSchema = z.object({
  range: z.union([z.literal('7'), z.literal('30'), z.literal('90'), z.literal('all')]).default('30'),
});
