/**
 * Frontend adapter over the shared category registry (shared/productCategorySchemas).
 * The schemas themselves are framework-agnostic; this module localizes them for the
 * current language and converts between stored attribute values and form-input values.
 * All category truth still lives in the shared module — this only presents it.
 */
import type { Lang } from '@/lib/i18n';
import {
  coerceAttributeValue,
  getProductCategorySchema,
  listProductCategorySchemas,
  localize,
  normalizeCategoryAttributes,
  validateCategoryAttributes,
  persistedSellingType,
  type Bilingual,
  type ProductAttributeValue,
  type ProductCategorySchema,
  type ProductDetailFieldSchema,
  type SellingType,
} from '@shared/productCategorySchemas';

export {
  getProductCategorySchema,
  listProductCategorySchemas,
  normalizeCategoryAttributes,
  validateCategoryAttributes,
  persistedSellingType,
};
export type { ProductCategorySchema, ProductDetailFieldSchema, ProductAttributeValue, SellingType };

export const tr = (value: Bilingual | undefined, lang: Lang): string => localize(value, lang);

/** Options for the category selector, localized + sorted by label. */
export function categorySelectOptions(lang: Lang): { value: string; label: string }[] {
  return listProductCategorySchemas()
    .map((schema) => ({ value: schema.key, label: tr(schema.label, lang) }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

/** Human label for a selling type. */
export function sellingTypeLabel(type: SellingType, lang: Lang): string {
  const en: Record<SellingType, string> = {
    simple: 'Simple product',
    variants: 'Has variants',
    made_to_order: 'Made to order',
    digital: 'Digital',
    service: 'Service',
  };
  const ar: Record<SellingType, string> = {
    simple: 'منتج بسيط',
    variants: 'بمتغيّرات',
    made_to_order: 'حسب الطلب',
    digital: 'رقمي',
    service: 'خدمة',
  };
  return (lang === 'ar' ? ar : en)[type];
}

/** Form-input value for an attribute field: '' / boolean / string[] depending on type. */
export type AttributeFormValue = string | boolean | string[];

export function emptyAttributeValue(field: ProductDetailFieldSchema): AttributeFormValue {
  if (field.type === 'boolean') return false;
  if (field.type === 'multi_select') return [];
  return '';
}

/** Build the attribute form state for a category, seeded from stored attributes. */
export function attributesToForm(
  categoryKey: string | undefined,
  stored: Record<string, ProductAttributeValue> | undefined,
): Record<string, AttributeFormValue> {
  const schema = getProductCategorySchema(categoryKey);
  if (!schema) return {};
  const out: Record<string, AttributeFormValue> = {};
  for (const field of schema.fields) {
    const value = stored?.[field.key];
    if (field.type === 'boolean') out[field.key] = value === true;
    else if (field.type === 'multi_select') out[field.key] = Array.isArray(value) ? value.map(String) : [];
    else out[field.key] = value === null || value === undefined ? '' : String(value);
  }
  return out;
}

/** Convert attribute form state back to normalized stored attributes (drops blanks). */
export function formToAttributes(
  categoryKey: string | undefined,
  form: Record<string, AttributeFormValue> | undefined,
): Record<string, ProductAttributeValue> {
  const schema = getProductCategorySchema(categoryKey);
  if (!schema || !form) return {};
  const raw: Record<string, unknown> = {};
  for (const field of schema.fields) raw[field.key] = coerceAttributeValue(field, form[field.key]);
  return normalizeCategoryAttributes(categoryKey, raw);
}

/** Map a shared AttributeError list to a key→message record for inline display. */
export function attributeErrorMap(
  categoryKey: string | undefined,
  attributes: Record<string, ProductAttributeValue> | undefined,
): Record<string, string> {
  const errors = validateCategoryAttributes(categoryKey, attributes);
  return Object.fromEntries(errors.map((error) => [error.key, error.message]));
}

/** Suggested variant option templates for a category, localized. */
export function variantOptionTemplates(categoryKey: string | undefined, lang: Lang) {
  return (getProductCategorySchema(categoryKey)?.variantOptions ?? []).map((option) => ({
    key: option.key,
    label: tr(option.label, lang),
    suggestedValues: option.suggestedValues ?? [],
  }));
}

/** Whether this category supports a variants selling type. */
export function categorySupportsVariants(categoryKey: string | undefined): boolean {
  return getProductCategorySchema(categoryKey)?.sellingTypes.includes('variants') ?? false;
}

/** Format a stored attribute value for display (option labels, units, booleans), localized. */
export function formatAttributeValue(field: ProductDetailFieldSchema, value: ProductAttributeValue, lang: Lang): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'boolean') return value ? (lang === 'ar' ? 'نعم' : 'Yes') : (lang === 'ar' ? 'لا' : 'No');
  const labelFor = (raw: string) => tr(field.options?.find((option) => option.value === raw)?.label, lang) || raw;
  if (Array.isArray(value)) return value.map((item) => labelFor(String(item))).join(lang === 'ar' ? '، ' : ', ');
  const base = field.options ? labelFor(String(value)) : String(value);
  return field.unit ? `${base} ${field.unit}` : base;
}

/**
 * Compact [label, value] rows for fields flagged `visibleOnCard` — the few key specs
 * worth surfacing on a product card (e.g. brand, condition, storage). Public-only.
 */
export function cardAttributeRows(
  categoryKey: string | undefined,
  attributes: Record<string, ProductAttributeValue> | undefined,
  lang: Lang,
): [string, string][] {
  const schema = getProductCategorySchema(categoryKey);
  if (!schema || !attributes) return [];
  const rows: [string, string][] = [];
  for (const field of schema.fields) {
    if (!field.visibleOnCard || field.adminOnly) continue;
    const value = attributes[field.key];
    if (value === undefined || value === null || (Array.isArray(value) && value.length === 0) || value === '') continue;
    rows.push([tr(field.label, lang), formatAttributeValue(field, value, lang)]);
  }
  return rows;
}

/**
 * Public, schema-ordered [label, value] rows for a product's category attributes.
 * Only fields visible on the product page (and never admin-only) are included.
 */
export function categoryDetailRows(
  categoryKey: string | undefined,
  attributes: Record<string, ProductAttributeValue> | undefined,
  lang: Lang,
): [string, string][] {
  const schema = getProductCategorySchema(categoryKey);
  if (!schema || !attributes) return [];
  const rows: [string, string][] = [];
  for (const field of schema.fields) {
    if (field.adminOnly || field.visibleOnProductPage === false) continue;
    const value = attributes[field.key];
    if (value === undefined || value === null || (Array.isArray(value) && value.length === 0) || value === '') continue;
    rows.push([tr(field.label, lang), formatAttributeValue(field, value, lang)]);
  }
  return rows;
}
