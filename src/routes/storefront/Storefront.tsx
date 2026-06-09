import React, { Component, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Link, Route, Routes, useNavigate, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { useForm, type FieldPath, type UseFormReturn } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  Minus,
  Plus,
  Printer,
  Search,
  ShieldCheck,
  ShoppingBag,
  SlidersHorizontal,
  Truck,
  X,
} from 'lucide-react';
import { queryKeys, usePublicStore } from '@/api/queries';
import { LanguageToggle } from '@/components/ui/LanguageToggle';
import { money } from '@/lib/format';
import { useI18n } from '@/lib/i18n';
import { useStore } from '@/lib/store';
import { getStorefrontTemplate, resolveStoreTheme } from '@/lib/themes';
import { cn } from '@/lib/cn';
import { computeOrderSummary, getDiscountStatus } from '@/lib/checkout';
import type { Discount, Order, Product, Store } from '@/lib/types';
import {
  activeVariants,
  cartLineKey,
  colorValues,
  findCartVariant,
  isVariableProduct,
  lineMaxQuantity,
  lineUnitPrice,
  optionValueAvailable,
  productImages,
  productOptions,
  productPriceRange,
  productPrimaryImage,
  productStock,
  selectedVariant,
} from '@/lib/productOptions';
import { isJordanMobile, normalizeJordanMobile } from '@shared/phone';
import { categoryDetailRows } from '@/lib/productCategory';

type CartItem = { productId: string; variantId?: string; quantity: number };
type SortMode = 'newest' | 'price-asc' | 'price-desc' | 'name';

const EMPTY_CART: CartItem[] = [];
const PAGE_SIZE = 12;
const GOVERNORATES = [
  'Amman',
  'Irbid',
  'Zarqa',
  'Balqa',
  'Madaba',
  'Karak',
  'Tafilah',
  "Ma'an",
  'Aqaba',
  'Mafraq',
  'Jerash',
  'Ajloun',
] as const;

const checkoutSchema = z.object({
  customerName: z.string().trim().min(2, 'Full name is required.'),
  customerEmail: z.string().trim().email('Enter a valid email.').optional().or(z.literal('')),
  customerPhone: z.string().trim().refine(isJordanMobile, 'Enter a valid Jordan mobile number.'),
  governorate: z.enum(GOVERNORATES, { message: 'Choose a governorate.' }),
  address: z.string().trim().min(8, 'Delivery address is required.'),
  shippingOption: z.enum(['DELIVERY', 'PICKUP']),
  note: z.string().trim().max(1000).optional(),
});

type CheckoutValues = z.infer<typeof checkoutSchema>;

const text = {
  en: {
    unavailableTitle: 'Store unavailable',
    unavailableBody: 'This storefront is currently inactive or under maintenance.',
    notFoundTitle: 'Store not found',
    notFoundBody: 'We could not find that public storefront.',
    retry: 'Retry',
    shop: 'Shop',
    about: 'About',
    policies: 'Policies',
    cart: 'Cart',
    search: 'Search products',
    newest: 'Newest',
    priceLow: 'Price: low to high',
    priceHigh: 'Price: high to low',
    name: 'Name',
    inStock: 'In stock',
    onSale: 'On sale',
    noProducts: 'No products yet',
    noResults: 'No results',
    noResultsHint: 'Try a different search or filter.',
    featured: 'Featured products',
    allProducts: 'All products',
    addToCart: 'Add to cart',
    soldOut: 'Sold out',
    related: 'Related products',
    aboutTitle: 'About this store',
    shippingReturns: 'Shipping and returns',
    emptyCart: 'Your cart is empty',
    subtotal: 'Subtotal',
    discount: 'Discount',
    gst: 'GST',
    shipping: 'Shipping',
    total: 'Total',
    free: 'Free',
    promo: 'Promo code',
    apply: 'Apply',
    remove: 'Remove',
    checkout: 'Checkout',
    placeOrder: 'Place COD order',
    orderReview: 'Order review',
    customer: 'Customer',
    delivery: 'Delivery',
    fullName: 'Full name',
    emailOptional: 'Email (optional)',
    phone: 'Jordan mobile',
    governorate: 'Governorate',
    address: 'Street, building, area',
    note: 'Order note (optional)',
    cod: 'Cash on Delivery',
    confirmed: 'Order confirmed',
    reference: 'Reference',
    invoice: 'Internal tax invoice',
    print: 'Print invoice',
    continueShopping: 'Continue shopping',
    offline: 'You appear to be offline. Existing content stays available; retry when connection returns.',
    cartUpdated: 'Cart updated with current stock.',
    powered: 'Powered by Plinth',
  },
  ar: {
    unavailableTitle: 'المتجر غير متاح',
    unavailableBody: 'هذا المتجر متوقف حاليا أو قيد الصيانة.',
    notFoundTitle: 'المتجر غير موجود',
    notFoundBody: 'لم نتمكن من العثور على هذا المتجر.',
    retry: 'إعادة المحاولة',
    shop: 'تسوق',
    about: 'عن المتجر',
    policies: 'السياسات',
    cart: 'السلة',
    search: 'ابحث عن المنتجات',
    newest: 'الأحدث',
    priceLow: 'السعر: من الأقل',
    priceHigh: 'السعر: من الأعلى',
    name: 'الاسم',
    inStock: 'المتوفر',
    onSale: 'العروض',
    noProducts: 'لا توجد منتجات بعد',
    noResults: 'لا توجد نتائج',
    noResultsHint: 'جرب بحثا أو فلتر آخر.',
    featured: 'منتجات مختارة',
    allProducts: 'كل المنتجات',
    addToCart: 'أضف إلى السلة',
    soldOut: 'نفدت الكمية',
    related: 'منتجات مشابهة',
    aboutTitle: 'عن هذا المتجر',
    shippingReturns: 'الشحن والإرجاع',
    emptyCart: 'سلتك فارغة',
    subtotal: 'المجموع الفرعي',
    discount: 'الخصم',
    gst: 'ضريبة المبيعات',
    shipping: 'الشحن',
    total: 'الإجمالي',
    free: 'مجاني',
    promo: 'رمز الخصم',
    apply: 'تطبيق',
    remove: 'حذف',
    checkout: 'إتمام الشراء',
    placeOrder: 'تأكيد طلب الدفع عند الاستلام',
    orderReview: 'مراجعة الطلب',
    customer: 'العميل',
    delivery: 'التوصيل',
    fullName: 'الاسم الكامل',
    emailOptional: 'البريد الإلكتروني (اختياري)',
    phone: 'رقم الموبايل الأردني',
    governorate: 'المحافظة',
    address: 'الشارع، المبنى، المنطقة',
    note: 'ملاحظة للطلب (اختياري)',
    cod: 'الدفع عند الاستلام',
    confirmed: 'تم تأكيد الطلب',
    reference: 'المرجع',
    invoice: 'فاتورة ضريبية داخلية',
    print: 'طباعة الفاتورة',
    continueShopping: 'متابعة التسوق',
    offline: 'يبدو أنك غير متصل. سيبقى المحتوى الحالي متاحا وأعد المحاولة عند عودة الاتصال.',
    cartUpdated: 'تم تحديث السلة حسب المخزون الحالي.',
    powered: 'مشغل بواسطة Plinth',
  },
} as const;

function useCopy() {
  const { lang } = useI18n();
  return text[lang];
}

function productCollection(product: Product, store: Store) {
  return product.collection?.trim() || store.category || 'Collection';
}

function productCategory(product: Product, store: Store) {
  return product.category?.trim() || store.category || 'General';
}

function isOnSale(product: Product) {
  return Boolean(product.compareAtCents && product.compareAtCents > product.priceCents);
}

function useOnlineStatus() {
  const [online, setOnline] = useState(() => typeof navigator === 'undefined' ? true : navigator.onLine);
  useEffect(() => {
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);
  return online;
}

function useStorefrontMeta(store?: Store, product?: Product) {
  useEffect(() => {
    if (!store) return;
    const title = product?.details?.seoTitle || (product ? `${product.name} · ${store.name}` : `${store.name} · Plinth`);
    const description = product?.details?.seoDescription || product?.details?.shortDescription || product?.description || store.tagline || store.about || store.name;
    document.title = title;

    const setMeta = (selector: string, attr: 'name' | 'property', key: string, content: string) => {
      let el = document.head.querySelector<HTMLMetaElement>(selector);
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute(attr, key);
        document.head.appendChild(el);
      }
      el.content = content;
    };
    setMeta('meta[name="description"]', 'name', 'description', description);
    setMeta('meta[property="og:title"]', 'property', 'og:title', title);
    setMeta('meta[property="og:description"]', 'property', 'og:description', description);
    if (product?.imageUrl || store.logoUrl) setMeta('meta[property="og:image"]', 'property', 'og:image', product?.imageUrl || store.logoUrl || '');

    let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.rel = 'canonical';
      document.head.appendChild(canonical);
    }
    canonical.href = `${window.location.origin}${window.location.pathname}${window.location.hash}`;
  }, [store, product]);
}

