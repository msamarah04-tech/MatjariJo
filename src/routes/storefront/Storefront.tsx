import React, { Component, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Link, Route, Routes, useNavigate, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { useForm, type FieldPath, type UseFormReturn } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  Instagram,
  Menu,
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
    featured: 'Featured',
    allProducts: 'All products',
    addToCart: 'Add to cart',
    soldOut: 'Sold out',
    related: 'You may also like',
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
    shopNow: 'Shop now',
    viewAll: 'View all →',
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
    featured: 'مختارة',
    allProducts: 'كل المنتجات',
    addToCart: 'أضف إلى السلة',
    soldOut: 'نفدت الكمية',
    related: 'قد يعجبك أيضاً',
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
    shopNow: 'تسوق الآن',
    viewAll: 'عرض الكل ←',
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

function getCtaClass(style?: string): string {
  const base = 'inline-flex h-11 w-full items-center justify-center text-[11px] font-black uppercase tracking-[0.12em] transition-all duration-200 active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed';
  if (style === 'outline') {
    return `${base} rounded-[var(--c-radius)] border-2 border-[var(--c-text)] text-[var(--c-text)] hover:bg-[var(--c-text)] hover:text-[var(--c-bg)]`;
  }
  if (style === 'pill') {
    return `${base} rounded-full bg-[var(--c-primary)] text-white hover:opacity-85 shadow-sm`;
  }
  return `${base} rounded-[var(--c-radius)] bg-[var(--c-text)] text-[var(--c-bg)] hover:opacity-80`;
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
          <div className="w-full max-w-md rounded-2xl bg-white p-10 text-center shadow-xl border border-black/5">
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [appliedCode, setAppliedCode] = useState<string>();
  const [promoInput, setPromoInput] = useState('');
  const [promoMessage, setPromoMessage] = useState<string>();
  const [liveMessage, setLiveMessage] = useState('');
  const [checkoutError, setCheckoutError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const idempotencyRef = useRef('');
  const queryClient = useQueryClient();
  const overrides = store.themeOverrides as Record<string, string> | null | undefined;

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
    if (!drawerOpen && !mobileMenuOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setDrawerOpen(false); setMobileMenuOpen(false); }
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKey);
    };
  }, [drawerOpen, mobileMenuOpen]);

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

  const hasSocial = overrides?.instagram || overrides?.whatsapp || overrides?.tiktok;

  return (
    <div className="min-h-screen bg-[var(--c-bg)] text-[var(--c-text)] selection:bg-[var(--c-text)] selection:text-[var(--c-bg)]" dir={dir} style={themeVars}>
      <div aria-live="polite" className="sr-only">{liveMessage}</div>

      {/* Announcement bar */}
      {store.announcement && announcement && (
        <div className="relative z-50 flex min-h-10 items-center justify-center bg-[var(--c-primary)] px-10 py-2.5 text-center text-[11px] font-bold uppercase tracking-[0.18em] text-white">
          <span>{store.announcement}</span>
          <button type="button" aria-label="Dismiss" className="absolute end-3 rounded-full p-1.5 opacity-70 hover:opacity-100 transition-opacity" onClick={() => setAnnouncement(false)}>
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Header */}
      <header className="sticky top-0 z-40 bg-[var(--c-bg)]/90 backdrop-blur-xl border-b border-[var(--c-line)]/40 transition-all duration-300">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6 lg:px-8">
          {/* Logo + Name */}
          <Link to={`/s/${store.slug}`} className="flex min-w-0 items-center gap-3 group shrink-0">
            <ProductLogo store={store} />
            <span className="hidden sm:block truncate text-base font-black tracking-tight group-hover:opacity-70 transition-opacity" style={{ fontFamily: theme.hero }}>
              {store.name}
            </span>
          </Link>

          {/* Center nav */}
          <nav className="hidden md:flex flex-1 items-center justify-center gap-8 text-[11px] font-bold uppercase tracking-[0.14em]">
            <Link to={`/s/${store.slug}`} className="opacity-50 hover:opacity-100 transition-opacity">{c.shop}</Link>
            <Link to={`/s/${store.slug}/about`} className="opacity-50 hover:opacity-100 transition-opacity">{c.about}</Link>
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-2 ms-auto">
            <LanguageToggle className="border-[var(--c-line)]/50 bg-[var(--c-surface)] text-[var(--c-text)] hover:bg-[var(--c-soft)] rounded-lg transition-colors text-xs h-8 px-2" />
            <button
              type="button"
              aria-label={`${c.cart}: ${cartCount}`}
              className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--c-surface)] border border-[var(--c-line)]/40 hover:bg-[var(--c-soft)] transition-all active:scale-95"
              onClick={() => setDrawerOpen(true)}
            >
              <ShoppingBag className="h-4.5 w-4.5" />
              {cartCount > 0 && (
                <span className="absolute -end-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--c-text)] px-1 text-[10px] font-black text-[var(--c-bg)] shadow">
                  {cartCount}
                </span>
              )}
            </button>
            {/* Mobile menu toggle */}
            <button
              type="button"
              aria-label="Menu"
              className="md:hidden flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--c-surface)] border border-[var(--c-line)]/40 hover:bg-[var(--c-soft)] transition-all"
              onClick={() => setMobileMenuOpen(true)}
            >
              <Menu className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile nav drawer */}
      {mobileMenuOpen && (
        <>
          <div className="fixed inset-0 z-[90] bg-black/40 backdrop-blur-sm md:hidden" onClick={() => setMobileMenuOpen(false)} />
          <div className="fixed inset-y-0 end-0 z-[91] w-72 bg-[var(--c-bg)] shadow-2xl flex flex-col md:hidden" role="dialog" aria-modal="true">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--c-line)]/30">
              <span className="font-black tracking-tight" style={{ fontFamily: theme.hero }}>{store.name}</span>
              <button type="button" onClick={() => setMobileMenuOpen(false)} className="rounded-full p-2 hover:bg-[var(--c-soft)] transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="flex flex-col p-4 gap-1 text-sm font-bold">
              <Link to={`/s/${store.slug}`} onClick={() => setMobileMenuOpen(false)} className="px-4 py-3 rounded-xl hover:bg-[var(--c-soft)] transition-colors">{c.shop}</Link>
              <Link to={`/s/${store.slug}/about`} onClick={() => setMobileMenuOpen(false)} className="px-4 py-3 rounded-xl hover:bg-[var(--c-soft)] transition-colors">{c.about}</Link>
              <button type="button" onClick={() => { setMobileMenuOpen(false); setDrawerOpen(true); }} className="flex items-center justify-between px-4 py-3 rounded-xl hover:bg-[var(--c-soft)] transition-colors text-start">
                <span>{c.cart}</span>
                {cartCount > 0 && <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--c-text)] px-1 text-[10px] font-black text-[var(--c-bg)]">{cartCount}</span>}
              </button>
            </nav>
          </div>
        </>
      )}

      <main>
        <Routes>
          <Route path="/" element={<HomePage store={store} products={products} addToCart={addToCart} />} />
          <Route path="/p/:productId" element={<ProductDetail store={store} products={products} addToCart={addToCart} />} />
          <Route path="/about" element={<AboutPage store={store} />} />
          <Route path="/cart" element={<CartPage store={store} products={products} cartItems={cartItems} summary={summary} setQuantity={setQuantity} openCheckout={beginCheckout} />} />
          <Route path="/order/:orderId" element={<OrderConfirmation store={store} />} />
        </Routes>
      </main>

      {/* Footer */}
      <footer className="border-t border-[var(--c-line)]/30 bg-[var(--c-surface)] mt-8">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div>
              <p className="text-lg font-black tracking-tight" style={{ fontFamily: theme.hero }}>{store.name}</p>
              {store.tagline && <p className="mt-1 text-sm font-medium opacity-50">{store.tagline}</p>}
            </div>
            {hasSocial && (
              <div className="flex items-center gap-3">
                {overrides?.instagram && (
                  <a href={overrides.instagram.startsWith('http') ? overrides.instagram : `https://instagram.com/${overrides.instagram.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--c-soft)] hover:bg-[var(--c-line)]/40 transition-colors opacity-60 hover:opacity-100">
                    <Instagram className="h-4 w-4" />
                  </a>
                )}
                {overrides?.whatsapp && (
                  <a href={`https://wa.me/${overrides.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--c-soft)] hover:bg-[var(--c-line)]/40 transition-colors opacity-60 hover:opacity-100" aria-label="WhatsApp">
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
                  </a>
                )}
                {overrides?.tiktok && (
                  <a href={overrides.tiktok.startsWith('http') ? overrides.tiktok : `https://tiktok.com/@${overrides.tiktok.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--c-soft)] hover:bg-[var(--c-line)]/40 transition-colors opacity-60 hover:opacity-100" aria-label="TikTok">
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.3 6.3 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.16 8.16 0 004.77 1.52V6.76a4.85 4.85 0 01-1-.07z"/></svg>
                  </a>
                )}
              </div>
            )}
          </div>
          <div className="mt-8 border-t border-[var(--c-line)]/20 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] font-bold uppercase tracking-[0.18em] opacity-35">
            <nav className="flex gap-6">
              <Link to={`/s/${store.slug}`} className="hover:opacity-100 transition-opacity">{c.shop}</Link>
              <Link to={`/s/${store.slug}/about`} className="hover:opacity-100 transition-opacity">{c.about}</Link>
            </nav>
            <span>{store.name} · {c.powered}</span>
          </div>
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

  const featuredProduct = featured[0] || products[0];

  return (
    <>
      {/* ── EDITORIAL ────────────────────────────────────────────────── */}
      {template.id === 'editorial' && (
        <section className="relative overflow-hidden bg-[var(--c-surface)] border-b border-[var(--c-line)]/20">
          <div className="mx-auto grid min-h-[78vh] max-w-7xl items-center gap-8 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:gap-16 lg:px-8 lg:py-20">
            <div className="z-10 flex flex-col justify-center">
              <span className="mb-6 w-fit rounded-full bg-[var(--c-soft)] px-4 py-1.5 text-[11px] font-black uppercase tracking-[0.2em] border border-[var(--c-line)]/40">
                {store.category}
              </span>
              <h1 className="text-5xl font-black leading-[1.02] tracking-tighter sm:text-6xl lg:text-7xl xl:text-8xl" style={{ fontFamily: theme.hero }}>
                {store.tagline || store.name}
              </h1>
              <div className="mt-8 flex flex-wrap gap-3 text-[11px] font-bold uppercase tracking-[0.14em] opacity-55">
                <span className="inline-flex items-center gap-2 bg-[var(--c-bg)] border border-[var(--c-line)]/40 px-4 py-2 rounded-full"><Truck className="h-3.5 w-3.5" /> Jordan delivery</span>
                <span className="inline-flex items-center gap-2 bg-[var(--c-bg)] border border-[var(--c-line)]/40 px-4 py-2 rounded-full"><ShieldCheck className="h-3.5 w-3.5" /> {c.cod}</span>
              </div>
              <div className="mt-10 flex gap-3">
                <a href="#all-products" className={cn(getCtaClass((store.themeOverrides as Record<string,string>)?.buttonStyle), 'w-auto px-8 no-underline')}>
                  {c.shopNow}
                </a>
                {store.about && (
                  <Link to={`/s/${store.slug}/about`} className="inline-flex h-11 items-center gap-2 px-6 text-[11px] font-black uppercase tracking-[0.12em] opacity-50 hover:opacity-100 transition-opacity">
                    {c.about}
                  </Link>
                )}
              </div>
            </div>
            <div className="relative">
              <div className="aspect-[4/5] overflow-hidden rounded-2xl bg-[var(--c-soft)] shadow-2xl shadow-[var(--c-text)]/8 border border-[var(--c-line)]/20">
                {featuredProduct ? (
                  <Link to={`/s/${store.slug}/p/${featuredProduct.id}`}>
                    <ProductThumb product={featuredProduct} className="h-full w-full" />
                  </Link>
                ) : (
                  <div className="h-full w-full flex items-center justify-center">
                    <ProductLogo store={store} large />
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── BOUTIQUE ─────────────────────────────────────────────────── */}
      {template.id === 'boutique' && (
        <section className="overflow-hidden border-b border-[var(--c-line)]/20">
          <div className="mx-auto grid max-w-7xl lg:grid-cols-2">
            <div className="flex flex-col justify-center px-6 py-16 sm:px-10 lg:px-14 lg:py-24">
              <span className="mb-5 w-fit rounded-sm bg-[var(--c-soft)] px-3 py-1 text-[11px] font-black uppercase tracking-[0.2em]">{store.category}</span>
              <h1 className="text-5xl font-black leading-[1.03] tracking-tighter sm:text-6xl lg:text-7xl" style={{ fontFamily: theme.hero }}>
                {store.tagline || store.name}
              </h1>
              <p className="mt-5 max-w-sm text-base font-medium leading-relaxed opacity-55">
                {store.name} — curated collection, delivered across Jordan.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <a href="#all-products" className={cn(getCtaClass((store.themeOverrides as Record<string,string>)?.buttonStyle), 'w-auto px-8 no-underline')}>
                  {c.shopNow}
                </a>
              </div>
              <div className="mt-8 flex flex-wrap gap-4 text-[11px] font-bold uppercase tracking-[0.14em] opacity-50">
                <span className="inline-flex items-center gap-2"><Truck className="h-3.5 w-3.5" /> Jordan delivery</span>
                <span className="inline-flex items-center gap-2"><ShieldCheck className="h-3.5 w-3.5" /> {c.cod}</span>
              </div>
            </div>
            <div className={cn('relative min-h-[55vw] overflow-hidden bg-[var(--c-soft)] lg:min-h-[600px]', !featuredProduct && 'flex items-center justify-center')}>
              {featuredProduct ? (
                <Link to={`/s/${store.slug}/p/${featuredProduct.id}`} className="absolute inset-0">
                  <ProductThumb product={featuredProduct} className="h-full w-full object-cover" />
                </Link>
              ) : (
                <ProductLogo store={store} large />
              )}
            </div>
          </div>
        </section>
      )}

      {/* ── MARKET ───────────────────────────────────────────────────── */}
      {template.id === 'market' && (
        <section className="border-b border-[var(--c-line)]/20 bg-[var(--c-surface)]">
          <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-3xl font-black tracking-tight sm:text-4xl" style={{ fontFamily: theme.hero }}>{store.name}</h1>
                <p className="mt-1 text-sm font-medium opacity-50">{store.tagline}</p>
              </div>
              <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] opacity-50">
                <span className="inline-flex items-center gap-1.5"><Truck className="h-3 w-3" /> Jordan delivery</span>
                <span className="opacity-30">·</span>
                <span className="inline-flex items-center gap-1.5"><ShieldCheck className="h-3 w-3" /> {c.cod}</span>
              </div>
            </div>
            {collections.length > 1 && (
              <div className="mt-5 flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                {collections.slice(0, 10).map((col) => (
                  <button
                    key={col}
                    type="button"
                    onClick={() => setCollection(col)}
                    className={cn(
                      'shrink-0 rounded-full px-4 py-1.5 text-xs font-bold transition-all',
                      collection === col
                        ? 'bg-[var(--c-text)] text-[var(--c-bg)] shadow-sm'
                        : 'bg-[var(--c-bg)] border border-[var(--c-line)]/40 hover:border-[var(--c-text)]/40'
                    )}
                  >
                    {col}
                  </button>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* ── LOOKBOOK ─────────────────────────────────────────────────── */}
      {template.id === 'lookbook' && (
        <section className="relative overflow-hidden border-b border-[var(--c-line)]/20 min-h-[65vh] flex items-end">
          <div className="absolute inset-0 bg-[var(--c-soft)]">
            {featuredProduct && productPrimaryImage(featuredProduct) && (
              <img
                src={productPrimaryImage(featuredProduct)!}
                alt={featuredProduct.name}
                className="h-full w-full object-cover opacity-70"
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
          </div>
          <div className="relative z-10 mx-auto w-full max-w-7xl px-6 pb-14 sm:px-8 lg:pb-20 lg:px-12">
            <span className="mb-4 inline-block rounded-full bg-white/20 backdrop-blur-md px-4 py-1.5 text-[11px] font-black uppercase tracking-[0.2em] text-white border border-white/20">
              {store.category}
            </span>
            <h1 className="max-w-3xl text-5xl font-black leading-[1.02] tracking-tighter text-white sm:text-6xl lg:text-7xl" style={{ fontFamily: theme.hero }}>
              {store.tagline || store.name}
            </h1>
            <div className="mt-8 flex gap-3">
              <a href="#all-products" className="inline-flex h-11 w-auto items-center justify-center rounded-full bg-white px-8 text-[11px] font-black uppercase tracking-[0.12em] text-black transition-all hover:opacity-90 active:scale-[0.97] no-underline">
                {c.shopNow}
              </a>
            </div>
          </div>
        </section>
      )}

      {/* Featured products (editorial + boutique + lookbook show this) */}
      {featured.length > 0 && template.id !== 'market' && (
        <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-4 mb-8">
            <h2 className="text-2xl font-black tracking-tight sm:text-3xl">{c.featured}</h2>
            <a href="#all-products" className="text-[11px] font-bold uppercase tracking-[0.14em] opacity-50 hover:opacity-100 transition-opacity">{c.viewAll}</a>
          </div>
          <ProductGrid products={featured} store={store} addToCart={addToCart} templateId={template.id} />
        </section>
      )}

      {/* All products */}
      <section id="all-products" className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        {template.id !== 'market' && <h2 className="mb-8 text-2xl font-black tracking-tight sm:text-3xl">{c.allProducts}</h2>}

        {/* Filter bar */}
        <div className="mb-8 rounded-2xl bg-[var(--c-surface)] p-3 shadow-sm border border-[var(--c-line)]/30">
          <div className="flex flex-col gap-3 sm:flex-row">
            <label className="relative flex-1">
              <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 opacity-35" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={c.search}
                className="h-10 w-full rounded-xl border border-[var(--c-line)]/40 bg-[var(--c-bg)] ps-9 pe-4 text-sm font-medium transition-all focus:border-[var(--c-text)]/50 focus:ring-1 focus:ring-[var(--c-text)]/30 outline-none"
              />
            </label>
            <label className="relative">
              <select
                value={collection}
                onChange={(e) => setCollection(e.target.value)}
                className="h-10 appearance-none rounded-xl border border-[var(--c-line)]/40 bg-[var(--c-bg)] ps-3 pe-9 text-sm font-medium transition-all focus:border-[var(--c-text)]/50 focus:ring-1 focus:ring-[var(--c-text)]/30 outline-none min-w-[10rem]"
              >
                {collections.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
              <ChevronDown className="pointer-events-none absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 opacity-35" />
            </label>
            <label className="relative">
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as SortMode)}
                className="h-10 appearance-none rounded-xl border border-[var(--c-line)]/40 bg-[var(--c-bg)] ps-3 pe-9 text-sm font-medium transition-all focus:border-[var(--c-text)]/50 focus:ring-1 focus:ring-[var(--c-text)]/30 outline-none min-w-[10rem]"
              >
                <option value="newest">{c.newest}</option>
                <option value="price-asc">{c.priceLow}</option>
                <option value="price-desc">{c.priceHigh}</option>
                <option value="name">{c.name}</option>
              </select>
              <SlidersHorizontal className="pointer-events-none absolute end-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 opacity-35" />
            </label>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <FilterChip active={inStockOnly} onClick={() => setInStockOnly((v) => !v)} label={c.inStock} />
            <FilterChip active={onSaleOnly} onClick={() => setOnSaleOnly((v) => !v)} label={c.onSale} />
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
              <div className="mt-12 text-center">
                <button
                  type="button"
                  className="rounded-xl bg-[var(--c-surface)] border border-[var(--c-line)]/40 px-8 py-3.5 text-xs font-black uppercase tracking-[0.15em] hover:bg-[var(--c-soft)] transition-all active:scale-95"
                  onClick={() => setPage((v) => v + 1)}
                >
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

  if (!product) return <EmptyState title="Product not found" body="" action={<Link className={cn(getCtaClass((store.themeOverrides as Record<string,string>)?.buttonStyle), 'w-auto px-6')} to={`/s/${store.slug}`}>Back to shop</Link>} />;

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
  const categoryRows = categoryDetailRows(details.categoryKey, details.attributes, lang);
  const detailRows = categoryRows.length > 0 ? categoryRows : specRows;

  return (
    <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      {/* Breadcrumb */}
      <div className="mb-8 flex items-center gap-2.5 text-[11px] font-bold uppercase tracking-[0.14em] opacity-40">
        <Link to={`/s/${store.slug}`} className="hover:opacity-100 transition-opacity">{c.shop}</Link>
        <span>/</span>
        <span>{collection}</span>
      </div>

      <div className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
        <ProductImageGallery product={product} activeImage={displayImage} />
        <div className="flex flex-col justify-start lg:pt-4">
          <p className="mb-3 text-[11px] font-black uppercase tracking-[0.18em] opacity-40">{productCategory(product, store)}</p>
          <h1 className="text-4xl font-black leading-tight tracking-tighter sm:text-5xl md:text-6xl" style={{ fontFamily: theme.hero }}>{product.name}</h1>
          {details.subtitle && <p className="mt-4 text-lg font-bold opacity-55">{details.subtitle}</p>}

          <div className="my-7 flex flex-wrap items-baseline gap-3 text-3xl font-black tracking-tight">
            {displayCompareAt && displayCompareAt > displayPrice && (
              <span className="text-lg font-bold line-through opacity-35">{money(displayCompareAt, store.currency)}</span>
            )}
            <span>{money(displayPrice, store.currency)}</span>
            {isOnSale(product) && (
              <span className="text-sm font-black text-red-600 bg-red-50 px-2.5 py-1 rounded-full">Sale</span>
            )}
          </div>

          {details.shortDescription && <p className="mb-4 text-lg font-bold leading-relaxed">{details.shortDescription}</p>}
          <p className="mb-6 whitespace-pre-line text-base font-medium leading-relaxed opacity-55">{product.description}</p>

          {(product.tags || []).length > 0 && (
            <div className="mb-8 flex flex-wrap gap-2">
              {product.tags!.map((tag) => (
                <span key={tag} className="rounded-lg bg-[var(--c-soft)] px-3 py-1 text-[11px] font-black uppercase tracking-[0.12em] border border-[var(--c-line)]/30">{tag}</span>
              ))}
            </div>
          )}

          {variable && (
            <ProductOptionSelector product={product} selections={selections} setSelections={setSelections} />
          )}

          <div className="rounded-2xl bg-[var(--c-surface)] p-5 shadow-sm border border-[var(--c-line)]/25 mb-6">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-[0.15em] opacity-45">Quantity</span>
              {displayStock <= 5 && displayStock > 0 && (
                <span className="text-[11px] font-bold text-orange-600 bg-orange-50 px-2.5 py-1 rounded-full">Only {displayStock} left</span>
              )}
              {displayStock <= 0 && (
                <span className="text-[11px] font-bold text-red-600 bg-red-50 px-2.5 py-1 rounded-full">Out of stock</span>
              )}
            </div>
            {variable && (
              <p className="mb-4 text-sm font-bold opacity-55">
                {chosenVariant ? `Selected: ${chosenVariant.title}` : `Choose ${options.filter((o) => !selections[o.name]).map((o) => o.name.toLowerCase()).join(', ')}`}
              </p>
            )}
            <div className="flex flex-col gap-3 sm:flex-row">
              <QuantityStepper value={quantity} max={Math.max(displayStock, 1)} onChange={setQuantity} />
              <button
                type="button"
                disabled={displayStock <= 0 || (variable && !chosenVariant)}
                className={cn(getCtaClass((store.themeOverrides as Record<string,string>)?.buttonStyle), 'flex-1 h-12 shadow-md disabled:opacity-40')}
                onClick={() => addToCart(product.id, quantity, chosenVariant?.id)}
              >
                {displayStock <= 0 ? c.soldOut : variable && !chosenVariant ? 'Choose options' : c.addToCart}
              </button>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex items-center gap-3 rounded-xl bg-[var(--c-surface)] p-4 text-sm font-bold border border-[var(--c-line)]/25">
              <Truck className="h-5 w-5 opacity-60 shrink-0" />
              <span>Jordan delivery</span>
            </div>
            <div className="flex items-center gap-3 rounded-xl bg-[var(--c-surface)] p-4 text-sm font-bold border border-[var(--c-line)]/25">
              <ShieldCheck className="h-5 w-5 opacity-60 shrink-0" />
              <span>{c.cod}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Product details grid */}
      {(detailRows.length > 0 || (details.highlights || []).length > 0 || (details.specifications || []).length > 0) && (
        <section className="mt-14 grid gap-4 lg:grid-cols-3">
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
      )}

      {related.length > 0 && (
        <section className="mt-20 border-t border-[var(--c-line)]/20 pt-14">
          <h2 className="mb-8 text-2xl font-black tracking-tight sm:text-3xl">{c.related}</h2>
          <ProductGrid products={related} store={store} addToCart={addToCart} templateId={template.id} />
        </section>
      )}
    </section>
  );
}

function ProductImageGallery({ product, activeImage }: { product: Product; activeImage?: string }) {
  const images = productImages(product);
  const [selected, setSelected] = useState<string | undefined>(activeImage);
  const main = selected || activeImage || images[0]?.url;

  useEffect(() => { setSelected(activeImage); }, [activeImage]);

  return (
    <div className="lg:sticky lg:top-24 space-y-3">
      <div className="aspect-square w-full overflow-hidden rounded-2xl border border-[var(--c-line)]/20 bg-[var(--c-surface)] shadow-xl shadow-black/5">
        {main
          ? <img src={main} alt={product.name} className="h-full w-full object-cover" />
          : <div className="h-full w-full flex items-center justify-center text-7xl opacity-25">{product.imageEmoji || '📦'}</div>
        }
      </div>
      {images.length > 1 && (
        <div className="grid grid-cols-5 gap-2">
          {images.slice(0, 5).map((image) => (
            <button
              key={image.id}
              type="button"
              onClick={() => setSelected(image.url)}
              className={cn('aspect-square overflow-hidden rounded-xl border-2 bg-[var(--c-surface)] transition-all', image.url === main ? 'border-[var(--c-text)] shadow-sm' : 'border-[var(--c-line)]/30 hover:border-[var(--c-text)]/50')}
            >
              <img src={image.url} alt={image.altText || product.name} className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ProductOptionSelector({ product, selections, setSelections }: { product: Product; selections: Record<string, string>; setSelections: React.Dispatch<React.SetStateAction<Record<string, string>>> }) {
  const options = productOptions(product);
  return (
    <div className="mb-6 space-y-5">
      {options.map((option) => {
        const isColor = /colou?r/i.test(option.name);
        return (
          <div key={option.id}>
            <div className="mb-2.5 flex items-center justify-between gap-3">
              <p className="text-[11px] font-black uppercase tracking-[0.15em] opacity-45">Choose {option.name.toLowerCase()}</p>
              {selections[option.name] && <p className="text-xs font-bold opacity-55">{selections[option.name]}</p>}
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
                      'min-h-10 rounded-xl border px-4 text-sm font-black transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-30',
                      selected ? 'border-[var(--c-text)] bg-[var(--c-text)] text-[var(--c-bg)] shadow-sm' : 'border-[var(--c-line