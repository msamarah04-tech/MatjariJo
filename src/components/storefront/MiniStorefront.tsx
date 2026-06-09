import * as React from 'react';
import { Product, Store } from '@/lib/types';
import { getStorefrontTemplate, resolveStoreTheme } from '@/lib/themes';
import { money } from '@/lib/format';

interface MiniStorefrontProps {
  store: Partial<Store>;
  products?: Partial<Product>[];
}

export function MiniStorefront({ store, products = [] }: MiniStorefrontProps) {
  const theme = resolveStoreTheme(store.themeId || 'mono', store.themeOverrides);
  const template = getStorefrontTemplate(store.storefrontTemplate);
  
  const v = {
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

  return (
    <div 
      className="w-full flex-1 overflow-hidden relative flex flex-col border border-[#E7E0D3] shadow-sm rounded-2xl animate-fade-in"
      style={v}
    >
      <div className="flex-1 overflow-y-auto bg-[var(--c-bg)] text-[var(--c-text)]">
        {store.announcement && (
          <div
            className="px-4 py-2 text-center text-[11px] font-bold"
            style={{ backgroundColor: 'var(--c-primary)', color: theme.id === 'noir' ? '#000' : '#fff' }}
          >
            {store.announcement}
          </div>
        )}

        {/* Header */}
        <header className="px-5 py-4 flex items-center justify-between border-b" style={{ borderColor: 'var(--c-line)', backgroundColor: 'var(--c-surface)' }}>
          <div className="flex items-center gap-2 font-bold text-lg" style={{ fontFamily: theme.hero }}>
            {store.logoUrl ? (
              <img src={store.logoUrl} alt="Logo" className="w-8 h-8 object-cover" style={{ borderRadius: 'calc(var(--c-radius) / 2)' }} />
            ) : store.logoEmoji ? (
              <span className="text-2xl leading-none">{store.logoEmoji}</span>
            ) : (
              <span className="w-8 h-8 rounded bg-[var(--c-soft)] flex items-center justify-center text-xs">?</span>
            )}
            <span className="truncate tracking-tight">{store.name || 'Store Name'}</span>
          </div>
          <div className="w-8 h-8 rounded flex items-center justify-center text-[var(--c-text)]" style={{ backgroundColor: 'var(--c-soft)' }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
          </div>
        </header>
        
        {/* Hero */}
        <div className={template.id === 'boutique' ? 'grid grid-cols-2 gap-4 px-6 py-10 text-left' : template.id === 'market' ? 'px-5 py-8 text-left' : template.id === 'lookbook' ? 'px-6 py-14 text-center flex flex-col items-center bg-[var(--c-soft)]' : 'px-6 py-12 md:py-16 text-center flex flex-col items-center'}>
          <div className={template.id === 'boutique' ? 'flex flex-col justify-center' : ''}>
          <p className="mb-2 text-[10px] font-black uppercase tracking-[0.2em] opacity-50">{template.name}</p>
          <h1 className={template.id === 'market' ? 'text-2xl leading-[1.05] font-bold mb-3 tracking-tight' : 'text-3xl md:text-4xl lg:text-5xl leading-[1.1] font-bold mb-4 tracking-tight'} style={{ fontFamily: theme.hero }}>
            {store.name || 'Store Name'}
          </h1>
          <p className="text-base md:text-lg max-w-[280px] md:max-w-md mb-8 font-medium leading-relaxed opacity-80" style={{ color: 'var(--c-text)' }}>
            {store.tagline || 'Tagline goes here. Tell us what your shop is for.'}
          </p>
          <button 
            className="px-6 py-3 text-sm font-semibold transition-opacity hover:opacity-90 active:scale-95 shadow-sm"
            style={{ 
              backgroundColor: 'var(--c-primary)', 
              color: theme.id === 'noir' ? '#000' : '#fff',
              borderRadius: 'calc(var(--c-radius) * 1.5)' 
            }}
          >
            Shop Now
          </button>
          </div>
          {template.id === 'boutique' && (
            <div className="aspect-[4/5] rounded-xl bg-[var(--c-soft)] text-5xl grid place-items-center">
              {products[0]?.imageEmoji || store.logoEmoji || '✨'}
            </div>
          )}
        </div>

        {/* Products */}
        <div className="px-6 pb-12 space-y-4 max-w-2xl mx-auto">
           {products.length > 0 ? (
             <div className={template.id === 'market' ? 'grid grid-cols-3 gap-2' : template.id === 'lookbook' ? 'grid grid-cols-2 gap-3 [&>*:first-child]:col-span-2' : 'grid grid-cols-2 gap-4 md:gap-6'}>
               {products.map((p, i) => (
                 <div key={i} className="flex flex-col transform transition-transform hover:-translate-y-1" style={{ backgroundColor: 'var(--c-surface)', borderRadius: 'var(--c-radius)', overflow: 'hidden', border: '1px solid var(--c-line)' }}>
                   <div className={template.id === 'lookbook' && i === 0 ? 'aspect-[16/9] flex items-center justify-center text-6xl' : 'aspect-square flex items-center justify-center text-5xl'} style={{ backgroundColor: 'var(--c-soft)' }}>
                     {p.imageEmoji || '🛍️'}
                   </div>
                   <div className="p-4 flex justify-between items-start gap-2">
                     <p className="font-semibold text-sm truncate">{p.name || 'Product'}</p>
                     <p className="text-sm font-bold opacity-80">{money(p.priceCents || 0)}</p>
                   </div>
                 </div>
               ))}
             </div>
           ) : (
             <div className="border-2 border-dashed p-8 text-center text-sm" style={{ borderColor: 'var(--c-line)', color: 'var(--c-muted)', borderRadius: 'var(--c-radius)' }}>
               Your products will appear here
             </div>
           )}
        </div>
      </div>
    </div>
  );
}
