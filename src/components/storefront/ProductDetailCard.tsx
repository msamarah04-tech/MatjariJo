import { useMemo, useState } from 'react';
import { ShieldCheck, ShoppingBag, Truck } from 'lucide-react';
import type { Product, Store } from '@/lib/types';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/cn';
import { resolveStoreTheme } from '@/lib/themes';
import {
  activeVariants,
  isVariableProduct,
  lineUnitPrice,
  optionValueAvailable,
  productImages,
  productOptions,
  productPriceRange,
  productPrimaryImage,
  productStock,
  selectedVariant,
} from '@/lib/productOptions';
import { cardAttributeRows, categoryDetailRows, getProductCategorySchema, tr } from '@/lib/productCategory';

interface ProductDetailCardProps {
  product: Product;
  store: Store;
  /** Wire up to add the resolved (variant-aware) line to the cart. */
  onAddToCart?: (productId: string, quantity: number, variantId?: string) => void;
  /** Apply the store theme variables on this card's root (default true). */
  themed?: boolean;
  className?: string;
}

const COPY = {
  en: {
    productDetails: 'Product details', from: 'from', inStock: 'In stock', onlyLeft: (n: number) => `Only ${n} left`,
    outOfStock: 'Out of stock', addToCart: 'Add to cart', chooseOptions: 'Choose options', sale: 'Sale', featured: 'Featured',
    sku: 'SKU', delivery: 'Jordan delivery', cod: 'Cash on delivery', choose: 'Choose',
  },
  ar: {
    productDetails: 'تفاصيل المنتج', from: 'من', inStock: 'متوفر', onlyLeft: (n: number) => `بقي ${n} فقط`,
    outOfStock: 'غير متوفر', addToCart: 'أضف إلى السلة', chooseOptions: 'اختر الخيارات', sale: 'تخفيض', featured: 'مميّز',
    sku: 'الرمز', delivery: 'توصيل داخل الأردن', cod: 'الدفع عند الاستلام', choose: 'اختر',
  },
};

/**
 * Reusable storefront product detail card. Reflects the category taxonomy: it shows
 * the category badge, the schema-driven "Product details" attributes (public-only,
 * localized), and updates price / stock / SKU / image as variants are selected.
 * Inherits the storefront theme via CSS variables so it drops into any themed page.
 */
