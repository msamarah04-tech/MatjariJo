import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, ChevronLeft, ChevronRight, ImageIcon, Plus, Sparkles, Trash2, X } from 'lucide-react';
import { parseMoney, toMajor } from '@shared/money';
import { useI18n, type Lang } from '@/lib/i18n';
import { cn } from '@/lib/cn';
import { slugify } from '@/lib/format';
import { prepareImageDataUrl } from '@/lib/images';
import { Drawer } from '@/components/ui/Drawer';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { toast } from '@/components/ui/Toast';
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

// ---------------------------------------------------------------------------
// Local bilingual copy.
// ---------------------------------------------------------------------------
const COPY = {
  en: {
    steps: ['What are you selling?', 'Price & Stock', 'Details & Options', 'Publish'],
    stepHint: [
      'Give your product a name, pick a category, and add an image.',
      'Set your price and stock. Advanced fields are optional.',
      'Describe your product and fill in any category-specific details.',
      'Review and choose how to publish.',
    ],
    back: 'Back', next: 'Next', create: 'Create product', save: 'Save changes',
    step: 'Step', of: 'of',
    name: 'Product name', shortDescription: 'Short summary', description: 'Full description',
    category: 'Category', selectCategory: 'Choose a category…', status: 'Status', featured: 'Feature on storefront',
    statusDraft: 'Draft', statusActive: 'Active', statusArchived: 'Archived',
    price: 'Selling price', compareAt: 'Compare-at price (was)', costPrice: 'Cost price (private)',
    sku: 'SKU', barcode: 'Barcode / GTIN', brand: 'Brand', stock: 'Stock quantity',
    lowStock: 'Low-stock alert', tags: 'Tags', weight: 'Shipping weight (g)', dimensions: 'Dimensions',
    returnPolicy: 'Return eligibility', warranty: 'Warranty',
    moreDetails: 'More details (optional)',
    sellingType: 'Selling type', noVariantsForCategory: 'This category does not support variants.',
    variantsHint: 'Let customers pick a size, color, etc. Each combination gets its own stock.',
    optionName: 'Option name', optionValues: 'Values (comma separated)', addOption: 'Add option',
    generate: 'Sync combinations', variant: 'variant', vPrice: 'Price', vStock: 'Stock', vSku: 'SKU', vImage: 'Image URL', vActive: 'Active',
    noVariantsYet: 'Add option values above — the combinations appear here automatically.',
    mainImage: 'Product image', upload: 'Upload photo', addImage: 'Add gallery image', imageUrl: 'Image URL', altText: 'Alt text',
    gallery: 'Gallery images',
    slug: 'URL slug', preview: 'Preview',
    productDetails: 'Specifications', fixErrors: 'Please fix the highlighted fields before saving.',
    required: 'required', optionalHint: 'Optional.',
    priceRequired: 'Enter a price greater than 0.', nameRequired: 'Product name is required.', categoryRequired: 'Choose a category.',
    yes: 'Yes', no: 'No',
  },
  ar: {
    steps: ['ماذا تبيع؟', 'السعر والمخزون', 'التفاصيل والخيارات', 'النشر'],
    stepHint: [
      'أعطِ منتجك اسمًا، واختر الفئة، وأضف صورة.',
      'حدّد السعر والمخزون. الحقول الإضافية اختيارية.',
      'صف منتجك وأكمل تفاصيل الفئة.',
      'راجع واختر طريقة النشر.',
    ],
    back: 'رجوع', next: 'التالي', create: 'إنشاء المنتج', save: 'حفظ التغييرات',
    step: 'الخطوة', of: 'من',
    name: 'اسم المنتج', shortDescription: 'وصف مختصر', description: 'الوصف الكامل',
    category: 'الفئة', selectCategory: 'اختر فئة…', status: 'الحالة', featured: 'إبراز في المتجر',
    statusDraft: 'مسودة', statusActive: 'فعّال', statusArchived: 'مؤرشف',
    price: 'سعر البيع', compareAt: 'السعر قبل الخصم', costPrice: 'سعر التكلفة (خاص)',
    sku: 'رمز SKU', barcode: 'الباركود / GTIN', brand: 'العلامة التجارية', stock: 'كمية المخزون',
    lowStock: 'تنبيه المخزون المنخفض', tags: 'الوسوم', weight: 'وزن الشحن (غم)', dimensions: 'الأبعاد',
    returnPolicy: 'سياسة الإرجاع', warranty: 'الضمان',
    moreDetails: 'تفاصيل إضافية (اختياري)',
    sellingType: 'طريقة البيع', noVariantsForCategory: 'هذه الفئة لا تدعم المتغيّرات.',
    variantsHint: 'اسمح للعملاء باختيار المقاس واللون وغيرها. لكل تركيبة مخزونها الخاص.',
    optionName: 'اسم الخيار', optionValues: 'القيم (مفصولة بفواصل)', addOption: 'إضافة خيار',
    generate: 'مزامنة التركيبات', variant: 'متغيّر', vPrice: 'السعر', vStock: 'المخزون', vSku: 'SKU', vImage: 'رابط الصورة', vActive: 'مفعّل',
    noVariantsYet: 'أضف قيم الخيارات بالأعلى وستظهر التركيبات هنا تلقائيًا.',
    mainImage: 'صورة المنتج', upload: 'رفع صورة', addImage: 'إضافة صورة', imageUrl: 'رابط الصورة', altText: 'النص البديل',
    gallery: 'صور المعرض',
    slug: 'رابط الصفحة', preview: 'معاينة',
    productDetails: 'المواصفات', fixErrors: 'يرجى تصحيح الحقول المظلّلة قبل الحفظ.',
    required: 'مطلوب', optionalHint: 'اختياري.',
    priceRequired: 'أدخل سعرًا أكبر من صفر.', nameRequired: 'اسم المنتج مطلوب.', categoryRequired: 'اختر فئة.',
    yes: 'نعم', no: 'لا',
  },
};

