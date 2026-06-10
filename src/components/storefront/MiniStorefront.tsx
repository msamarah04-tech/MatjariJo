import * as React from 'react';
import { Product, Store } from '@/lib/types';
import { getStorefrontTemplate, resolveStoreTheme } from '@/lib/themes';
import { money } from '@/lib/format';
import { productPrimaryImage } from '@/lib/productOptions';
import { cn } from '@/lib/cn';

interface MiniStorefrontProps {
  store: Partial<Store>;
  products?: Partial<Product>[];
}

export function MiniStorefront({ store, products = [] }: MiniStorefrontProps) {
  const theme = resolveStoreTheme(store.themeId || 'mono', store.themeOverrides);
  const template = getStorefrontTemplate(store.storefrontTemplate);
  const overrides = store.themeOverrides as Record<string, string> | null | undefined;

  const cssVars = {
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
  } as React.CSSProperties;

  const btnStyle = overrides?.buttonStyle || 'solid';
  const btnCls = cn(
    'inline-flex items-center justify-center px-5 text-[10px] font-black uppercase tracking-wider transition-all',
    btnStyle === 'outline' ? 'border-2 border-[var(--c-text)] text-[var(--c-text)]' :
    btnStyle === 'pill' ? 'rounded-full bg-[var(--c-primary)] text-white' :
    'bg-[var(--c-text)] text-[var(--c-bg)]',
    btnStyle !== 'pill' && 'rounded-[var(--c-radius)]',
  );

  const featuredProduct = products[0];
  const gridProducts = products.slice(0, template.id === 'market' ? 8 : 4);

  const cardAspect = template.id === 'market' ? 'aspect-square' : template.id === 'boutique' ? 'aspect-[3/4]' : 'aspect-[4/5]';

  return (
    <div
      className="w-full h-full overflow-hidden relative flex flex-col border border-[#E7E0D3] shadow-sm rounded-2xl"
      style={cssVars}
    >
      <div className="flex-1 overflow-y-auto bg-[var(--c-bg)] text-[var(--c-text)]" style={{ fontFamily: theme.font }}>

        {/* Announcement */}
        {store.announcement && (
          <div className="px-4 py-2 text-center text-[10px] font-bold tracking-wider" style={{ backgroundColor: 'var(--c-primary)', color: '#fff' }}>
            {store.announcement}
          </div>
        )}

        {/* Header */}
        <header className="flex h-12 items-center justify-between border-b px-4" style={{ borderColor: 'var(--c-line)', backgroundColor: 'var(--c-bg)' }}>
          <div className="flex items-center gap-2">
            {store.logoUrl
              ? <img src={store.logoUrl} alt="" className="h-7 w-7 rounded-lg object-cover" />
              : <span className="flex h-7 w-7 items-center justify-center rounded-lg text-base" style={{ backgroundColor: 'var(--c-soft)' }}>{store.logoEmoji || '🛍️'}</span>
            }
            <span className="truncate text-sm font-black tracking-tight" style={{ fontFamily: theme.hero }}>{store.name || 'Store Name'}</span>
          </div>
          <div className="relative flex h-7 w-7 items-center justify-center rounded-lg" style={{ backgroundColor: 'var(--c-soft)' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
          </div>
        </header>

        {/* Hero — Editorial: big type + featured card with floating price chip + ticker */}
        {template.id === 'editorial' && (
          <div style={{ backgroundColor: 'var(--c-surface)' }}>
            <div className="grid grid-cols-2 gap-3 px-4 py-6 items-center">
              <div className="flex flex-col gap-2">
                <span className="flex w-fit items-center gap-1 rounded-full border px-2.5 py-0.5 text-[9px] font-black uppercase tracking-widest opacity-60" style={{ borderColor: 'var(--c-line)', backgroundColor: 'var(--c-bg)' }}>
                  <span className="h-1 w-1 rounded-full" style={{ backgroundColor: 'var(--c-primary)' }} />
                  {store.category || 'Collection'}
                </span>
                <h1 className="text-lg font-black leading-tight tracking-tight" style={{ fontFamily: theme.hero }}>
                  {store.tagline || store.name}
                </h1>
                <div className={cn('mt-1 flex h-7 w-full items-center justify-center text-[10px] font-black uppercase tracking-wider', btnCls)}>
                  Shop Now
                </div>
              </div>
              <div className="relative aspect-[4/5] overflow-hidden rounded-xl" style={{ backgroundColor: 'var(--c-soft)' }}>
                {featuredProduct && productPrimaryImage(featuredProduct as Product)
                  ? <img src={productPrimaryImage(featuredProduct as Product)!} alt="" className="h-full w-full object-cover" />
                  : <div className="h-full w-full flex items-center justify-center text-3xl opacity-40">{featuredProduct?.imageEmoji || '📦'}</div>
                }
                {featuredProduct && (
                  <div className="absolute inset-x-1.5 bottom-1.5 flex items-center justify-between gap-1 rounded-lg px-2 py-1 text-[8px] font-black backdrop-blur-md" style={{ backgroundColor: 'color-mix(in srgb, var(--c-bg) 85%, transparent)' }}>
                    <span className="truncate">{featuredProduct.name}</span>
                    <span className="shrink-0 rounded-full px-1.5 py-0.5" style={{ backgroundColor: 'var(--c-text)', color: 'var(--c-bg)' }}>{money(featuredProduct.priceCents || 0)}</span>
                  </div>
                )}
              </div>
            </div>
            <div className="flex gap-4 overflow-hidden border-t px-4 py-1.5 text-[8px] font-black uppercase tracking-widest opacity-40" style={{ borderColor: 'var(--c-line)' }}>
              {['New in', 'Best sellers', 'Gifts'].map((item) => <span key={item} className="flex shrink-0 items-center gap-4">{item} <span style={{ color: 'var(--c-primary)' }}>✦</span></span>)}
            </div>
          </div>
        )}

        {/* Hero — Boutique: centered refined type beside full-height image */}
        {template.id === 'boutique' && (
          <div className="grid grid-cols-2 items-stretch" style={{ minHeight: '120px' }}>
            <div className="flex flex-col items-center justify-center gap-2 px-4 py-6 text-center">
              <div className="flex items-center gap-1.5 text-[8px] font-black uppercase tracking-widest opacity-45">
                <span className="h-px w-4 bg-current opacity-40" />
                {store.category || 'Collection'}
                <span className="h-px w-4 bg-current opacity-40" />
              </div>
              <h1 className="text-base font-black leading-tight tracking-tight" style={{ fontFamily: theme.hero }}>
                {store.tagline || store.name}
              </h1>
              <div className={cn('mt-1 flex h-7 w-fit items-center justify-center px-4 text-[10px] font-black uppercase tracking-wider', btnCls)}>
                Shop Now
              </div>
            </div>
            <div className="overflow-hidden" style={{ backgroundColor: 'var(--c-soft)' }}>
              {featuredProduct && productPrimaryImage(featuredProduct as Product)
                ? <img src={productPrimaryImage(featuredProduct as Product)!} alt="" className="h-full w-full object-cover" />
                : <div className="h-full w-full flex items-center justify-center text-3xl opacity-40">{featuredProduct?.imageEmoji || '📦'}</div>
              }
            </div>
          </div>
        )}

        {/* Hero — Market: search-first with category chips */}
        {template.id === 'market' && (
          <div className="border-b px-4 py-4" style={{ borderColor: 'var(--c-line)', backgroundColor: 'var(--c-surface)' }}>
            <h1 className="text-sm font-black tracking-tight" style={{ fontFamily: theme.hero }}>{store.name}</h1>
            <p className="text-[10px] font-medium opacity-50">{store.tagline}</p>
            <div className="mt-2 flex h-7 items-center gap-1.5 rounded-lg border px-2.5 text-[9px] font-medium opacity-50" style={{ borderColor: 'var(--c-line)', backgroundColor: 'var(--c-bg)' }}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
              Search products…
            </div>
            <div className="mt-2 flex gap-1.5 overflow-x-hidden">
              {['All', 'Fashion', 'Beauty', 'Gifts'].map((cat) => (
                <span key={cat} className={cn('shrink-0 rounded-full px-2.5 py-0.5 text-[9px] font-bold', cat === 'All' ? 'text-[var(--c-bg)]' : 'border opacity-50')} style={cat === 'All' ? { backgroundColor: 'var(--c-text)' } : { borderColor: 'var(--c-line)' }}>
                  {cat}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Hero — Lookbook: full-bleed image with overlay type */}
        {template.id === 'lookbook' && (
          <div className="relative overflow-hidden" style={{ minHeight: '140px', backgroundColor: 'var(--c-soft)' }}>
            {featuredProduct && productPrimaryImage(featuredProduct as Product) && (
              <img src={productPrimaryImage(featuredProduct as Product)!} alt="" className="absolute inset-0 h-full w-full object-cover" />
            )}
            <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.7), rgba(0,0,0,0.1))' }} />
            <div className="absolute bottom-4 left-4 right-4">
              <span className="mb-1 inline-block rounded-full border border-white/30 bg-white/15 px-2 py-0.5 text-[8px] font-black uppercase tracking-widest text-white backdrop-blur-sm">
                {store.category || 'Collection'}
              </span>
              <h1 className="text-base font-black leading-tight tracking-tight text-white" style={{ fontFamily: theme.hero }}>
                {store.tagline || store.name}
              </h1>
              <button className="mt-2 flex h-6 items-center justify-center rounded-full bg-white px-4 text-[9px] font-black uppercase tracking-wider text-black">Shop Now</button>
            </div>
          </div>
        )}

        {/* Product grid */}
        <div className="p-3">
          {gridProducts.length > 0 ? (
            <div className={cn(
              'grid gap-2',
              template.id === 'market' ? 'grid-cols-3' :
              template.id === 'lookbook' ? 'grid-cols-2 [&>*:first-child]:col-span-2' :
              template.id === 'boutique' ? 'grid-cols-2' :
              'grid-cols-2',
            )}>
              {gridProducts.map((p, i) => {
                const img = productPrimaryImage(p as Product);
                const isFeaturedLookbook = template.id === 'lookbook' && i === 0;
                return (
                  <div
                    key={i}
                    className={cn('flex flex-col overflow-hidden', template.id === 'market' ? 'rounded-lg' : 'rounded-xl')}
                    style={{ backgroundColor: 'var(--c-surface)', border: '1px solid var(--c-line)' }}
                  >
                    <div
                      className={cn('flex items-center justify-center overflow-hidden', isFeaturedLookbook ? 'aspect-[16/9]' : cardAspect)}
                      style={{ backgroundColor: 'var(--c-soft)' }}
                    >
                      {img
                        ? <img src={img} alt={p.name} className="h-full w-full object-cover" />
                        : <span className="text-2xl opacity-40">{p.imageEmoji || '📦'}</span>
                      }
                    </div>
                    <div className={cn('flex flex-col gap-0.5', template.id === 'market' ? 'p-1.5' : 'p-2')}>
                      <p className={cn('font-black truncate leading-snug', template.id === 'market' ? 'text-[9px]' : 'text-[11px]')}>{p.name || 'Product'}</p>
                      <p className="text-[10px] font-bold opacity-60">{money(p.priceCents || 0)}</p>
                      <div className={cn('mt-1 flex items-center justify-center font-black uppercase tracking-wider', btnCls, 'h-6 text-[9px] w-full')}>
                        {template.id === 'market' ? '+' : 'Add'}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-xl border-2 border-dashed p-8 text-center text-[11px] opacity-40" style={{ borderColor: 'var(--c-line)' }}>
              Products appear here
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t px-4 py-4" style={{ borderColor: 'var(--c-line)' }}>
          <p className="text-[10px] font-black tracking-tight" style={{ fontFamily: theme.hero }}>{store.name}</p>
          <p className="mt-0.5 text-[9px] font-bold uppercase tracking-[0.15em] opacity-30">Powered by Matjari</p>
        </div>
      </div>
    </div>
  );
}
