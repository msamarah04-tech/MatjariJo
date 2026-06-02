import React, { useEffect, useMemo, useState } from 'react';
import { useParams, Link, Routes, Route, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useStore } from '@/lib/store';
import { getTheme } from '@/lib/themes';
import { money } from '@/lib/format';
import { computeOrderSummary, getDiscountStatus } from '@/lib/checkout';
import { Product, Store } from '@/lib/types';
import { ShoppingBag, X, Plus, Minus, CheckCircle2, AlertCircle, Search, ArrowLeft } from 'lucide-react';

const checkoutSchema = z.object({
  customerName: z.string().min(2, 'Name is required'),
  customerEmail: z.string().email('Valid email required'),
  note: z.string().optional(),
});

type CheckoutValues = z.infer<typeof checkoutSchema>;
type CartItem = { productId: string; quantity: number };

const productCollection = (product: Product, store: Store) => product.collection?.trim() || store.category || 'General';
const isOnSale = (product: Product) => Boolean(product.compareAtCents && product.compareAtCents > product.priceCents);

export default function StorefrontRoot() {
  const { slug } = useParams();
  const stores = useStore((s) => s.stores);
  const store = stores.find((s) => s.slug === slug);

  useEffect(() => {
    if (store) document.title = store.name;
  }, [store]);

  if (!store || store.status === 'SUSPENDED') {
    return (
      <div className="min-h-screen flex flex-col bg-paper">
        <div className="flex-1 flex flex-col items-center justify-center p-4 text-center">
          <div className="w-20 h-20 bg-surface rounded-full flex items-center justify-center text-muted mb-6 shadow-sm border border-line">
            <AlertCircle className="w-10 h-10" />
          </div>
          <h1 className="text-4xl font-heading font-black text-ink mb-4">Store unavailable</h1>
          <p className="text-muted mb-8">This store is currently unavailable or doesn't exist.</p>
          <Link to="/" className="text-surface bg-ink px-6 py-3 rounded-full font-bold hover:bg-ink/90 transition-colors">Return Home</Link>
        </div>
      </div>
    );
  }

  const theme = getTheme(store.themeId || 'mono');
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
    <div className="min-h-screen flex flex-col" style={v}>
      <div className="flex-1 bg-[var(--c-bg)] text-[var(--c-text)]">
        <StorefrontFrame store={store} />
      </div>
    </div>
  );
}

