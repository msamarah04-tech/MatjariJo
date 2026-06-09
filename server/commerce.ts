import type { Discount, Product, Store } from '@prisma/client';
import { badRequest } from './errors.js';
import { applyBps, percentOf, taxFromBase } from '../shared/money.js';
import { productPubliclyActive, resolveMerchandiseLine } from './productDetails.js';

export type CartLine = { productId: string; variantId?: string; quantity: number };

export type TaxContext = {
  /** Effective GST rate in basis points (store override or platform default). */
  taxRateBps: number;
  /** Whether listed prices already include tax. */
  pricesIncludeTax: boolean;
  /** Effective platform commission rate in basis points. */
  commissionBps: number;
};

export function discountIsValid(discount: Discount | undefined | null, subtotalCents: number, now = new Date()): discount is Discount {
  if (!discount) return false;
  if (!discount.active) return false;
  if (discount.expiresAt && discount.expiresAt.getTime() < now.getTime()) return false;
  if (discount.usageLimit !== null && discount.usedCount >= discount.usageLimit) return false;
  if (discount.minSubtotalCents !== null && subtotalCents < discount.minSubtotalCents) return false;
  return true;
}

export function computeDiscountCents(discount: Discount | undefined, subtotalCents: number) {
  if (!discount) return 0;
  if (discount.type === 'PERCENT') return percentOf(subtotalCents, discount.value);
  if (discount.type === 'FIXED') return Math.min(subtotalCents, discount.value);
  return 0;
}

export function shippingCents(store: Store, subtotalCents: number, freeShipping = false) {
  if (freeShipping) return 0;
  if (store.shippingType === 'PICKUP') return 0;
  if (store.shippingType === 'FREE_OVER') {
    if (store.freeOverCents !== null && subtotalCents >= store.freeOverCents) return 0;
    return store.shippingFlatCents ?? 0;
  }
  return store.shippingFlatCents ?? 0;
}

export type OrderComputation = {
  items: {
    productId: string;
    variantId?: string;
    productNameSnapshot: string;
    variantTitleSnapshot?: string;
    variantSkuSnapshot?: string;
    variantImageUrlSnapshot?: string;
    unitPriceCents: number;
    quantity: number;
    lineTotalCents: number;
  }[];
  currency: string;
  subtotalCents: number;
  discountCents: number;
  taxCents: number;
  taxRateBps: number;
  pricesIncludeTax: boolean;
  shippingCents: number;
  totalCents: number;
  commissionCents: number;
  discountCode?: string;
};

/**
 * Server-authoritative order math, all in integer minor units of the store's
 * currency. Order of operations: subtotal -> discount -> GST -> shipping -> total.
 *
 *  - exclusive pricing: tax is added on top of (subtotal - discount).
 *  - inclusive pricing: tax is the portion already inside (subtotal - discount).
 *
 * Commission is taken on the net merchandise value (excluding tax and shipping).
 * Stock is NOT enforced here — the conditional UPDATE at checkout is the authority;
 * this pre-check only yields a friendlier error.
 */
export function computeOrder(
  store: Store,
  products: Product[],
  cartLines: CartLine[],
  discount: Discount | undefined,
  tax: TaxContext,
): OrderComputation {
  const items = cartLines.map((line) => {
    const product = products.find((item) => item.id === line.productId);
    if (!product || !productPubliclyActive(product) || product.storeId !== store.id) {
      throw badRequest('Order contains an inactive, missing, or cross-store product.');
    }
    try {
      return resolveMerchandiseLine(product, line);
    } catch (error) {
      throw badRequest(error instanceof Error ? error.message : 'Selected product option is unavailable.');
    }
  });

  const subtotalCents = items.reduce((sum, item) => sum + item.lineTotalCents, 0);
  const validDiscount = discountIsValid(discount, subtotalCents) ? discount : undefined;
  const discountCents = computeDiscountCents(validDiscount, subtotalCents);
  const freeShipping = validDiscount?.type === 'FREE_SHIPPING';
  const shippingAmountCents = shippingCents(store, subtotalCents, freeShipping);

  const taxableBase = Math.max(0, subtotalCents - discountCents);
  const taxCents = taxFromBase(taxableBase, tax.taxRateBps, tax.pricesIncludeTax);
  const netMerchandise = tax.pricesIncludeTax ? taxableBase - taxCents : taxableBase;
  const totalCents = tax.pricesIncludeTax
    ? taxableBase + shippingAmountCents
    : taxableBase + taxCents + shippingAmountCents;
  const commissionCents = applyBps(netMerchandise, tax.commissionBps);

  return {
    items,
    currency: store.currency,
    subtotalCents,
    discountCents,
    taxCents,
    taxRateBps: tax.taxRateBps,
    pricesIncludeTax: tax.pricesIncludeTax,
    shippingCents: shippingAmountCents,
    totalCents: Math.max(0, totalCents),
    commissionCents,
    discountCode: validDiscount?.code,
  };
}