const PRODUCT_EMOJIS = ['📦', '🛍️', '🪴', '☕', '🖼️', '💎', '🕯️', '🍪', '👕', '✨'];
const STEP_COUNT = 4;

// ---------------------------------------------------------------------------
// Wizard form state.
// ---------------------------------------------------------------------------
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

type WizardState = {
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

const stableId = (prefix: string) => `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
const splitCsv = (value: string) => value.split(',').map((item) => item.trim()).filter(Boolean);
const cartesian = <T,>(sets: T[][]): T[][] => sets.reduce<T[][]>((acc, set) => acc.flatMap((prefix) => set.map((item) => [...prefix, item])), [[]]);

const parseOptionDrafts = (options: OptionDraft[]) =>
  options
    .map((option) => ({
      name: option.name.trim(),
      values: splitCsv(option.valuesText).map((raw) => raw.replace(/#[0-9a-fA-F]{6}/g, '').trim()).filter(Boolean),
    }))
    .filter((option) => option.name && option.values.length > 0);

const buildVariantDrafts = (options: OptionDraft[], priceText: string, defaultStockText: string, existing: VariantDraft[]): VariantDraft[] => {
  const parsed = parseOptionDrafts(options);
  if (parsed.length === 0) return [];
  const prior = new Map(existing.map((variant) => [variant.title, variant]));
  return cartesian(parsed.map((option) => option.values)).map((combo) => {
    const title = combo.join(' / ');
    const selections = Object.fromEntries(parsed.map((option, index) => [option.name, combo[index]]));
    const found = prior.get(title);
    return found ? { ...found, selections } : { id: stableId('var'), title, selections, priceText, stockText: defaultStockText || '0', sku: '', imageUrl: '', isActive: true };
  });
};

const TEMPLATE_ATTRIBUTE_KEYS: Record<string, string[]> = {
  size: ['availableSizes'],
  color: ['color'],
  storage: ['storage'],
  ram: ['ram'],
  scent: ['scent'],
};
const valuesFromAttributes = (templateKey: string, attributes: Record<string, AttributeFormValue>): string => {
  for (const attrKey of TEMPLATE_ATTRIBUTE_KEYS[templateKey] ?? []) {
    const value = attributes[attrKey];
    if (Array.isArray(value) && value.length >= 2) return value.join(', ');
  }
  return '';
};

const seedOptionDrafts = (templates: { key: string; label: string }[], attributes: Record<string, AttributeFormValue>): OptionDraft[] =>
  templates.map((template) => ({ name: template.label, valuesText: valuesFromAttributes(template.key, attributes) }));

const minorToText = (minor: number | undefined, currency: string): string =>
  minor === undefined || minor === null ? '' : String(toMajor(minor, currency));

function blankState(store: Store): WizardState {
  return {
    name: '', shortDescription: '', description: '', categoryKey: '', status: 'ACTIVE', isFeatured: false,
    priceText: '', compareAtText: '', costPriceText: '', sku: '', barcode: '', brand: '',
    stockText: '10', lowStockText: '5', tagsText: '', weightText: '', dimensions: '', returnPolicy: '', warranty: '',
    attributes: {}, sellingType: 'simple', options: [], variants: [],
    image: { emoji: '📦' }, gallery: [], seoTitle: '', seoDescription: '', slug: '',
  };
}

function stateFromProduct(product: Product, store: Store): WizardState {
  const d = product.details || {};
  const categoryKey = d.categoryKey && getProductCategorySchema(d.categoryKey) ? d.categoryKey : '';
  const options: OptionDraft[] = (d.options || []).map((option) => ({
    name: option.name,
    valuesText: option.values.map((value) => `${value.value}${value.colorHex ? ` ${value.colorHex}` : ''}`).join(', '),
  }));
  const variants: VariantDraft[] = (d.variants || []).map((variant) => ({
    id: variant.id,
    title: variant.title,
    selections: variant.selections,
    priceText: minorToText(variant.priceCents, store.currency),
    stockText: String(variant.stock ?? 0),
    sku: variant.sku || '',
    imageUrl: variant.imageUrl || '',
    isActive: variant.isActive,
  }));
  const status: ProductCatalogStatus = d.status || (product.isActive ? 'ACTIVE' : 'DRAFT');
  return {
    name: product.name,
    shortDescription: d.shortDescription || '',
    description: product.description || '',
    categoryKey,
    status,
    isFeatured: product.isFeatured ?? false,
    priceText: minorToText(product.priceCents, store.currency),
    compareAtText: minorToText(product.compareAtCents, store.currency),
    costPriceText: minorToText(d.costPriceCents, store.currency),
    sku: d.sku || '',
    barcode: d.barcode || '',
    brand: d.brand || '',
    stockText: String(product.stock ?? 0),
    lowStockText: d.lowStockThreshold !== undefined ? String(d.lowStockThreshold) : '',
    tagsText: (product.tags || []).join(', '),
    weightText: d.weightGrams !== undefined ? String(d.weightGrams) : '',
    dimensions: d.dimensions || '',
    returnPolicy: d.returnPolicy || '',
    warranty: d.warranty || '',
    attributes: attributesToForm(categoryKey, d.attributes),
    sellingType: d.sellingType === 'VARIABLE' ? 'variants' : 'simple',
    options,
    variants,
    image: { emoji: product.imageEmoji || (product.imageUrl ? undefined : '📦'), url: product.imageUrl },
    gallery: (d.images || []).map((image) => ({ url: image.url, altText: image.altText || '' })),
    seoTitle: d.seoTitle || '',
    seoDescription: d.seoDescription || '',
    slug: d.slug || '',
  };
}

export interface ProductWizardProps {
  open: boolean;
  onClose: () => void;
  store: Store;
  editing: Product | null;
  onSubmit: (payload: Record<string, unknown>) => Promise<void>;
}

export function ProductWizard({ open, onClose, store, editing, onSubmit }: ProductWizardProps) {
  const { lang, dir } = useI18n();
  const c = COPY[lang as Lang] ?? COPY.en;
  const [step, setStep] = useState(0);
  const [state, setState] = useState<WizardState>(() => blankState(store));
  const [submitting, setSubmitting] = useState(false);
  const [showErrors, setShowErrors] = useState(false);

  useEffect(() => {
    if (!open) return;
    setStep(0);
    setShowErrors(false);
    setState(editing ? stateFromProduct(editing, store) : blankState(store));
  }, [open, editing, store]);

  const set = <K extends keyof WizardState>(key: K, value: WizardState[K]) => setState((prev) => ({ ...prev, [key]: value }));

  const schema = getProductCategorySchema(state.categoryKey);
  const attributesNormalized = useMemo(() => formToAttributes(state.categoryKey, state.attributes), [state.categoryKey, state.attributes]);
  const attributeErrors = useMemo(() => attributeErrorMap(state.categoryKey, attributesNormalized), [state.categoryKey, attributesNormalized]);
  const supportsVariants = categorySupportsVariants(state.categoryKey);
  const priceMinor = parseMoney(state.priceText, store.currency) ?? 0;

  useEffect(() => {
    if (state.sellingType !== 'variants') return;
    const next = buildVariantDrafts(state.options, state.priceText, state.stockText, state.variants);
    const unchanged = next.length === state.variants.length && next.every((variant, index) => variant.title === state.variants[index]?.title);
    if (!unchanged) set('variants', next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.sellingType, state.options]);

  const stepErrors = useMemo<Record<string, string>>(() => {
    const errors: Record<string, string> = {};
    if (step === 0) {
      if (!state.name.trim()) errors.name = c.nameRequired;
      if (!state.categoryKey) errors.categoryKey = c.categoryRequired;
    }
    if (step === 1) {
      if (priceMinor <= 0) errors.price = c.priceRequired;
    }
    if (step === 2) Object.assign(errors, attributeErrors);
    return errors;
  }, [step, state.name, state.categoryKey, priceMinor, attributeErrors, c]);

  const canAdvance = Object.keys(stepErrors).length === 0;

  const goNext = () => {
    if (!canAdvance) { setShowErrors(true); return; }
    setShowErrors(false);
    setStep((s) => Math.min(STEP_COUNT - 1, s + 1));
  };
  const goBack = () => { setShowErrors(false); setStep((s) => Math.max(0, s - 1)); };

  const buildPayload = (): Record<string, unknown> => {
    const currency = store.currency;
    const optionDrafts = state.sellingType === 'variants'
      ? state.options
      : seedOptionDrafts(variantOptionTemplates(state.categoryKey, lang), state.attributes).filter((option) => splitCsv(option.valuesText).length >= 2);

    const variantDrafts = state.sellingType === 'variants' && state.variants.length
      ? state.variants
      : buildVariantDrafts(optionDrafts, state.priceText, state.stockText, []);
    const useVariants = variantDrafts.length > 0;
    const persistedType = useVariants ? 'VARIABLE' : 'SIMPLE';

    const builtOptions = optionDrafts
      .map((option, index) => {
        const name = option.name.trim();
        const isColor = /colou?r/i.test(name);
        const values = splitCsv(option.valuesText).map((raw, vIndex) => {
          const colorMatch = isColor ? raw.match(/#[0-9a-fA-F]{6}/) : null;
          const value = (colorMatch ? raw.replace(colorMatch[0], '') : raw).trim();
          return value ? { id: stableId('val'), value, displayValue: value, colorHex: colorMatch?.[0], sortOrder: vIndex } : undefined;
        }).filter((v): v is NonNullable<typeof v> => Boolean(v));
        return name && values.length ? { id: stableId('opt'), name, sortOrder: index, values } : undefined;
      })
      .filter((o): o is NonNullable<typeof o> => Boolean(o));

    const builtVariants = useVariants
      ? variantDrafts.map((variant, index) => ({
          id: variant.id,
          title: variant.title,
          selections: variant.selections,
          priceCents: parseMoney(variant.priceText, currency) ?? priceMinor,
          stock: Math.max(0, Math.floor(Number(variant.stockText) || 0)),
          sku: variant.sku.trim() || undefined,
          imageUrl: variant.imageUrl.trim() || undefined,
          isActive: variant.isActive,
          sortOrder: index,
        }))
      : [];

    const compareAtMinor = parseMoney(state.compareAtText, currency);
    const costMinor = parseMoney(state.costPriceText, currency);
    const stock = useVariants ? builtVariants.reduce((sum, v) => sum + v.stock, 0) : Math.max(0, Math.floor(Number(state.stockText) || 0));

    const existingDetails = (editing?.details ?? {}) as Record<string, unknown>;
    const details: Record<string, unknown> = {
      ...existingDetails,
      categoryKey: state.categoryKey || undefined,
      attributes: attributesNormalized,
      sellingType: persistedType,
      status: state.status,
      sku: state.sku.trim() || undefined,
      barcode: state.barcode.trim() || undefined,
      brand: state.brand.trim() || undefined,
      shortDescription: state.shortDescription.trim() || undefined,
      options: builtOptions,
      variants: builtVariants,
      images: state.gallery.filter((img) => img.url.trim()).map((img, index) => ({ id: stableId('img'), url: img.url.trim(), altText: img.altText.trim() || state.name, sortOrder: index })),
      costPriceCents: costMinor && costMinor > 0 ? costMinor : undefined,
      lowStockThreshold: state.lowStockText === '' ? undefined : Math.max(0, Math.floor(Number(state.lowStockText) || 0)),
      weightGrams: state.weightText === '' ? undefined : Math.max(0, Math.floor(Number(state.weightText) || 0)),
      dimensions: state.dimensions.trim() || undefined,
      returnPolicy: state.returnPolicy.trim() || undefined,
      warranty: state.warranty.trim() || undefined,
      seoTitle: state.seoTitle.trim() || undefined,
      seoDescription: state.seoDescription.trim() || undefined,
      slug: state.slug.trim() || slugify(state.name),
    };

    return {
      name: state.name.trim(),
      description: state.description.trim(),
      details,
      category: schema ? tr(schema.label, 'en') : (editing?.category || store.category || ''),
      collection: editing?.collection || '',
      tags: splitCsv(state.tagsText).slice(0, 12),
      priceCents: priceMinor,
      compareAtCents: compareAtMinor && compareAtMinor > priceMinor ? compareAtMinor : undefined,
      stock,
      imageEmoji: state.image.url ? undefined : (state.image.emoji || '📦'),
      imageUrl: state.image.url,
      isActive: state.status === 'ACTIVE',
      isFeatured: state.isFeatured,
    };
  };

  const submit = async () => {
    if (Object.keys(attributeErrors).length > 0 || priceMinor <= 0 || !state.name.trim() || !state.categoryKey) {
      setShowErrors(true);
      if (!state.name.trim() || !state.categoryKey) setStep(0);
      else if (priceMinor <= 0) setStep(1);
      else setStep(2);
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit(buildPayload());
      onClose();
    } catch {
      // caller toasts the error; keep wizard open for retry
    } finally {
      setSubmitting(false);
    }
  };

  const isLast = step === STEP_COUNT - 1;

  return (
    <Drawer
      isOpen={open}
      onClose={onClose}
      title={editing ? c.save : c.create}
      description={`${c.step} ${step + 1} ${c.of} ${STEP_COUNT} · ${c.steps[step]}`}
      className="max-w-2xl"
      footer={
        <div className="flex items-center gap-2">
          <Button type="button" variant="ghost" className="border border-line" onClick={step === 0 ? onClose : goBack}>
            {step === 0 ? <X className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            <span className="ms-1">{c.back}</span>
          </Button>
          <div className="flex-1" />
          {isLast ? (
            <Button type="button" variant="accent" onClick={submit} disabled={submitting}>
              <Check className="h-4 w-4 me-1" /> {editing ? c.save : c.create}
            </Button>
          ) : (
            <Button type="button" variant="accent" onClick={goNext}>
              {c.next} <ChevronRight className="h-4 w-4 ms-1" />
            </Button>
          )}
        </div>
      }
    >
      <div dir={dir} className="space-y-5">
        <StepIndicator steps={c.steps} current={step} onJump={(target) => target < step && setStep(target)} />
        <p className="text-sm text-muted">{c.stepHint[step]}</p>

        {step === 0 && (
          <BasicsStep
            c={c} lang={lang as Lang} state={state}
            set={set}
            setState={setState}
            errors={showErrors ? stepErrors : {}}
          />
        )}
        {step === 1 && (
          <PricingStep
            c={c} state={state} set={set}
            currency={store.currency}
            errors={showErrors ? stepErrors : {}}
          />
        )}
        {step === 2 && (
          <DetailsStep
            c={c} lang={lang as Lang} state={state} set={set}
            setAttr={(key, value) => set('attributes', { ...state.attributes, [key]: value })}
            supportsVariants={supportsVariants}
            attributeErrors={showErrors ? attributeErrors : {}}
          />
        )}
        {step === 3 && (
          <PublishStep
            c={c} lang={lang as Lang} state={state} set={set}
            store={store} priceMinor={priceMinor}
            attributes={attributesNormalized}
            attributeErrors={attributeErrors}
          />
        )}
      </div>
    </Drawer>
  );
}

// ---------------------------------------------------------------------------
// Shared primitives.
// ---------------------------------------------------------------------------
function Field({ label, required, hint, error, children }: { label: string; required?: boolean; hint?: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-muted">
        {label}{required && <span className="text-accent">*</span>}
      </span>
      {children}
      {hint && !error && <span className="mt-1 block text-xs text-muted">{hint}</span>}
      {error && <span className="mt-1 flex items-center gap-1 text-xs font-semibold text-red-600"><X className="h-3 w-3" /> {error}</span>}
    </label>
  );
}

function Card({ title, children, className }: { title?: string; className?: string; children: React.ReactNode }) {
  return (
    <section className={cn('rounded-2xl border border-line bg-surface p-4 shadow-sm', className)}>
      {title && <h3 className="mb-3 text-sm font-black text-ink">{title}</h3>}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">{children}</div>
    </section>
  );
}

const selectCls = 'h-10 w-full rounded-md border border-line bg-surface px-3 text-sm font-semibold text-ink focus:outline-none focus:ring-1 focus:ring-accent';

function StepIndicator({ steps, current, onJump }: { steps: readonly string[]; current: number; onJump: (i: number) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {steps.map((label, index) => (
        <button
          key={label}
          type="button"
          onClick={() => onJump(index)}
          className={cn(
            'flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold transition-colors',
            index === current ? 'bg-ink text-surface' : index < current ? 'bg-accent-soft text-accent cursor-pointer' : 'bg-paper text-muted ring-1 ring-line',
          )}
        >
          <span className={cn('grid h-4 w-4 place-items-center rounded-full text-[9px]', index < current ? 'bg-accent text-white' : index === current ? 'bg-surface text-ink' : 'bg-line text-muted')}>
            {index < current ? <Check className="h-2.5 w-2.5" /> : index + 1}
          </span>
          {label}
        </button>
      ))}
    </div>
  );
}

function MoneyInput({ value, onChange, currency, placeholder }: { value: string; onChange: (v: string) => void; currency: string; placeholder?: string }) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted">{currency}</span>
      <Input type="number" step="0.001" min="0" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder ?? '0'} className="ps-12" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 1 — What are you selling?
// ---------------------------------------------------------------------------
type Copy = (typeof COPY)['en'];
type Setter = <K extends keyof WizardState>(key: K, value: WizardState[K]) => void;

function BasicsStep({ c, lang, state, set, setState, errors }: { c: Copy; lang: Lang; state: WizardState; set: Setter; setState: React.Dispatch<React.SetStateAction<WizardState>>; errors: Record<string, string> }) {
  const groupedCategories = useMemo(() => groupedCategorySchemas(), []);
  const schema = getProductCategorySchema(state.categoryKey);

  const onUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await prepareImageDataUrl(file, { maxDimension: 1000, maxBytes: 450_000 });
      set('image', { url: dataUrl, emoji: undefined });
      toast({ title: 'Image ready', type: 'success' });
    } catch (error) {
      toast({ title: 'Could not use image', description: error instanceof Error ? error.message : undefined, type: 'error' });
    } finally {
      event.target.value = '';
    }
  };

  return (
    <div className="space-y-4">
      {/* Image picker — compact row at the top */}
      <Card title={c.mainImage}>
        <div className="md:col-span-2 flex items-center gap-4">
          <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-xl border border-line bg-paper text-3xl">
            {state.image.url ? <img src={state.image.url} alt="" className="h-full w-full object-cover" /> : (state.image.emoji || '📦')}
          </div>
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap gap-1.5">
              {PRODUCT_EMOJIS.map((emoji) => (
                <button key={emoji} type="button" onClick={() => set('image', { emoji, url: undefined })}
                  className={cn('grid h-8 w-8 place-items-center rounded-lg border bg-paper text-base', state.image.emoji === emoji && !state.image.url ? 'border-ink bg-line/50' : 'border-line hover:border-ink/30')}>
                  {emoji}
                </button>
              ))}
            </div>
            <label className="inline-flex w-fit cursor-pointer items-center gap-1.5 rounded-md border border-line px-2 py-1 text-xs font-bold text-ink hover:bg-paper">
              <ImageIcon className="h-3 w-3" /> {c.upload}
              <input type="file" accept="image/*" className="hidden" onChange={onUpload} />
            </label>
          </div>
        </div>
      </Card>

      {/* Core identity */}
      <Card>
        <div className="md:col-span-2">
          <Field label={c.name} required error={errors.name}>
            <Input value={state.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Linen Shirt" autoFocus />
          </Field>
        </div>
        <div className="md:col-span-2">
          <Field label={c.shortDescription} hint={c.optionalHint}>
            <Input value={state.shortDescription} onChange={(e) => set('shortDescription', e.target.value)} placeholder="One line that appears under the product name" />
          </Field>
        </div>
        <div className="md:col-span-2">
          <Field label={c.category} required error={errors.categoryKey}>
            <select
              className={cn(selectCls, errors.categoryKey && 'border-red-400')}
              value={state.categoryKey}
              onChange={(e) => {
                const newKey = e.target.value;
                const newSchema = getProductCategorySchema(newKey);
                const firstType = newSchema?.sellingTypes[0] ?? 'simple';
                setState((prev) => ({ ...prev, categoryKey: newKey, sellingType: firstType, attributes: {} }));
              }}
            >
              <option value="">{c.selectCategory}</option>
              {groupedCategories.map(({ group, schemas }) => (
                <optgroup key={group.key} label={group.label[lang as Lang] ?? group.label.en}>
                  {schemas.map((s) => (
                    <option key={s.key} value={s.key}>{tr(s.label, lang as Lang)}</option>
                  ))}
                </optgroup>
              ))}
            </select>
            {schema?.description && (
              <p className="mt-1 text-xs text-muted">{tr(schema.description, lang as Lang)}</p>
            )}
          </Field>
        </div>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 2 — Price & Stock.
// ---------------------------------------------------------------------------
function PricingStep({ c, state, set, currency, errors }: { c: Copy; state: WizardState; set: Setter; currency: string; errors: Record<string, string> }) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const variantsActive = state.sellingType === 'variants' && state.variants.length > 0;

  const hasAdvancedValues = state.sku || state.barcode || state.costPriceText || state.lowStockText || state.tagsText || state.weightText || state.dimensions || state.warranty || state.returnPolicy;

  return (
    <div className="space-y-4">
      {/* Essential pricing */}
      <Card>
        <Field label={c.price} required error={errors.price}>
          <MoneyInput value={state.priceText} onChange={(v) => set('priceText', v)} currency={currency} />
        </Field>
        <Field label={c.stock} hint={variantsActive ? 'Managed per variant.' : undefined}>
          <Input type="number" min="0" value={state.stockText} onChange={(e) => set('stockText', e.target.value)} disabled={variantsActive} />
        </Field>
        <Field label={c.compareAt} hint={c.optionalHint}>
          <MoneyInput value={state.compareAtText} onChange={(v) => set('compareAtText', v)} currency={currency} />
        </Field>
        <Field label={c.brand} hint={c.optionalHint}>
          <Input value={state.brand} onChange={(e) => set('brand', e.target.value)} placeholder="e.g. Nike" />
        </Field>
      </Card>

      {/* Collapsible advanced section */}
      <button
        type="button"
        onClick={() => setShowAdvanced((v) => !v)}
        className="flex w-full items-center justify-between rounded-xl border border-line bg-paper px-4 py-3 text-sm font-bold text-muted hover:text-ink transition-colors"
      >
        <span>{c.moreDetails} {hasAdvancedValues && <span className="ms-1 inline-block h-2 w-2 rounded-full bg-accent" />}</span>
        <ChevronDown className={cn('h-4 w-4 transition-transform', showAdvanced && 'rotate-180')} />
      </button>

      {showAdvanced && (
        <Card>
          <Field label={c.sku}>
            <Input value={state.sku} onChange={(e) => set('sku', e.target.value)} />
          </Field>
          <Field label={c.barcode}>
            <Input value={state.barcode} onChange={(e) => set('barcode', e.target.value)} />
          </Field>
          <Field label={c.costPrice} hint={c.optionalHint}>
            <MoneyInput value={state.costPriceText} onChange={(v) => set('costPriceText', v)} currency={currency} />
          </Field>
          <Field label={c.lowStock}>
            <Input type="number" min="0" value={state.lowStockText} onChange={(e) => set('lowStockText', e.target.value)} />
          </Field>
          <div className="md:col-span-2">
            <Field label={c.tags} hint="Comma separated.">
              <Input value={state.tagsText} onChange={(e) => set('tagsText', e.target.value)} placeholder="cotton, summer, gift" />
            </Field>
          </div>
          <Field label={c.weight}>
            <Input type="number" min="0" value={state.weightText} onChange={(e) => set('weightText', e.target.value)} />
          </Field>
          <Field label={c.dimensions}>
            <Input value={state.dimensions} onChange={(e) => set('dimensions', e.target.value)} placeholder="30 × 20 × 8 cm" />
          </Field>
          <div className="md:col-span-2">
            <Field label={c.warranty}>
              <Input value={state.warranty} onChange={(e) => set('warranty', e.target.value)} />
            </Field>
          </div>
          <div className="md:col-span-2">
            <Field label={c.returnPolicy}>
              <Input value={state.returnPolicy} onChange={(e) => set('returnPolicy', e.target.value)} />
            </Field>
          </div>
        </Card>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 3 — Details & Options (category fields + variants, combined).
// ---------------------------------------------------------------------------
function DetailsStep({ c, lang, state, set, setAttr, supportsVariants, attributeErrors }: {
  c: Copy; lang: Lang; state: WizardState; set: Setter;
  setAttr: (key: string, value: AttributeFormValue) => void;
  supportsVariants: boolean;
  attributeErrors: Record<string, string>;
}) {
  const schema = getProductCategorySchema(state.categoryKey);
  const publicFields = schema?.fields.filter((f) => !f.adminOnly) ?? [];
  const adminFields = schema?.fields.filter((f) => f.adminOnly) ?? [];

  return (
    <div className="space-y-4">
      {/* Description */}
      <Card>
        <div className="md:col-span-2">
          <Field label={c.description} hint={c.optionalHint}>
            <Textarea rows={4} value={state.description} onChange={(e) => set('description', e.target.value)} />
          </Field>
        </div>
      </Card>

      {/* Category-specific fields */}
      {schema && publicFields.length > 0 && (
        <Card title={tr(schema.label, lang)}>
          {publicFields.map((field) => (
            <AttributeField key={field.key} field={field} lang={lang} value={state.attributes[field.key]} onChange={(v) => setAttr(field.key, v)} error={attributeErrors[field.key]} />
          ))}
        </Card>
      )}
      {adminFields.length > 0 && (
        <Card title={lang === 'ar' ? 'حقول داخلية' : 'Internal (private)'}>
          {adminFields.map((field) => (
            <AttributeField key={field.key} field={field} lang={lang} value={state.attributes[field.key]} onChange={(v) => setAttr(field.key, v)} error={attributeErrors[field.key]} />
          ))}
        </Card>
      )}

      {/* Variants — shown inline only if category supports them */}
      {supportsVariants && (
        <VariantsInline c={c} lang={lang} state={state} set={set} />
      )}
    </div>
  );
}

function VariantsInline({ c, lang, state, set }: { c: Copy; lang: Lang; state: WizardState; set: Setter }) {
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

  const surfaced = useRef(false);
  useEffect(() => {
    if (surfaced.current) return;
    surfaced.current = true;
    if (state.sellingType === 'simple' && state.options.length === 0) enableVariants(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const suggestedFor = (name: string) => templates.find((t) => t.label === name)?.suggestedValues ?? [];

  const setOption = (index: number, patch: Partial<OptionDraft>) =>
    set('options', state.options.map((o, i) => (i === index ? { ...o, ...patch } : o)));
  const addOption = () => set('options', [...state.options, { name: '', valuesText: '' }].slice(0, 3));
  const removeOption = (index: number) => set('options', state.options.filter((_, i) => i !== index));
  const generate = () => set('variants', buildVariantDrafts(state.options, state.priceText, state.stockText, state.variants));
  const setVariant = (id: string, patch: Partial<VariantDraft>) =>
    set('variants', state.variants.map((v) => (v.id === id ? { ...v, ...patch } : v)));

  return (
    <div className="space-y-3">
      {/* Toggle */}
      <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-line bg-surface p-4 hover:bg-line/10">
        <input type="checkbox" checked={enabled} onChange={(e) => enableVariants(e.target.checked)} className="mt-0.5 h-4 w-4 accent-accent" />
        <span>
          <span className="block text-sm font-bold text-ink">{c.sellingType}: {sellingTypeLabel('variants', lang)}</span>
          <span className="mt-0.5 block text-xs text-muted">{c.variantsHint}</span>
        </span>
      </label>

      {enabled && (
        <>
          <Card title={c.optionName}>
            {state.options.map((option, index) => (
              <div key={index} className="md:col-span-2 grid grid-cols-1 gap-3 rounded-xl border border-line bg-paper/50 p-3 md:grid-cols-[1fr_2fr_auto]">
                <Input value={option.name} onChange={(e) => setOption(index, { name: e.target.value })} placeholder={c.optionName} />
                <Input value={option.valuesText} onChange={(e) => setOption(index, { valuesText: e.target.value })} placeholder={suggestedFor(option.name).join(', ') || c.optionValues} />
                <Button type="button" variant="ghost" className="border border-line" onClick={() => removeOption(index)}><Trash2 className="h-4 w-4" /></Button>
              </div>
            ))}
            <div className="md:col-span-2 flex gap-2">
              {state.options.length < 3 && (
                <Button type="button" variant="ghost" className="border border-line" onClick={addOption}><Plus className="h-4 w-4 me-1" /> {c.addOption}</Button>
              )}
              <Button type="button" variant="soft" onClick={generate}><Sparkles className="h-4 w-4 me-1" /> {c.generate}</Button>
            </div>
          </Card>

          {state.variants.length === 0 ? (
            <p className="text-sm text-muted px-1">{c.noVariantsYet}</p>
          ) : (
            <div className="space-y-2">
              {state.variants.map((variant) => (
                <div key={variant.id} className="rounded-xl border border-line bg-surface p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm font-black text-ink">{variant.title}</span>
                    <label className="flex items-center gap-1.5 text-xs font-bold text-muted cursor-pointer">
                      <input type="checkbox" checked={variant.isActive} onChange={(e) => setVariant(variant.id, { isActive: e.target.checked })} className="h-3.5 w-3.5 accent-accent" />
                      {c.vActive}
                    </label>
                  </div>
                  <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                    <Input value={variant.priceText} onChange={(e) => setVariant(variant.id, { priceText: e.target.value })} placeholder={c.vPrice} type="number" step="0.001" />
                    <Input value={variant.stockText} onChange={(e) => setVariant(variant.id, { stockText: e.target.value })} placeholder={c.vStock} type="number" />
                    <Input value={variant.sku} onChange={(e) => setVariant(variant.id, { sku: e.target.value })} placeholder={c.vSku} />
                    <Input value={variant.imageUrl} onChange={(e) => setVariant(variant.id, { imageUrl: e.target.value })} placeholder={c.vImage} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 4 — Publish (preview + slug + status + gallery).
// ---------------------------------------------------------------------------
function PublishStep({ c, lang, state, set, store, priceMinor, attributes, attributeErrors }: {
  c: Copy; lang: Lang; state: WizardState; set: Setter;
  store: Store; priceMinor: number;
  attributes: Record<string, unknown>;
  attributeErrors: Record<string, string>;
}) {
  const { money } = useI18n();
  const schema = getProductCategorySchema(state.categoryKey);
  const hasErrors = Object.keys(attributeErrors).length > 0 || priceMinor <= 0 || !state.name.trim() || !state.categoryKey;
  const compareAtMinor = parseMoney(state.compareAtText, store.currency) ?? 0;

  // Auto-fill slug when name changes and slug is still empty/auto-derived
  useEffect(() => {
    if (!state.name.trim()) return;
    const derived = slugify(state.name);
    if (!state.slug || state.slug === derived) set('slug', derived);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.name]);

  const displayRows = (schema?.fields ?? [])
    .filter((f) => !f.adminOnly && f.visibleOnProductPage !== false)
    .map((f) => ({ label: tr(f.label, lang), value: attributes[f.key], field: f }))
    .filter((r) => r.value !== undefined && r.value !== null && !(Array.isArray(r.value) && r.value.length === 0));

  return (
    <div className="space-y-4">
      {hasErrors && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">{c.fixErrors}</div>
      )}

      {/* Preview card */}
      <Card title={c.preview}>
        <div className="md:col-span-2 flex gap-4">
          <div className="grid h-24 w-24 shrink-0 place-items-center overflow-hidden rounded-xl border border-line bg-paper text-4xl">
            {state.image.url ? <img src={state.image.url} alt="" className="h-full w-full object-cover" /> : (state.image.emoji || '📦')}
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-widest text-muted">{schema ? tr(schema.label, lang) : ''}</p>
            <h3 className="truncate text-xl font-black text-ink">{state.name || '—'}</h3>
            {state.shortDescription && <p className="mt-0.5 text-sm text-muted">{state.shortDescription}</p>}
            <p className="mt-1 flex items-baseline gap-2 text-lg font-black text-ink">
              {compareAtMinor > priceMinor && (
                <span className="text-sm font-bold text-muted line-through">{money(compareAtMinor, store.currency)}</span>
              )}
              {money(priceMinor, store.currency)}
            </p>
            <p className="mt-1 text-xs font-bold text-muted">
              {state.sellingType === 'variants'
                ? `${state.variants.filter((v) => v.isActive).length} ${c.variant}s`
                : `${c.stock}: ${state.stockText || 0}`}
            </p>
          </div>
        </div>
      </Card>

      {/* Specs summary */}
      {displayRows.length > 0 && (
        <Card title={c.productDetails}>
          <dl className="md:col-span-2 divide-y divide-line">
            {displayRows.map((row) => (
              <div key={row.field.key} className="flex justify-between gap-4 py-2 text-sm">
                <dt className="font-semibold text-muted">{row.label}</dt>
                <dd className="text-end font-bold text-ink">{formatAttr(row.value, row.field, lang, c)}</dd>
              </div>
            ))}
          </dl>
        </Card>
      )}

      {/* Status, slug, featured */}
      <Card>
        <Field label={c.status}>
          <select className={selectCls} value={state.status} onChange={(e) => set('status', e.target.value as ProductCatalogStatus)}>
            <option value="DRAFT">{c.statusDraft}</option>
            <option value="ACTIVE">{c.statusActive}</option>
            <option value="ARCHIVED">{c.statusArchived}</option>
          </select>
        </Field>
        <Field label={c.slug} hint="Auto-filled from the product name.">
          <Input value={state.slug} onChange={(e) => set('slug', e.target.value)} placeholder={slugify(state.name || 'my-product')} />
        </Field>
        <div className="md:col-span-2">
          <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-line bg-paper p-3 hover:bg-line/20">
            <input type="checkbox" checked={state.isFeatured} onChange={(e) => set('isFeatured', e.target.checked)} className="h-4 w-4 accent-accent" />
            <span className="text-sm font-bold text-ink">{c.featured}</span>
          </label>
        </div>
      </Card>

      {/* Gallery */}
      <Card title={c.gallery}>
        {state.gallery.map((img, index) => (
          <div key={index} className="md:col-span-2 grid grid-cols-1 gap-2 rounded-xl border border-line bg-paper/50 p-2 md:grid-cols-[2fr_1fr_auto]">
            <Input value={img.url} onChange={(e) => set('gallery', state.gallery.map((g, i) => i === index ? { ...g, url: e.target.value } : g))} placeholder={c.imageUrl} />
            <Input value={img.altText} onChange={(e) => set('gallery', state.gallery.map((g, i) => i === index ? { ...g, altText: e.target.value } : g))} placeholder={c.altText} />
            <Button type="button" variant="ghost" className="border border-line" onClick={() => set('gallery', state.gallery.filter((_, i) => i !== index))}><Trash2 className="h-4 w-4" /></Button>
          </div>
        ))}
        <div className="md:col-span-2">
          <Button type="button" variant="ghost" className="border border-line" onClick={() => set('gallery', [...state.gallery, { url: '', altText: '' }])}>
            <Plus className="h-4 w-4 me-1" /> {c.addImage}
          </Button>
        </div>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Category attribute field renderer (shared across steps).
// ---------------------------------------------------------------------------
function AttributeField({ field, lang, value, onChange, error }: { field: ProductDetailFieldSchema; lang: Lang; value: AttributeFormValue | undefined; onChange: (v: AttributeFormValue) => void; error?: string }) {
  const label = tr(field.label, lang) + (field.unit ? ` (${field.unit})` : '');
  const placeholder = tr(field.placeholder, lang);
  const hint = tr(field.helpText, lang) || undefined;
  const fullWidth = field.type === 'textarea' || field.type === 'multi_select';

  const control = () => {
    switch (field.type) {
      case 'boolean':
        return (
          <label className="flex items-center gap-3 rounded-xl border border-line bg-paper p-3 cursor-pointer hover:bg-line/20">
            <input type="checkbox" checked={value === true} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4 accent-accent" />
            <span className="text-sm font-bold text-ink">{label}</span>
          </label>
        );
      case 'textarea':
        return <Textarea rows={3} value={String(value ?? '')} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />;
      case 'number':
      case 'weight':
        return <Input type="number" value={String(value ?? '')} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />;
      case 'date':
        return <Input type="date" value={String(value ?? '')} onChange={(e) => onChange(e.target.value)} />;
      case 'url':
        return <Input type="url" value={String(value ?? '')} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />;
      case 'select':
      case 'color':
        return (
          <select className={selectCls} value={String(value ?? '')} onChange={(e) => onChange(e.target.value)}>
            <option value="">—</option>
            {field.options?.map((option) => <option key={option.value} value={option.value}>{tr(option.label, lang)}</option>)}
          </select>
        );
      case 'multi_select':
        return <MultiSelect field={field} lang={lang} value={Array.isArray(value) ? value : []} onChange={onChange} />;
      default:
        return <Input value={String(value ?? '')} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />;
    }
  };

  if (field.type === 'boolean') {
    return (
      <div className={cn(fullWidth && 'md:col-span-2')}>
        {control()}
        {error && <span className="mt-1 flex items-center gap-1 text-xs font-semibold text-red-600"><X className="h-3 w-3" /> {error}</span>}
      </div>
    );
  }
  return (
    <div className={cn(fullWidth && 'md:col-span-2')}>
      <Field label={label} required={field.required} hint={hint} error={error}>{control()}</Field>
    </div>
  );
}

function MultiSelect({ field, lang, value, onChange }: { field: ProductDetailFieldSchema; lang: Lang; value: string[]; onChange: (v: string[]) => void }) {
  const toggle = (option: string) => onChange(value.includes(option) ? value.filter((v) => v !== option) : [...value, option]);
  return (
    <div className="flex flex-wrap gap-2">
      {field.options?.map((option) => {
        const active = value.includes(option.value);
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => toggle(option.value)}
            className={cn('rounded-lg border px-3 py-1.5 text-xs font-bold transition-colors', active ? 'border-accent bg-accent-soft text-accent' : 'border-line bg-surface text-muted hover:border-ink/30')}
          >
            {tr(option.label, lang)}
          </button>
        );
      })}
    </div>
  );
}

function formatAttr(value: unknown, field: ProductDetailFieldSchema, lang: Lang, c: Copy): string {
  if (typeof value === 'boolean') return value ? c.yes : c.no;
  const labelFor = (raw: string) => tr(field.options?.find((o) => o.value === raw)?.label, lang) || raw;
  if (Array.isArray(value)) return value.map((item) => labelFor(String(item))).join(', ');
  const base = field.options ? labelFor(String(value)) : String(value);
  return field.unit ? `${base} ${field.unit}` : base;
}
