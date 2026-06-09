import type { Product } from '@prisma/client';

export type ProductVariantSnapshot = {
  id: string;
  title: string;
  sku?: string;
  priceCents: number;
  stock: number;
  isActive: boolean;
  imageUrl?: string;
  selections?: Record<string, string>;
};

export type ParsedProductDetails = {
  sellingType?: 'SIMPLE' | 'VARIABLE';
  status?: 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
  variants?: ProductVariantSnapshot[];
  [key: string]: unknown;
};

export type ResolvedMerchandiseLine = {
  productId: string;
  variantId?: string;
  productNameSnapshot: string;
  variantTitleSnapshot?: string;
  variantSkuSnapshot?: string;
  variantImageUrlSnapshot?: string;
  unitPriceCents: number;
  quantity: number;
  lineTotalCents: number;
};

export function parseDetails(product: Product): ParsedProductDetails {
  try {
    const parsed = product.details ? JSON.parse(product.details) : {};
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export function activeProductVariants(product: Product) {
  const details = parseDetails(product);
  return (details.variants || []).filter((variant) => variant.isActive);
}

export function productIsVariable(product: Product) {
  const details = parseDetails(product);
  return details.sellingType === 'VARIABLE' && activeProductVariants(product).length > 0;
}

export function productPubliclyActive(product: Product) {
  const details = parseDetails(product);
  return product.isActive && details.status !== 'DRAFT' && details.status !== 'ARCHIVED';
}

export function resolveMerchandiseLine(product: Product, line: { variantId?: string; quantity: number }): ResolvedMerchandiseLine {
  if (productIsVariable(product)) {
    if (!line.variantId) throw new Error(`Choose an option for ${product.name}.`);
    const variant = activeProductVariants(product).find((item) => item.id === line.variantId);
    if (!variant) throw new Error(`Selected option is unavailable for ${product.name}.`);
    if (line.quantity > variant.stock) throw new Error(`Not enough stock for ${product.name} - ${variant.title}.`);
    return {
      productId: product.id,
      variantId: variant.id,
      productNameSnapshot: product.name,
      variantTitleSnapshot: variant.title,
      variantSkuSnapshot: variant.sku,
      variantImageUrlSnapshot: variant.imageUrl,
      unitPriceCents: variant.priceCents,
      quantity: line.quantity,
      lineTotalCents: variant.priceCents * line.quantity,
    };
  }
  if (line.quantity > product.stock) throw new Error(`Not enough stock for ${product.name}.`);
  return {
    productId: product.id,
    productNameSnapshot: product.name,
    unitPriceCents: product.priceCents,
    quantity: line.quantity,
    lineTotalCents: product.priceCents * line.quantity,
  };
}

export function decrementVariantStock(product: Product, variantId: string, quantity: number) {
  const details = parseDetails(product);
  let found = false;
  const variants = (details.variants || []).map((variant) => {
    if (variant.id !== variantId) return variant;
    found = true;
    if (variant.stock < quantity) throw new Error(`Insufficient stock for ${product.name} - ${variant.title}.`);
    return { ...variant, stock: variant.stock - quantity };
  });
  if (!found) throw new Error(`Selected option is unavailable for ${product.name}.`);
  return JSON.stringify({ ...details, variants });
}
