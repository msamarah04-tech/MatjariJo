import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, Check, ChevronDown, ImageIcon, Info, Package, Plus,
  Sparkles, Tag, Trash2, X, BarChart2, Layers, Search,
  Box, GitBranch, Clock, Download, UserCheck,
} from 'lucide-react';
import { parseMoney, toMajor } from '@shared/money';
import { useI18n, type Lang } from '@/lib/i18n';
import { cn } from '@/lib/cn';
import { slugify } from '@/lib/format';
import { prepareImageDataUrl } from '@/lib/images';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { toast } from '@/components/ui/Toast';
import { useStore } from '@/lib/store';
import type { Product, ProductCatalogStatus, Store } from '@/lib/types';
import {
  attributeErrorMap,
  attributesToForm,
  categorySupportsVariants,
  formToAttributes,
  getProductCategorySchema,
  groupedCategorySchemas,
  sellingTypeLabel,
  tr,
  variantOptionTemplates,
  type AttributeFormValue,
  type ProductDetailFieldSchema,
  type SellingType,
} from '@/lib/productCategory';
import { useAdminContext, useStoreProducts } from './shared';

// ─── Types (mirrors ProductWizard exactly so buildPayload is identical) ────────

type OptionDraft = { name: string; valuesText: string };
type VariantDraft = {
  id: string;
  title: string;
  selections: Record<string, string>;
  priceText: string;
  stockText: string;
  sku: string;
  imageUrl: string;
  isActive: boolean;
};
type ImageAsset = { url: string; altText: string };

type EditorState = {
  name: string;
  shortDescription: string;
  description: string;
  categoryKey: string;
  status: ProductCatalogStatus;
  isFeatured: boolean;
  priceText: string;
  compareAtText: string;
  costPriceText: string;
  sku: string;
  barcode: string;
  brand: string;
  stockText: string;
  lowStockText: string;
  tagsText: string;
  weightText: string;
  dimensions: string;
  returnPolicy: string;
  warranty: string;
  attributes: Record<string, AttributeFormValue>;
  sellingType: SellingType;
  options: OptionDraft[];
  variants: VariantDraft[];
  image: { emoji?: string; url?: string };
  gallery: ImageAsset[];
  seoTitle: string;
  seoDescription: string;
  slug: string;
};

// ─── Helpers (identical logic to ProductWizard) ────────────────────────────────