class StorefrontErrorBoundary extends Component<{ children: React.ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (this.state.failed) {
      return (
        <div className="min-h-screen bg-neutral-100 p-6 text-neutral-950 flex items-center justify-center">
          <div className="w-full max-w-md rounded-2xl bg-white p-10 text-center shadow-xl border border-black/5 transition-all">
            <AlertCircle className="mx-auto mb-6 h-12 w-12 text-red-500" />
            <h1 className="mb-3 text-3xl font-black tracking-tight">Storefront error</h1>
            <p className="mb-8 text-sm text-neutral-500">Something went wrong while rendering this store.</p>
            <button type="button" className="w-full rounded-xl bg-black px-5 py-4 text-sm font-bold text-white transition-transform active:scale-95" onClick={() => this.setState({ failed: false })}>
              Try again
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function StorefrontRoot() {
  const { slug } = useParams();
  const c = useCopy();
  const online = useOnlineStatus();
  const query = usePublicStore(slug);

  if (!slug) return <Unavailable title={c.notFoundTitle} body={c.notFoundBody} />;
  if (query.isLoading) return <StorefrontSkeleton />;
  if (query.isError) {
    const message = query.error instanceof Error ? query.error.message : '';
    const isNotFound = message.toLowerCase().includes('not found');
    return (
      <Unavailable
        title={isNotFound ? c.notFoundTitle : c.unavailableTitle}
        body={isNotFound ? c.notFoundBody : message || c.unavailableBody}
        actionLabel={c.retry}
        onAction={() => query.refetch()}
      />
    );
  }
  if (!query.data) return <Unavailable title={c.notFoundTitle} body={c.notFoundBody} />;
  if (query.data.store.status === 'SUSPENDED') return <Unavailable title={c.unavailableTitle} body={c.unavailableBody} />;

  return (
    <StorefrontErrorBoundary>
      {!online && <OfflineBanner message={c.offline} />}
      <StorefrontFrame store={query.data.store} products={query.data.products} discounts={query.data.discounts} />
    </StorefrontErrorBoundary>
  );
}

function StorefrontFrame({ store, products, discounts }: { store: Store; products: Product[]; discounts: Discount[] }) {
  const c = useCopy();
  const { dir } = useI18n();
  const theme = resolveStoreTheme(store.themeId || 'mono', store.themeOverrides);
  const navigate = useNavigate();
  const carts = useStore((s) => s.carts);
  const updateCart = useStore((s) => s.updateCart);
  const placeOrder = useStore((s) => s.placeOrder);
  const recordEvent = useStore((s) => s.recordEvent);
  const cartItems = carts[store.id] ?? EMPTY_CART;
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [announcement, setAnnouncement] = useState(true);
  const [appliedCode, setAppliedCode] = useState<string>();
  const [promoInput, setPromoInput] = useState('');
  const [promoMessage, setPromoMessage] = useState<string>();
  const [liveMessage, setLiveMessage] = useState('');
  const [checkoutError, setCheckoutError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const idempotencyRef = useRef('');
  const queryClient = useQueryClient();

  const themeVars = {
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

  const form = useForm<CheckoutValues>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      customerName: '',
      customerEmail: '',
      customerPhone: '',
      governorate: 'Amman',
      address: '',
      shippingOption: store.shipping?.type === 'PICKUP' ? 'PICKUP' : 'DELIVERY',
      note: '',
    },
  });

  const activeDiscount = appliedCode ? discounts.find((item) => item.code === appliedCode) : undefined;
  const summary = computeOrderSummary(store, products, cartItems, activeDiscount);
  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  useStorefrontMeta(store);

  useEffect(() => {
    const normalized = cartItems
      .map((item) => {
        const product = products.find((candidate) => candidate.id === item.productId && candidate.isActive);
        if (!product) return null;
        const variant = findCartVariant(product, item);
        if (isVariableProduct(product) && !variant) return null;
        const stock = lineMaxQuantity(product, variant);
        if (stock <= 0) return null;
        return { productId: item.productId, variantId: item.variantId, quantity: Math.min(item.quantity, stock) };
      })
      .filter(Boolean) as CartItem[];
    const changed = normalized.length !== cartItems.length || normalized.some((item, index) => item.quantity !== cartItems[index]?.quantity || item.productId !== cartItems[index]?.productId || item.variantId !== cartItems[index]?.variantId);
    if (changed) {
      updateCart(store.id, normalized);
      setLiveMessage(c.cartUpdated);
    }
  }, [cartItems, products, store.id, updateCart, c.cartUpdated]);

  useEffect(() => {
    if (!activeDiscount) return;
    const status = getDiscountStatus(activeDiscount, summary.subtotalCents);
    if (status !== 'Valid') {
      setAppliedCode(undefined);
      setPromoMessage(status);
    }
  }, [activeDiscount, summary.subtotalCents]);

  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setDrawerOpen(false);
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKey);
    };
  }, [drawerOpen]);

  const addToCart = (productId: string, quantity = 1, variantId?: string) => {
    const product = products.find((item) => item.id === productId);
    if (!product) return;
    const variant = variantId ? activeVariants(product).find((item) => item.id === variantId) : undefined;
    if (isVariableProduct(product) && !variant) return;
    const stock = lineMaxQuantity(product, variant);
    if (stock <= 0) return;
    const existing = cartItems.find((item) => item.productId === productId && item.variantId === variantId);
    const next = existing
      ? cartItems.map((item) => item.productId === productId && item.variantId === variantId ? { ...item, quantity: Math.min(stock, item.quantity + quantity) } : item)
      : [...cartItems, { productId, variantId, quantity: Math.min(stock, quantity) }];
    updateCart(store.id, next);
    recordEvent(store.id, 'add_to_cart', productId);
    setLiveMessage(`${product.name} ${c.addToCart}`);
    setDrawerOpen(true);
  };

  const setQuantity = (productId: string, quantity: number, variantId?: string) => {
    const product = products.find((item) => item.id === productId);
    if (quantity <= 0) {
      updateCart(store.id, cartItems.filter((item) => !(item.productId === productId && item.variantId === variantId)));
      return;
    }
    if (!product) return;
    const variant = variantId ? activeVariants(product).find((item) => item.id === variantId) : undefined;
    const stock = lineMaxQuantity(product, variant);
    updateCart(store.id, cartItems.map((item) => item.productId === productId && item.variantId === variantId ? { ...item, quantity: Math.min(quantity, stock) } : item));
  };

  const applyPromo = () => {
    const code = promoInput.trim().toUpperCase();
    const discount = discounts.find((item) => item.code === code);
    if (!discount) {
      setAppliedCode(undefined);
      setPromoMessage('Invalid code.');
      return;
    }
    const status = getDiscountStatus(discount, summary.subtotalCents);
    if (status !== 'Valid') {
      setAppliedCode(undefined);
      setPromoMessage(status);
      return;
    }
    setAppliedCode(code);
    setPromoInput(code);
    setPromoMessage('Applied.');
  };

  const beginCheckout = () => {
    recordEvent(store.id, 'checkout_start');
    idempotencyRef.current = crypto.randomUUID();
    setCheckoutError('');
    setCheckoutOpen(true);
  };

  const submitCheckout = async (values: CheckoutValues) => {
    if (summary.items.length === 0 || submitting) return;
    setSubmitting(true);
    setCheckoutError('');
    const normalizedPhone = normalizeJordanMobile(values.customerPhone) || values.customerPhone;
    const address = values.shippingOption === 'PICKUP'
      ? `Pickup · ${values.governorate} · ${values.address}`
      : `${values.governorate} · ${values.address}`;
    const idempotencyKey = idempotencyRef.current || crypto.randomUUID();
    idempotencyRef.current = idempotencyKey;
    try {
      const orderId = await placeOrder({
        storeId: store.id,
        customerName: values.customerName,
        customerEmail: values.customerEmail || undefined,
        customerPhone: normalizedPhone,
        shippingAddress: address,
        discountCode: appliedCode,
        note: values.note || undefined,
        items: cartItems,
        idempotencyKey,
      });
      await queryClient.invalidateQueries({ queryKey: queryKeys.publicStore(store.slug) });
      form.reset();
      setAppliedCode(undefined);
      setPromoInput('');
      setPromoMessage(undefined);
      setCheckoutOpen(false);
      setDrawerOpen(false);
      idempotencyRef.current = '';
      window.scrollTo(0, 0);
      useStore.getState().recordEvent(store.id, 'order');
      useStore.getState().loadPublicStore(store.slug).catch(() => undefined);
      navigate(`/s/${store.slug}/order/${orderId}`);
    } catch (error) {
      await queryClient.invalidateQueries({ queryKey: queryKeys.publicStore(store.slug) });
      setCheckoutError(error instanceof Error ? error.message : 'Checkout failed. Please review your cart and retry.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--c-bg)] text-[var(--c-text)] selection:bg-[var(--c-text)] selection:text-[var(--c-bg)] font-sans" dir={dir} style={themeVars}>
      <div aria-live="polite" className="sr-only">{liveMessage}</div>
      {store.announcement && announcement && (
        <div className="relative z-50 flex min-h-12 items-center justify-center bg-[var(--c-text)] px-12 py-3 text-center text-[11px] font-black uppercase tracking-[0.2em] text-[var(--c-bg)]">
          <span>{store.announcement}</span>
          <button type="button" aria-label="Dismiss announcement" className="absolute end-4 rounded-full p-2 opacity-60 hover:opacity-100 transition-opacity" onClick={() => setAnnouncement(false)}>
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <header className="sticky top-0 z-40 border-b border-[var(--c-line)]/30 bg-[var(--c-surface)]/80 backdrop-blur-2xl transition-all duration-300">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:h-24 sm:px-6 lg:px-8">
          <Link to={`/s/${store.slug}`} className="flex min-w-0 items-center gap-4 group">
            <ProductLogo store={store} />
            <span className="truncate text-xl font-black tracking-tighter sm:text-3xl group-hover:opacity-80 transition-opacity" style={{ fontFamily: theme.hero }}>{store.name}</span>
          </Link>
          <nav className="hidden items-center gap-8 text-xs font-bold uppercase tracking-[0.15em] opacity-60 md:flex">
            <Link to={`/s/${store.slug}`} className="hover:opacity-100 transition-opacity">{c.shop}</Link>
            <Link to={`/s/${store.slug}/about`} className="hover:opacity-100 transition-opacity">{c.about}</Link>
            <Link to={`/s/${store.slug}/cart`} className="hover:opacity-100 transition-opacity">{c.cart}</Link>
          </nav>
          <div className="flex items-center gap-3 sm:gap-4">
            <LanguageToggle className="border-[var(--c-line)]/50 bg-[var(--c-bg)] text-[var(--c-text)] hover:bg-[var(--c-soft)] rounded-xl transition-colors" />
            <button
              type="button"
              aria-label={`${c.cart}: ${cartCount}`}
              className="relative inline-flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--c-surface)] shadow-sm border border-[var(--c-line)]/50 hover:bg-[var(--c-soft)] transition-all active:scale-95 group"
              onClick={() => setDrawerOpen(true)}
            >
              <ShoppingBag className="h-5 w-5 opacity-80 group-hover:opacity-100 transition-opacity" />
              {cartCount > 0 && <span className="absolute -end-2 -top-2 grid h-6 min-w-6 place-items-center rounded-full bg-[var(--c-text)] px-1.5 text-[11px] font-black text-[var(--c-bg)] shadow-md animate-in zoom-in-50 duration-300">{cartCount}</span>}
            </button>
          </div>
        </div>
      </header>

      <main className="pb-16">
        <Routes>
          <Route path="/" element={<HomePage store={store} products={products} addToCart={addToCart} />} />
          <Route path="/p/:productId" element={<ProductDetail store={store} products={products} addToCart={addToCart} />} />
          <Route path="/about" element={<AboutPage store={store} />} />
          <Route path="/cart" element={<CartPage store={store} products={products} cartItems={cartItems} summary={summary} setQuantity={setQuantity} openCheckout={beginCheckout} />} />
          <Route path="/order/:orderId" element={<OrderConfirmation store={store} />} />
        </Routes>
      </main>

      <footer className="border-t border-[var(--c-line)]/30 bg-[var(--c-surface)]">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 px-4 py-12 text-center sm:px-6 md:flex-row md:text-start lg:px-8">
          <div>
            <p className="text-xl font-black tracking-tight">{store.name}</p>
            <p className="mt-2 text-sm font-medium opacity-50">{store.tagline}</p>
          </div>
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] opacity-40 hover:opacity-100 transition-opacity cursor-default">{store.name} · {c.powered}</p>
        </div>
      </footer>

      <CartDrawer
        open={drawerOpen}
        checkoutOpen={checkoutOpen}
        submitting={submitting}
        checkoutError={checkoutError}
        store={store}
        products={products}
        cartItems={cartItems}
        discounts={discounts}
        summary={summary}
        promoInput={promoInput}
        promoMessage={promoMessage}
        form={form}
        setPromoInput={setPromoInput}
        applyPromo={applyPromo}
        removePromo={() => { setAppliedCode(undefined); setPromoMessage(undefined); }}
        setQuantity={setQuantity}
        close={() => { setDrawerOpen(false); setCheckoutOpen(false); }}
        openCheckout={beginCheckout}
        backToCart={() => setCheckoutOpen(false)}
        submitCheckout={submitCheckout}
      />
    </div>
  );
}

function HomePage({ store, products, addToCart }: { store: Store; products: Product[]; addToCart: (productId: string, quantity?: number, variantId?: string) => void }) {
  const c = useCopy();
  const theme = resolveStoreTheme(store.themeId || 'mono', store.themeOverrides);
  const template = getStorefrontTemplate(store.storefrontTemplate);
  const [query, setQuery] = useState('');
  const [collection, setCollection] = useState('All');
  const [sort, setSort] = useState<SortMode>('newest');
  const [inStockOnly, setInStockOnly] = useState(false);
  const [onSaleOnly, setOnSaleOnly] = useState(false);
  const [page, setPage] = useState(1);
  const debouncedQuery = useDebouncedValue(query, 180);
  useStorefrontMeta(store);

  const collections = useMemo(() => ['All', ...Array.from(new Set(products.flatMap((product) => [productCategory(product, store), productCollection(product, store)]))).sort()], [products, store]);
  const featured = products.filter((product) => product.isFeatured).slice(0, 4);
  const filtered = useMemo(() => {
    const q = debouncedQuery.trim().toLowerCase();
    return products
      .filter((product) => collection === 'All' || productCollection(product, store) === collection || productCategory(product, store) === collection)
      .filter((product) => !inStockOnly || productStock(product) > 0)
      .filter((product) => !onSaleOnly || isOnSale(product))
      .filter((product) => !q || `${product.name} ${product.description || ''} ${JSON.stringify(product.details || {})} ${product.category || ''} ${product.collection || ''} ${(product.tags || []).join(' ')}`.toLowerCase().includes(q))
      .sort((a, b) => {
        if (sort === 'price-asc') return productPriceRange(a).min - productPriceRange(b).min;
        if (sort === 'price-desc') return productPriceRange(b).min - productPriceRange(a).min;
        if (sort === 'name') return a.name.localeCompare(b.name);
        return b.createdAt - a.createdAt;
      });
  }, [collection, debouncedQuery, inStockOnly, onSaleOnly, products, sort, store]);
  const visible = filtered.slice(0, page * PAGE_SIZE);

  useEffect(() => setPage(1), [collection, debouncedQuery, inStockOnly, onSaleOnly, sort]);

  return (
    <>
      <section className={cn('relative overflow-hidden bg-[var(--c-surface)] border-b border-[var(--c-line)]/20', template.id === 'lookbook' && 'bg-[var(--c-soft)]')}>
        {/* Subtle decorative background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-[var(--c-surface)] via-transparent to-[var(--c-soft)] opacity-50 pointer-events-none" />
        
        <div className={cn(
          'relative mx-auto grid min-h-[calc(100vh-6rem)] max-w-7xl items-center gap-12 px-4 py-20 sm:px-6 lg:px-8',
          template.id === 'editorial' && 'lg:grid-cols-[1.1fr_0.9fr]',
          template.id === 'boutique' && 'lg:grid-cols-2',
          template.id === 'market' && 'min-h-0 py-16 lg:grid-cols-[0.8fr_1.2fr]',
          template.id === 'lookbook' && 'lg:grid-cols-[0.85fr_1.15fr]',
        )}>
          <div className="z-10">
            <p className="mb-6 w-fit rounded-full bg-[var(--c-bg)]/80 backdrop-blur-md px-5 py-2 text-[11px] font-black uppercase tracking-[0.2em] border border-[var(--c-line)]/40 shadow-sm">{store.category}</p>
            <h1 className={cn('max-w-4xl font-black leading-[1.05] tracking-tighter', template.id === 'market' ? 'text-5xl sm:text-6xl lg:text-7xl' : 'text-6xl sm:text-7xl lg:text-8xl')} style={{ fontFamily: theme.hero }}>{store.tagline || store.name}</h1>
            {template.id === 'market' && <p className="mt-6 max-w-xl text-lg font-medium leading-relaxed opacity-60">{store.name} catalog, ready for quick browsing and COD orders.</p>}
            <div className="mt-10 flex flex-wrap gap-4 text-xs font-bold uppercase tracking-[0.15em] opacity-60">
              <span className="inline-flex items-center gap-2 bg-[var(--c-soft)] px-4 py-2 rounded-xl"><Truck className="h-4 w-4" /> Jordan delivery</span>
              <span className="inline-flex items-center gap-2 bg-[var(--c-soft)] px-4 py-2 rounded-xl"><ShieldCheck className="h-4 w-4" /> {c.cod}</span>
            </div>
          </div>
          <div className={cn('group relative grid place-items-center overflow-hidden bg-[var(--c-bg)] shadow-2xl shadow-[var(--c-text)]/5 border border-[var(--c-line)]/20', template.id === 'lookbook' ? 'aspect-[16/10] rounded-none' : template.id === 'market' ? 'aspect-[16/9] rounded-2xl' : 'aspect-[4/5] rounded-3xl')}>
            {featured[0] ? <ProductThumb product={featured[0]} className="h-full w-full text-8xl group-hover:scale-105 transition-transform duration-700 ease-out" /> : <ProductLogo store={store} large />}
          </div>
        </div>
      </section>

      {featured.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <SectionHeading title={c.featured} />
          <ProductGrid products={featured} store={store} addToCart={addToCart} templateId={template.id} />
        </section>
      )}

      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <SectionHeading title={c.allProducts} />
        <div className="mb-10 rounded-2xl bg-[var(--c-surface)] p-4 shadow-sm border border-[var(--c-line)]/40">
          <div className="grid gap-4 lg:grid-cols-[1fr_auto_auto]">
            <label className="relative block">
              <Search className="pointer-events-none absolute start-4 top-1/2 h-5 w-5 -translate-y-1/2 opacity-40" />
              <span className="sr-only">{c.search}</span>
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={c.search} className="h-14 w-full rounded-xl border border-[var(--c-line)]/50 bg-[var(--c-bg)] pe-4 ps-12 text-sm font-medium transition-all focus:border-[var(--c-text)] focus:ring-1 focus:ring-[var(--c-text)] outline-none" />
            </label>
            <label className="relative block">
              <span className="sr-only">Collection</span>
              <select value={collection} onChange={(event) => setCollection(event.target.value)} className="h-14 min-w-[12rem] appearance-none rounded-xl border border-[var(--c-line)]/50 bg-[var(--c-bg)] pe-12 ps-4 text-sm font-medium transition-all focus:border-[var(--c-text)] focus:ring-1 focus:ring-[var(--c-text)] outline-none">
                {collections.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
              <ChevronDown className="pointer-events-none absolute end-4 top-1/2 h-5 w-5 -translate-y-1/2 opacity-40" />
            </label>
            <label className="relative block">
              <span className="sr-only">Sort</span>
              <select value={sort} onChange={(event) => setSort(event.target.value as SortMode)} className="h-14 min-w-[12rem] appearance-none rounded-xl border border-[var(--c-line)]/50 bg-[var(--c-bg)] pe-12 ps-4 text-sm font-medium transition-all focus:border-[var(--c-text)] focus:ring-1 focus:ring-[var(--c-text)] outline-none">
                <option value="newest">{c.newest}</option>
                <option value="price-asc">{c.priceLow}</option>
                <option value="price-desc">{c.priceHigh}</option>
                <option value="name">{c.name}</option>
              </select>
              <SlidersHorizontal className="pointer-events-none absolute end-4 top-1/2 h-4 w-4 -translate-y-1/2 opacity-40" />
            </label>
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <Toggle active={inStockOnly} onClick={() => setInStockOnly((value) => !value)} label={c.inStock} />
            <Toggle active={onSaleOnly} onClick={() => setOnSaleOnly((value) => !value)} label={c.onSale} />
          </div>
        </div>
        {products.length === 0 ? (
          <EmptyState title={c.noProducts} body="" />
        ) : filtered.length === 0 ? (
          <EmptyState title={c.noResults} body={c.noResultsHint} />
        ) : (
          <>
            <ProductGrid products={visible} store={store} addToCart={addToCart} templateId={template.id} />
            {visible.length < filtered.length && (
              <div className="mt-14 text-center">
                <button type="button" className="rounded-xl bg-[var(--c-text)] px-8 py-4 text-xs font-black uppercase tracking-[0.2em] text-[var(--c-bg)] hover:scale-105 active:scale-95 transition-all shadow-xl" onClick={() => setPage((value) => value + 1)}>
                  Load more
                </button>
              </div>
            )}
          </>
        )}
      </section>
    </>
  );
}

function ProductDetail({ store, products, addToCart }: { store: Store; products: Product[]; addToCart: (productId: string, quantity?: number, variantId?: string) => void }) {
  const { productId } = useParams();
  const c = useCopy();
  const { lang } = useI18n();
  const theme = resolveStoreTheme(store.themeId || 'mono', store.themeOverrides);
  const template = getStorefrontTemplate(store.storefrontTemplate);
  const recordEvent = useStore((s) => s.recordEvent);
  const [quantity, setQuantity] = useState(1);
  const [selections, setSelections] = useState<Record<string, string>>({});
  const product = products.find((item) => item.id === productId);
  useStorefrontMeta(store, product);

  useEffect(() => {
    if (!product) return;
    recordEvent(store.id, 'view', product.id);
    setSelections({});
    setQuantity(1);
    window.scrollTo(0, 0);
  }, [product, recordEvent, store.id]);

  if (!product) return <EmptyState title="Product not found" body="" action={<Link className="rounded-xl bg-[var(--c-text)] px-6 py-4 text-sm font-bold text-[var(--c-bg)] transition-transform hover:scale-105" to={`/s/${store.slug}`}>Back to shop</Link>} />;

  const collection = productCollection(product, store);
  const details = product.details || {};
  const variable = isVariableProduct(product);
  const options = productOptions(product);
  const chosenVariant = selectedVariant(product, selections);
  const displayStock = productStock(product, chosenVariant);
  const displayPrice = lineUnitPrice(product, chosenVariant);
  const displayCompareAt = chosenVariant?.compareAtCents ?? product.compareAtCents;
  const displayImage = productPrimaryImage(product, chosenVariant);
  const related = products.filter((item) => item.id !== product.id && productCollection(item, store) === collection).slice(0, 4);
  const specRows = [
    details.sku ? ['SKU', details.sku] : undefined,
    details.barcode ? ['Barcode', details.barcode] : undefined,
    details.brand ? ['Brand', details.brand] : undefined,
    details.productType ? ['Type', details.productType] : undefined,
    details.sizeOptions?.length ? ['Sizes', details.sizeOptions.join(', ')] : undefined,
    details.colorOptions?.length ? ['Colours', details.colorOptions.join(', ')] : undefined,
    details.fit ? ['Fit', details.fit] : undefined,
    details.gender ? ['Audience', details.gender] : undefined,
    details.ageGroup ? ['Age group', details.ageGroup] : undefined,
    details.skinType ? ['Skin / hair type', details.skinType] : undefined,
    details.scent ? ['Scent', details.scent] : undefined,
    details.concentration ? ['Concentration', details.concentration] : undefined,
    details.topNotes ? ['Top notes', details.topNotes] : undefined,
    details.middleNotes ? ['Middle notes', details.middleNotes] : undefined,
    details.baseNotes ? ['Base notes', details.baseNotes] : undefined,
    details.volumeMl !== undefined ? ['Volume', `${details.volumeMl} ml`] : undefined,
    details.expiryDate ? ['Expiry', details.expiryDate] : undefined,
    details.modelNumber ? ['Model', details.modelNumber] : undefined,
    details.power ? ['Power', details.power] : undefined,
    details.room ? ['Room', details.room] : undefined,
    details.assemblyRequired ? ['Assembly', details.assemblyRequired] : undefined,
    details.author ? ['Author', details.author] : undefined,
    details.isbn ? ['ISBN', details.isbn] : undefined,
    details.pages !== undefined ? ['Pages', `${details.pages}`] : undefined,
    details.language ? ['Language', details.language] : undefined,
    details.materials ? ['Materials', details.materials] : undefined,
    details.dimensions ? ['Dimensions', details.dimensions] : undefined,
    details.weightGrams !== undefined ? ['Weight', `${details.weightGrams} g`] : undefined,
    details.countryOfOrigin ? ['Origin', details.countryOfOrigin] : undefined,
  ].filter(Boolean) as [string, string][];
  // Schema-driven category attributes (localized, public-only) take precedence over the
  // legacy flat spec rows when this product has a category assigned.
  const categoryRows = categoryDetailRows(details.categoryKey, details.attributes, lang);
  const detailRows = categoryRows.length > 0 ? categoryRows : specRows;

  return (
    <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="mb-10 flex items-center gap-3 text-xs font-bold uppercase tracking-[0.15em] opacity-50">
        <Link to={`/s/${store.slug}`} className="hover:opacity-100 transition-opacity">{c.shop}</Link>
        <span>/</span>
        <span>{collection}</span>
      </div>
      <div className="grid gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
        <ProductImageGallery product={product} activeImage={displayImage} />
        <div className="flex flex-col justify-center">
          <p className="mb-4 text-[11px] font-black uppercase tracking-[0.2em] opacity-40">{productCategory(product, store)} · {collection}</p>
          <h1 className="text-5xl font-black leading-none tracking-tighter sm:text-6xl md:text-7xl" style={{ fontFamily: theme.hero }}>{product.name}</h1>
          {details.subtitle && <p className="mt-5 text-xl font-bold opacity-60">{details.subtitle}</p>}
          <p className="my-8 flex flex-wrap items-baseline gap-3 text-4xl font-black tracking-tight">
            {displayCompareAt && displayCompareAt > displayPrice && <span className="text-xl font-bold line-through opacity-35">{money(displayCompareAt, store.currency)}</span>}
            <span>{money(displayPrice, store.currency)}</span>
          </p>
          {details.shortDescription && <p className="mb-4 text-xl font-bold leading-relaxed">{details.shortDescription}</p>}
          <p className="mb-6 whitespace-pre-line text-lg font-medium leading-relaxed opacity-60">{product.description}</p>
          {(product.tags || []).length > 0 && (
            <div className="mb-10 flex flex-wrap gap-2">
              {product.tags!.map((tag) => (
                <span key={tag} className="rounded-md bg-[var(--c-soft)] px-3 py-1.5 text-xs font-black uppercase tracking-[0.12em] ring-1 ring-[var(--c-line)]">{tag}</span>
              ))}
            </div>
          )}
          {variable && (
            <ProductOptionSelector product={product} selections={selections} setSelections={setSelections} />
          )}
          <div className="mb-10 rounded-2xl bg-[var(--c-surface)] p-6 shadow-sm border border-[var(--c-line)]/30">
            <div className="mb-5 flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-[0.15em] opacity-50">Quantity</span>
              {displayStock <= 5 && displayStock > 0 && <span className="text-xs font-bold text-orange-600 bg-orange-100/50 px-3 py-1 rounded-full">Only {displayStock} left</span>}
              {displayStock <= 0 && <span className="text-xs font-bold text-red-600 bg-red-100/50 px-3 py-1 rounded-full">Out of stock</span>}
            </div>
            {variable && (
              <p className="mb-4 text-sm font-bold opacity-60">
                {chosenVariant ? `Selected: ${chosenVariant.title}` : `Choose ${options.filter((option) => !selections[option.name]).map((option) => option.name.toLowerCase()).join(', ')}`}
              </p>
            )}
            <div className="flex flex-col gap-4 sm:flex-row">
              <QuantityStepper value={quantity} max={Math.max(displayStock, 1)} onChange={setQuantity} />
              <button type="button" disabled={displayStock <= 0 || (variable && !chosenVariant)} className="h-14 flex-1 rounded-xl bg-[var(--c-text)] px-6 text-sm font-black uppercase tracking-[0.15em] text-[var(--c-bg)] shadow-xl transition-all hover:-translate-y-1 active:translate-y-0 disabled:transform-none disabled:cursor-not-allowed disabled:opacity-40" onClick={() => addToCart(product.id, quantity, chosenVariant?.id)}>
                {displayStock <= 0 ? c.soldOut : variable && !chosenVariant ? 'Choose options' : c.addToCart}
              </button>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Feature icon={<Truck />} text="Jordan delivery" />
            <Feature icon={<ShieldCheck />} text={c.cod} />
          </div>
        </div>
      </div>
      <section className="mt-16 grid gap-5 lg:grid-cols-3">
        {(details.highlights || []).length > 0 && <ProductInfoList title="Highlights" items={details.highlights!} />}
        {detailRows.length > 0 && <ProductSpecs title="Product details" rows={detailRows} />}
        {(details.specifications || []).length > 0 && <ProductInfoList title="Specifications" items={details.specifications!} />}
        {(details.detailsRows || []).map((row) => <ProductInfoText key={row.id} title={row.name} body={row.value} />)}
        {details.sizeGuide && <ProductInfoText title="Size guide" body={details.sizeGuide} />}
        {details.ingredients && <ProductInfoText title="Ingredients" body={details.ingredients} />}
        {(details.allergens || []).length > 0 && <ProductInfoList title="Allergens" items={details.allergens!} />}
        {details.storageInstructions && <ProductInfoText title="Storage" body={details.storageInstructions} />}
        {details.nutrition && <ProductInfoText title="Nutrition" body={details.nutrition} />}
        {details.compatibility && <ProductInfoText title="Compatibility" body={details.compatibility} />}
        {(details.includedItems || []).length > 0 && <ProductInfoList title="Included" items={details.includedItems!} />}
        {details.careInstructions && <ProductInfoText title="Care instructions" body={details.careInstructions} />}
        {details.shippingNote && <ProductInfoText title="Shipping note" body={details.shippingNote} />}
        {details.warranty && <ProductInfoText title="Warranty" body={details.warranty} />}
        {details.returnPolicy && <ProductInfoText title="Returns" body={details.returnPolicy} />}
      </section>
      {related.length > 0 && (
        <section className="mt-24 border-t border-[var(--c-line)]/20 pt-16">
          <SectionHeading title={c.related} />
          <ProductGrid products={related} store={store} addToCart={addToCart} templateId={template.id} />
        </section>
      )}
    </section>
  );
}

function ProductImageGallery({ product, activeImage }: { product: Product; activeImage?: string }) {
  const images = productImages(product);
  const main = activeImage || images[0]?.url;
  return (
    <div className="lg:sticky lg:top-32">
      <div className="grid aspect-square w-full place-items-center overflow-hidden rounded-3xl border border-[var(--c-line)]/20 bg-[var(--c-surface)] text-8xl shadow-2xl shadow-black/5">
        {main ? <img src={main} alt={product.name} className="h-full w-full object-cover" /> : <span className="opacity-30">{product.imageEmoji || 'Bag'}</span>}
      </div>
      {images.length > 1 && (
        <div className="mt-4 grid grid-cols-5 gap-3">
          {images.slice(0, 5).map((image) => (
            <div key={image.id} className={cn('aspect-square overflow-hidden rounded-xl border bg-[var(--c-surface)]', image.url === main ? 'border-[var(--c-text)]' : 'border-[var(--c-line)]/30')}>
              <img src={image.url} alt={image.altText || product.name} className="h-full w-full object-cover" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ProductOptionSelector({ product, selections, setSelections }: { product: Product; selections: Record<string, string>; setSelections: React.Dispatch<React.SetStateAction<Record<string, string>>> }) {
  const options = productOptions(product);
  return (
    <div className="mb-8 space-y-5">
      {options.map((option) => {
        const isColor = /colou?r/i.test(option.name);
        return (
          <div key={option.id}>
            <div className="mb-2 flex items-center justify-between gap-3">
              <p className="text-xs font-black uppercase tracking-[0.15em] opacity-50">Choose {option.name.toLowerCase()}</p>
              {selections[option.name] && <p className="text-xs font-bold opacity-60">{selections[option.name]}</p>}
            </div>
            <div className="flex flex-wrap gap-2">
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
                      'min-h-11 rounded-xl border px-4 text-sm font-black transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-30',
                      selected ? 'border-[var(--c-text)] bg-[var(--c-text)] text-[var(--c-bg)] shadow-md' : 'border-[var(--c-line)] bg-[var(--c-surface)] hover:border-[var(--c-text)]',
                      isColor && 'flex items-center gap-2',
                    )}
                  >
                    {isColor && <span className="h-4 w-4 rounded-full ring-1 ring-[var(--c-line)]" style={{ backgroundColor: value.colorHex || value.value }} />}
                    {value.displayValue || value.value}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function AboutPage({ store }: { store: Store }) {
  const c = useCopy();
  const theme = resolveStoreTheme(store.themeId || 'mono', store.themeOverrides);
  useStorefrontMeta(store);
  return (
    <section className="mx-auto max-w-5xl px-4 py-20 sm:px-6 lg:px-8">
      <p className="mb-5 text-[12px] font-black uppercase tracking-[0.2em] opacity-40">{c.aboutTitle}</p>
      <h1 className="mb-12 text-6xl font-black tracking-tighter sm:text-7xl" style={{ fontFamily: theme.hero }}>{store.name}</h1>
      <div className="grid gap-8 md:grid-cols-[1.2fr_0.8fr]">
        <div className="whitespace-pre-line rounded-3xl bg-[var(--c-surface)] p-8 text-lg font-medium leading-relaxed shadow-sm border border-[var(--c-line)]/30">{store.about || store.tagline}</div>
        <div className="rounded-3xl bg-[var(--c-surface)] p-8 shadow-sm border border-[var(--c-line)]/30 h-fit">
          <h2 className="mb-5 text-sm font-black uppercase tracking-[0.15em] opacity-80">{c.shippingReturns}</h2>
          <p className="text-sm font-medium leading-relaxed opacity-60">{shippingPolicyText(store)}</p>
          {(store.contactPhone || store.address) && <div className="mt-8 pt-8 border-t border-[var(--c-line)]/20">
            {store.contactPhone && <p className="mb-2 text-sm font-medium opacity-80 flex items-center gap-2">📞 {store.contactPhone}</p>}
            {store.address && <p className="text-sm font-medium opacity-80 flex items-center gap-2">📍 {store.address}</p>}
          </div>}
        </div>
      </div>
    </section>
  );
}

function ProductInfoList({ title, items }: { title: string; items: string[] }) {
  return (
    <section className="rounded-2xl bg-[var(--c-surface)] p-6 ring-1 ring-[var(--c-line)]/40">
      <h2 className="mb-4 text-[11px] font-black uppercase tracking-[0.2em] opacity-45">{title}</h2>
      <div className="space-y-3">
        {items.map((item) => <p key={item} className="text-sm font-bold leading-6 opacity-75">{item}</p>)}
      </div>
    </section>
  );
}

function ProductSpecs({ title, rows }: { title: string; rows: [string, string][] }) {
  return (
    <section className="rounded-2xl bg-[var(--c-surface)] p-6 ring-1 ring-[var(--c-line)]/40">
      <h2 className="mb-4 text-[11px] font-black uppercase tracking-[0.2em] opacity-45">{title}</h2>
      <div className="divide-y divide-[var(--c-line)]/40">
        {rows.map(([label, value]) => (
          <div key={label} className="grid grid-cols-[7rem_1fr] gap-4 py-3 text-sm">
            <span className="font-black opacity-45">{label}</span>
            <span className="font-bold opacity-75">{value}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function ProductInfoText({ title, body }: { title: string; body: string }) {
  return (
    <section className="rounded-2xl bg-[var(--c-surface)] p-6 ring-1 ring-[var(--c-line)]/40">
      <h2 className="mb-4 text-[11px] font-black uppercase tracking-[0.2em] opacity-45">{title}</h2>
      <p className="whitespace-pre-line text-sm font-bold leading-6 opacity-75">{body}</p>
    </section>
  );
}

function CartPage({ store, products, cartItems, summary, setQuantity, openCheckout }: { store: Store; products: Product[]; cartItems: CartItem[]; summary: ReturnType<typeof computeOrderSummary>; setQuantity: (productId: string, quantity: number, variantId?: string) => void; openCheckout: () => void }) {
  const c = useCopy();
  return (
    <section className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
      <SectionHeading title={c.cart} />
      <div className="grid gap-8 lg:grid-cols-[1fr_24rem]">
        <CartLines store={store} products={products} cartItems={cartItems} setQuantity={setQuantity} />
        <div className="h-fit rounded-3xl bg-[var(--c-surface)] p-6 shadow-sm border border-[var(--c-line)]/30">
          <SummaryRows store={store} summary={summary} />
          <button type="button" disabled={cartItems.length === 0} onClick={openCheckout} className="mt-6 h-14 w-full rounded-xl bg-[var(--c-text)] text-sm font-black uppercase tracking-[0.15em] text-[var(--c-bg)] shadow-xl transition-all hover:scale-[1.02] active:scale-[0.98] disabled:transform-none disabled:opacity-40">{c.checkout}</button>
        </div>
      </div>
    </section>
  );
}

function OrderConfirmation({ store }: { store: Store }) {
  const { orderId } = useParams();
  const c = useCopy();
  const { date } = useI18n();
  const orders = useStore((s) => s.orders);
  const order = orders.find((item) => item.id === orderId) as (Order & { customerPhone?: string; shippingAddress?: string }) | undefined;
  useStorefrontMeta(store);

  if (!order) return <EmptyState title="Order not found" body="Refresh protection for guest order lookup is deferred until the public lookup endpoint exists." />;

  const invoiceNumber = order.invoiceNumber || `DRAFT-${order.id.slice(0, 8).toUpperCase()}`;
  return (
    <section className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="mb-10 rounded-3xl bg-[var(--c-surface)] p-10 text-center shadow-sm border border-[var(--c-line)]/30">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
          <CheckCircle2 className="h-10 w-10 text-green-600" />
        </div>
        <h1 className="text-4xl font-black tracking-tighter sm:text-5xl">{c.confirmed}</h1>
        <p className="mt-4 text-sm font-medium opacity-60">{c.reference}: <span className="font-mono font-bold">{order.id}</span></p>
      </div>

      <div id="invoice" className="rounded-3xl bg-white p-8 text-neutral-950 shadow-xl border border-black/5 print:shadow-none print:border-none print:p-0">
        <div className="mb-8 flex flex-col justify-between gap-6 border-b border-neutral-100 pb-8 sm:flex-row">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-neutral-400">{c.invoice}</p>
            <h2 className="mt-2 text-3xl font-black tracking-tight">{store.name}</h2>
            <p className="mt-2 text-sm text-neutral-500">{store.address}</p>
            {store.taxRegistrationNumber && <p className="mt-1 text-sm text-neutral-500">Tax No. {store.taxRegistrationNumber}</p>}
          </div>
          <div className="text-start sm:text-end">
            <p className="font-mono text-sm font-bold text-neutral-800">{invoiceNumber}</p>
            <p className="mt-1 text-sm text-neutral-500">{date(order.createdAt)}</p>
            <p className="mt-3 inline-block rounded-md bg-neutral-100 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-neutral-600">{order.paymentMethod || 'COD'}</p>
          </div>
        </div>
        <div className="mb-8 grid gap-8 sm:grid-cols-2">
          <InvoiceBlock title={c.customer} lines={[order.customerName, order.customerPhone, order.customerEmail].filter(Boolean) as string[]} />
          <InvoiceBlock title={c.delivery} lines={[order.shippingAddress || 'COD delivery address on file', order.note].filter(Boolean) as string[]} />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-100 text-start text-xs font-black uppercase tracking-[0.15em] text-neutral-400">
                <th className="py-4 text-start">Item</th>
                <th className="py-4 text-end">Qty</th>
                <th className="py-4 text-end">Unit</th>
                <th className="py-4 text-end">Line</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item, index) => (
                <tr key={`${item.productName}-${index}`} className="border-b border-neutral-50 last:border-0">
                  <td className="py-4 font-bold text-neutral-800">{item.productName}</td>
                  <td className="py-4 text-end font-medium text-neutral-600">{item.quantity}</td>
                  <td className="py-4 text-end font-medium text-neutral-600">{money(item.priceCents, order.currency || store.currency)}</td>
                  <td className="py-4 text-end font-black text-neutral-900">{money(item.priceCents * item.quantity, order.currency || store.currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="ms-auto mt-8 max-w-sm space-y-3 text-sm rounded-2xl bg-neutral-50 p-6">
          <InvoiceRow label={c.subtotal} value={money(order.subtotalCents, order.currency || store.currency)} />
          {(order.discountCents ?? 0) > 0 && <InvoiceRow label={c.discount} value={`-${money(order.discountCents ?? 0, order.currency || store.currency)}`} />}
          <InvoiceRow label={c.gst} value={money(order.taxCents ?? 0, order.currency || store.currency)} />
          <InvoiceRow label={c.shipping} value={money(order.shippingCents ?? 0, order.currency || store.currency)} />
          <div className="border-t border-neutral-200 pt-4 mt-2">
            <InvoiceRow label={c.total} value={money(order.totalCents, order.currency || store.currency)} strong />
          </div>
        </div>
      </div>
      <div className="mt-8 flex flex-col gap-4 sm:flex-row print:hidden">
        <button type="button" onClick={() => window.print()} className="inline-flex h-14 flex-1 items-center justify-center gap-3 rounded-xl bg-[var(--c-text)] text-xs font-black uppercase tracking-[0.15em] text-[var(--c-bg)] transition-transform hover:scale-[1.02] active:scale-[0.98] shadow-xl"><Printer className="h-5 w-5" />{c.print}</button>
        <Link to={`/s/${store.slug}`} className="inline-flex h-14 flex-1 items-center justify-center rounded-xl bg-[var(--c-surface)] text-xs font-black uppercase tracking-[0.15em] border border-[var(--c-line)]/40 transition-colors hover:bg-[var(--c-soft)]">{c.continueShopping}</Link>
      </div>
    </section>
  );
}

function CartDrawer(props: {
  open: boolean;
  checkoutOpen: boolean;
  submitting: boolean;
  checkoutError: string;
  store: Store;
  products: Product[];
  cartItems: CartItem[];
  discounts: Discount[];
  summary: ReturnType<typeof computeOrderSummary>;
  promoInput: string;
  promoMessage?: string;
  form: UseFormReturn<CheckoutValues>;
  setPromoInput: (value: string) => void;
  applyPromo: () => void;
  removePromo: () => void;
  setQuantity: (productId: string, quantity: number, variantId?: string) => void;
  close: () => void;
  openCheckout: () => void;
  backToCart: () => void;
  submitCheckout: (values: CheckoutValues) => void;
}) {
  const c = useCopy();
  const firstFocusable = useRef<HTMLButtonElement | null>(null);
  
  useEffect(() => {
    if (props.open) firstFocusable.current?.focus();
  }, [props.open]);

  return (
    <>
      {/* Backdrop */}
      <div 
        className={cn(
          "fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm transition-opacity duration-300", 
          props.open ? "opacity-100 visible" : "opacity-0 invisible pointer-events-none"
        )} 
        onMouseDown={(event) => { if (event.target === event.currentTarget) props.close(); }} 
      />
      
      {/* Drawer */}
      <aside 
        role="dialog" 
        aria-modal="true" 
        aria-label={props.checkoutOpen ? c.checkout : c.cart} 
        className={cn(
          "fixed top-0 right-0 z-[101] flex h-full w-full max-w-[32rem] flex-col bg-[var(--c-bg)] text-[var(--c-text)] shadow-2xl shadow-black/20 transition-transform duration-500 cubic-bezier(0.32, 0.72, 0, 1)",
          props.open ? "translate-x-0" : "translate-x-full"
        )}
      >
        <div className="flex h-20 items-center justify-between border-b border-[var(--c-line)]/30 bg-[var(--c-surface)]/80 backdrop-blur-xl px-6">
          <h2 className="text-2xl font-black tracking-tight">{props.checkoutOpen ? c.checkout : c.cart}</h2>
          <button ref={firstFocusable} type="button" aria-label="Close cart" onClick={props.close} className="grid h-10 w-10 place-items-center rounded-full bg-[var(--c-soft)] hover:bg-[var(--c-line)]/20 transition-colors">
            <X className="h-5 w-5 opacity-70" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 scroll-smooth">
          {props.checkoutOpen ? (
            <CheckoutForm {...props} />
          ) : (
            <CartLines store={props.store} products={props.products} cartItems={props.cartItems} setQuantity={props.setQuantity} />
          )}
        </div>
        {props.cartItems.length > 0 && (
          <div className="border-t border-[var(--c-line)]/30 bg-[var(--c-surface)] p-6 shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
            <PromoBox {...props} />
            <SummaryRows store={props.store} summary={props.summary} />
            {props.checkoutError && <p className="mt-5 rounded-xl bg-red-50 p-4 text-sm font-bold text-red-700 border border-red-200 shadow-sm">{props.checkoutError}</p>}
            <button
              type={props.checkoutOpen ? 'submit' : 'button'}
              form={props.checkoutOpen ? 'cod-checkout-form' : undefined}
              disabled={props.submitting || props.summary.items.length === 0}
              onClick={props.checkoutOpen ? undefined : props.openCheckout}
              className="mt-6 h-14 w-full rounded-xl bg-[var(--c-text)] text-sm font-black uppercase tracking-[0.15em] text-[var(--c-bg)] shadow-xl transition-all hover:scale-[1.02] active:scale-[0.98] disabled:transform-none disabled:cursor-wait disabled:opacity-40"
            >
              {props.checkoutOpen ? (props.submitting ? 'Placing...' : c.placeOrder) : c.checkout}
            </button>
          </div>
        )}
      </aside>
    </>
  );
}

function CartLines({ store, products, cartItems, setQuantity }: { store: Store; products: Product[]; cartItems: CartItem[]; setQuantity: (productId: string, quantity: number, variantId?: string) => void }) {
  const c = useCopy();
  if (cartItems.length === 0) return <EmptyState title={c.emptyCart} body="" />;
  return (
    <div className="space-y-5">
      {cartItems.map((item) => {
        const product = products.find((candidate) => candidate.id === item.productId);
        if (!product) return null;
        const variant = findCartVariant(product, item);
        const unitPrice = lineUnitPrice(product, variant);
        const max = lineMaxQuantity(product, variant);
        return (
          <div key={cartLineKey(item)} className="grid grid-cols-[6rem_1fr] gap-5 rounded-2xl bg-[var(--c-surface)] p-4 border border-[var(--c-line)]/30 shadow-sm transition-all hover:shadow-md group">
            {variant?.imageUrl ? (
              <img src={variant.imageUrl} alt={variant.title} className="aspect-square rounded-xl bg-[var(--c-bg)] object-cover transition-transform group-hover:scale-[1.02]" />
            ) : (
              <ProductThumb product={product} className="aspect-square rounded-xl bg-[var(--c-bg)] text-4xl overflow-hidden group-hover:scale-[1.02] transition-transform" />
            )}
            <div className="min-w-0 flex flex-col justify-between">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <Link to={`/s/${store.slug}/p/${product.id}`} className="block truncate text-base font-black hover:opacity-70 transition-opacity">{product.name}</Link>
                  {variant && <p className="mt-1 truncate text-xs font-black uppercase tracking-[0.12em] opacity-45">{variant.title}{variant.sku ? ` · ${variant.sku}` : ''}</p>}
                  <p className="mt-1 text-sm font-medium opacity-60">{money(unitPrice, store.currency)}</p>
                </div>
                <button type="button" aria-label={c.remove} className="rounded-full p-2 opacity-40 hover:opacity-100 hover:bg-[var(--c-soft)] transition-all" onClick={() => setQuantity(product.id, 0, item.variantId)}>
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="mt-4 flex items-center justify-between">
                <QuantityStepper value={item.quantity} max={max} onChange={(value) => setQuantity(product.id, value, item.variantId)} compact />
                <p className="text-base font-black">{money(unitPrice * item.quantity, store.currency)}</p>
              </div>
              {max <= 0 && <p className="mt-2 text-xs font-bold text-red-500">{c.soldOut}</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function CheckoutForm({ form, store, submitCheckout, backToCart }: { form: UseFormReturn<CheckoutValues>; store: Store; submitCheckout: (values: CheckoutValues) => void; backToCart: () => void }) {
  const c = useCopy();
  return (
    <form id="cod-checkout-form" className="space-y-6" onSubmit={form.handleSubmit(submitCheckout)}>
      <div className="rounded-2xl bg-[var(--c-soft)] p-5 border border-[var(--c-line)]/20">
        <p className="flex items-center gap-3 text-sm font-black"><ShieldCheck className="h-5 w-5" /> {c.cod}</p>
        <p className="mt-2 text-xs font-medium leading-relaxed opacity-60">The server recalculates stock, discount, GST, shipping, and total before creating the order.</p>
      </div>
      <Field form={form} name="customerName" label={c.fullName} />
      <Field form={form} name="customerPhone" label={c.phone} type="tel" placeholder="0790000000" />
      <Field form={form} name="customerEmail" label={c.emailOptional} type="email" />
      <label className="block">
        <span className="mb-2 block text-[11px] font-black uppercase tracking-[0.15em] opacity-50">{c.governorate}</span>
        <select {...form.register('governorate')} className="h-14 w-full rounded-xl border border-[var(--c-line)]/50 bg-[var(--c-surface)] px-4 text-sm font-medium transition-all focus:border-[var(--c-text)] focus:ring-1 focus:ring-[var(--c-text)] outline-none">
          {GOVERNORATES.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
        <FieldError form={form} name="governorate" />
      </label>
      <label className="block">
        <span className="mb-2 block text-[11px] font-black uppercase tracking-[0.15em] opacity-50">{c.shipping}</span>
        <select {...form.register('shippingOption')} className="h-14 w-full rounded-xl border border-[var(--c-line)]/50 bg-[var(--c-surface)] px-4 text-sm font-medium transition-all focus:border-[var(--c-text)] focus:ring-1 focus:ring-[var(--c-text)] outline-none">
          <option value={store.shipping?.type === 'PICKUP' ? 'PICKUP' : 'DELIVERY'}>{store.shipping?.type === 'PICKUP' ? 'Pickup' : 'Delivery'}</option>
        </select>
      </label>
      <Field form={form} name="address" label={c.address} />
      <label className="block">
        <span className="mb-2 block text-[11px] font-black uppercase tracking-[0.15em] opacity-50">{c.note}</span>
        <textarea {...form.register('note')} rows={3} className="w-full rounded-xl border border-[var(--c-line)]/50 bg-[var(--c-surface)] px-4 py-3 text-sm font-medium transition-all focus:border-[var(--c-text)] focus:ring-1 focus:ring-[var(--c-text)] outline-none resize-none" />
        <FieldError form={form} name="note" />
      </label>
      <button type="button" onClick={backToCart} className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.15em] opacity-50 hover:opacity-100 transition-opacity"><ArrowLeft className="h-4 w-4" /> {c.cart}</button>
    </form>
  );
}

function PromoBox(props: { checkoutOpen: boolean; promoInput: string; promoMessage?: string; setPromoInput: (value: string) => void; applyPromo: () => void; removePromo: () => void; summary: ReturnType<typeof computeOrderSummary> }) {
  const c = useCopy();
  if (!props.checkoutOpen) return null;
  return (
    <div className="mb-6">
      <div className="flex rounded-xl bg-[var(--c-surface)] p-1.5 border border-[var(--c-line)]/40 focus-within:border-[var(--c-text)] focus-within:ring-1 focus-within:ring-[var(--c-text)] transition-all">
        <input value={props.promoInput} onChange={(event) => props.setPromoInput(event.target.value.toUpperCase())} placeholder={c.promo} className="h-11 min-w-0 flex-1 rounded-lg border-0 bg-transparent px-4 text-sm font-mono font-bold uppercase focus:outline-none" />
        {props.summary.discountCode ? (
          <button type="button" onClick={props.removePromo} className="rounded-lg px-4 text-xs font-black uppercase tracking-[0.1em] hover:bg-red-50 hover:text-red-600 transition-colors">{c.remove}</button>
        ) : (
          <button type="button" onClick={props.applyPromo} className="rounded-lg bg-[var(--c-text)] px-4 text-xs font-black uppercase tracking-[0.1em] text-[var(--c-bg)] transition-transform active:scale-95">{c.apply}</button>
        )}
      </div>
      {props.promoMessage && <p className="mt-3 text-xs font-bold opacity-70 px-1">{props.promoMessage}</p>}
    </div>
  );
}

export function SummaryRows({ store, summary }: { store: Store; summary: ReturnType<typeof computeOrderSummary> }) {
  const c = useCopy();
  return (
    <div className="space-y-3 text-sm">
      <SummaryRow label={c.subtotal} value={money(summary.subtotalCents, store.currency)} />
      {summary.discountCents > 0 && <SummaryRow label={`${c.discount}${summary.discountCode ? ` (${summary.discountCode})` : ''}`} value={`-${money(summary.discountCents, store.currency)}`} />}
      <SummaryRow label={c.gst} value={money(summary.taxCents, store.currency)} />
      <SummaryRow label={c.shipping} value={summary.shippingCents === 0 ? c.free : money(summary.shippingCents, store.currency)} />
      <div className="mt-4 border-t border-[var(--c-line)]/20 pt-4">
        <SummaryRow label={c.total} value={money(summary.totalCents, store.currency)} strong />
      </div>
    </div>
  );
}

function ProductGrid({ products, store, addToCart, templateId = 'editorial' }: { products: Product[]; store: Store; addToCart: (productId: string, quantity?: number, variantId?: string) => void; templateId?: 'editorial' | 'boutique' | 'market' | 'lookbook' }) {
  return (
    <div className={cn(
      'grid grid-cols-2 gap-4 sm:gap-6',
      templateId === 'market' ? 'md:grid-cols-4 lg:grid-cols-5' : 'md:grid-cols-3 lg:grid-cols-4',
      templateId === 'lookbook' && '[&>*:first-child]:md:col-span-2',
    )}>
      {products.map((product, index) => <ProductCard key={product.id} product={product} store={store} addToCart={addToCart} templateId={templateId} featured={templateId === 'lookbook' && index === 0} />)}
    </div>
  );
}

function ProductCard({ product, store, addToCart, templateId, featured = false }: { product: Product; store: Store; addToCart: (productId: string, quantity?: number, variantId?: string) => void; templateId: 'editorial' | 'boutique' | 'market' | 'lookbook'; featured?: boolean }) {
  const c = useCopy();
  const variable = isVariableProduct(product);
  const soldOut = productStock(product) <= 0;
  const priceRange = productPriceRange(product);
  const swatches = colorValues(product);
  return (
    <article className={cn('group flex min-h-0 flex-col bg-[var(--c-surface)] border border-[var(--c-line)]/30 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-[var(--c-text)]/5', templateId === 'market' ? 'rounded-xl p-3' : 'rounded-3xl p-4')}>
      <Link to={`/s/${store.slug}/p/${product.id}`} className="relative overflow-hidden rounded-2xl bg-[var(--c-bg)]">
        <ProductThumb product={product} className={cn('w-full text-6xl transition-transform duration-500 group-hover:scale-105', featured ? 'aspect-[16/10]' : templateId === 'market' ? 'aspect-square' : 'aspect-[4/5]')} />
        {soldOut && <span className="absolute inset-x-4 top-4 rounded-xl bg-[var(--c-text)]/90 backdrop-blur-md px-3 py-2 text-center text-[10px] font-black uppercase tracking-[0.2em] text-[var(--c-bg)] shadow-md">{c.soldOut}</span>}
        {isOnSale(product) && !soldOut && <span className="absolute start-4 top-4 rounded-xl bg-red-600/90 backdrop-blur-md px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.15em] text-white shadow-md">{c.onSale}</span>}
      </Link>
      <p className="mt-4 truncate text-[10px] font-black uppercase tracking-[0.16em] opacity-45">{productCategory(product, store)}</p>
      <Link to={`/s/${store.slug}/p/${product.id}`} className={cn('mt-1 truncate font-black tracking-tight', templateId === 'market' ? 'text-sm sm:text-base' : 'text-base sm:text-lg')}>{product.name}</Link>
      {product.details?.shortDescription && <p className="mt-1 line-clamp-2 text-xs font-medium opacity-50">{product.details.shortDescription}</p>}
      <p className={cn('mt-1.5 flex flex-wrap items-baseline gap-2 font-bold opacity-70', templateId === 'market' ? 'text-xs' : 'text-sm')}>
        {variable && priceRange.min !== priceRange.max ? `From ${money(priceRange.min, store.currency)}` : money(priceRange.min, store.currency)}
      </p>
      {swatches.length > 0 && (
        <div className="mt-3 flex gap-1.5">
          {swatches.slice(0, 5).map((value) => <span key={value.id} title={value.value} className="h-4 w-4 rounded-full ring-1 ring-[var(--c-line)]" style={{ backgroundColor: value.colorHex }} />)}
        </div>
      )}
      {variable ? (
        <Link to={`/s/${store.slug}/p/${product.id}`} className={cn('mt-5 grid place-items-center rounded-xl bg-[var(--c-bg)] font-black uppercase tracking-[0.15em] border border-[var(--c-line)]/50 transition-all hover:bg-[var(--c-text)] hover:text-[var(--c-bg)] hover:shadow-lg active:scale-95', templateId === 'market' ? 'h-10 text-[10px]' : 'h-12 text-[11px]')}>
          Choose options
        </Link>
      ) : (
        <button type="button" disabled={soldOut} onClick={() => addToCart(product.id)} className={cn('mt-5 rounded-xl bg-[var(--c-bg)] font-black uppercase tracking-[0.15em] border border-[var(--c-line)]/50 transition-all hover:bg-[var(--c-text)] hover:text-[var(--c-bg)] hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-[var(--c-bg)] disabled:hover:text-[var(--c-text)] disabled:hover:shadow-none active:scale-95', templateId === 'market' ? 'h-10 text-[10px]' : 'h-12 text-[11px]')}>
          {soldOut ? c.soldOut : c.addToCart}
        </button>
      )}
    </article>
  );
}

function ProductThumb({ product, className = '' }: { product: Product; className?: string }) {
  const image = productPrimaryImage(product);
  return (
    <div className={cn('grid place-items-center overflow-hidden', className)}>
      {image ? (
        <img src={image} alt={product.name} width={700} height={875} loading="lazy" decoding="async" className="h-full w-full object-cover" />
      ) : (
        <span className="opacity-30">{product.imageEmoji || 'Bag'}</span>
      )}
    </div>
  );
}

function ProductLogo({ store, large = false }: { store: Store; large?: boolean }) {
  if (store.logoUrl) return <img src={store.logoUrl} alt={store.name} width={large ? 160 : 44} height={large ? 160 : 44} className={cn('rounded-xl object-cover shadow-sm border border-[var(--c-line)]/20', large ? 'h-40 w-40' : 'h-11 w-11')} />;
  return <span className={cn('grid place-items-center rounded-xl bg-[var(--c-surface)] shadow-sm border border-[var(--c-line)]/30', large ? 'h-40 w-40 text-7xl rounded-3xl' : 'h-11 w-11 text-2xl')}>{store.logoEmoji || 'Shop'}</span>;
}

function PriceLine({ product, currency, className }: { product: Product; currency: string; className?: string }) {
  return (
    <p className={cn('flex flex-wrap items-baseline gap-2.5', className)}>
      {isOnSale(product) && <span className="text-sm font-medium line-through opacity-40">{money(product.compareAtCents!, currency)}</span>}
      <span>{money(product.priceCents, currency)}</span>
    </p>
  );
}

function QuantityStepper({ value, max, onChange, compact = false }: { value: number; max: number; onChange: (value: number) => void; compact?: boolean }) {
  return (
    <div className={cn('inline-flex items-center rounded-xl bg-[var(--c-surface)] p-1 border border-[var(--c-line)]/40', compact ? 'h-10' : 'h-14')}>
      <button type="button" aria-label="Decrease quantity" disabled={value <= 1} onClick={() => onChange(value - 1)} className="grid h-full w-10 place-items-center rounded-lg hover:bg-[var(--c-soft)] transition-colors disabled:opacity-20 active:scale-90"><Minus className="h-4 w-4" /></button>
      <span className="w-12 text-center text-sm font-black">{value}</span>
      <button type="button" aria-label="Increase quantity" disabled={value >= max} onClick={() => onChange(value + 1)} className="grid h-full w-10 place-items-center rounded-lg hover:bg-[var(--c-soft)] transition-colors disabled:opacity-20 active:scale-90"><Plus className="h-4 w-4" /></button>
    </div>
  );
}

function Field({ form, name, label, type = 'text', placeholder }: { form: UseFormReturn<CheckoutValues>; name: FieldPath<CheckoutValues>; label: string; type?: string; placeholder?: string }) {
  return (
    <label className="block">
      <span className="mb-2 block text-[11px] font-black uppercase tracking-[0.15em] opacity-50">{label}</span>
      <input type={type} placeholder={placeholder} {...form.register(name)} className="h-14 w-full rounded-xl border border-[var(--c-line)]/50 bg-[var(--c-surface)] px-4 text-sm font-medium transition-all focus:border-[var(--c-text)] focus:ring-1 focus:ring-[var(--c-text)] outline-none placeholder:opacity-30" />
      <FieldError form={form} name={name} />
    </label>
  );
}

function FieldError({ form, name }: { form: UseFormReturn<CheckoutValues>; name: FieldPath<CheckoutValues> }) {
  const error = form.formState.errors[name]?.message;
  return error ? <span className="mt-2 block text-[11px] font-bold text-red-500">{String(error)}</span> : null;
}

function SummaryRow({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={cn('flex items-center justify-between gap-4', strong && 'text-lg font-black tracking-tight')}>
      <span className="font-medium opacity-60">{label}</span>
      <span className={cn('font-black', !strong && 'opacity-80')}>{value}</span>
    </div>
  );
}

function InvoiceRow({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return <div className={cn('flex justify-between gap-4', strong && 'text-lg font-black text-neutral-900')}><span className="text-neutral-500">{label}</span><span className="font-bold text-neutral-800">{value}</span></div>;
}

function InvoiceBlock({ title, lines }: { title: string; lines: string[] }) {
  return (
    <div>
      <h3 className="mb-3 text-xs font-black uppercase tracking-[0.2em] text-neutral-400">{title}</h3>
      <div className="space-y-1">
        {lines.map((line) => <p key={line} className="text-sm font-medium text-neutral-700">{line}</p>)}
      </div>
    </div>
  );
}

function Toggle({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button type="button" aria-pressed={active} onClick={onClick} className={cn('rounded-xl px-5 py-2.5 text-[11px] font-black uppercase tracking-[0.15em] border transition-all active:scale-95', active ? 'border-[var(--c-text)] bg-[var(--c-text)] text-[var(--c-bg)] shadow-md' : 'border-[var(--c-line)]/50 bg-[var(--c-surface)] opacity-60 hover:opacity-100')}>
      {label}
    </button>
  );
}

function SectionHeading({ title }: { title: string }) {
  return <h2 className="mb-8 text-4xl font-black tracking-tighter sm:text-5xl">{title}</h2>;
}

function Feature({ icon, text }: { icon: React.ReactNode; text: string }) {
  return <div className="flex items-center gap-4 rounded-2xl bg-[var(--c-surface)] p-5 text-sm font-bold border border-[var(--c-line)]/30 shadow-sm">{React.cloneElement(icon as React.ReactElement<{ className?: string }>, { className: 'h-6 w-6 opacity-70' })}<span>{text}</span></div>;
}

function EmptyState({ title, body, action }: { title: string; body: string; action?: React.ReactNode }) {
  return (
    <div className="rounded-3xl bg-[var(--c-surface)] p-12 text-center border border-[var(--c-line)]/30 shadow-sm">
      <AlertCircle className="mx-auto mb-6 h-12 w-12 opacity-20" />
      <h3 className="text-3xl font-black tracking-tight">{title}</h3>
      {body && <p className="mx-auto mt-3 max-w-md text-sm font-medium opacity-50">{body}</p>}
      {action && <div className="mt-8">{action}</div>}
    </div>
  );
}

function StorefrontSkeleton() {
  return (
    <div className="min-h-screen animate-pulse bg-neutral-50/50">
      <div className="h-24 bg-white/60 border-b border-black/5" />
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mb-16 h-96 rounded-3xl bg-black/5" />
        <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => <div key={index} className="h-72 rounded-3xl bg-black/5" />)}
        </div>
      </div>
    </div>
  );
}

function Unavailable({ title, body, actionLabel, onAction }: { title: string; body: string; actionLabel?: string; onAction?: () => void }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 p-6 text-neutral-950">
      <div className="w-full max-w-md rounded-3xl bg-white p-10 text-center shadow-xl border border-black/5">
        <AlertCircle className="mx-auto mb-6 h-12 w-12 text-neutral-300" />
        <h1 className="text-4xl font-black tracking-tight">{title}</h1>
        <p className="mt-4 text-sm font-medium leading-relaxed text-neutral-500">{body}</p>
        <div className="mt-8 flex flex-col gap-3">
          {onAction && <button type="button" onClick={onAction} className="h-14 rounded-xl bg-black text-sm font-black text-white transition-transform active:scale-95 shadow-xl">{actionLabel}</button>}
          <Link to="/" className="inline-flex h-14 items-center justify-center rounded-xl bg-neutral-100 text-sm font-bold transition-colors hover:bg-neutral-200">Home</Link>
        </div>
      </div>
    </div>
  );
}

function OfflineBanner({ message }: { message: string }) {
  return <div className="fixed inset-x-0 top-0 z-[120] bg-yellow-400 px-4 py-3 text-center text-[11px] font-black uppercase tracking-[0.15em] text-yellow-950 shadow-md">{message}</div>;
}

function shippingPolicyText(store: Store) {
  const shipping = store.shipping;
  if (!shipping || shipping.type === 'FLAT') return `Delivery is available across Jordan. Shipping is ${money(shipping?.flatCents ?? 0, store.currency)} and Cash on Delivery is supported.`;
  if (shipping.type === 'FREE_OVER') return `Delivery is ${money(shipping.flatCents ?? 0, store.currency)} and becomes free over ${money(shipping.freeOverCents ?? 0, store.currency)}. Cash on Delivery is supported.`;
  return 'Pickup is available. Cash on Delivery is supported when the order is handed over.';
}

function useDebouncedValue<T>(value: T, delay: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

export function LazyStorefrontRoot() {
  return (
    <Suspense fallback={<StorefrontSkeleton />}>
      <StorefrontRoot />
    </Suspense>
  );
}
