import { Product, ProductImageAsset, ProductOption, ProductVariant } from './types';

export type CartVariantLine = {
  productId: string;
  variantId?: string;
  quantity: number;
};

export const isVariableProduct = (product: Product) =>
  product.details?.sellingType === 'VARIABLE' && (product.details?.variants || []).some((variant) => variant.isActive);

export const activeVariants = (product: Product): ProductVariant[] =>
  (product.details?.variants || []).filter((variant) => variant.isActive);

export const productOptions = (product: Product): ProductOption[] =>
  isVariableProduct(product) ? (product.details?.options || []) : [];

export const productImages = (product: Product): ProductImageAsset[] => {
  const gallery = (product.details?.images || []).filter((image) => image.url);
  if (gallery.length > 0) return [...gallery].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  return product.imageUrl ? [{ id: 'primary', url: product.imageUrl, altText: product.name, sortOrder: 0 }] : [];
};

export const productPrimaryImage = (product: Product, variant?: ProductVariant) =>
  variant?.imageUrl || productImages(product)[0]?.url || product.imageUrl;

export const variantTitle = (variant?: ProductVariant) => variant?.title || '';

export const productStock = (product: Product, variant?: ProductVariant) => {
  if (variant) return variant.stock;
  if (isVariableProduct(product)) return activeVariants(product).reduce((sum, item) => sum + item.stock, 0);
  return product.stock;
};

export const productPriceRange = (product: Product) => {
  const variants = activeVariants(product);
  if (variants.length === 0) return { min: product.priceCents, max: product.priceCents };
  const prices = variants.map((variant) => variant.priceCents);
  return { min: Math.min(...prices), max: Math.max(...prices) };
};

export const selectedVariant = (product: Product, selections: Record<string, string>) => {
  const optionNames = productOptions(product).map((option) => option.name);
  if (optionNames.length === 0 || optionNames.some((name) => !selections[name])) return undefined;
  return activeVariants(product).find((variant) => optionNames.every((name) => variant.selections[name] === selections[name]));
};

export const optionValueAvailable = (product: Product, optionName: string, value: string, selections: Record<string, string>) => {
  const next = { ...selections, [optionName]: value };
  return activeVariants(product).some((variant) =>
    variant.stock > 0
    && Object.entries(next).every(([name, selected]) => !selected || variant.selections[name] === selected),
  );
};

export const colorValues = (product: Product) => productOptions(product)
  .find((option) => /colou?r/i.test(option.name))
  ?.values.filter((value) => value.colorHex) || [];

export const cartLineKey = (line: CartVariantLine) => `${line.productId}:${line.variantId || 'default'}`;

export const findCartProduct = (products: Product[], line: CartVariantLine) => products.find((product) => product.id === line.productId);

export const findCartVariant = (product: Product | undefined, line: CartVariantLine) =>
  product && line.variantId ? activeVariants(product).find((variant) => variant.id === line.variantId) : undefined;

export const lineUnitPrice = (product: Product, variant?: ProductVariant) => variant?.priceCents ?? product.priceCents;

export const lineMaxQuantity = (product: Product, variant?: ProductVariant) => productStock(product, variant);

