import { Discount, Product, Store } from './types';

export interface CartLine {
  productId: string;
  quantity: number;
}

export interface OrderLine {
  productId: string;
  productName: string;
  priceCents: number;
  quantity: number;
}

export interface SummaryResult {
  items: OrderLine[];
  subtotalCents: number;
  discountCents: number;
  shippingCents: number;
  totalCents: number;
  discountCode?: string;
  freeShipping: boolean;
}

export function getActiveOrderItems(cartItems: CartLine[], products: Product[]): OrderLine[] {
  return cartItems
    .map((item) => {
      const product = products.find((p) => p.id === item.productId);
      if (!product || !product.isActive || product.stock <= 0) return null;
      return {
        productId: product.id,
        productName: product.name,
        priceCents: product.priceCents,
        quantity: Math.min(item.quantity, product.stock),
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

export function getDiscountCents(discount: Discount | undefined, subtotalCents: number) {
  if (!discount) return 0;
  if (discount.type === 'PERCENT') return Math.min(subtotalCents, Math.round(subtotalCents * (discount.value / 100)));
  if (discount.type === 'FIXED') return Math.min(subtotalCents, discount.value);
  return 0;
}

export function computeOrderSummary(store: Store, products: Product[], cartItems: CartLine[], discount?: Discount): SummaryResult {
  const items = getActiveOrderItems(cartItems, products);
  const subtotalCents = getSubtotalCents(items);
  const validDiscount = discount && getDiscountStatus(discount, subtotalCents) === 'Valid' ? discount : undefined;
  const discountCents = getDiscountCents(validDiscount, subtotalCents);
  const freeShipping = validDiscount?.type === 'FREE_SHIPPING';
  const shippingCents = getShippingCents(store, subtotalCents, freeShipping);
  return {
    items,
    subtotalCents,
    discountCents,
    shippingCents,
    totalCents: Math.max(0, subtotalCents - discountCents + shippingCents),
    discountCode: validDiscount?.code,
    freeShipping,
  };
}