export function ProductDetailCard({ product, store, onAddToCart, themed = true, className }: ProductDetailCardProps) {
  const { lang, dir, money } = useI18n();
  const c = COPY[lang] ?? COPY.en;
  const theme = resolveStoreTheme(store.themeId || 'mono', store.themeOverrides);
  const [selections, setSelections] = useState<Record<string, string>>({});

  const themeVars = themed
    ? ({
        '--c-bg': theme.bg,
        '--c-surface': theme.surface,
        '--c-text': theme.text,
        '--c-muted': theme.muted,
        '--c-primary': theme.primary,
        '--c-accent': theme.accent,
        '--c-soft': theme.soft,
        '--c-line': theme.line,
        '--c-radius': theme.radius,
        fontFamily: theme.font,
      } as React.CSSProperties)
    : undefined;

  const details = product.details || {};
  const schema = getProductCategorySchema(details.categoryKey);
  const variable = isVariableProduct(product);
  const options = productOptions(product);
  const chosen = selectedVariant(product, selections);
  const needsChoice = variable && !chosen;

  const price = lineUnitPrice(product, chosen);
  const compareAt = chosen?.compareAtCents ?? product.compareAtCents;
  const onSale = Boolean(compareAt && compareAt > price);
  const range = useMemo(() => productPriceRange(product), [product]);
  const showRange = variable && !chosen && range.min !== range.max;
  const stock = productStock(product, chosen);
  const image = productPrimaryImage(product, chosen);
  const sku = chosen?.sku ?? details.sku;

  const chips = useMemo(() => cardAttributeRows(details.categoryKey, details.attributes, lang), [details.categoryKey, details.attributes, lang]);
  const detailRows = useMemo(() => categoryDetailRows(details.categoryKey, details.attributes, lang), [details.categoryKey, details.attributes, lang]);

  return (
    <article
      dir={dir}
      style={themeVars}
      className={cn(
        'overflow-hidden rounded-2xl border border-[var(--c-line)] bg-[var(--c-surface)] text-[var(--c-text)] shadow-sm',
        'grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]',
        className,
      )}
    >
      {/* Media */}
      <div className="relative aspect-square bg-[var(--c-soft)]">
        {image ? (
          <img src={image} alt={product.name} className="h-full w-full object-cover" />
        ) : (
          <div className="grid h-full w-full place-items-center text-7xl">{product.imageEmoji || '🛍️'}</div>
        )}
        <div className="absolute start-3 top-3 flex flex-col gap-1.5">
          {product.isFeatured && <Badge tone="accent">{c.featured}</Badge>}
          {onSale && <Badge tone="sale">{c.sale}</Badge>}
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-col gap-4 p-5">
        <div>
          {schema && <p className="mb-1 text-[10px] font-black uppercase tracking-[0.2em] text-[var(--c-muted)]">{tr(schema.label, lang)}</p>}
          <h3 className="text-xl font-black leading-tight tracking-tight">{product.name}</h3>
          {details.shortDescription && <p className="mt-1 text-sm font-medium text-[var(--c-muted)]">{details.shortDescription}</p>}
        </div>

        <div className="flex flex-wrap items-baseline gap-2">
          {onSale && <span className="text-sm font-bold text-[var(--c-muted)] line-through">{money(compareAt!, store.currency)}</span>}
          <span className="text-2xl font-black tracking-tight">
            {showRange ? `${c.from} ${money(range.min, store.currency)}` : money(price, store.currency)}
          </span>
        </div>

        {/* Card-level quick specs (visibleOnCard attributes). */}
        {chips.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {chips.map(([label, value]) => (
              <span key={label} className="rounded-md bg-[var(--c-soft)] px-2 py-1 text-[11px] font-bold ring-1 ring-[var(--c-line)]">
                {label}: {value}
              </span>
            ))}
          </div>
        )}

        {/* Variant selectors. */}
        {variable && options.length > 0 && (
          <div className="space-y-3">
            {options.map((option) => {
              const isColor = /colou?r/i.test(option.name);
              return (
                <div key={option.id}>
                  <p className="mb-1.5 text-[11px] font-black uppercase tracking-[0.12em] text-[var(--c-muted)]">{c.choose} {option.name}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {option.values.map((value) => {
                      const selected = selections[option.name] === value.value;
                      const available = optionValueAvailable(product, option.name, value.value, selections);
                      return (
                        <button
                          key={value.id}
                          type="button"
                          disabled={!available}
                          onClick={() => setSelections((current) => ({ ...current, [option.name]: value.value }))}
                          className={cn(
                            'inline-flex min-h-9 items-center gap-1.5 rounded-lg border px-3 text-xs font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-30',
                            selected ? 'border-[var(--c-text)] bg-[var(--c-text)] text-[var(--c-bg)]' : 'border-[var(--c-line)] bg-[var(--c-surface)] hover:border-[var(--c-text)]',
                          )}
                        >
                          {isColor && value.colorHex && <span className="h-3.5 w-3.5 rounded-full ring-1 ring-[var(--c-line)]" style={{ backgroundColor: value.colorHex }} />}
                          {value.displayValue || value.value}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Availability + SKU. */}
        <div className="flex items-center justify-between gap-3 text-xs font-bold">
          {stock <= 0 ? (
            <span className="rounded-full bg-red-100/60 px-2.5 py-1 text-red-700">{c.outOfStock}</span>
          ) : stock <= 5 ? (
            <span className="rounded-full bg-orange-100/60 px-2.5 py-1 text-orange-700">{c.onlyLeft(stock)}</span>
          ) : (
            <span className="rounded-full bg-emerald-100/50 px-2.5 py-1 text-emerald-700">{c.inStock}</span>
          )}
          {sku && <span className="font-mono text-[10px] text-[var(--c-muted)]">{c.sku} {sku}</span>}
        </div>

        {onAddToCart && (
          <button
            type="button"
            disabled={stock <= 0 || needsChoice}
            onClick={() => onAddToCart(product.id, 1, chosen?.id)}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[var(--c-text)] px-5 text-sm font-black uppercase tracking-[0.12em] text-[var(--c-bg)] transition-transform hover:-translate-y-0.5 active:translate-y-0 disabled:transform-none disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ShoppingBag className="h-4 w-4" />
            {stock <= 0 ? c.outOfStock : needsChoice ? c.chooseOptions : c.addToCart}
          </button>
        )}

        {/* Schema-driven category attributes (admin-only fields already excluded). */}
        {detailRows.length > 0 && (
          <div className="rounded-xl border border-[var(--c-line)] bg-[var(--c-bg)] p-4">
            <p className="mb-2 text-[11px] font-black uppercase tracking-[0.12em] text-[var(--c-muted)]">{c.productDetails}</p>
            <dl className="divide-y divide-[var(--c-line)]">
              {detailRows.map(([label, value]) => (
                <div key={label} className="flex justify-between gap-4 py-1.5 text-sm">
                  <dt className="font-semibold text-[var(--c-muted)]">{label}</dt>
                  <dd className="text-end font-bold">{value}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}

        {(product.tags || []).length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {product.tags!.map((tag) => (
              <span key={tag} className="rounded bg-[var(--c-soft)] px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.1em] text-[var(--c-muted)] ring-1 ring-[var(--c-line)]">{tag}</span>
            ))}
          </div>
        )}

        <div className="mt-auto grid grid-cols-2 gap-2 pt-1 text-[11px] font-bold text-[var(--c-muted)]">
          <span className="inline-flex items-center gap-1.5"><Truck className="h-3.5 w-3.5" /> {c.delivery}</span>
          <span className="inline-flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5" /> {c.cod}</span>
        </div>
      </div>
    </article>
  );
}

function Badge({ tone, children }: { tone: 'accent' | 'sale'; children: React.ReactNode }) {
  return (
    <span className={cn(
      'rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] shadow-sm',
      tone === 'sale' ? 'bg-red-600 text-white' : 'bg-[var(--c-accent)] text-white',
    )}>
      {children}
    </span>
  );
}
