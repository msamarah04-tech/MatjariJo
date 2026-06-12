import { Discount, Product, Store } from './types';
import { taxFromBase } from '@shared/money';
import { findCartVariant, lineMaxQuantity, lineUnitPrice, isVariableProduct } from './productOptions';

export interface CartLine {
  productId: string;
  variantId?: string;
  quantity: number;
}

export interface OrderLine {
  productId: string;
  variantId?: string;
  productName: string;
  variantTitle?: string;
  sku?: string;
  imageUrl?: string;
  priceCents: number;
  quantity: number;
}

export interface SummaryResult {
  items: OrderLine[];
  subtotalCents: number;
  discountCents: number;
  taxCents: number;
  shippingCents: number;
  totalCents: number;
  discountCode?: string;
  freeShipping: boolean;
}

export function getActiveOrderItems(cartItems: CartLine[], products: Product[]): OrderLine[] {
  return cartItems
    .map((item) => {
      const product = products.find((p) => p.id === item.productId);
      if (!product || !product.isActive) return null;
      const variant = findCartVariant(product, item);
      if (isVariableProduct(product) && !variant) return null;
      const stock = lineMaxQuantity(product, variant);
      if (stock <= 0) return null;
      return {
        productId: product.id,
        variantId: variant?.id,
        productName: product.name,
        variantTitle: variant?.title,
        sku: variant?.sku || product.details?.sku,
        imageUrl: variant?.imageUrl || product.imageUrl,
        priceCents: lineUnitPrice(product, variant),
        quantity: Math.min(item.quantity, stock),
      };
    })
    .filter(Boolean) as OrderLine[];
}

export function getSubtotalCents(items: OrderLine[]) {
  return items.reduce((sum, item) => sum + item.priceCents * item.quantity, 0);
}

export function getShippingCents(store: Store, subtotalCents: number, freeShipping = false) {
  if (freeShipping) return 0;
  const shipping = store.shipping || { type: 'FLAT' as const, flatCents: 0 };
  if (shipping.type === 'PICKUP') return 0;
  if (shipping.type === 'FREE_OVER') {
    if (shipping.freeOverCents && subtotalCents >= shipping.freeOverCents) return 0;
    return shipping.flatCents ?? 0;
  }
  return shipping.flatCents ?? 0;
}

export function getDiscountStatus(discount: Discount, subtotalCents: number, now = Date.now()) {
  if (!discount.active) return 'Inactive';
  if (discount.expiresAt && discount.expiresAt < now) return 'Expired';
  if (discount.usageLimit !== undefined && discount.usedCount >= discount.usageLimit) return 'Limit reached';
  if (discount.minSubtotalCents && subtotalCents < discount.minSubtotalCents) return 'Minimum not met';
  return 'Valid';
}

export function getDiscountCents(
  discount: Discount | undefined,
  subtotalCents: number,
  totalQty = 0,
  scopedItems?: { priceCents: number; quantity: number }[],
) {
  if (!discount) return 0;
  if (discount.type === 'PERCENT') return Math.min(subtotalCents, Math.round(subtotalCents * (discount.value / 100)));
  if (discount.type === 'FIXED') {
    if (scopedItems) {
      return scopedItems.reduce((sum, item) => sum + Math.max(0, item.priceCents - discount.value) * item.quantity, 0);
    }
    return 0;
  }
  if (discount.type === 'BXGY' && discount.details) {
    const d = discount.details as { buyQty: number; priceCents: number };
    if (totalQty >= d.buyQty && scopedItems) {
      return scopedItems.reduce((sum, item) => sum + Math.max(0, item.priceCents - d.priceCents) * item.quantity, 0);
    }
  }
  if (discount.type === 'TIERED' && discount.details) {
    const d = discount.details as { tiers: { minCents: number; pct: number }[] };
    const sorted = [...d.tiers].sort((a, b) => b.minCents - a.minCents);
    const tier = sorted.find((t) => subtotalCents >= t.minCents);
    if (tier) return Math.min(subtotalCents, Math.round(subtotalCents * (tier.pct / 100)));
  }
  return 0;
}

export function computeOrderSummary(store: Store, products: Product[], cartItems: CartLine[], discount?: Discount): SummaryResult {
  const items = getActiveOrderItems(cartItems, products);
  const subtotalCents = getSubtotalCents(items);
  const scopedItems = discount?.productIds?.length
    ? items.filter((item) => discount.productIds!.includes(item.productId))
    : items;
  const scopedSubtotal = scopedItems.reduce((sum, item) => sum + item.priceCents * item.quantity, 0);
  const totalQty = scopedItems.reduce((sum, item) => sum + item.quantity, 0);
  const validDiscount = discount && getDiscountStatus(discount, subtotalCents) === 'Valid' ? discount : undefined;
  const discountCents = getDiscountCents(validDiscount, scopedSubtotal, totalQty, scopedItems);
  const freeShipping = validDiscount?.type === 'FREE_SHIPPING';
  const shippingCents = getShippingCents(store, subtotalCents, freeShipping);
  // Mirror the server's GST math so the cart preview matches the final order/invoice.
  const taxableBase = Math.max(0, subtotalCents - discountCents);
  const pricesIncludeTax = store.pricesIncludeTax ?? false;
  const taxCents = taxFromBase(taxableBase, store.taxRateBps ?? 0, pricesIncludeTax);
  const totalCents = pricesIncludeTax
    ? taxableBase + shippingCents
    : taxableBase + taxCents + shippingCents;
  return {
    items,
    subtotalCents,
    discountCents,
    taxCents,
    shippingCents,
    totalCents: Math.max(0, totalCents),
    discountCode: validDiscount?.code,
    freeShipping,
  };
}
