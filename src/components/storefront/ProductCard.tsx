import * as React from 'react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, ImageOff, ShoppingBag } from 'lucide-react';
import { DEFAULT_CURRENCY } from '@shared/money';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/cn';
import type { Product } from '@/lib/types';
import {
  activeVariants,
  isVariableProduct,
  productImages,
  productOptions,
  productPriceRange,
  productPrimaryImage,
  productStock,
} from '@/lib/productOptions';
import { getProductCategorySchema, tr } from '@/lib/productCategory';

/**
 * NOTE: the brief named the prop type `StorefrontProduct` with `priceMinor` /
 * `compareAtPriceMinor` / top-level `slug` / `details.options[].values: string[]`.
 * Plinth's actual shared storefront product (the source of truth, from the storefront
 * API serializer) is `Product` from `@/lib/types` — money lives in `*Cents` (already
 * integer MINOR units per shared/money.ts), the slug lives in `details.slug`, options
 * carry `{ value, colorHex }` objects, and variants use `selections`/`priceCents`/
 * `isActive`. We use that real type + the existing `productOptions.ts` helpers so this
 * card stays in lockstep with checkout and never duplicates schema logic.
 * TODO: if a dedicated public `StorefrontProduct` type is ever extracted, swap it in.
 */
export type StorefrontProduct = Product;

export type ProductCardLayout = 'grid' | 'compact' | 'horizontal';

export type ProductCardProps = {
  product: StorefrontProduct;
  storeSlug: string;
  /** Store currency for money formatting (JOD by default). The product type carries no
   *  currency — currency lives on the Store — so the parent passes `store.currency`. */
  currency?: string;
  layout?: ProductCardLayout;
  showQuickAdd?: boolean;
  showCategory?: boolean;
  showBadges?: boolean;
  showVariantPreview?: boolean;
  priorityImage?: boolean;
  /** Existing storefront cart handler — same signature `addToCart` already uses.
   *  Quick add only renders when this is provided. */
  onAddToCart?: (productId: string, quantity: number, variantId?: string) => void;
  /** Render even if the product looks archived (defaults to hiding non-active products). */
  forceRender?: boolean;
  className?: string;
};

const COPY = {
  en: {
    sale: 'Sale', new: 'New', featured: 'Featured',
    inStock: 'In stock', lowStock: 'Low stock', outOfStock: 'Out of stock',
    addToCart: 'Add to cart', added: 'Added', viewProduct: 'View product', chooseOptions: 'Choose options',
    off: 'off',
  },
  ar: {
    sale: 'تخفيض', new: 'جديد', featured: 'مميز',
    inStock: 'متوفر', lowStock: 'كمية محدودة', outOfStock: 'غير متوفر',
    addToCart: 'أضف للسلة', added: 'تمت الإضافة', viewProduct: 'عرض المنتج', chooseOptions: 'اختر الخيارات',
    off: 'خصم',
  },
};

const NEW_WINDOW_MS = 14 * 24 * 60 * 60 * 1000;
const DEFAULT_LOW_STOCK = 3;
const MAX_COLORS = 5;
const MAX_CHIPS = 4;

type StockState = 'in' | 'low' | 'out';

// A small CSS-color sniff for option values that aren't given an explicit colorHex.
const NAMED_COLORS = new Set(['black', 'white', 'red', 'green', 'blue', 'yellow', 'orange', 'purple', 'pink', 'brown', 'grey', 'gray', 'beige', 'navy', 'gold', 'silver', 'cream', 'olive', 'teal', 'maroon']);
function asCssColor(value: string): string | undefined {
  const v = value.trim().toLowerCase();
  if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/.test(v)) return v;
  if (/^(rgb|hsl)a?\(/.test(v)) return v;
  if (NAMED_COLORS.has(v)) return v;
  return undefined;
}

type VariantPreview = {
  colors: { key: string; label: string; css?: string }[];
  colorOverflow: number;
  chipsLabel?: string;
  chips: string[];
  chipOverflow: number;
};

function buildVariantPreview(product: Product): VariantPreview {
  const options = productOptions(product);
  const empty: VariantPreview = { colors: [], colorOverflow: 0, chips: [], chipOverflow: 0 };
  if (options.length === 0) return empty;

  const colorOption = options.find((option) => /colou?r|لون/i.test(option.name) || option.values.some((value) => value.colorHex || asCssColor(value.value)));
  const chipOption = options.find((option) => option !== colorOption);

  const colors = colorOption
    ? colorOption.values.slice(0, MAX_COLORS).map((value) => ({ key: value.id, label: value.displayValue || value.value, css: value.colorHex || asCssColor(value.value) }))
    : [];
  const colorOverflow = colorOption ? Math.max(0, colorOption.values.length - MAX_COLORS) : 0;

  const chips = chipOption ? chipOption.values.slice(0, MAX_CHIPS).map((value) => value.displayValue || value.value) : [];
  const chipOverflow = chipOption ? Math.max(0, chipOption.values.length - MAX_CHIPS) : 0;

  return { colors, colorOverflow, chipsLabel: chipOption?.name, chips, chipOverflow };
}