function StorefrontFrame({ store }: { store: Store }) {
  const navigate = useNavigate();
  const { products, discounts, carts, updateCart, placeOrder, recordEvent } = useStore();
  const theme = getTheme(store.themeId || 'mono');
  const activeProducts = products.filter(p => p.storeId === store.id && p.isActive);
  const cartItems = carts[store.id] || [];
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckout, setIsCheckout] = useState(false);
  const [showAnnouncement, setShowAnnouncement] = useState(true);
  const [promoInput, setPromoInput] = useState('');
  const [appliedCode, setAppliedCode] = useState<string | undefined>();
  const [promoMessage, setPromoMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const form = useForm<CheckoutValues>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: { customerName: '', customerEmail: '', note: '' },
  });

  const getProduct = (id: string) => products.find(p => p.id === id);
  const cartTotalItems = cartItems.reduce((acc, item) => acc + item.quantity, 0);
  const storeDiscounts = discounts.filter((d) => d.storeId === store.id);
  const appliedDiscount = appliedCode ? storeDiscounts.find((d) => d.code === appliedCode) : undefined;
  const orderSummary = computeOrderSummary(store, products, cartItems, appliedDiscount);
  const cartTotalCents = orderSummary.totalCents;

  useEffect(() => {
    if (!appliedDiscount) return;
    const status = getDiscountStatus(appliedDiscount, orderSummary.subtotalCents);
    if (status !== 'Valid') {
      setAppliedCode(undefined);
      setPromoMessage({ type: 'error', text: `${appliedDiscount.code} was removed: ${status.toLowerCase()}.` });
    }
  }, [appliedDiscount, orderSummary.subtotalCents]);

  const addToCart = (productId: string, quantity = 1) => {
    const p = getProduct(productId);
    if (!p || p.stock <= 0) return;

    const existing = cartItems.find(i => i.productId === productId);
    const nextItems = existing
      ? cartItems.map(i => i.productId === productId ? { ...i, quantity: Math.min(i.quantity + quantity, p.stock) } : i)
      : [...cartItems, { productId, quantity: Math.min(quantity, p.stock) }];

    updateCart(store.id, nextItems);
    recordEvent(store.id, 'add_to_cart', productId);
    setIsCartOpen(true);
  };

  const updateItemQty = (productId: string, delta: number) => {
    const p = getProduct(productId);
    const nextItems = cartItems.map(i => {
      if (i.productId !== productId) return i;
      const nextQuantity = i.quantity + delta;
      if (nextQuantity <= 0) return null;
      if (p && nextQuantity > p.stock) return i;
      return { ...i, quantity: nextQuantity };
    }).filter(Boolean) as CartItem[];
    updateCart(store.id, nextItems);
  };

  const handleApplyPromo = () => {
    const code = promoInput.trim().toUpperCase();
    if (!code) {
      setPromoMessage({ type: 'error', text: 'Enter a promo code.' });
      return;
    }
    const discount = storeDiscounts.find((d) => d.code === code);
    if (!discount) {
      setAppliedCode(undefined);
      setPromoMessage({ type: 'error', text: 'That code was not found.' });
      return;
    }
    const status = getDiscountStatus(discount, orderSummary.subtotalCents);
    if (status !== 'Valid') {
      setAppliedCode(undefined);
      setPromoMessage({ type: 'error', text: `${code} cannot be applied: ${status.toLowerCase()}.` });
      return;
    }
    setAppliedCode(code);
    setPromoInput(code);
    setPromoMessage({ type: 'success', text: `${code} applied.` });
  };

  const onCheckoutSubmit = (data: CheckoutValues) => {
    if (orderSummary.items.length === 0) return;

    const orderId = placeOrder({
      storeId: store.id,
      customerName: data.customerName,
      customerEmail: data.customerEmail,
      discountCode: appliedCode,
      note: data.note,
    });

    setIsCartOpen(false);
    setIsCheckout(false);
    setAppliedCode(undefined);
    setPromoInput('');
    setPromoMessage(null);
    form.reset();
    navigate(`/s/${store.slug}/order/${orderId}`);
  };

  return (
    <div className="relative min-h-[calc(100vh-81px)] flex flex-col">
      {store.announcement && showAnnouncement && (
        <div className="px-4 py-2 text-center text-xs font-bold relative" style={{ backgroundColor: 'var(--c-primary)', color: theme.id === 'noir' ? '#000' : '#fff' }}>
          <span>{store.announcement}</span>
          <button onClick={() => setShowAnnouncement(false)} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-black/10" aria-label="Dismiss announcement">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      <header className="sticky top-0 z-30 px-4 md:px-6 h-16 flex items-center justify-between gap-4" style={{ backgroundColor: 'var(--c-surface)', borderBottom: '1px solid var(--c-line)' }}>
        <Link to={`/s/${store.slug}`} className="flex items-center gap-3 min-w-0">
          {store.logoUrl ? (
            <img src={store.logoUrl} alt={store.name} className="w-8 h-8 object-cover shrink-0" style={{ borderRadius: 'calc(var(--c-radius) * 0.5)' }} />
          ) : (
            <span className="text-2xl leading-none shrink-0">{store.logoEmoji || '🛍️'}</span>
          )}
          <span className="font-bold text-lg tracking-tight truncate" style={{ fontFamily: theme.hero }}>{store.name}</span>
        </Link>
        <div className="flex items-center gap-2 md:gap-4">
          <Link to={`/s/${store.slug}/about`} className="hidden sm:inline text-sm font-bold hover:opacity-70">About</Link>
          <button
            onClick={() => setIsCartOpen(true)}
            className="flex items-center justify-center p-2 rounded-full transition-colors relative hover:opacity-80"
            style={{ backgroundColor: 'var(--c-soft)', color: 'var(--c-text)' }}
            aria-label="Open shopping bag"
          >
            <ShoppingBag className="w-5 h-5" />
            {cartTotalItems > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold" style={{ backgroundColor: 'var(--c-primary)', color: theme.id === 'noir' ? '#000' : '#fff' }}>
                {cartTotalItems}
              </span>
            )}
          </button>
        </div>
      </header>

      <main className="flex-1">
        <Routes>
          <Route path="/" element={<StorefrontHome store={store} products={activeProducts} addToCart={addToCart} />} />
          <Route path="/p/:productId" element={<ProductDetail store={store} products={activeProducts} addToCart={addToCart} />} />
          <Route path="/about" element={<AboutPage store={store} />} />
          <Route path="/order/:orderId" element={<OrderConfirmation store={store} />} />
        </Routes>
      </main>

      <footer className="py-8 px-6 border-t text-sm font-medium tracking-wide flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-5" style={{ borderColor: 'var(--c-line)', color: 'var(--c-muted)' }}>
        <Link to={`/s/${store.slug}`} className="hover:opacity-80">{store.logoEmoji || '🛍️'} {store.name}</Link>
        <Link to={`/s/${store.slug}/about`} className="hover:opacity-80">About</Link>
        <span className="opacity-50">Powered by PLINTH</span>
      </footer>

      {isCartOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/20 backdrop-blur-sm animate-fade-in" onClick={(e) => { if (e.target === e.currentTarget) setIsCartOpen(false); }}>
          <div className="w-full max-w-md h-full flex flex-col shadow-2xl animate-scale-in origin-right" style={{ backgroundColor: 'var(--c-surface)', color: 'var(--c-text)' }}>
            <div className="p-6 flex items-center justify-between border-b" style={{ borderColor: 'var(--c-line)' }}>
              <h2 className="text-2xl font-bold tracking-tight" style={{ fontFamily: theme.hero }}>{isCheckout ? 'Checkout' : 'Your Bag'}</h2>
              <button onClick={() => { setIsCartOpen(false); setIsCheckout(false); }} className="p-2 rounded-full hover:opacity-70" style={{ backgroundColor: 'var(--c-soft)' }}>
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 flex flex-col">
              {isCheckout ? (
                <form id="checkout-form" onSubmit={form.handleSubmit(onCheckoutSubmit)} className="flex flex-col gap-5 flex-1">
                  <p className="text-sm opacity-80 p-4 mb-2" style={{ backgroundColor: 'var(--c-soft)', color: 'var(--c-text)', borderRadius: 'var(--c-radius)' }}>
                    This sends your order request to <strong>{store.name}</strong> for approval. No payment is taken right now.
                  </p>
                  <CheckoutField label="Full Name" error={form.formState.errors.customerName?.message}>
                    <input {...form.register('customerName')} className="px-4 py-3 rounded-lg border focus:outline-none focus:ring-1" style={{ backgroundColor: 'var(--c-bg)', borderColor: 'var(--c-line)', color: 'var(--c-text)', outlineColor: 'var(--c-primary)' }} />
                  </CheckoutField>
                  <CheckoutField label="Email Address" error={form.formState.errors.customerEmail?.message}>
                    <input type="email" {...form.register('customerEmail')} className="px-4 py-3 rounded-lg border focus:outline-none focus:ring-1" style={{ backgroundColor: 'var(--c-bg)', borderColor: 'var(--c-line)', color: 'var(--c-text)', outlineColor: 'var(--c-primary)' }} />
                  </CheckoutField>
                  <CheckoutField label="Order Note" error={form.formState.errors.note?.message}>
                    <textarea rows={3} {...form.register('note')} placeholder="Delivery notes, gift message, or preferences" className="px-4 py-3 rounded-lg border focus:outline-none focus:ring-1 resize-none" style={{ backgroundColor: 'var(--c-bg)', borderColor: 'var(--c-line)', color: 'var(--c-text)', outlineColor: 'var(--c-primary)' }} />
                  </CheckoutField>
                  <button type="button" onClick={() => setIsCheckout(false)} className="w-full text-sm font-bold opacity-70 hover:opacity-100 py-3 mt-auto">Back to bag</button>
                </form>
              ) : cartItems.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center opacity-60">
                  <ShoppingBag className="w-12 h-12 mb-4 opacity-50" />
                  <p className="text-lg font-bold">Your bag is empty.</p>
                </div>
              ) : (
                <div className="flex flex-col gap-6 flex-1">
                  {cartItems.map(item => {
                    const p = getProduct(item.productId);
                    if (!p) return null;
                    const isInvalid = !p.isActive || p.stock <= 0;
                    return (
                      <div key={item.productId} className={`flex gap-4 items-center ${isInvalid ? 'opacity-40' : ''}`}>
                        <ProductThumb product={p} className="w-20 h-20 text-3xl" />
                        <div className="flex-1 flex flex-col min-w-0">
                          <h4 className="font-bold mb-1 truncate">{p.name}</h4>
                          <p className="font-bold opacity-70 text-sm mb-2">{money(p.priceCents, store.currency)}</p>
                          {isInvalid ? (
                            <p className="text-xs font-bold text-red-500 uppercase tracking-widest">Unavailable</p>
                          ) : (
                            <QuantityStepper value={item.quantity} min={1} max={p.stock} onMinus={() => updateItemQty(p.id, -1)} onPlus={() => updateItemQty(p.id, 1)} />
                          )}
                        </div>
                        {!isInvalid && <div className="font-bold text-right self-end pb-1.5">{money(p.priceCents * item.quantity, store.currency)}</div>}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {cartItems.length > 0 && (
              <div className="p-6 border-t" style={{ borderColor: 'var(--c-line)' }}>
                {isCheckout && (
                  <div className="mb-5">
                    <label className="text-sm font-bold opacity-80 mb-2 block">Promo Code</label>
                    <div className="flex gap-2">
                      <input value={promoInput} onChange={(e) => setPromoInput(e.target.value.toUpperCase())} className="min-w-0 flex-1 px-4 py-3 rounded-lg border focus:outline-none focus:ring-1 font-mono text-sm" style={{ backgroundColor: 'var(--c-bg)', borderColor: 'var(--c-line)', color: 'var(--c-text)', outlineColor: 'var(--c-primary)' }} placeholder="WELCOME10" />
                      <button type="button" onClick={handleApplyPromo} className="px-4 py-3 rounded-lg font-bold text-sm" style={{ backgroundColor: 'var(--c-soft)', color: 'var(--c-text)' }}>Apply</button>
                    </div>
                    {promoMessage && (
                      <p className={`mt-2 text-xs font-bold ${promoMessage.type === 'success' ? 'text-green-600' : 'text-red-500'}`}>{promoMessage.text}</p>
                    )}
                  </div>
                )}

                <div className="space-y-2 mb-6 text-sm">
                  <SummaryRow label="Subtotal" value={money(orderSummary.subtotalCents, store.currency)} />
                  {orderSummary.discountCents > 0 && <SummaryRow label={`Discount${orderSummary.discountCode ? ` (${orderSummary.discountCode})` : ''}`} value={`-${money(orderSummary.discountCents, store.currency)}`} />}
                  {orderSummary.freeShipping && <SummaryRow label={`Discount (${orderSummary.discountCode})`} value="Free shipping" />}
                  <SummaryRow label="Shipping" value={orderSummary.shippingCents === 0 ? 'Free' : money(orderSummary.shippingCents, store.currency)} />
                  <div className="flex items-center justify-between pt-3 mt-3 border-t text-lg" style={{ borderColor: 'var(--c-line)' }}>
                    <span className="font-bold opacity-70">Total</span>
                    <span className="font-bold text-2xl">{money(cartTotalCents, store.currency)}</span>
                  </div>
                </div>
                <button
                  type={isCheckout ? 'submit' : 'button'}
                  form={isCheckout ? 'checkout-form' : undefined}
                  onClick={isCheckout ? undefined : () => {
                    recordEvent(store.id, 'checkout_start');
                    setIsCheckout(true);
                  }}
                  className="w-full py-4 text-center font-bold text-lg rounded-full shadow-lg transition-transform hover:scale-[1.02] active:scale-[0.98]"
                  style={{ backgroundColor: isCheckout ? 'var(--c-primary)' : 'var(--c-text)', color: isCheckout && theme.id === 'noir' ? '#000' : 'var(--c-bg)' }}
                >
                  {isCheckout ? 'Place Order' : 'Proceed to Checkout'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function StorefrontHome({ store, products, addToCart }: { store: Store; products: Product[]; addToCart: (productId: string) => void }) {
  const theme = getTheme(store.themeId || 'mono');
  const [query, setQuery] = useState('');
  const [selectedCollection, setSelectedCollection] = useState('All');
  const [sort, setSort] = useState('newest');
  const [inStockOnly, setInStockOnly] = useState(false);
  const [saleOnly, setSaleOnly] = useState(false);

  const collections = useMemo(() => ['All', ...Array.from(new Set(products.map(p => productCollection(p, store)))).sort((a, b) => a.localeCompare(b))], [products, store]);
  const featuredProducts = products.filter(p => p.isFeatured && p.stock > 0).slice(0, 4);

  const filteredProducts = useMemo(() => {
    const search = query.trim().toLowerCase();
    return [...products]
      .filter(p => selectedCollection === 'All' || productCollection(p, store) === selectedCollection)
      .filter(p => !search || `${p.name} ${p.description || ''}`.toLowerCase().includes(search))
      .filter(p => !inStockOnly || p.stock > 0)
      .filter(p => !saleOnly || isOnSale(p))
      .sort((a, b) => {
        if (sort === 'price-asc') return a.priceCents - b.priceCents;
        if (sort === 'price-desc') return b.priceCents - a.priceCents;
        if (sort === 'name') return a.name.localeCompare(b.name);
        return b.createdAt - a.createdAt;
      });
  }, [products, query, selectedCollection, inStockOnly, saleOnly, sort, store]);

  return (
    <>
      <section className="px-6 py-16 md:py-20 text-center flex flex-col items-center justify-center border-b" style={{ borderColor: 'var(--c-line)' }}>
        <div className="mb-6 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest inline-block" style={{ backgroundColor: 'var(--c-soft)', color: 'var(--c-primary)' }}>
          {store.category}
        </div>
        <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold max-w-4xl tracking-tight leading-[1.05] mb-6" style={{ fontFamily: theme.hero }}>
          {store.tagline}
        </h1>
        <p className="text-lg opacity-80" style={{ color: 'var(--c-muted)' }}>
          {products.length} items · Ships worldwide
        </p>
      </section>

      {featuredProducts.length > 0 && (
        <section className="px-6 py-12 max-w-7xl mx-auto w-full border-b" style={{ borderColor: 'var(--c-line)' }}>
          <div className="flex items-end justify-between gap-4 mb-6">
            <div>
              <p className="text-[10px] uppercase tracking-[0.22em] font-bold mb-2" style={{ color: 'var(--c-muted)' }}>Featured</p>
              <h2 className="text-2xl md:text-3xl font-bold tracking-tight" style={{ fontFamily: theme.hero }}>Merchant picks</h2>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {featuredProducts.map(p => <ProductCard key={p.id} store={store} product={p} addToCart={addToCart} compact />)}
          </div>
        </section>
      )}

      <section className="px-4 md:px-6 py-8 border-b" style={{ borderColor: 'var(--c-line)' }}>
        <div className="max-w-7xl mx-auto flex gap-2 overflow-x-auto pb-1">
          {collections.map(collection => (
            <button
              key={collection}
              onClick={() => setSelectedCollection(collection)}
              className="px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap border transition-opacity hover:opacity-80"
              style={{ backgroundColor: selectedCollection === collection ? 'var(--c-text)' : 'var(--c-surface)', color: selectedCollection === collection ? 'var(--c-bg)' : 'var(--c-text)', borderColor: 'var(--c-line)' }}
            >
              {collection}
            </button>
          ))}
        </div>
      </section>

      <section className="flex-1 px-4 md:px-6 py-10 max-w-7xl mx-auto w-full">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto_auto_auto] gap-3 mb-8">
          <label className="relative block">
            <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2" style={{ color: 'var(--c-muted)' }} />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search products" className="w-full pl-10 pr-4 py-3 border text-sm font-semibold focus:outline-none focus:ring-2" style={{ backgroundColor: 'var(--c-surface)', borderColor: 'var(--c-line)', color: 'var(--c-text)', borderRadius: 'var(--c-radius)' }} />
          </label>
          <select value={selectedCollection} onChange={(e) => setSelectedCollection(e.target.value)} className="px-4 py-3 border text-sm font-bold focus:outline-none focus:ring-2" style={{ backgroundColor: 'var(--c-surface)', borderColor: 'var(--c-line)', color: 'var(--c-text)', borderRadius: 'var(--c-radius)' }}>
            {collections.map(collection => <option key={collection} value={collection}>{collection}</option>)}
          </select>
          <select value={sort} onChange={(e) => setSort(e.target.value)} className="px-4 py-3 border text-sm font-bold focus:outline-none focus:ring-2" style={{ backgroundColor: 'var(--c-surface)', borderColor: 'var(--c-line)', color: 'var(--c-text)', borderRadius: 'var(--c-radius)' }}>
            <option value="newest">Newest</option>
            <option value="price-asc">Price low to high</option>
            <option value="price-desc">Price high to low</option>
            <option value="name">Name</option>
          </select>
          <div className="flex flex-wrap gap-2">
            <TogglePill checked={inStockOnly} onChange={setInStockOnly} label="In stock only" />
            <TogglePill checked={saleOnly} onChange={setSaleOnly} label="On sale only" />
          </div>
        </div>

        {filteredProducts.length === 0 ? (
          <div className="text-center py-20 border border-dashed" style={{ borderColor: 'var(--c-line)', borderRadius: 'var(--c-radius)', color: 'var(--c-muted)' }}>
            <p className="font-bold text-lg mb-2">No products match your search.</p>
            <p className="text-sm">Try a different collection, search, or filter.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8 md:gap-x-8 md:gap-y-12">
            {filteredProducts.map(p => <ProductCard key={p.id} store={store} product={p} addToCart={addToCart} />)}
          </div>
        )}
      </section>
    </>
  );
}

function ProductDetail({ store, products, addToCart }: { store: Store; products: Product[]; addToCart: (productId: string, quantity?: number) => void }) {
  const { productId } = useParams();
  const theme = getTheme(store.themeId || 'mono');
  const product = products.find(p => p.id === productId);
  const [quantity, setQuantity] = useState(1);
  const recordEvent = useStore((s) => s.recordEvent);

  useEffect(() => {
    if (product) recordEvent(store.id, 'view', product.id);
  }, [product?.id, recordEvent, store.id]);

  if (!product) {
    return (
      <div className="px-6 py-20 text-center">
        <h1 className="text-3xl font-bold mb-4" style={{ fontFamily: theme.hero }}>Product not found</h1>
        <Link to={`/s/${store.slug}`} className="font-bold underline underline-offset-4">Back to shop</Link>
      </div>
    );
  }

  const collection = productCollection(product, store);
  const recommendations = products
    .filter(p => p.id !== product.id && p.stock > 0 && productCollection(p, store) === collection)
    .slice(0, 4);

  return (
    <div className="px-4 md:px-6 py-10 md:py-16 max-w-7xl mx-auto w-full">
      <Link to={`/s/${store.slug}`} className="inline-flex items-center gap-2 text-sm font-bold mb-8 hover:opacity-70">
        <ArrowLeft className="w-4 h-4" /> back to shop
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-start">
        <ProductThumb product={product} className="w-full aspect-square text-8xl md:text-9xl" />
        <div className="lg:pt-6">
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest" style={{ backgroundColor: 'var(--c-soft)', color: 'var(--c-primary)' }}>{collection}</span>
            {isOnSale(product) && <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest bg-red-600 text-white">Sale</span>}
          </div>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight leading-tight mb-5" style={{ fontFamily: theme.hero }}>{product.name}</h1>
          <PriceLine product={product} currency={store.currency} className="text-2xl mb-8" />
          <p className="text-lg leading-8 mb-8" style={{ color: 'var(--c-muted)' }}>{product.description || 'No description available for this product yet.'}</p>

          <div className="flex flex-col sm:flex-row gap-3">
            <QuantityStepper value={quantity} min={1} max={Math.max(product.stock, 1)} onMinus={() => setQuantity(q => Math.max(1, q - 1))} onPlus={() => setQuantity(q => Math.min(product.stock, q + 1))} large />
            <button
              onClick={() => addToCart(product.id, quantity)}
              disabled={product.stock <= 0}
              className="flex-1 py-4 px-6 font-bold rounded-full transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 active:scale-[0.98]"
              style={{ backgroundColor: 'var(--c-text)', color: 'var(--c-bg)' }}
            >
              {product.stock <= 0 ? 'Sold out' : 'Add to bag'}
            </button>
          </div>
        </div>
      </div>

      <section className="mt-16 pt-10 border-t" style={{ borderColor: 'var(--c-line)' }}>
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight mb-6" style={{ fontFamily: theme.hero }}>You might also like</h2>
        {recommendations.length === 0 ? (
          <p className="py-10 text-sm font-semibold" style={{ color: 'var(--c-muted)' }}>No related in-stock products right now.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {recommendations.map(p => <ProductCard key={p.id} store={store} product={p} addToCart={addToCart} compact />)}
          </div>
        )}
      </section>
    </div>
  );
}

function AboutPage({ store }: { store: Store }) {
  const theme = getTheme(store.themeId || 'mono');
  return (
    <div className="px-4 md:px-6 py-12 md:py-20 max-w-3xl mx-auto w-full">
      <Link to={`/s/${store.slug}`} className="inline-flex items-center gap-2 text-sm font-bold mb-8 hover:opacity-70">
        <ArrowLeft className="w-4 h-4" /> back to shop
      </Link>
      <p className="text-[10px] uppercase tracking-[0.22em] font-bold mb-3" style={{ color: 'var(--c-muted)' }}>About</p>
      <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-8" style={{ fontFamily: theme.hero }}>{store.name}</h1>
      <div className="text-lg leading-8 whitespace-pre-line" style={{ color: 'var(--c-muted)' }}>
        {store.about || `${store.name} has not added an about page yet.`}
      </div>
    </div>
  );
}

function OrderConfirmation({ store }: { store: Store }) {
  const { orderId } = useParams();
  const orders = useStore((s) => s.orders);
  const order = orders.find((o) => o.id === orderId);
  const theme = getTheme(store.themeId || 'mono');

  if (!order) return <div className="p-12 text-center">Order not found.</div>;

  return (
    <div className="flex-1 flex items-center justify-center p-6 py-20">
      <div className="max-w-md w-full p-8 md:p-12 text-center border shadow-xl animate-scale-in" style={{ backgroundColor: 'var(--c-surface)', borderColor: 'var(--c-line)', borderRadius: 'var(--c-radius)' }}>
        <div className="w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-8 shadow-sm" style={{ backgroundColor: 'var(--c-soft)', color: 'var(--c-primary)' }}>
          <CheckCircle2 className="w-10 h-10" />
        </div>
        <h1 className="text-3xl font-bold mb-4 tracking-tight" style={{ fontFamily: theme.hero }}>Thank you, {order.customerName.split(' ')[0]}!</h1>
        <p className="text-base opacity-80 mb-8 leading-relaxed">
          Your order request for <strong>{money(order.totalCents, store.currency)}</strong> has been sent to <strong>{store.name}</strong> for approval.
        </p>
        <div className="p-4 mb-10 text-sm font-medium text-left space-y-3" style={{ backgroundColor: 'var(--c-bg)', borderRadius: 'var(--c-radius)' }}>
          <div className="flex justify-between border-b pb-3 opacity-60" style={{ borderColor: 'var(--c-line)' }}>
            <span>Order ID</span>
            <span className="font-mono">{order.id.slice(0, 13)}...</span>
          </div>
          <div className="flex justify-between items-center opacity-60">
            <span>Status</span>
            <span className="font-bold uppercase tracking-widest text-[10px] px-2 py-1 rounded" style={{ backgroundColor: 'var(--c-line)' }}>Pending Approval</span>
          </div>
        </div>
        <Link to={`/s/${store.slug}`} className="inline-block px-8 py-3 rounded-full font-bold transition-opacity hover:opacity-80" style={{ backgroundColor: 'var(--c-text)', color: 'var(--c-bg)' }}>
          Return to Store
        </Link>
      </div>
    </div>
  );
}

function ProductCard({ store, product, addToCart, compact = false }: { store: Store; product: Product; addToCart: (productId: string) => void; compact?: boolean }) {
  const isSoldOut = product.stock <= 0;
  return (
    <div className="flex flex-col group">
      <Link to={`/s/${store.slug}/p/${product.id}`} className="block">
        <ProductThumb product={product} className={`${compact ? 'text-6xl' : 'text-7xl'} w-full aspect-square mb-4 transition-transform duration-500 group-hover:-translate-y-1`}>
          {isSoldOut && (
            <div className="absolute inset-0 bg-[var(--c-bg)]/50 backdrop-blur-sm flex items-center justify-center z-10">
              <span className="px-4 py-2 font-bold uppercase tracking-widest text-xs rounded-full bg-[var(--c-text)] text-[var(--c-surface)]">Sold out</span>
            </div>
          )}
          {isOnSale(product) && !isSoldOut && (
            <span className="absolute top-3 left-3 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest rounded-full bg-red-600 text-white">Sale</span>
          )}
        </ProductThumb>
      </Link>
      <div className="flex justify-between items-start gap-4 mb-2">
        <Link to={`/s/${store.slug}/p/${product.id}`} className="font-bold text-lg leading-tight group-hover:underline underline-offset-4">{product.name}</Link>
        <PriceLine product={product} currency={store.currency} />
      </div>
      <p className="text-sm opacity-80 mb-6 flex-1 line-clamp-2" style={{ color: 'var(--c-muted)' }}>{product.description}</p>
      <button
        onClick={() => addToCart(product.id)}
        disabled={isSoldOut}
        className="w-full py-3 px-4 font-bold rounded-full transition-all focus:outline-none focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 active:scale-95"
        style={{ backgroundColor: 'var(--c-text)', color: 'var(--c-bg)', borderRadius: 'calc(var(--c-radius) * 1.5)' }}
      >
        {isSoldOut ? 'Sold out' : 'Add to bag'}
      </button>
    </div>
  );
}

function ProductThumb({ product, className = '', children }: { product: Product; className?: string; children?: React.ReactNode }) {
  return (
    <div className={`flex items-center justify-center overflow-hidden relative ${className}`} style={{ backgroundColor: 'var(--c-soft)', borderRadius: 'var(--c-radius)' }}>
      {product.imageUrl ? <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" /> : <span>{product.imageEmoji || '🛍️'}</span>}
      {children}
    </div>
  );
}

function PriceLine({ product, currency, className = '' }: { product: Product; currency: string; className?: string }) {
  return (
    <span className={`font-bold whitespace-nowrap text-right ${className}`}>
      {isOnSale(product) && <span className="block text-sm font-semibold line-through opacity-50">{money(product.compareAtCents!, currency)}</span>}
      {money(product.priceCents, currency)}
    </span>
  );
}

function TogglePill({ checked, onChange, label }: { checked: boolean; onChange: (checked: boolean) => void; label: string }) {
  return (
    <label className="flex items-center gap-2 px-4 py-3 border text-sm font-bold cursor-pointer" style={{ backgroundColor: checked ? 'var(--c-text)' : 'var(--c-surface)', color: checked ? 'var(--c-bg)' : 'var(--c-text)', borderColor: 'var(--c-line)', borderRadius: 'var(--c-radius)' }}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="sr-only" />
      {label}
    </label>
  );
}

function QuantityStepper({ value, min, max, onMinus, onPlus, large = false }: { value: number; min: number; max: number; onMinus: () => void; onPlus: () => void; large?: boolean }) {
  return (
    <div className={`flex items-center gap-1 w-fit rounded-full px-1 py-1 ${large ? 'h-14' : ''}`} style={{ backgroundColor: 'var(--c-bg)', border: '1px solid var(--c-line)' }}>
      <button onClick={onMinus} disabled={value <= min} className={`${large ? 'w-12 h-12' : 'w-6 h-6'} flex items-center justify-center rounded-full hover:bg-[var(--c-soft)] disabled:opacity-30`}>
        <Minus className={large ? 'w-4 h-4' : 'w-3 h-3'} />
      </button>
      <span className={`${large ? 'w-10 text-sm' : 'w-6 text-xs'} text-center font-bold`}>{value}</span>
      <button onClick={onPlus} disabled={value >= max} className={`${large ? 'w-12 h-12' : 'w-6 h-6'} flex items-center justify-center rounded-full hover:bg-[var(--c-soft)] disabled:opacity-30`}>
        <Plus className={large ? 'w-4 h-4' : 'w-3 h-3'} />
      </button>
    </div>
  );
}

function CheckoutField({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-bold opacity-80">{label}</label>
      {children}
      {error && <span className="text-red-500 text-xs font-bold">{error}</span>}
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="font-bold opacity-65">{label}</span>
      <span className="font-bold text-right">{value}</span>
    </div>
  );
}