const PRODUCT_EMOJIS = ['📦', '🛍️', '🪴', '☕', '🖼️', '💎', '🕯️', '🍪', '👕', '✨'];
const stableId = (prefix: string) => `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
const splitCsv = (v: string) => v.split(',').map((s) => s.trim()).filter(Boolean);
const cartesian = <T,>(sets: T[][]): T[][] =>
  sets.reduce<T[][]>((acc, set) => acc.flatMap((p) => set.map((item) => [...p, item])), [[]]);

const parseOptionDrafts = (options: OptionDraft[]) =>
  options
    .map((o) => ({
      name: o.name.trim(),
      values: splitCsv(o.valuesText).map((r) => r.replace(/#[0-9a-fA-F]{6}/g, '').trim()).filter(Boolean),
    }))
    .filter((o) => o.name && o.values.length > 0);

const buildVariantDrafts = (options: OptionDraft[], priceText: string, defaultStock: string, existing: VariantDraft[]): VariantDraft[] => {
  const parsed = parseOptionDrafts(options);
  if (!parsed.length) return [];
  const prior = new Map(existing.map((v) => [v.title, v]));
  return cartesian(parsed.map((o) => o.values)).map((combo) => {
    const title = combo.join(' / ');
    const selections = Object.fromEntries(parsed.map((o, i) => [o.name, combo[i]]));
    const found = prior.get(title);
    return found ? { ...found, selections } : { id: stableId('var'), title, selections, priceText, stockText: defaultStock || '0', sku: '', imageUrl: '', isActive: true };
  });
};

const TEMPLATE_ATTR_KEYS: Record<string, string[]> = {
  size: ['availableSizes'], color: ['color'], storage: ['storage'], ram: ['ram'], scent: ['scent'],
};
const valuesFromAttrs = (key: string, attrs: Record<string, AttributeFormValue>): string => {
  for (const attrKey of TEMPLATE_ATTR_KEYS[key] ?? []) {
    const v = attrs[attrKey];
    if (Array.isArray(v) && v.length >= 2) return v.join(', ');
  }
  return '';
};
const seedOptionDrafts = (templates: { key: string; label: string }[], attrs: Record<string, AttributeFormValue>): OptionDraft[] =>
  templates.map((t) => ({ name: t.label, valuesText: valuesFromAttrs(t.key, attrs) }));

const minorToText = (minor: number | undefined, currency: string) =>
  minor === undefined || minor === null ? '' : String(toMajor(minor, currency));

function blankState(): EditorState {
  return {
    name: '', shortDescription: '', description: '', categoryKey: '', status: 'ACTIVE', isFeatured: false,
    priceText: '', compareAtText: '', costPriceText: '', sku: '', barcode: '', brand: '',
    stockText: '10', lowStockText: '5', tagsText: '', weightText: '', dimensions: '', returnPolicy: '', warranty: '',
    attributes: {}, sellingType: 'simple', options: [], variants: [],
    image: { emoji: '📦' }, gallery: [], seoTitle: '', seoDescription: '', slug: '',
  };
}

function stateFromProduct(product: Product, store: Store): EditorState {
  const d = product.details || {};
  const categoryKey = d.categoryKey && getProductCategorySchema(d.categoryKey) ? d.categoryKey : '';
  const options: OptionDraft[] = (d.options || []).map((o: any) => ({
    name: o.name,
    valuesText: o.values.map((v: any) => `${v.value}${v.colorHex ? ` ${v.colorHex}` : ''}`).join(', '),
  }));
  const variants: VariantDraft[] = (d.variants || []).map((v: any) => ({
    id: v.id, title: v.title, selections: v.selections,
    priceText: minorToText(v.priceCents, store.currency),
    stockText: String(v.stock ?? 0), sku: v.sku || '', imageUrl: v.imageUrl || '', isActive: v.isActive,
  }));
  return {
    name: product.name, shortDescription: d.shortDescription || '', description: product.description || '',
    categoryKey, status: d.status || (product.isActive ? 'ACTIVE' : 'DRAFT'),
    isFeatured: product.isFeatured ?? false,
    priceText: minorToText(product.priceCents, store.currency),
    compareAtText: minorToText(product.compareAtCents, store.currency),
    costPriceText: minorToText(d.costPriceCents, store.currency),
    sku: d.sku || '', barcode: d.barcode || '', brand: d.brand || '',
    stockText: String(product.stock ?? 0),
    lowStockText: d.lowStockThreshold !== undefined ? String(d.lowStockThreshold) : '',
    tagsText: (product.tags || []).join(', '),
    weightText: d.weightGrams !== undefined ? String(d.weightGrams) : '',
    dimensions: d.dimensions || '', returnPolicy: d.returnPolicy || '', warranty: d.warranty || '',
    attributes: attributesToForm(categoryKey, d.attributes),
    sellingType: d.sellingType === 'VARIABLE' ? 'variants' : 'simple',
    options, variants,
    image: { emoji: product.imageEmoji || (product.imageUrl ? undefined : '📦'), url: product.imageUrl },
    gallery: (d.images || []).map((img: any) => ({ url: img.url, altText: img.altText || '' })),
    seoTitle: d.seoTitle || '', seoDescription: d.seoDescription || '', slug: d.slug || '',
  };
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function ProductEditor() {
  const { storeId, store } = useAdminContext();
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();
  const { lang, dir } = useI18n();
  const storeProducts = useStoreProducts(storeId);
  const addProduct = useStore((s) => s.addProduct);
  const updateProduct = useStore((s) => s.updateProduct);

  const editing = useMemo(
    () => (productId ? storeProducts.find((p) => p.id === productId) ?? null : null),
    [productId, storeProducts],
  );

  const [state, setState] = useState<EditorState>(() => blankState());
  const [submitting, setSubmitting] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const [activeSection, setActiveSection] = useState('info');

  useEffect(() => {
    setState(editing ? stateFromProduct(editing, store) : blankState());
    setShowErrors(false);
  }, [editing, store]);

  const set = <K extends keyof EditorState>(key: K, value: EditorState[K]) =>
    setState((prev) => ({ ...prev, [key]: value }));

  const schema = getProductCategorySchema(state.categoryKey);
  const attributesNormalized = useMemo(() => formToAttributes(state.categoryKey, state.attributes), [state.categoryKey, state.attributes]);
  const attributeErrors = useMemo(() => attributeErrorMap(state.categoryKey, attributesNormalized), [state.categoryKey, attributesNormalized]);
  const supportsVariants = categorySupportsVariants(state.categoryKey);
  const priceMinor = parseMoney(state.priceText, store.currency) ?? 0;
  const groupedCategories = useMemo(() => groupedCategorySchemas(), []);

  useEffect(() => {
    if (state.sellingType !== 'variants') return;
    const next = buildVariantDrafts(state.options, state.priceText, state.stockText, state.variants);
    const unchanged = next.length === state.variants.length && next.every((v, i) => v.title === state.variants[i]?.title);
    if (!unchanged) set('variants', next);
  }, [state.sellingType, state.options]);

  const formErrors = useMemo(() => {
    const errors: Record<string, string> = {};
    if (!state.name.trim()) errors.name = 'Product name is required.';
    if (!state.categoryKey) errors.categoryKey = 'Choose a category.';
    if (priceMinor <= 0) errors.price = 'Enter a price greater than 0.';
    Object.assign(errors, attributeErrors);
    return errors;
  }, [state.name, state.categoryKey, priceMinor, attributeErrors]);

  const buildPayload = (): Record<string, unknown> => {
    const currency = store.currency;
    const optionDrafts = state.sellingType === 'variants'
      ? state.options
      : seedOptionDrafts(variantOptionTemplates(state.categoryKey, lang as Lang), state.attributes).filter((o) => splitCsv(o.valuesText).length >= 2);
    const variantDrafts = state.sellingType === 'variants' && state.variants.length
      ? state.variants
      : buildVariantDrafts(optionDrafts, state.priceText, state.stockText, []);
    const useVariants = variantDrafts.length > 0;
    const persistedType = useVariants ? 'VARIABLE' : 'SIMPLE';

    const builtOptions = optionDrafts.map((o, i) => {
      const name = o.name.trim();
      const isColor = /colou?r/i.test(name);
      const values = splitCsv(o.valuesText).map((raw, vi) => {
        const cm = isColor ? raw.match(/#[0-9a-fA-F]{6}/) : null;
        const value = (cm ? raw.replace(cm[0], '') : raw).trim();
        return value ? { id: stableId('val'), value, displayValue: value, colorHex: cm?.[0], sortOrder: vi } : undefined;
      }).filter((v): v is NonNullable<typeof v> => Boolean(v));
      return name && values.length ? { id: stableId('opt'), name, sortOrder: i, values } : undefined;
    }).filter((o): o is NonNullable<typeof o> => Boolean(o));

    const builtVariants = useVariants
      ? variantDrafts.map((v, i) => ({
          id: v.id, title: v.title, selections: v.selections,
          priceCents: parseMoney(v.priceText, currency) ?? priceMinor,
          stock: Math.max(0, Math.floor(Number(v.stockText) || 0)),
          sku: v.sku.trim() || undefined, imageUrl: v.imageUrl.trim() || undefined,
          isActive: v.isActive, sortOrder: i,
        }))
      : [];

    const compareAtMinor = parseMoney(state.compareAtText, currency);
    const costMinor = parseMoney(state.costPriceText, currency);
    const stock = useVariants ? builtVariants.reduce((s, v) => s + v.stock, 0) : Math.max(0, Math.floor(Number(state.stockText) || 0));
    const existingDetails = (editing?.details ?? {}) as Record<string, unknown>;

    const details: Record<string, unknown> = {
      ...existingDetails, categoryKey: state.categoryKey || undefined,
      attributes: attributesNormalized, sellingType: persistedType, status: state.status,
      sku: state.sku.trim() || undefined, barcode: state.barcode.trim() || undefined,
      brand: state.brand.trim() || undefined, shortDescription: state.shortDescription.trim() || undefined,
      options: builtOptions, variants: builtVariants,
      images: state.gallery.filter((img) => img.url.trim()).map((img, i) => ({ id: stableId('img'), url: img.url.trim(), altText: img.altText.trim() || state.name, sortOrder: i })),
      costPriceCents: costMinor && costMinor > 0 ? costMinor : undefined,
      lowStockThreshold: state.lowStockText === '' ? undefined : Math.max(0, Math.floor(Number(state.lowStockText) || 0)),
      weightGrams: state.weightText === '' ? undefined : Math.max(0, Math.floor(Number(state.weightText) || 0)),
      dimensions: state.dimensions.trim() || undefined, returnPolicy: state.returnPolicy.trim() || undefined,
      warranty: state.warranty.trim() || undefined, seoTitle: state.seoTitle.trim() || undefined,
      seoDescription: state.seoDescription.trim() || undefined, slug: state.slug.trim() || slugify(state.name),
    };

    return {
      name: state.name.trim(), description: state.description.trim(), details,
      category: schema ? tr(schema.label, 'en') : (editing?.category || store.category || ''),
      collection: editing?.collection || '',
      tags: splitCsv(state.tagsText).slice(0, 12), priceCents: priceMinor,
      compareAtCents: compareAtMinor && compareAtMinor > priceMinor ? compareAtMinor : undefined,
      stock, imageEmoji: state.image.url ? undefined : (state.image.emoji || '📦'),
      imageUrl: state.image.url, isActive: state.status === 'ACTIVE', isFeatured: state.isFeatured,
    };
  };

  const save = async (targetStatus?: ProductCatalogStatus) => {
    const effectiveStatus = targetStatus ?? state.status;
    if (effectiveStatus !== state.status) setState((prev) => ({ ...prev, status: effectiveStatus }));

    if (Object.keys(formErrors).length > 0) {
      setShowErrors(true);
      toast({ title: 'Fix the highlighted fields first', type: 'error' });
      return;
    }
    setSubmitting(true);
    try {
      const payload = buildPayload();
      if (effectiveStatus !== state.status) {
        (payload.details as Record<string, unknown>).status = effectiveStatus;
        payload.isActive = effectiveStatus === 'ACTIVE';
      }
      if (editing) {
        await updateProduct(storeId, editing.id, payload as Partial<Product>);
        toast({ title: 'Product saved', type: 'success' });
      } else {
        await addProduct(storeId, payload as Omit<Product, 'id' | 'storeId' | 'createdAt'>);
        toast({ title: 'Product created', type: 'success' });
        navigate(`/admin/${storeId}/products`);
      }
    } catch (error) {
      toast({ title: 'Could not save product', description: error instanceof Error ? error.message : undefined, type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const SECTIONS = [
    { id: 'info', label: 'Info', icon: Info },
    { id: 'pricing', label: 'Pricing', icon: Tag },
    { id: 'inventory', label: 'Inventory', icon: Package },
    { id: 'category', label: 'Category', icon: Layers },
    { id: 'variants', label: 'Variants', icon: BarChart2 },
    { id: 'images', label: 'Images', icon: ImageIcon },
    { id: 'seo', label: 'SEO', icon: Search },
  ];

  const isNew = !editing;
  const title = isNew ? 'New Product' : (state.name || 'Edit Product');

  return (
    <div dir={dir} className="space-y-6">
      {/* ── Sticky top bar ─────────────────────────────────────────────── */}
      <div className="sticky top-0 z-20 -mx-5 -mt-6 flex items-center justify-between gap-4 border-b border-line bg-surface/95 px-5 py-3 backdrop-blur md:-mx-8 md:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <button
            onClick={() => navigate(`/admin/${storeId}/products`)}
            className="flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-1.5 text-xs font-bold text-muted transition-colors hover:bg-paper hover:text-ink"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Products
          </button>
          <span className="text-muted">/</span>
          <span className="truncate text-sm font-black text-ink">{title}</span>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button
            variant="ghost"
            className="border border-line"
            onClick={() => save('DRAFT')}
            disabled={submitting}
          >
            Save draft
          </Button>
          <Button
            variant="accent"
            onClick={() => save('ACTIVE')}
            disabled={submitting}
          >
            <Check className="me-1.5 h-4 w-4" />
            {isNew ? 'Publish' : 'Save & publish'}
          </Button>
        </div>
      </div>

      <div className="flex gap-8 lg:items-start">
        {/* ── Left sidebar (sticky) ────────────────────────────────────── */}
        <aside className="hidden w-56 shrink-0 lg:block">
          <div className="sticky top-24 space-y-4">
            {/* Image card */}
            <div className="rounded-2xl border border-line bg-surface p-4 shadow-sm">
              <p className="mb-3 text-[10px] font-black uppercase tracking-widest text-muted">Product image</p>
              <ImageSidebar state={state} set={set} />
            </div>

            {/* Status + featured */}
            <div className="rounded-2xl border border-line bg-surface p-4 shadow-sm space-y-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted">Visibility</p>
              <select
                value={state.status}
                onChange={(e) => set('status', e.target.value as ProductCatalogStatus)}
                className="h-9 w-full rounded-lg border border-line bg-surface px-3 text-sm font-bold text-ink focus:outline-none focus:ring-1 focus:ring-accent"
              >
                <option value="ACTIVE">Active (Live)</option>
                <option value="DRAFT">Draft (Hidden)</option>
                <option value="ARCHIVED">Archived</option>
              </select>
              <label className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-line bg-paper px-3 py-2.5 hover:bg-line/20">
                <input
                  type="checkbox"
                  checked={state.isFeatured}
                  onChange={(e) => set('isFeatured', e.target.checked)}
                  className="h-4 w-4 accent-accent"
                />
                <span className="text-sm font-bold text-ink">Featured</span>
              </label>
            </div>

            {/* Quick facts */}
            {editing && (
              <div className="rounded-2xl border border-line bg-surface p-4 shadow-sm space-y-2.5">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted">Quick info</p>
                <div className="space-y-1.5 text-xs text-muted">
                  {state.sku && <p><span className="font-bold text-ink">SKU</span> {state.sku}</p>}
                  <p><span className="font-bold text-ink">Stock</span> {state.sellingType === 'variants' ? `${state.variants.filter((v) => v.isActive).length} variants` : `${state.stockText || 0} units`}</p>
                  {state.brand && <p><span className="font-bold text-ink">Brand</span> {state.brand}</p>}
                </div>
              </div>
            )}

            {/* Section nav */}
            <nav className="rounded-2xl border border-line bg-surface p-2 shadow-sm">
              {SECTIONS.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => {
                    document.getElementById(`section-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    setActiveSection(id);
                  }}
                  className={cn(
                    'flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-bold transition-colors',
                    activeSection === id ? 'bg-ink text-surface' : 'text-muted hover:bg-paper hover:text-ink',
                  )}
                >
                  <Icon className="h-3.5 w-3.5 shrink-0" />
                  {label}
                </button>
              ))}
            </nav>
          </div>
        </aside>

        {/* ── Main form ───────────────────────────────────────────────── */}
        <div className="min-w-0 flex-1 space-y-6">
          {showErrors && Object.keys(formErrors).length > 0 && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">
              Fix the highlighted fields before saving.
            </div>
          )}

          {/* SECTION: Info */}
          <Section id="info" title="Product info" icon={Info} onVisible={setActiveSection}>
            <div className="space-y-4">
              <FormField label="Product name" required error={showErrors ? formErrors.name : undefined}>
                <Input
                  value={state.name}
                  onChange={(e) => set('name', e.target.value)}
                  placeholder="e.g. Linen Shirt"
                  className={showErrors && formErrors.name ? 'border-red-400' : ''}
                />
              </FormField>
              <FormField label="Short summary" hint="Shown in product cards (max 240 chars).">
                <Input value={state.shortDescription} onChange={(e) => set('shortDescription', e.target.value)} />
              </FormField>
              <FormField label="Full description">
                <Textarea rows={4} value={state.description} onChange={(e) => set('description', e.target.value)} />
              </FormField>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField label="Category" required error={showErrors ? formErrors.categoryKey : undefined}>
                  <select
                    className={cn(selectCls, showErrors && formErrors.categoryKey && 'border-red-400')}
                    value={state.categoryKey}
                    onChange={(e) => {
                      const newKey = e.target.value;
                      const newSchema = getProductCategorySchema(newKey);
                      const firstType = newSchema?.sellingTypes[0] ?? 'simple';
                      setState((prev) => ({ ...prev, categoryKey: newKey, sellingType: firstType, attributes: {} }));
                    }}
                  >
                    <option value="">Choose a category…</option>
                    {groupedCategories.map(({ group, schemas }) => (
                      <optgroup key={group.key} label={group.label.en}>
                        {schemas.map((s) => (
                          <option key={s.key} value={s.key}>{s.label.en}</option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                  {schema?.description && (
                    <p className="mt-1 text-xs text-muted">{schema.description.en}</p>
                  )}
                </FormField>
                <FormField label="Collection / grouping" hint="Optional">
                  <Input value={(editing?.collection) || ''} placeholder="e.g. Summer 2025" disabled />
                </FormField>
              </div>

              {/* Selling type radio cards — only shown when a category is chosen */}
              {schema && (
                <SellingTypeCards
                  supported={schema.sellingTypes}
                  value={state.sellingType}
                  onChange={(t) => set('sellingType', t)}
                  lang={lang as Lang}
                />
              )}
            </div>
          </Section>

          {/* SECTION: Pricing */}
          <Section id="pricing" title="Pricing" icon={Tag} onVisible={setActiveSection}>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <FormField label="Selling price" required error={showErrors ? formErrors.price : undefined}>
                <MoneyInput value={state.priceText} onChange={(v) => set('priceText', v)} currency={store.currency} className={showErrors && formErrors.price ? 'border-red-400' : ''} />
              </FormField>
              <FormField label="Compare-at price" hint="Crossed-out 'was' price.">
                <MoneyInput value={state.compareAtText} onChange={(v) => set('compareAtText', v)} currency={store.currency} />
              </FormField>
              <FormField label="Cost price" hint="Private — not shown to customers.">
                <MoneyInput value={state.costPriceText} onChange={(v) => set('costPriceText', v)} currency={store.currency} />
              </FormField>
            </div>
          </Section>

          {/* SECTION: Inventory */}
          <Section id="inventory" title="Inventory" icon={Package} onVisible={setActiveSection}>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <FormField label="Brand">
                <Input value={state.brand} onChange={(e) => set('brand', e.target.value)} />
              </FormField>
              <FormField label="SKU">
                <Input value={state.sku} onChange={(e) => set('sku', e.target.value)} />
              </FormField>
              <FormField label="Barcode / GTIN">
                <Input value={state.barcode} onChange={(e) => set('barcode', e.target.value)} />
              </FormField>
              <FormField label="Stock quantity" hint={state.sellingType === 'variants' && state.variants.length > 0 ? 'Managed per variant.' : undefined}>
                <Input
                  type="number" min="0"
                  value={state.stockText}
                  onChange={(e) => set('stockText', e.target.value)}
                  disabled={state.sellingType === 'variants' && state.variants.length > 0}
                />
              </FormField>
              <FormField label="Low-stock alert at">
                <Input type="number" min="0" value={state.lowStockText} onChange={(e) => set('lowStockText', e.target.value)} />
              </FormField>
              <FormField label="Shipping weight (g)">
                <Input type="number" min="0" value={state.weightText} onChange={(e) => set('weightText', e.target.value)} />
              </FormField>
              <FormField label="Dimensions">
                <Input value={state.dimensions} onChange={(e) => set('dimensions', e.target.value)} placeholder="30 × 20 × 8 cm" />
              </FormField>
              <div className="sm:col-span-2">
                <FormField label="Tags" hint="Comma separated (max 12).">
                  <Input value={state.tagsText} onChange={(e) => set('tagsText', e.target.value)} placeholder="cotton, summer, gift" />
                </FormField>
              </div>
              <div className="sm:col-span-2 lg:col-span-3 grid sm:grid-cols-2 gap-4">
                <FormField label="Return policy">
                  <Input value={state.returnPolicy} onChange={(e) => set('returnPolicy', e.target.value)} />
                </FormField>
                <FormField label="Warranty">
                  <Input value={state.warranty} onChange={(e) => set('warranty', e.target.value)} />
                </FormField>
              </div>
            </div>
          </Section>

          {/* SECTION: Category details */}
          <Section id="category" title="Category details" icon={Layers} onVisible={setActiveSection}>
            {!state.categoryKey ? (
              <p className="text-sm text-muted">Choose a category above to see category-specific fields.</p>
            ) : !schema ? (
              <p className="text-sm text-muted">No extra fields for this category.</p>
            ) : (
              <CategoryFields
                schema={schema}
                lang={lang as Lang}
                attributes={state.attributes}
                setAttr={(key, value) => set('attributes', { ...state.attributes, [key]: value })}
                errors={showErrors ? attributeErrors : {}}
              />
            )}
          </Section>

          {/* SECTION: Variants */}
          <Section id="variants" title="Variants" icon={BarChart2} onVisible={setActiveSection}>
            <VariantsSection
              state={state}
              set={set}
              supportsVariants={supportsVariants}
              lang={lang as Lang}
            />
          </Section>

          {/* SECTION: Images */}
          <Section id="images" title="Images" icon={ImageIcon} onVisible={setActiveSection}>
            <ImagesSection state={state} set={set} />
          </Section>

          {/* SECTION: SEO */}
          <Section id="seo" title="SEO & URL" icon={Search} onVisible={setActiveSection}>
            <div className="space-y-4">
              <FormField label="SEO title" hint="Defaults to the product name if left blank.">
                <Input value={state.seoTitle} onChange={(e) => set('seoTitle', e.target.value)} placeholder={state.name || 'Product name'} />
              </FormField>
              <FormField label="SEO description">
                <Textarea rows={2} value={state.seoDescription} onChange={(e) => set('seoDescription', e.target.value)} />
              </FormField>
              <FormField label="URL slug" hint={`/store/${store.slug}/p/...`}>
                <Input
                  value={state.slug}
                  onChange={(e) => set('slug', e.target.value)}
                  placeholder={slugify(state.name) || 'product-url-slug'}
                />
              </FormField>
            </div>
          </Section>

          {/* Bottom save bar */}
          <div className="flex justify-end gap-3 rounded-2xl border border-line bg-surface p-4 shadow-sm">
            <Button variant="ghost" className="border border-line" onClick={() => navigate(`/admin/${storeId}/products`)}>
              Cancel
            </Button>
            <Button variant="ghost" className="border border-line" onClick={() => save('DRAFT')} disabled={submitting}>
              Save draft
            </Button>
            <Button variant="accent" onClick={() => save('ACTIVE')} disabled={submitting}>
              <Check className="me-1.5 h-4 w-4" />
              {isNew ? 'Publish product' : 'Save changes'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────────

const selectCls = 'h-10 w-full rounded-lg border border-line bg-surface px-3 text-sm font-semibold text-ink focus:outline-none focus:ring-1 focus:ring-accent';

function Section({ id, title, icon: Icon, children, onVisible }: { id: string; title: string; icon: typeof Info; children: React.ReactNode; onVisible: (id: string) => void }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) onVisible(id); }, { threshold: 0.3, rootMargin: '-80px 0px -40% 0px' });
    observer.observe(el);
    return () => observer.disconnect();
  }, [id, onVisible]);

  return (
    <div ref={ref} id={`section-${id}`} className="rounded-2xl border border-line bg-surface p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <div className="grid h-7 w-7 place-items-center rounded-lg bg-accent/10">
          <Icon className="h-4 w-4 text-accent" />
        </div>
        <h2 className="text-base font-black text-ink">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function FormField({ label, required, hint, error, children }: { label: string; required?: boolean; hint?: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-muted">
        {label}{required && <span className="text-red-500">*</span>}
      </span>
      {children}
      {hint && !error && <span className="mt-1 block text-xs text-muted">{hint}</span>}
      {error && (
        <span className="mt-1 flex items-center gap-1 text-xs font-semibold text-red-600">
          <X className="h-3 w-3" /> {error}
        </span>
      )}
    </label>
  );
}

function MoneyInput({ value, onChange, currency, className }: { value: string; onChange: (v: string) => void; currency: string; className?: string }) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted">{currency}</span>
      <Input type="number" step="0.001" min="0" value={value} onChange={(e) => onChange(e.target.value)} placeholder="0" className={cn('ps-12', className)} />
    </div>
  );
}

function ImageSidebar({ state, set }: { state: EditorState; set: <K extends keyof EditorState>(k: K, v: EditorState[K]) => void }) {
  const onUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await prepareImageDataUrl(file, { maxDimension: 1000, maxBytes: 450_000 });
      set('image', { url: dataUrl });
      toast({ title: 'Image ready', type: 'success' });
    } catch (error) {
      toast({ title: 'Could not use image', description: error instanceof Error ? error.message : undefined, type: 'error' });
    } finally {
      event.target.value = '';
    }
  };
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="grid h-28 w-28 place-items-center overflow-hidden rounded-2xl border-2 border-line bg-paper text-5xl">
        {state.image.url ? <img src={state.image.url} alt="" className="h-full w-full object-cover" /> : (state.image.emoji || '📦')}
      </div>
      <div className="flex flex-wrap justify-center gap-1">
        {PRODUCT_EMOJIS.map((emoji) => (
          <button
            key={emoji} type="button"
            onClick={() => set('image', { emoji, url: undefined })}
            className={cn('grid h-7 w-7 place-items-center rounded-lg border text-sm', state.image.emoji === emoji && !state.image.url ? 'border-ink bg-line/50' : 'border-line hover:border-ink/30')}
          >
            {emoji}
          </button>
        ))}
      </div>
      <label className="flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-line py-1.5 text-xs font-bold text-muted hover:bg-paper">
        <ImageIcon className="h-3 w-3" /> Upload photo
        <input type="file" accept="image/*" className="hidden" onChange={onUpload} />
      </label>
      {state.image.url && (
        <button onClick={() => set('image', { emoji: '📦' })} className="text-xs font-bold text-red-500 hover:underline">
          Remove image
        </button>
      )}
    </div>
  );
}