export function ProductCard({
  product,
  storeSlug,
  currency = DEFAULT_CURRENCY,
  layout = 'grid',
  showQuickAdd = false,
  showCategory = true,
  showBadges = true,
  showVariantPreview = false,
  priorityImage = false,
  onAddToCart,
  forceRender = false,
  className,
}: ProductCardProps) {
  const { lang, money } = useI18n();
  const c = COPY[lang] ?? COPY.en;
  const [added, setAdded] = useState(false);
  const addedTimer = React.useRef<number | undefined>(undefined);

  React.useEffect(() => () => window.clearTimeout(addedTimer.current), []);

  const details = product.details || {};

  // Derived, memoized: price / stock / variant / badge data (no per-render recompute).
  const data = useMemo(() => {
    const variable = isVariableProduct(product);
    const variants = activeVariants(product);
    const range = productPriceRange(product);
    const displayPrice = variable ? range.min : product.priceCents ?? 0;
    const compareAt = product.compareAtCents;
    const onSale = typeof compareAt === 'number' && compareAt > displayPrice && displayPrice > 0;
    const discountPct = onSale ? Math.round(((compareAt! - displayPrice) / compareAt!) * 100) : 0;

    const stock = productStock(product); // sums active-variant stock for variable products
    const threshold = typeof details.lowStockThreshold === 'number' ? details.lowStockThreshold : DEFAULT_LOW_STOCK;
    const stockState: StockState = stock <= 0 ? 'out' : stock <= Math.max(threshold, 1) ? 'low' : 'in';

    const isNew = typeof product.createdAt === 'number' && Date.now() - product.createdAt < NEW_WINDOW_MS;

    // Safe quick-add target: simple product, or a variable product with exactly one
    // active variant. Otherwise the customer must choose on the product page.
    const singleVariant = variable && variants.length === 1 ? variants[0] : undefined;
    const quickAddVariantId = singleVariant?.id;
    const canQuickAdd = stockState !== 'out' && (!variable || Boolean(singleVariant));
    const needsChoice = variable && !singleVariant;

    return { variable, range, displayPrice, compareAt, onSale, discountPct, stock, stockState, isNew, quickAddVariantId, canQuickAdd, needsChoice };
  }, [product, details.lowStockThreshold]);

  const variantPreview = useMemo(() => (showVariantPreview ? buildVariantPreview(product) : null), [showVariantPreview, product]);

  // Category label: prefer the localized taxonomy label, else the free-text category.
  const categoryLabel = useMemo(() => {
    const schema = getProductCategorySchema(details.categoryKey);
    return schema ? tr(schema.label, lang) : (product.category || '');
  }, [details.categoryKey, product.category, lang]);

  // Defensive: never render an archived product on the public storefront.
  if (!forceRender && (details.status === 'ARCHIVED' || product.isActive === false)) return null;

  const productHref = `/s/${storeSlug}/p/${product.id}`;
  const images = productImages(product);
  const primaryImage = productPrimaryImage(product);
  const hoverImage = images.find((image) => image.url && image.url !== primaryImage)?.url;
  const shortDescription = details.shortDescription || product.description || '';
  const priceText = data.variable && data.range.min !== data.range.max ? `${money(data.range.min, currency)}+` : money(data.displayPrice, currency);

  const handleQuickAdd = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    if (!onAddToCart || !data.canQuickAdd) return;
    onAddToCart(product.id, 1, data.quickAddVariantId);
    setAdded(true);
    window.clearTimeout(addedTimer.current);
    addedTimer.current = window.setTimeout(() => setAdded(false), 1500);
  };

  // ---- Shared pieces -------------------------------------------------------
  const Badges = showBadges ? (
    <div className={cn('pointer-events-none absolute inset-x-2 top-2 flex flex-wrap items-start gap-1.5', lang === 'ar' && 'flex-row-reverse')}>
      {data.stockState === 'out' ? (
        <Badge tone="muted">{c.outOfStock}</Badge>
      ) : data.onSale ? (
        <Badge tone="sale">-{data.discountPct}% {c.off}</Badge>
      ) : null}
      {data.isNew && data.stockState !== 'out' && <Badge tone="new">{c.new}</Badge>}
      {product.isFeatured && data.stockState !== 'out' && <Badge tone="accent">{c.featured}</Badge>}
    </div>
  ) : null;

  const Media = (
    <div className={cn('relative overflow-hidden bg-[var(--c-soft,#f3f4f6)]', layout === 'horizontal' ? 'h-full' : 'aspect-square')}>
      {primaryImage ? (
        <>
          <img
            src={primaryImage}
            alt={product.name}
            loading={priorityImage ? 'eager' : 'lazy'}
            decoding="async"
            className={cn('h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105', hoverImage && 'group-hover:opacity-0')}
          />
          {hoverImage && (
            <img
              src={hoverImage}
              alt=""
              aria-hidden
              loading="lazy"
              decoding="async"
              className="absolute inset-0 h-full w-full object-cover opacity-0 transition-opacity duration-500 group-hover:opacity-100"
            />
          )}
        </>
      ) : product.imageEmoji ? (
        <div className="grid h-full w-full place-items-center text-5xl">{product.imageEmoji}</div>
      ) : (
        <div className="grid h-full w-full place-items-center text-[var(--c-muted,#9ca3af)]"><ImageOff className="h-8 w-8" /></div>
      )}
      {data.stockState === 'out' && (
        <div className="absolute inset-0 grid place-items-center bg-[var(--c-bg,#fff)]/55">
          <span className="rounded-full bg-[var(--c-text,#111)]/85 px-3 py-1 text-[11px] font-black uppercase tracking-widest text-[var(--c-bg,#fff)]">{c.outOfStock}</span>
        </div>
      )}
      {Badges}
    </div>
  );

  const StockPill = (
    <span className={cn('inline-flex items-center gap-1 text-[11px] font-bold',
      data.stockState === 'in' && 'text-emerald-600',
      data.stockState === 'low' && 'text-amber-600',
      data.stockState === 'out' && 'text-[var(--c-muted,#9ca3af)]')}>
      <span className={cn('h-1.5 w-1.5 rounded-full', data.stockState === 'in' && 'bg-emerald-500', data.stockState === 'low' && 'bg-amber-500', data.stockState === 'out' && 'bg-neutral-400')} />
      {data.stockState === 'in' ? c.inStock : data.stockState === 'low' ? c.lowStock : c.outOfStock}
    </span>
  );

  const Price = (
    <div className="flex flex-wrap items-baseline gap-2">
      <span className="text-base font-black tracking-tight text-[var(--c-text,#111)]">{priceText}</span>
      {data.onSale && <span className="text-xs font-bold text-[var(--c-muted,#9ca3af)] line-through">{money(data.compareAt!, currency)}</span>}
    </div>
  );

  const VariantPreview = variantPreview && (variantPreview.colors.length > 0 || variantPreview.chips.length > 0) ? (
    <div className="flex flex-wrap items-center gap-2">
      {variantPreview.colors.length > 0 && (
        <div className="flex items-center gap-1">
          {variantPreview.colors.map((color) =>
            color.css ? (
              <span key={color.key} title={color.label} aria-label={color.label} className="h-4 w-4 rounded-full ring-1 ring-[var(--c-line,#e5e7eb)]" style={{ backgroundColor: color.css }} />
            ) : (
              <span key={color.key} className="rounded border border-[var(--c-line,#e5e7eb)] px-1.5 py-0.5 text-[10px] font-bold text-[var(--c-muted,#6b7280)]">{color.label}</span>
            ),
          )}
          {variantPreview.colorOverflow > 0 && <span className="text-[10px] font-bold text-[var(--c-muted,#9ca3af)]">+{variantPreview.colorOverflow}</span>}
        </div>
      )}
      {variantPreview.chips.length > 0 && (
        <div className="flex flex-wrap items-center gap-1">
          {variantPreview.chips.map((chip) => (
            <span key={chip} className="rounded border border-[var(--c-line,#e5e7eb)] px-1.5 py-0.5 text-[10px] font-bold text-[var(--c-muted,#6b7280)]">{chip}</span>
          ))}
          {variantPreview.chipOverflow > 0 && <span className="text-[10px] font-bold text-[var(--c-muted,#9ca3af)]">+{variantPreview.chipOverflow}</span>}
        </div>
      )}
    </div>
  ) : null;

  // Quick add renders as a button (cart) or, for multi-variant, a Link to choose options.
  // Both are siblings of the main card Link — never nested interactive elements.
  const QuickAdd = showQuickAdd && onAddToCart ? (
    data.needsChoice ? (
      <Link
        to={productHref}
        onClick={(event) => event.stopPropagation()}
        className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-[var(--c-line,#e5e7eb)] px-3 text-xs font-bold text-[var(--c-text,#111)] transition-colors hover:bg-[var(--c-soft,#f3f4f6)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--c-accent,#111)]"
      >
        {c.chooseOptions}
      </Link>
    ) : (
      <button
        type="button"
        disabled={!data.canQuickAdd}
        aria-label={`${data.canQuickAdd ? c.addToCart : c.outOfStock}: ${product.name}`}
        onClick={handleQuickAdd}
        className={cn(
          'inline-flex h-9 items-center justify-center gap-1.5 rounded-lg px-3 text-xs font-black uppercase tracking-wide transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--c-accent,#111)]',
          data.canQuickAdd ? 'bg-[var(--c-text,#111)] text-[var(--c-bg,#fff)] hover:opacity-90 active:scale-95' : 'cursor-not-allowed bg-[var(--c-soft,#f3f4f6)] text-[var(--c-muted,#9ca3af)]',
        )}
      >
        {added ? <Check className="h-3.5 w-3.5" /> : <ShoppingBag className="h-3.5 w-3.5" />}
        {data.stockState === 'out' ? c.outOfStock : added ? c.added : c.addToCart}
      </button>
    )
  ) : null;

  const cardBase = 'group relative isolate flex overflow-hidden rounded-2xl border border-[var(--c-line,#e5e7eb)] bg-[var(--c-surface,#fff)] text-[var(--c-text,#111)] shadow-sm transition-shadow duration-300 hover:shadow-lg';
  const linkFocus = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--c-accent,#111)] focus-visible:ring-offset-2';

  // ---- Horizontal layout (search / related / sidebar) ----------------------
  if (layout === 'horizontal') {
    return (
      <article className={cn(cardBase, 'flex-row', className)}>
        <Link to={productHref} className={cn('block w-28 shrink-0 sm:w-36', linkFocus)} aria-label={`${c.viewProduct}: ${product.name}`}>
          {Media}
        </Link>
        <div className="flex min-w-0 flex-1 flex-col gap-1.5 p-3">
          <Link to={productHref} className={cn('block min-w-0', linkFocus)}>
            {showCategory && categoryLabel && <p className="truncate text-[10px] font-black uppercase tracking-widest text-[var(--c-muted,#9ca3af)]">{categoryLabel}</p>}
            <h3 className="line-clamp-2 text-sm font-bold leading-snug text-[var(--c-text,#111)]">{product.name}</h3>
            {shortDescription && <p className="line-clamp-2 text-xs text-[var(--c-muted,#6b7280)]">{shortDescription}</p>}
          </Link>
          {showVariantPreview && VariantPreview}
          <div className="mt-auto flex items-center justify-between gap-2 pt-1">
            <div className="min-w-0">{Price}{StockPill}</div>
            {QuickAdd}
          </div>
        </div>
      </article>
    );
  }

  // ---- Compact layout ------------------------------------------------------
  if (layout === 'compact') {
    return (
      <article className={cn(cardBase, 'flex-col', className)}>
        <Link to={productHref} className={cn('block', linkFocus)} aria-label={`${c.viewProduct}: ${product.name}`}>
          {Media}
          <div className="flex flex-col gap-1 p-2.5">
            <h3 className="line-clamp-1 text-sm font-bold text-[var(--c-text,#111)]">{product.name}</h3>
            {Price}
          </div>
        </Link>
      </article>
    );
  }

  // ---- Grid layout (default) -----------------------------------------------
  return (
    <article className={cn(cardBase, 'flex-col', className)}>
      <Link to={productHref} className={cn('block', linkFocus)} aria-label={`${c.viewProduct}: ${product.name}`}>
        {Media}
        <div className="flex flex-col gap-1.5 p-3">
          {showCategory && categoryLabel && <p className="truncate text-[10px] font-black uppercase tracking-widest text-[var(--c-muted,#9ca3af)]">{categoryLabel}</p>}
          <h3 className="line-clamp-2 min-h-[2.5rem] text-sm font-bold leading-snug text-[var(--c-text,#111)]">{product.name}</h3>
          {Price}
          {showVariantPreview && VariantPreview}
          {StockPill}
        </div>
      </Link>
      {QuickAdd && <div className="px-3 pb-3">{QuickAdd}</div>}
    </article>
  );
}

function Badge({ tone, children }: { tone: 'sale' | 'new' | 'accent' | 'muted'; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        'pointer-events-none rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wide shadow-sm',
        tone === 'sale' && 'bg-red-600 text-white',
        tone === 'new' && 'bg-emerald-600 text-white',
        tone === 'accent' && 'bg-[var(--c-accent,#111)] text-white',
        tone === 'muted' && 'bg-neutral-800/85 text-white',
      )}
    >
      {children}
    </span>
  );
}

export default React.memo(ProductCard);