// ─── Selling-type radio cards ────────────────────────────────────────────────

const SELLING_TYPE_META: Record<SellingType, { icon: React.ElementType; label: string; hint: string }> = {
  simple:       { icon: Box,       label: 'Simple',        hint: 'One price, one stock count.' },
  variants:     { icon: GitBranch, label: 'Variants',      hint: 'Size, color or other options.' },
  made_to_order:{ icon: Clock,     label: 'Made to order', hint: 'Produced after the customer buys.' },
  digital:      { icon: Download,  label: 'Digital',       hint: 'Instant download or link delivery.' },
  service:      { icon: UserCheck, label: 'Service',       hint: 'Bookable or deliverable service.' },
};

function SellingTypeCards({ supported, value, onChange, lang: _lang }: { supported: SellingType[]; value: SellingType; onChange: (t: SellingType) => void; lang: Lang }) {
  if (supported.length <= 1) {
    const meta = SELLING_TYPE_META[supported[0]];
    const Icon = meta.icon;
    return (
      <div className="flex items-center gap-2 rounded-lg border border-line bg-surface px-3 py-2 text-sm text-muted">
        <Icon className="h-4 w-4 shrink-0" />
        <span><span className="font-semibold text-ink">{meta.label}</span> — {meta.hint}</span>
      </div>
    );
  }
  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted">Selling type</p>
      <div className="flex flex-wrap gap-2">
        {supported.map((type) => {
          const meta = SELLING_TYPE_META[type];
          const Icon = meta.icon;
          const active = value === type;
          return (
            <button
              key={type} type="button"
              onClick={() => onChange(type)}
              className={cn(
                'flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors',
                active
                  ? 'border-ink bg-ink text-paper'
                  : 'border-line bg-paper text-muted hover:border-ink/40 hover:text-ink',
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="font-semibold">{meta.label}</span>
            </button>
          );
        })}
      </div>
      {value && <p className="mt-1.5 text-xs text-muted">{SELLING_TYPE_META[value]?.hint}</p>}
    </div>
  );
}

function CategoryFields({ schema, lang, attributes, setAttr, errors }: { schema: ReturnType<typeof getProductCategorySchema>; lang: Lang; attributes: Record<string, AttributeFormValue>; setAttr: (key: string, value: AttributeFormValue) => void; errors: Record<string, string> }) {
  if (!schema) return null;
  const publicFields = schema.fields.filter((f) => !f.adminOnly);
  const adminFields = schema.fields.filter((f) => f.adminOnly);
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {publicFields.map((field) => (
          <AttributeFieldInput key={field.key} field={field} lang={lang} value={attributes[field.key]} onChange={(v) => setAttr(field.key, v)} error={errors[field.key]} />
        ))}
      </div>
      {adminFields.length > 0 && (
        <>
          <p className="text-[10px] font-black uppercase tracking-widest text-muted">Internal (private)</p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {adminFields.map((field) => (
              <AttributeFieldInput key={field.key} field={field} lang={lang} value={attributes[field.key]} onChange={(v) => setAttr(field.key, v)} error={errors[field.key]} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function AttributeFieldInput({ field, lang, value, onChange, error }: { field: ProductDetailFieldSchema; lang: Lang; value: AttributeFormValue | undefined; onChange: (v: AttributeFormValue) => void; error?: string }) {
  const label = tr(field.label, lang) + (field.unit ? ` (${field.unit})` : '');
  const placeholder = tr(field.placeholder, lang);
  const hint = tr(field.helpText, lang) || undefined;
  const fullWidth = field.type === 'textarea' || field.type === 'multi_select';

  const control = () => {
    switch (field.type) {
      case 'boolean':
        return (
          <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-line bg-paper p-3 hover:bg-line/20">
            <input type="checkbox" checked={value === true} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4 accent-accent" />
            <span className="text-sm font-bold text-ink">{label}</span>
          </label>
        );
      case 'textarea':
        return <Textarea rows={3} value={String(value ?? '')} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />;
      case 'number': case 'weight':
        return <Input type="number" value={String(value ?? '')} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />;
      case 'date':
        return <Input type="date" value={String(value ?? '')} onChange={(e) => onChange(e.target.value)} />;
      case 'url':
        return <Input type="url" value={String(value ?? '')} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />;
      case 'select': case 'color':
        return (
          <select className={selectCls} value={String(value ?? '')} onChange={(e) => onChange(e.target.value)}>
            <option value="">—</option>
            {field.options?.map((o) => <option key={o.value} value={o.value}>{tr(o.label, lang)}</option>)}
          </select>
        );
      case 'multi_select':
        return (
          <div className="flex flex-wrap gap-2">
            {field.options?.map((o) => {
              const arr = Array.isArray(value) ? value : [];
              const active = arr.includes(o.value);
              return (
                <button key={o.value} type="button"
                  onClick={() => onChange(active ? arr.filter((v) => v !== o.value) : [...arr, o.value])}
                  className={cn('rounded-lg border px-3 py-1.5 text-xs font-bold transition-colors', active ? 'border-accent bg-accent-soft text-accent' : 'border-line bg-surface text-muted hover:border-ink/30')}
                >
                  {tr(o.label, lang)}
                </button>
              );
            })}
          </div>
        );
      default:
        return <Input value={String(value ?? '')} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />;
    }
  };

  if (field.type === 'boolean') {
    return <div className={cn(fullWidth && 'sm:col-span-2')}>{control()}{error && <span className="mt-1 flex items-center gap-1 text-xs font-semibold text-red-600"><X className="h-3 w-3" /> {error}</span>}</div>;
  }
  return (
    <div className={cn(fullWidth && 'sm:col-span-2')}>
      <FormField label={label} required={field.required} hint={hint} error={error}>{control()}</FormField>
    </div>
  );
}

function VariantsSection({ state, set, supportsVariants, lang }: { state: EditorState; set: <K extends keyof EditorState>(k: K, v: EditorState[K]) => void; supportsVariants: boolean; lang: Lang }) {
  const templates = variantOptionTemplates(state.categoryKey, lang);
  const enabled = state.sellingType === 'variants';

  const enableVariants = (on: boolean) => {
    if (on) {
      set('sellingType', 'variants');
      if (state.options.length === 0) set('options', seedOptionDrafts(templates, state.attributes));
    } else {
      set('sellingType', 'simple');
    }
  };

  const setOption = (index: number, patch: Partial<OptionDraft>) =>
    set('options', state.options.map((o, i) => (i === index ? { ...o, ...patch } : o)));
  const addOption = () => set('options', [...state.options, { name: '', valuesText: '' }].slice(0, 3));
  const removeOption = (index: number) => set('options', state.options.filter((_, i) => i !== index));
  const generate = () => set('variants', buildVariantDrafts(state.options, state.priceText, state.stockText, state.variants));
  const setVariant = (id: string, patch: Partial<VariantDraft>) =>
    set('variants', state.variants.map((v) => (v.id === id ? { ...v, ...patch } : v)));

  if (!supportsVariants) {
    return <p className="text-sm text-muted">This category doesn't support variants.</p>;
  }

  return (
    <div className="space-y-4">
      <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-line bg-paper p-3 hover:bg-line/20">
        <input type="checkbox" checked={enabled} onChange={(e) => enableVariants(e.target.checked)} className="mt-0.5 h-4 w-4 accent-accent" />
        <span>
          <span className="block text-sm font-bold text-ink">Enable variants ({sellingTypeLabel('variants', lang)})</span>
          <span className="mt-0.5 block text-xs text-muted">Let customers choose size, color, or other options. Each combination gets its own stock.</span>
        </span>
      </label>

      {enabled && (
        <div className="space-y-3">
          {state.options.map((option, index) => (
            <div key={index} className="grid grid-cols-[1fr_2fr_auto] gap-2 rounded-xl border border-line bg-paper/50 p-3">
              <Input value={option.name} onChange={(e) => setOption(index, { name: e.target.value })} placeholder="Option name (e.g. Size)" />
              <Input
                value={option.valuesText}
                onChange={(e) => setOption(index, { valuesText: e.target.value })}
                placeholder={templates.find((t) => t.label === option.name)?.suggestedValues?.join(', ') || 'Values (comma separated)'}
              />
              <Button type="button" variant="ghost" className="border border-line" onClick={() => removeOption(index)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <div className="flex gap-2">
            {state.options.length < 3 && (
              <Button type="button" variant="ghost" className="border border-line" onClick={addOption}>
                <Plus className="me-1 h-4 w-4" /> Add option
              </Button>
            )}
            <Button type="button" variant="soft" onClick={generate}>
              <Sparkles className="me-1 h-4 w-4" /> Generate combinations
            </Button>
          </div>

          {state.variants.length > 0 && (
            <div className="overflow-x-auto rounded-xl border border-line">
              <table className="w-full text-sm">
                <thead className="bg-paper">
                  <tr>
                    <th className="px-3 py-2 text-left text-[10px] font-black uppercase tracking-widest text-muted">Variant</th>
                    <th className="px-3 py-2 text-left text-[10px] font-black uppercase tracking-widest text-muted">Price</th>
                    <th className="px-3 py-2 text-left text-[10px] font-black uppercase tracking-widest text-muted">Stock</th>
                    <th className="px-3 py-2 text-left text-[10px] font-black uppercase tracking-widest text-muted">SKU</th>
                    <th className="px-3 py-2 text-left text-[10px] font-black uppercase tracking-widest text-muted">Active</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {state.variants.map((variant) => (
                    <tr key={variant.id} className={cn(!variant.isActive && 'opacity-50')}>
                      <td className="px-3 py-2 font-bold text-ink">{variant.title}</td>
                      <td className="px-3 py-2">
                        <Input type="number" step="0.001" value={variant.priceText} onChange={(e) => setVariant(variant.id, { priceText: e.target.value })} className="w-24" />
                      </td>
                      <td className="px-3 py-2">
                        <Input type="number" value={variant.stockText} onChange={(e) => setVariant(variant.id, { stockText: e.target.value })} className="w-20" />
                      </td>
                      <td className="px-3 py-2">
                        <Input value={variant.sku} onChange={(e) => setVariant(variant.id, { sku: e.target.value })} placeholder="SKU" className="w-28" />
                      </td>
                      <td className="px-3 py-2">
                        <input type="checkbox" checked={variant.isActive} onChange={(e) => setVariant(variant.id, { isActive: e.target.checked })} className="h-4 w-4 accent-accent" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {enabled && state.variants.length === 0 && (
            <p className="text-sm text-muted">Add option values above, then click "Generate combinations".</p>
          )}
        </div>
      )}
    </div>
  );
}

function ImagesSection({ state, set }: { state: EditorState; set: <K extends keyof EditorState>(k: K, v: EditorState[K]) => void }) {
  const onUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await prepareImageDataUrl(file, { maxDimension: 1000, maxBytes: 450_000 });
      set('image', { url: dataUrl });
      toast({ title: 'Image ready', type: 'success' });
    } catch (error) {
      toast({ title: 'Could not use image', description: error instanceof Error ? error.message : undefined, type: 'error' });
    } finally { event.target.value = ''; }
  };
  const setGallery = (index: number, patch: Partial<ImageAsset>) =>
    set('gallery', state.gallery.map((img, i) => (i === index ? { ...img, ...patch } : img)));

  return (
    <div className="space-y-6">
      <div>
        <p className="mb-3 text-xs font-black uppercase tracking-widest text-muted">Main image</p>
        <div className="flex items-start gap-4">
          <div className="grid h-24 w-24 shrink-0 place-items-center overflow-hidden rounded-xl border-2 border-dashed border-line bg-paper text-4xl">
            {state.image.url ? <img src={state.image.url} alt="" className="h-full w-full object-cover" /> : (state.image.emoji || '📦')}
          </div>
          <div className="space-y-2">
            <div className="flex flex-wrap gap-1.5">
              {PRODUCT_EMOJIS.map((emoji) => (
                <button key={emoji} type="button" onClick={() => set('image', { emoji, url: undefined })}
                  className={cn('grid h-8 w-8 place-items-center rounded-lg border bg-paper text-lg', state.image.emoji === emoji && !state.image.url ? 'border-ink bg-line/50' : 'border-line hover:border-ink/30')}
                >{emoji}</button>
              ))}
            </div>
            <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-xs font-bold text-muted hover:bg-paper">
              <ImageIcon className="h-3.5 w-3.5" /> Upload photo
              <input type="file" accept="image/*" className="hidden" onChange={onUpload} />
            </label>
            {state.image.url && (
              <button onClick={() => set('image', { emoji: '📦' })} className="block text-xs font-bold text-red-500 hover:underline">Remove</button>
            )}
          </div>
        </div>
      </div>

      <div>
        <p className="mb-3 text-xs font-black uppercase tracking-widest text-muted">Gallery images</p>
        <div className="space-y-2">
          {state.gallery.map((img, index) => (
            <div key={index} className="grid grid-cols-[2fr_1fr_auto] gap-2 rounded-xl border border-line bg-paper/50 p-2">
              <Input value={img.url} onChange={(e) => setGallery(index, { url: e.target.value })} placeholder="Image URL" />
              <Input value={img.altText} onChange={(e) => setGallery(index, { altText: e.target.value })} placeholder="Alt text" />
              <Button type="button" variant="ghost" className="border border-line" onClick={() => set('gallery', state.gallery.filter((_, i) => i !== index))}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button type="button" variant="ghost" className="border border-line" onClick={() => set('gallery', [...state.gallery, { url: '', altText: '' }])}>
            <Plus className="me-1 h-4 w-4" /> Add gallery image
          </Button>
        </div>
      </div>
    </div>
  );
}
