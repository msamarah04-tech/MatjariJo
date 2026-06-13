import React, { Component, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Link, Route, Routes, useNavigate, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { useForm, type FieldPath, type UseFormReturn } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
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
import type { HeroSlide } from '@shared/contract';
import { categoryDetailRows } from '@/lib/productCategory';
import { mainSiteUrl } from '@/lib/tenant';

type CartItem = { productId: string; variantId?: string; quantity: number };
type SortMode = 'newest' | 'price-asc' | 'price-desc' | 'name';
type TemplateId = 'editorial' | 'boutique' | 'market' | 'lookbook';

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
  customerEmail: z.string().trim().email('Enter a valid email.'),
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
    quickAdd: 'Quick add',
    soldOut: 'Sold out',
    onlyLeft: 'Only {n} left',
    related: 'You may also like',
    aboutTitle: 'About this store',
    shippingReturns: 'Shipping and returns',
    emptyCart: 'Your cart is empty',
    emptyCartHint: 'Browse the shop and add something you love.',
    from: 'From',
    loadMore: 'Load more',
    placingOrder: 'Placing order…',
    chooseVariant: 'Choose',
    productNotFound: 'Product not found',
    subtotal: 'Subtotal',
    discount: 'Discount',
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
    emailOptional: 'Email (for your order updates and invoice)',
    phone: 'Jordan mobile',
    governorate: 'Governorate',
    address: 'Street, building, area',
    note: 'Order note (optional)',
    cod: 'Cash on Delivery',
    confirmed: 'Order confirmed',
    reference: 'Reference',
    invoice: 'Invoice',
    print: 'Print invoice',
    continueShopping: 'Continue shopping',
    offline: 'You appear to be offline. Existing content stays available; retry when connection returns.',
    cartUpdated: 'Cart updated with current stock.',
    powered: 'Powered by Matjari',
    shopNow: 'Shop now',
    viewAll: 'View all',
    products: 'products',
    jordanDelivery: 'Jordan delivery',
    freeShipUnlocked: 'Free delivery unlocked',
    freeShipRemaining: 'Add {amount} more for free delivery',
    chooseOptions: 'Choose options',
    quantity: 'Quantity',
    backToShop: 'Back to shop',
    location: 'Location',
    sale: 'Sale',
    newArrival: 'New',
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
    quickAdd: 'إضافة سريعة',
    soldOut: 'نفدت الكمية',
    onlyLeft: 'تبقى {n} فقط',
    related: 'قد يعجبك أيضاً',
    aboutTitle: 'عن هذا المتجر',
    shippingReturns: 'الشحن والإرجاع',
    emptyCart: 'سلتك فارغة',
    emptyCartHint: 'تصفح المتجر وأضف ما يعجبك.',
    subtotal: 'المجموع الفرعي',
    discount: 'الخصم',
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
    emailOptional: 'البريد الإلكتروني (لتحديثات طلبك والفاتورة)',
    phone: 'رقم الموبايل الأردني',
    governorate: 'المحافظة',
    address: 'الشارع، المبنى، المنطقة',
    note: 'ملاحظة للطلب (اختياري)',
    cod: 'الدفع عند الاستلام',
    confirmed: 'تم تأكيد الطلب',
    reference: 'المرجع',
    invoice: 'فاتورة',
    print: 'طباعة الفاتورة',
    continueShopping: 'متابعة التسوق',
    offline: 'يبدو أنك غير متصل. سيبقى المحتوى الحالي متاحا وأعد المحاولة عند عودة الاتصال.',
    cartUpdated: 'تم تحديث السلة حسب المخزون الحالي.',
    powered: 'مشغل بواسطة متجري الأردن',
    shopNow: 'تسوق الآن',
    viewAll: 'عرض الكل',
    products: 'منتجات',
    jordanDelivery: 'توصيل داخل الأردن',
    freeShipUnlocked: 'حصلت على توصيل مجاني',
    freeShipRemaining: 'أضف {amount} للحصول على توصيل مجاني',
    chooseOptions: 'اختر الخيارات',
    quantity: 'الكمية',
    backToShop: 'العودة للمتجر',
    location: 'الموقع',
    sale: 'تخفيض',
    newArrival: 'جديد',
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

function salePercent(product: Product) {
  if (!isOnSale(product)) return 0;
  return Math.round((1 - product.priceCents / product.compareAtCents!) * 100);
}

function getCtaClass(style?: string): string {
  const base = 'inline-flex h-11 w-full items-center justify-center gap-2 text-[11px] font-black uppercase tracking-[0.12em] transition-all duration-200 active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed';
  if (style === 'outline') {
    return `${base} rounded-[var(--c-radius)] border-2 border-[var(--c-text)] text-[var(--c-text)] hover:bg-[var(--c-text)] hover:text-[var(--c-bg)]`;
  }
  if (style === 'pill') {
    return `${base} rounded-full bg-[var(--c-primary)] text-white hover:opacity-85 shadow-sm`;
  }
  return `${base} rounded-[var(--c-radius)] bg-[var(--c-text)] text-[var(--c-bg)] hover:opacity-80`;
}

function buttonStyleOf(store: Store) {
  return (store.themeOverrides as Record<string, string> | null | undefined)?.buttonStyle;
}

/** Scroll to the product grid without touching the hash (hash IS the router here). */
function scrollToProducts() {
  document.getElementById('all-products')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
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

function useScrolled(threshold = 12) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > threshold);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [threshold]);
  return scrolled;
}

function useStorefrontMeta(store?: Store, product?: Product) {
  useEffect(() => {
    if (!store) return;
    const title = product?.details?.seoTitle || (product ? `${product.name} · ${store.name}` : `${store.name} · Matjari`);
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

/** Fade-up on first scroll into view; renders statically when reduced motion is preferred. */
function Reveal({ children, className, delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
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
  const reduce = useReducedMotion();
  const scrolled = useScrolled();
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
    // Compute the actual discount amount with this code applied so we can give
    // meaningful feedback (e.g. BXGY where qty threshold not yet met, FREE_SHIPPING, etc.)
    const previewSummary = computeOrderSummary(store, products, cartItems, discount);
    if (discount.type === 'FREE_SHIPPING') {
      setAppliedCode(code);
      setPromoInput(code);
      setPromoMessage('Applied — shipping is now free!');
      return;
    }
    if (previewSummary.discountCents <= 0) {
      // Code is technically valid but yields no saving with the current cart.
      // Give a type-specific hint so the customer knows what to do.
      if (discount.type === 'BXGY' && discount.details) {
        const d = discount.details as { buyQty: number; priceCents: number };
        const qualifyingItems = discount.productIds?.length
          ? previewSummary.items.filter((i) => discount.productIds!.includes(i.productId))
          : previewSummary.items;
        const totalQty = qualifyingItems.reduce((s, i) => s + i.quantity, 0);
        const need = d.buyQty - totalQty;
        if (need > 0) {
          setAppliedCode(undefined);
          setPromoMessage(`Add ${need} more item${need !== 1 ? 's' : ''} to unlock this deal.`);
          return;
        }
        // Qty threshold met but set price >= product price — no actual saving
        setAppliedCode(undefined);
        setPromoMessage('Items are already at or below the deal price.');
        return;
      }
      setAppliedCode(undefined);
      setPromoMessage('This code does not apply to the items in your cart.');
      return;
    }
    setAppliedCode(code);
    setPromoInput(code);
    if (discount.type === 'BXGY' && discount.details) {
      const d = discount.details as { buyQty: number; priceCents: number };
      setPromoMessage(`Applied — ${d.buyQty}+ items set at ${money(d.priceCents, store.currency)} total!`);
    } else {
      setPromoMessage(`Applied — you save ${money(previewSummary.discountCents, store.currency)}!`);
    }
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
        slug: store.slug,
        customerName: values.customerName,
        customerEmail: values.customerEmail,
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
    <div className="min-h-screen bg-[var(--c-bg)] text-[var(--c-text)] antialiased selection:bg-[var(--c-text)] selection:text-[var(--c-bg)]" dir={dir} style={themeVars}>
      <div aria-live="polite" className="sr-only">{liveMessage}</div>

      {/* Announcement bar */}
      <AnimatePresence initial={false}>
        {store.announcement && announcement && (
          <motion.div
            initial={false}
            exit={reduce ? undefined : { height: 0, opacity: 0 }}
            className="relative z-50 overflow-hidden bg-[var(--c-primary)] text-white"
          >
            <div className="flex min-h-9 items-center justify-center px-10 py-2 text-center text-[11px] font-bold uppercase tracking-[0.18em]">
              <span>{store.announcement}</span>
              <button type="button" aria-label="Dismiss" className="absolute end-3 rounded-full p-1.5 opacity-70 hover:opacity-100 transition-opacity" onClick={() => setAnnouncement(false)}>
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header — condenses on scroll */}
      <header className={cn(
        'sticky top-0 z-40 border-b transition-all duration-300',
        scrolled
          ? 'bg-[var(--c-bg)]/85 backdrop-blur-2xl border-[var(--c-line)]/50 shadow-[0_1px_24px_-12px_rgba(0,0,0,0.25)]'
          : 'bg-[var(--c-bg)]/95 backdrop-blur-xl border-transparent',
      )}>
        <div className={cn('mx-auto flex max-w-7xl items-center gap-4 px-4 sm:px-6 lg:px-8 transition-all duration-300', scrolled ? 'h-14' : 'h-16 sm:h-[4.5rem]')}>
          <Link to={`/s/${store.slug}`} className="flex min-w-0 items-center gap-3 group shrink-0">
            <ProductLogo store={store} />
            <span className="truncate text-base font-black tracking-tight group-hover:opacity-70 transition-opacity sm:text-lg" style={{ fontFamily: theme.hero }}>
              {store.name}
            </span>
          </Link>

          <nav className="hidden md:flex flex-1 items-center justify-center gap-9 text-[11px] font-bold uppercase tracking-[0.16em]">
            <Link to={`/s/${store.slug}`} className="relative py-1 opacity-55 hover:opacity-100 transition-opacity after:absolute after:inset-x-0 after:-bottom-0.5 after:h-0.5 after:origin-center after:scale-x-0 after:bg-current after:transition-transform hover:after:scale-x-100">{c.shop}</Link>
            <Link to={`/s/${store.slug}/about`} className="relative py-1 opacity-55 hover:opacity-100 transition-opacity after:absolute after:inset-x-0 after:-bottom-0.5 after:h-0.5 after:origin-center after:scale-x-0 after:bg-current after:transition-transform hover:after:scale-x-100">{c.about}</Link>
          </nav>

          <div className="flex items-center gap-2 ms-auto">
            <LanguageToggle className="border-[var(--c-line)]/50 bg-[var(--c-surface)] text-[var(--c-text)] hover:bg-[var(--c-soft)] rounded-lg transition-colors text-xs h-8 px-2" />
            <button
              type="button"
              aria-label={`${c.cart}: ${cartCount}`}
              className="relative flex h-10 w-10 items-center justify-center rounded-full bg-[var(--c-surface)] border border-[var(--c-line)]/40 hover:bg-[var(--c-soft)] transition-all active:scale-95"
              onClick={() => setDrawerOpen(true)}
            >
              <ShoppingBag className="h-[18px] w-[18px]" />
              <AnimatePresence>
                {cartCount > 0 && (
                  <motion.span
                    key={cartCount}
                    initial={reduce ? false : { scale: 0.4, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 22 }}
                    className="absolute -end-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--c-primary)] px-1 text-[10px] font-black text-white shadow"
                  >
                    {cartCount}
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
            <button
              type="button"
              aria-label="Menu"
              className="md:hidden flex h-10 w-10 items-center justify-center rounded-full bg-[var(--c-surface)] border border-[var(--c-line)]/40 hover:bg-[var(--c-soft)] transition-all"
              onClick={() => setMobileMenuOpen(true)}
            >
              <Menu className="h-[18px] w-[18px]" />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile nav drawer */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[90] bg-black/40 backdrop-blur-sm md:hidden"
              onClick={() => setMobileMenuOpen(false)}
            />
            <motion.div
              initial={reduce ? false : { x: dir === 'rtl' ? '-100%' : '100%' }}
              animate={{ x: 0 }}
              exit={reduce ? undefined : { x: dir === 'rtl' ? '-100%' : '100%' }}
              transition={{ type: 'spring', stiffness: 380, damping: 38 }}
              className="fixed inset-y-0 end-0 z-[91] flex w-[19rem] flex-col bg-[var(--c-bg)] shadow-2xl md:hidden"
              role="dialog"
              aria-modal="true"
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--c-line)]/30">
                <span className="font-black tracking-tight" style={{ fontFamily: theme.hero }}>{store.name}</span>
                <button type="button" onClick={() => setMobileMenuOpen(false)} className="rounded-full p-2 hover:bg-[var(--c-soft)] transition-colors">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <nav className="flex flex-col p-4 gap-1 text-sm font-bold">
                <Link to={`/s/${store.slug}`} onClick={() => setMobileMenuOpen(false)} className="px-4 py-3.5 rounded-xl hover:bg-[var(--c-soft)] transition-colors">{c.shop}</Link>
                <Link to={`/s/${store.slug}/about`} onClick={() => setMobileMenuOpen(false)} className="px-4 py-3.5 rounded-xl hover:bg-[var(--c-soft)] transition-colors">{c.about}</Link>
                <button type="button" onClick={() => { setMobileMenuOpen(false); setDrawerOpen(true); }} className="flex items-center justify-between px-4 py-3.5 rounded-xl hover:bg-[var(--c-soft)] transition-colors text-start">
                  <span>{c.cart}</span>
                  {cartCount > 0 && <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--c-primary)] px-1 text-[10px] font-black text-white">{cartCount}</span>}
                </button>
              </nav>
              <div className="mt-auto border-t border-[var(--c-line)]/25 p-5 text-[10px] font-bold uppercase tracking-[0.18em] opacity-35">
                {store.name} · {c.powered}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <main>
        <Routes>
          <Route path="/" element={<HomePage store={store} products={products} discounts={discounts} addToCart={addToCart} />} />
          <Route path="/p/:productId" element={<ProductDetail store={store} products={products} addToCart={addToCart} />} />
          <Route path="/about" element={<AboutPage store={store} />} />
          <Route path="/cart" element={<CartPage store={store} products={products} cartItems={cartItems} summary={summary} activeDiscount={activeDiscount} setQuantity={setQuantity} openCheckout={beginCheckout} />} />
          <Route path="/order/:orderId" element={<OrderConfirmation store={store} />} />
        </Routes>
      </main>

      {/* Footer */}
      <footer className="border-t border-[var(--c-line)]/30 bg-[var(--c-surface)] mt-16">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="grid gap-10 md:grid-cols-[1.2fr_1fr_1fr]">
            <div>
              <div className="flex items-center gap-3">
                <ProductLogo store={store} />
                <p className="text-xl font-black tracking-tight" style={{ fontFamily: theme.hero }}>{store.name}</p>
              </div>
              {store.tagline && <p className="mt-3 max-w-xs text-sm font-medium leading-relaxed opacity-50">{store.tagline}</p>}
            </div>
            <div>
              <p className="mb-4 text-[10px] font-black uppercase tracking-[0.2em] opacity-35">{c.shop}</p>
              <nav className="flex flex-col gap-2.5 text-sm font-bold">
                <Link to={`/s/${store.slug}`} className="w-fit opacity-60 hover:opacity-100 transition-opacity">{c.allProducts}</Link>
                <Link to={`/s/${store.slug}/about`} className="w-fit opacity-60 hover:opacity-100 transition-opacity">{c.about}</Link>
                <Link to={`/s/${store.slug}/cart`} className="w-fit opacity-60 hover:opacity-100 transition-opacity">{c.cart}</Link>
              </nav>
            </div>
            <div>
              <p className="mb-4 text-[10px] font-black uppercase tracking-[0.2em] opacity-35">{c.delivery}</p>
              <div className="flex flex-col gap-2.5 text-sm font-bold opacity-60">
                <span className="inline-flex items-center gap-2"><Truck className="h-4 w-4" /> {c.jordanDelivery}</span>
                <span className="inline-flex items-center gap-2"><ShieldCheck className="h-4 w-4" /> {c.cod}</span>
              </div>
              {hasSocial && (
                <div className="mt-5 flex items-center gap-2.5">
                  {overrides?.instagram && (
                    <a href={overrides.instagram.startsWith('http') ? overrides.instagram : `https://instagram.com/${overrides.instagram.replace('@', '')}`} target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--c-soft)] hover:bg-[var(--c-line)]/40 transition-all hover:-translate-y-0.5 opacity-60 hover:opacity-100">
                      <Instagram className="h-4 w-4" />
                    </a>
                  )}
                  {overrides?.whatsapp && (
                    <a href={`https://wa.me/${overrides.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp" className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--c-soft)] hover:bg-[var(--c-line)]/40 transition-all hover:-translate-y-0.5 opacity-60 hover:opacity-100">
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
                    </a>
                  )}
                  {overrides?.tiktok && (
                    <a href={overrides.tiktok.startsWith('http') ? overrides.tiktok : `https://tiktok.com/@${overrides.tiktok.replace('@', '')}`} target="_blank" rel="noopener noreferrer" aria-label="TikTok" className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--c-soft)] hover:bg-[var(--c-line)]/40 transition-all hover:-translate-y-0.5 opacity-60 hover:opacity-100">
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.3 6.3 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.16 8.16 0 004.77 1.52V6.76a4.85 4.85 0 01-1-.07z"/></svg>
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>
          <div className="mt-10 border-t border-[var(--c-line)]/20 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-[10px] font-bold uppercase tracking-[0.18em] opacity-35">
            <span>© {store.name}</span>
            <span className="flex items-center gap-4">
              <a href={mainSiteUrl('/privacy')} className="hover:opacity-100 transition-opacity">Privacy</a>
              <a href={mainSiteUrl('/terms')} className="hover:opacity-100 transition-opacity">Terms</a>
              <span>{c.powered}</span>
            </span>
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
        activeDiscount={activeDiscount}
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

function HomePage({ store, products, discounts, addToCart }: { store: Store; products: Product[]; discounts: Discount[]; addToCart: (productId: string, quantity?: number, variantId?: string) => void }) {
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
  const templateId = template.id as TemplateId;
  const heroSlides = ((store.themeOverrides as { heroSlides?: HeroSlide[] } | null)?.heroSlides ?? []).filter((s) => s.enabled);

  return (
    <>
      {heroSlides.length > 0 ? (
        <HeroCarousel slides={heroSlides} store={store} products={products} discounts={discounts} theme={theme} addToCart={addToCart} />
      ) : (
        <>
          {templateId === 'editorial' && <EditorialHero store={store} theme={theme} featuredProduct={featuredProduct} collections={collections} />}
          {templateId === 'boutique' && <BoutiqueHero store={store} theme={theme} featuredProduct={featuredProduct} />}
          {templateId === 'market' && (
            <MarketHero store={store} theme={theme} query={query} setQuery={setQuery} collections={collections} collection={collection} setCollection={setCollection} count={filtered.length} />
          )}
          {templateId === 'lookbook' && <LookbookHero store={store} theme={theme} featuredProduct={featuredProduct} />}
        </>
      )}

      {/* Featured products */}
      {featured.length > 0 && templateId !== 'market' && (
        <Reveal>
          <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-16 lg:px-8">
            <div className="mb-8 flex items-end justify-between gap-4">
              <div>
                <p className="mb-1.5 text-[10px] font-black uppercase tracking-[0.22em] text-[var(--c-primary)]">{store.name}</p>
                <h2 className="text-2xl font-black tracking-tight sm:text-3xl" style={{ fontFamily: theme.hero }}>{c.featured}</h2>
              </div>
              <button type="button" onClick={scrollToProducts} className="group inline-flex shrink-0 items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.14em] opacity-50 hover:opacity-100 transition-opacity">
                {c.viewAll} <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 rtl:rotate-180 rtl:group-hover:-translate-x-0.5" />
              </button>
            </div>
            <ProductGrid products={featured} store={store} addToCart={addToCart} templateId={templateId} />
          </section>
        </Reveal>
      )}

      {/* All products */}
      <section id="all-products" className="mx-auto max-w-7xl scroll-mt-20 px-4 py-14 sm:px-6 sm:py-16 lg:px-8">
        {templateId !== 'market' && (
          <div className="mb-8 flex items-end justify-between gap-4">
            <h2 className="text-2xl font-black tracking-tight sm:text-3xl" style={{ fontFamily: theme.hero }}>{c.allProducts}</h2>
            <p className="shrink-0 text-xs font-bold opacity-40">{filtered.length} {c.products}</p>
          </div>
        )}

        {/* Filter toolbar */}
        <div className="mb-8 rounded-2xl bg-[var(--c-surface)] p-3 shadow-sm border border-[var(--c-line)]/30">
          <div className="flex flex-col gap-3 sm:flex-row">
            {templateId !== 'market' && (
              <label className="relative flex-1">
                <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 opacity-35" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={c.search}
                  className="h-10 w-full rounded-xl border border-[var(--c-line)]/40 bg-[var(--c-bg)] ps-9 pe-4 text-sm font-medium transition-all focus:border-[var(--c-text)]/50 focus:ring-1 focus:ring-[var(--c-text)]/30 outline-none"
                />
              </label>
            )}
            <label className={cn('relative', templateId === 'market' && 'flex-1')}>
              <select
                value={collection}
                onChange={(e) => setCollection(e.target.value)}
                className="h-10 w-full appearance-none rounded-xl border border-[var(--c-line)]/40 bg-[var(--c-bg)] ps-3 pe-9 text-sm font-medium transition-all focus:border-[var(--c-text)]/50 focus:ring-1 focus:ring-[var(--c-text)]/30 outline-none sm:min-w-[10rem]"
              >
                {collections.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
              <ChevronDown className="pointer-events-none absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 opacity-35" />
            </label>
            <label className={cn('relative', templateId === 'market' && 'flex-1')}>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as SortMode)}
                className="h-10 w-full appearance-none rounded-xl border border-[var(--c-line)]/40 bg-[var(--c-bg)] ps-3 pe-9 text-sm font-medium transition-all focus:border-[var(--c-text)]/50 focus:ring-1 focus:ring-[var(--c-text)]/30 outline-none sm:min-w-[10rem]"
              >
                <option value="newest">{c.newest}</option>
                <option value="price-asc">{c.priceLow}</option>
                <option value="price-desc">{c.priceHigh}</option>
                <option value="name">{c.name}</option>
              </select>
              <SlidersHorizontal className="pointer-events-none absolute end-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 opacity-35" />
            </label>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <FilterChip active={inStockOnly} onClick={() => setInStockOnly((v) => !v)} label={c.inStock} />
            <FilterChip active={onSaleOnly} onClick={() => setOnSaleOnly((v) => !v)} label={c.onSale} />
            {templateId === 'market' && <span className="ms-auto text-xs font-bold opacity-40">{filtered.length} {c.products}</span>}
          </div>
        </div>

        {products.length === 0 ? (
          <EmptyState title={c.noProducts} body="" />
        ) : filtered.length === 0 ? (
          <EmptyState title={c.noResults} body={c.noResultsHint} />
        ) : (
          <>
            <ProductGrid products={visible} store={store} addToCart={addToCart} templateId={templateId} />
            {visible.length < filtered.length && (
              <div className="mt-12 text-center">
                <button
                  type="button"
                  className="rounded-full bg-[var(--c-surface)] border border-[var(--c-line)]/40 px-8 py-3.5 text-xs font-black uppercase tracking-[0.15em] hover:bg-[var(--c-soft)] transition-all active:scale-95"
                  onClick={() => setPage((v) => v + 1)}
                >
                  Load more · {filtered.length - visible.length}
                </button>
              </div>
            )}
          </>
        )}
      </section>
    </>
  );
}

/* ── Template heros ─────────────────────────────────────────────────── */

type Theme = ReturnType<typeof resolveStoreTheme>;

function HeroTrustChips({ className }: { className?: string }) {
  const c = useCopy();
  return (
    <div className={cn('flex flex-wrap gap-3 text-[11px] font-bold uppercase tracking-[0.14em]', className)}>
      <span className="inline-flex items-center gap-2 rounded-full border border-[var(--c-line)]/40 bg-[var(--c-bg)] px-4 py-2"><Truck className="h-3.5 w-3.5" /> {c.jordanDelivery}</span>
      <span className="inline-flex items-center gap-2 rounded-full border border-[var(--c-line)]/40 bg-[var(--c-bg)] px-4 py-2"><ShieldCheck className="h-3.5 w-3.5" /> {c.cod}</span>
    </div>
  );
}

function HeroFeaturedCard({ store, product }: { store: Store; product?: Product }) {
  if (!product) {
    return (
      <div className="flex aspect-[4/5] items-center justify-center overflow-hidden rounded-3xl bg-[var(--c-soft)] border border-[var(--c-line)]/20">
        <ProductLogo store={store} large />
      </div>
    );
  }
  return (
    <Link to={`/s/${store.slug}/p/${product.id}`} className="group relative block overflow-hidden rounded-3xl border border-[var(--c-line)]/20 bg-[var(--c-soft)] shadow-2xl shadow-[var(--c-text)]/10">
      <div className="aspect-[4/5] overflow-hidden">
        <ProductThumb product={product} className="h-full w-full transition-transform duration-700 group-hover:scale-[1.04]" />
      </div>
      <div className="absolute inset-x-4 bottom-4 flex items-center justify-between gap-3 rounded-2xl bg-[var(--c-bg)]/85 px-4 py-3 backdrop-blur-xl border border-[var(--c-line)]/30 shadow-lg">
        <span className="min-w-0 truncate text-sm font-black">{product.name}</span>
        <span className="shrink-0 rounded-full bg-[var(--c-text)] px-3 py-1 text-xs font-black text-[var(--c-bg)]">
          {money(productPriceRange(product).min, store.currency)}
        </span>
      </div>
    </Link>
  );
}

/* ── Hero Carousel ──────────────────────────────────────────────────── */

function offerSlideDescription(discount: Discount | undefined, currency: string): string {
  if (!discount) return 'Exclusive offer — use the code at checkout.';
  if (discount.type === 'PERCENT') return `${discount.value}% off your entire order`;
  if (discount.type === 'FIXED') return 'Items at a special set price';
  if (discount.type === 'FREE_SHIPPING') return 'Free shipping on your order';
  if (discount.type === 'BXGY' && discount.details) {
    const d = discount.details as { buyQty: number; priceCents: number };
    return `Buy ${d.buyQty}+ items for just ${money(d.priceCents, currency)} total`;
  }
  if (discount.type === 'TIERED') return 'The more you spend, the more you save';
  return 'Exclusive offer — use the code at checkout.';
}

function OfferSlide({ slide, store, discounts, theme }: {
  slide: HeroSlide; store: Store; discounts: Discount[]; theme: Theme;
}) {
  const [copied, setCopied] = useState(false);
  const discount = discounts.find((d) => d.code === slide.discountCode);
  const code = slide.discountCode || '';
  const copyCode = () => {
    navigator.clipboard.writeText(code).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  };
  const offerBadge = discount?.type === 'FREE_SHIPPING' ? 'Free Shipping' : discount?.type === 'TIERED' ? 'Spend & Save' : 'Special Offer';
  return (
    <section className="relative overflow-hidden bg-[var(--c-surface)] min-h-[60vh] flex items-center sm:min-h-[72vh]">
      <div aria-hidden className="pointer-events-none absolute -top-40 end-0 h-[32rem] w-[32rem] rounded-full bg-[var(--c-accent)] opacity-[0.08] blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute bottom-0 -start-32 h-72 w-72 rounded-full bg-[var(--c-primary)] opacity-[0.08] blur-3xl" />
      <div className="relative z-10 mx-auto grid max-w-7xl w-full items-center gap-10 px-5 py-16 sm:px-8 sm:py-20 lg:grid-cols-[1fr_auto] lg:gap-20 lg:px-12 lg:py-24">
        <Reveal className="flex flex-col gap-6">
          <span className="w-fit rounded-full bg-[var(--c-accent)]/15 px-4 py-1.5 text-[11px] font-black uppercase tracking-[0.22em] text-[var(--c-accent)] border border-[var(--c-accent)]/20">
            🎁 {offerBadge}
          </span>
          <h2 className="text-[2.5rem] font-black leading-[1.02] tracking-tighter sm:text-6xl lg:text-7xl" style={{ fontFamily: theme.hero }}>
            {slide.title || discount?.name || 'Exclusive Deal'}
          </h2>
          <p className="max-w-sm text-base font-medium leading-relaxed opacity-60">
            {slide.subtitle || offerSlideDescription(discount, store.currency)}
          </p>
          <div className="flex flex-wrap items-center gap-3">
            {code && (
              <button type="button" onClick={copyCode} className="inline-flex h-12 items-center gap-3 rounded-xl bg-[var(--c-text)] px-5 text-[var(--c-bg)] transition-all hover:opacity-80 active:scale-[0.97]">
                <span className="font-mono text-sm font-black tracking-[0.15em]">{code}</span>
                <span className="h-4 w-px bg-current opacity-30" />
                <span className="text-[10px] font-black uppercase tracking-wider">{copied ? '✓ Copied!' : 'Copy'}</span>
              </button>
            )}
            <button type="button" onClick={scrollToProducts} className="inline-flex h-12 items-center gap-2 px-4 text-[11px] font-black uppercase tracking-[0.12em] opacity-50 hover:opacity-100 transition-opacity">
              Shop now <ArrowRight className="h-3.5 w-3.5 rtl:rotate-180" />
            </button>
          </div>
        </Reveal>
        {code && (
          <div aria-hidden className="hidden lg:flex shrink-0 items-center justify-center">
            <div className="relative flex h-56 w-56 items-center justify-center rounded-[2rem] bg-[var(--c-accent)]/10 border-2 border-[var(--c-accent)]/20 shadow-xl">
              <span className="break-all px-4 text-center font-mono text-2xl font-black tracking-[0.18em] text-[var(--c-accent)]">{code}</span>
              {discount?.type === 'PERCENT' && (
                <span className="absolute -top-5 -right-5 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--c-accent)] text-sm font-black text-[var(--c-bg)] shadow-lg">
                  -{discount.value}%
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function ProductSlide({ slide, store, products, theme, addToCart }: {
  slide: HeroSlide; store: Store; products: Product[]; theme: Theme;
  addToCart: (productId: string, qty?: number, variantId?: string) => void;
}) {
  const c = useCopy();
  const product = products.find((p) => p.id === slide.productId);
  if (!product) {
    return (
      <section className="flex min-h-[60vh] items-center justify-center bg-[var(--c-surface)] sm:min-h-[72vh]">
        <p className="text-sm font-medium opacity-40">Product not found</p>
      </section>
    );
  }
  const range = productPriceRange(product);
  return (
    <section className="relative overflow-hidden bg-[var(--c-surface)]">
      <div aria-hidden className="pointer-events-none absolute -top-32 -end-32 h-96 w-96 rounded-full bg-[var(--c-primary)] opacity-[0.07] blur-3xl" />
      <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-4 py-14 sm:px-6 sm:py-20 lg:min-h-[72vh] lg:grid-cols-[1.1fr_0.9fr] lg:gap-16 lg:px-8">
        <Reveal className="z-10 flex flex-col justify-center">
          <span className="mb-6 inline-flex w-fit items-center gap-2 rounded-full bg-[var(--c-bg)] px-4 py-1.5 text-[11px] font-black uppercase tracking-[0.2em] border border-[var(--c-line)]/40">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--c-primary)]" />
            {product.category || store.category}
          </span>
          <h2 className="text-[2.5rem] font-black leading-[1.02] tracking-tighter sm:text-5xl lg:text-6xl" style={{ fontFamily: theme.hero }}>
            {product.name}
          </h2>
          {product.description && (
            <p className="mt-4 max-w-sm text-base font-medium leading-relaxed opacity-55 line-clamp-3">{product.description}</p>
          )}
          <p className="mt-4 text-2xl font-black">
            {money(range.min, store.currency)}
            {range.max > range.min && <span className="ms-1 text-base font-bold opacity-40">– {money(range.max, store.currency)}</span>}
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <button type="button" onClick={() => addToCart(product.id)} className={cn(getCtaClass(buttonStyleOf(store)), 'w-auto px-8 h-12')}>
              {c.addToCart}
            </button>
            <Link to={`/s/${store.slug}/p/${product.id}`} className="inline-flex h-12 items-center gap-2 px-4 text-[11px] font-black uppercase tracking-[0.12em] opacity-50 hover:opacity-100 transition-opacity">
              View product <ArrowRight className="h-3.5 w-3.5 rtl:rotate-180" />
            </Link>
          </div>
        </Reveal>
        <Reveal delay={0.12} className="relative lg:justify-self-end lg:w-full lg:max-w-md">
          <HeroFeaturedCard store={store} product={product} />
        </Reveal>
      </div>
    </section>
  );
}

function CustomSlide({ slide, store, theme }: { slide: HeroSlide; store: Store; theme: Theme }) {
  return (
    <section
      className="relative overflow-hidden min-h-[60vh] flex items-center sm:min-h-[72vh]"
      style={slide.bgColor ? { backgroundColor: slide.bgColor } : { backgroundColor: 'var(--c-surface)' }}
    >
      <div aria-hidden className="pointer-events-none absolute -top-32 -end-32 h-96 w-96 rounded-full bg-[var(--c-primary)] opacity-[0.06] blur-3xl" />
      <div className="relative z-10 mx-auto max-w-7xl w-full px-5 py-16 sm:px-8 sm:py-20 lg:px-12 lg:py-24">
        <Reveal className="flex flex-col gap-6 max-w-2xl">
          {slide.title && (
            <h2 className="text-[2.5rem] font-black leading-[1.02] tracking-tighter sm:text-6xl lg:text-7xl" style={{ fontFamily: theme.hero }}>
              {slide.title}
            </h2>
          )}
          {slide.subtitle && (
            <p className="text-base font-medium leading-relaxed opacity-60 max-w-md">{slide.subtitle}</p>
          )}
          {slide.ctaLabel && (
            <div className="mt-2">
              {slide.ctaUrl ? (
                <a href={slide.ctaUrl} target={slide.ctaUrl.startsWith('http') ? '_blank' : undefined} rel="noopener noreferrer" className={cn(getCtaClass(buttonStyleOf(store)), 'w-auto px-8 h-12 inline-flex items-center gap-2')}>
                  {slide.ctaLabel} <ArrowRight className="h-4 w-4 rtl:rotate-180" />
                </a>
              ) : (
                <button type="button" onClick={scrollToProducts} className={cn(getCtaClass(buttonStyleOf(store)), 'w-auto px-8 h-12')}>
                  {slide.ctaLabel} <ArrowRight className="h-4 w-4 rtl:rotate-180" />
                </button>
              )}
            </div>
          )}
        </Reveal>
      </div>
    </section>
  );
}

function HeroCarousel({ slides, store, products, discounts, theme, addToCart }: {
  slides: HeroSlide[]; store: Store; products: Product[]; discounts: Discount[]; theme: Theme;
  addToCart: (productId: string, qty?: number, variantId?: string) => void;
}) {
  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchX = useRef<number | null>(null);
  const reduce = useReducedMotion();

  useEffect(() => {
    if (paused || slides.length <= 1) return;
    const id = setInterval(() => setIdx((c) => (c + 1) % slides.length), 5000);
    return () => clearInterval(id);
  }, [paused, slides.length]);

  const go = (delta: number) => setIdx((c) => (c + delta + slides.length) % slides.length);
  const slide = slides[Math.min(idx, slides.length - 1)];

  return (
    <div
      className="relative overflow-hidden border-b border-[var(--c-line)]/20"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={(e) => { touchX.current = e.touches[0].clientX; }}
      onTouchEnd={(e) => {
        if (touchX.current === null) return;
        const diff = touchX.current - e.changedTouches[0].clientX;
        if (Math.abs(diff) > 40) go(diff > 0 ? 1 : -1);
        touchX.current = null;
      }}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={idx}
          initial={reduce ? false : { opacity: 0, x: 28 }}
          animate={{ opacity: 1, x: 0 }}
          exit={reduce ? undefined : { opacity: 0, x: -28 }}
          transition={{ duration: 0.32, ease: 'easeOut' }}
        >
          {slide.type === 'offer' && <OfferSlide slide={slide} store={store} discounts={discounts} theme={theme} />}
          {slide.type === 'product' && <ProductSlide slide={slide} store={store} products={products} theme={theme} addToCart={addToCart} />}
          {slide.type === 'custom' && <CustomSlide slide={slide} store={store} theme={theme} />}
        </motion.div>
      </AnimatePresence>

      {slides.length > 1 && (
        <>
          <div className="absolute bottom-5 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2">
            {slides.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setIdx(i)}
                aria-label={`Go to slide ${i + 1}`}
                className={cn('h-1.5 rounded-full transition-all duration-300', i === idx ? 'w-8 bg-[var(--c-text)]/55' : 'w-1.5 bg-[var(--c-text)]/20 hover:bg-[var(--c-text)]/40')}
              />
            ))}
          </div>
          <button type="button" onClick={() => go(-1)} aria-label="Previous slide" className="absolute start-3 top-1/2 z-20 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-[var(--c-bg)]/80 backdrop-blur-sm border border-[var(--c-line)]/30 shadow-sm hover:bg-[var(--c-bg)] transition-all">
            <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
          </button>
          <button type="button" onClick={() => go(1)} aria-label="Next slide" className="absolute end-3 top-1/2 z-20 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-[var(--c-bg)]/80 backdrop-blur-sm border border-[var(--c-line)]/30 shadow-sm hover:bg-[var(--c-bg)] transition-all">
            <ArrowRight className="h-4 w-4 rtl:rotate-180" />
          </button>
        </>
      )}
    </div>
  );
}

function EditorialHero({ store, theme, featuredProduct, collections }: { store: Store; theme: Theme; featuredProduct?: Product; collections: string[] }) {
  const c = useCopy();
  const categories = collections.filter((item) => item !== 'All');
  return (
    <section className="relative overflow-hidden bg-[var(--c-surface)] border-b border-[var(--c-line)]/20">
      <div aria-hidden className="pointer-events-none absolute -top-32 -end-32 h-96 w-96 rounded-full bg-[var(--c-primary)] opacity-[0.07] blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute -bottom-40 -start-24 h-80 w-80 rounded-full bg-[var(--c-accent)] opacity-[0.07] blur-3xl" />
      <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-4 py-14 sm:px-6 sm:py-20 lg:min-h-[72vh] lg:grid-cols-[1.1fr_0.9fr] lg:gap-16 lg:px-8">
        <Reveal className="z-10 flex flex-col justify-center">
          <span className="mb-6 inline-flex w-fit items-center gap-2 rounded-full bg-[var(--c-bg)] px-4 py-1.5 text-[11px] font-black uppercase tracking-[0.2em] border border-[var(--c-line)]/40">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--c-primary)]" />
            {store.category}
          </span>
          <h1 className="text-[2.75rem] font-black leading-[1.02] tracking-tighter sm:text-6xl lg:text-7xl xl:text-[5.25rem]" style={{ fontFamily: theme.hero }}>
            {store.tagline || store.name}
          </h1>
          <div className="mt-10 flex flex-wrap items-center gap-3">
            <button type="button" onClick={scrollToProducts} className={cn(getCtaClass(buttonStyleOf(store)), 'w-auto px-8 h-12')}>
              {c.shopNow} <ArrowRight className="h-4 w-4 rtl:rotate-180" />
            </button>
            {store.about && (
              <Link to={`/s/${store.slug}/about`} className="inline-flex h-12 items-center gap-2 px-6 text-[11px] font-black uppercase tracking-[0.12em] opacity-50 hover:opacity-100 transition-opacity">
                {c.about}
              </Link>
            )}
          </div>
          <HeroTrustChips className="mt-9 opacity-60" />
        </Reveal>
        <Reveal delay={0.12} className="relative lg:justify-self-end lg:w-full lg:max-w-md">
          <HeroFeaturedCard store={store} product={featuredProduct} />
        </Reveal>
      </div>
      {categories.length > 1 && (
        <div className="relative border-t border-[var(--c-line)]/20 bg-[var(--c-bg)]/60">
          <div className="mx-auto flex max-w-7xl gap-8 overflow-x-auto px-4 py-3.5 sm:px-6 lg:px-8 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {categories.slice(0, 12).map((item) => (
              <span key={item} className="flex shrink-0 items-center gap-8 text-[11px] font-black uppercase tracking-[0.2em] opacity-35">
                {item}
                <span aria-hidden className="text-[var(--c-primary)] opacity-80">✦</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function BoutiqueHero({ store, theme, featuredProduct }: { store: Store; theme: Theme; featuredProduct?: Product }) {
  const c = useCopy();
  return (
    <section className="overflow-hidden border-b border-[var(--c-line)]/20">
      <div className="mx-auto grid max-w-[110rem] lg:grid-cols-2">
        <Reveal className="order-2 flex flex-col items-center justify-center px-6 py-16 text-center sm:px-12 lg:order-1 lg:px-16 lg:py-28">
          <div className="mb-6 flex items-center gap-4 text-[11px] font-black uppercase tracking-[0.3em] opacity-45">
            <span aria-hidden className="h-px w-10 bg-current opacity-40" />
            {store.category}
            <span aria-hidden className="h-px w-10 bg-current opacity-40" />
          </div>
          <h1 className="max-w-xl text-4xl font-black leading-[1.05] tracking-tighter sm:text-6xl lg:text-[4.25rem]" style={{ fontFamily: theme.hero }}>
            {store.tagline || store.name}
          </h1>
          <p className="mt-6 max-w-sm text-base font-medium leading-relaxed opacity-55">
            {store.about ? store.about.split('\n')[0].slice(0, 140) : `${store.name} — curated collection, delivered across Jordan.`}
          </p>
          <button type="button" onClick={scrollToProducts} className={cn(getCtaClass(buttonStyleOf(store)), 'mt-9 w-auto px-10 h-12')}>
            {c.shopNow}
          </button>
          <div className="mt-9 flex flex-wrap justify-center gap-5 text-[11px] font-bold uppercase tracking-[0.14em] opacity-50">
            <span className="inline-flex items-center gap-2"><Truck className="h-3.5 w-3.5" /> {c.jordanDelivery}</span>
            <span className="inline-flex items-center gap-2"><ShieldCheck className="h-3.5 w-3.5" /> {c.cod}</span>
          </div>
        </Reveal>
        <div className={cn('relative order-1 min-h-[52vw] overflow-hidden bg-[var(--c-soft)] lg:order-2 lg:min-h-[640px]', !featuredProduct && 'flex items-center justify-center')}>
          {featuredProduct ? (
            <Link to={`/s/${store.slug}/p/${featuredProduct.id}`} className="group absolute inset-0">
              <ProductThumb product={featuredProduct} className="h-full w-full transition-transform duration-700 group-hover:scale-[1.03]" />
              <span className="absolute bottom-5 start-5 rounded-full bg-[var(--c-bg)]/85 px-4 py-2 text-xs font-black backdrop-blur-xl border border-[var(--c-line)]/30 shadow-lg">
                {featuredProduct.name} · {money(productPriceRange(featuredProduct).min, store.currency)}
              </span>
            </Link>
          ) : (
            <ProductLogo store={store} large />
          )}
        </div>
      </div>
    </section>
  );
}

function MarketHero({ store, theme, query, setQuery, collections, collection, setCollection, count }: {
  store: Store;
  theme: Theme;
  query: string;
  setQuery: (value: string) => void;
  collections: string[];
  collection: string;
  setCollection: (value: string) => void;
  count: number;
}) {
  const c = useCopy();
  return (
    <section className="border-b border-[var(--c-line)]/20 bg-[var(--c-surface)]">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-12 lg:px-8">
        <div className="flex flex-col gap-1.5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-black tracking-tight sm:text-4xl" style={{ fontFamily: theme.hero }}>{store.name}</h1>
            {store.tagline && <p className="mt-1.5 text-sm font-medium opacity-50">{store.tagline}</p>}
          </div>
          <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] opacity-50">
            <span className="inline-flex items-center gap-1.5"><Truck className="h-3 w-3" /> {c.jordanDelivery}</span>
            <span className="opacity-30">·</span>
            <span className="inline-flex items-center gap-1.5"><ShieldCheck className="h-3 w-3" /> {c.cod}</span>
          </div>
        </div>

        {/* Search-first: the hero owns the catalog search */}
        <label className="relative mt-6 block">
          <Search className="pointer-events-none absolute start-4 top-1/2 h-5 w-5 -translate-y-1/2 opacity-35" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`${c.search} · ${count} ${c.products}`}
            className="h-13 w-full rounded-2xl border border-[var(--c-line)]/40 bg-[var(--c-bg)] ps-12 pe-4 py-3.5 text-base font-medium shadow-sm transition-all focus:border-[var(--c-text)]/50 focus:ring-2 focus:ring-[var(--c-text)]/15 outline-none"
          />
        </label>

        {collections.length > 1 && (
          <div className="mt-4 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {collections.slice(0, 12).map((col) => (
              <button
                key={col}
                type="button"
                onClick={() => setCollection(col)}
                className={cn(
                  'shrink-0 rounded-full px-4 py-2 text-xs font-bold transition-all active:scale-95',
                  collection === col
                    ? 'bg-[var(--c-text)] text-[var(--c-bg)] shadow-sm'
                    : 'bg-[var(--c-bg)] border border-[var(--c-line)]/40 hover:border-[var(--c-text)]/40',
                )}
              >
                {col}
              </button>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function LookbookHero({ store, theme, featuredProduct }: { store: Store; theme: Theme; featuredProduct?: Product }) {
  const c = useCopy();
  const reduce = useReducedMotion();
  const heroImage = featuredProduct ? productPrimaryImage(featuredProduct) : undefined;
  return (
    <section className="relative flex min-h-[72vh] items-end overflow-hidden border-b border-[var(--c-line)]/20 sm:min-h-[78vh]">
      <div className="absolute inset-0 bg-[var(--c-soft)]">
        {heroImage && (
          <motion.img
            src={heroImage}
            alt={featuredProduct!.name}
            initial={reduce ? false : { scale: 1.08 }}
            animate={{ scale: 1 }}
            transition={{ duration: 1.6, ease: [0.22, 1, 0.36, 1] }}
            className="h-full w-full object-cover"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-black/5" />
      </div>
      <div className="relative z-10 mx-auto w-full max-w-7xl px-5 pb-16 sm:px-8 lg:px-12 lg:pb-24">
        <Reveal>
          <span className="mb-5 inline-block rounded-full bg-white/15 px-4 py-1.5 text-[11px] font-black uppercase tracking-[0.22em] text-white border border-white/25 backdrop-blur-md">
            {store.category}
          </span>
          <h1 className="max-w-3xl text-[2.75rem] font-black leading-[1.02] tracking-tighter text-white sm:text-6xl lg:text-7xl" style={{ fontFamily: theme.hero }}>
            {store.tagline || store.name}
          </h1>
          <div className="mt-9 flex flex-wrap items-center gap-4">
            <button type="button" onClick={scrollToProducts} className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-white px-9 text-[11px] font-black uppercase tracking-[0.12em] text-black transition-all hover:opacity-90 active:scale-[0.97]">
              {c.shopNow} <ArrowRight className="h-4 w-4 rtl:rotate-180" />
            </button>
            {featuredProduct && (
              <Link to={`/s/${store.slug}/p/${featuredProduct.id}`} className="text-[11px] font-black uppercase tracking-[0.14em] text-white/70 underline-offset-4 hover:text-white hover:underline transition-colors">
                {featuredProduct.name}
              </Link>
            )}
          </div>
        </Reveal>
      </div>
      {!reduce && (
        <motion.div
          aria-hidden
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute bottom-5 left-1/2 z-10 -translate-x-1/2 text-white/60"
        >
          <ChevronDown className="h-6 w-6" />
        </motion.div>
      )}
    </section>
  );
}

/* ── Product detail ─────────────────────────────────────────────────── */

function ProductDetail({ store, products, addToCart }: { store: Store; products: Product[]; addToCart: (productId: string, quantity?: number, variantId?: string) => void }) {
  const { productId } = useParams();
  const c = useCopy();
  const { lang } = useI18n();
  const theme = resolveStoreTheme(store.themeId || 'mono', store.themeOverrides);
  const template = getStorefrontTemplate(store.storefrontTemplate);
  const recordEvent = useStore((s) => s.recordEvent);
  const [quantity, setQuantity] = useState(1);
  const [selections, setSelections] = useState<Record<string, string>>({});
  const buyBoxRef = useRef<HTMLDivElement | null>(null);
  const [buyBoxVisible, setBuyBoxVisible] = useState(true);
  const product = products.find((item) => item.id === productId);
  useStorefrontMeta(store, product);

  useEffect(() => {
    if (!product) return;
    recordEvent(store.id, 'view', product.id);
    setSelections({});
    setQuantity(1);
    window.scrollTo(0, 0);
  }, [product, recordEvent, store.id]);

  // Drives the mobile sticky buy bar: shown while the in-page buy box is off screen.
  useEffect(() => {
    const node = buyBoxRef.current;
    if (!node || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(([entry]) => setBuyBoxVisible(entry.isIntersecting), { threshold: 0.1 });
    observer.observe(node);
    return () => observer.disconnect();
  }, [product]);

  if (!product) return (
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <EmptyState title="Product not found" body="" action={<Link className={cn(getCtaClass(buttonStyleOf(store)), 'w-auto px-6')} to={`/s/${store.slug}`}>{c.backToShop}</Link>} />
    </div>
  );

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
  const purchasable = displayStock > 0 && (!variable || Boolean(chosenVariant));
  const ctaLabel = displayStock <= 0 ? c.soldOut : variable && !chosenVariant ? c.chooseOptions : c.addToCart;
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
    <section className="mx-auto max-w-7xl px-4 pb-24 pt-8 sm:px-6 sm:pt-12 lg:px-8 lg:pb-16">
      {/* Breadcrumb */}
      <div className="mb-7 flex items-center gap-2.5 text-[11px] font-bold uppercase tracking-[0.14em] opacity-40">
        <Link to={`/s/${store.slug}`} className="hover:opacity-100 transition-opacity">{c.shop}</Link>
        <span aria-hidden>/</span>
        <span className="truncate">{collection}</span>
      </div>

      <div className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
        <ProductImageGallery product={product} activeImage={displayImage} />
        <div className="flex flex-col justify-start lg:pt-2">
          <div className="flex flex-wrap items-center gap-2.5">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[var(--c-primary)]">{productCategory(product, store)}</p>
            {isOnSale(product) && (
              <span className="rounded-full bg-red-600 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-widest text-white">-{salePercent(product)}%</span>
            )}
          </div>
          <h1 className="mt-3 text-3xl font-black leading-[1.08] tracking-tighter sm:text-5xl" style={{ fontFamily: theme.hero }}>{product.name}</h1>
          {details.subtitle && <p className="mt-3 text-lg font-bold opacity-55">{details.subtitle}</p>}

          <div className="my-6 flex flex-wrap items-baseline gap-3">
            <span className="text-3xl font-black tracking-tight">{money(displayPrice, store.currency)}</span>
            {displayCompareAt && displayCompareAt > displayPrice && (
              <span className="text-lg font-bold line-through opacity-35">{money(displayCompareAt, store.currency)}</span>
            )}
          </div>

          {details.shortDescription && <p className="mb-4 text-lg font-bold leading-relaxed">{details.shortDescription}</p>}
          {product.description && <p className="mb-6 whitespace-pre-line text-base font-medium leading-relaxed opacity-55">{product.description}</p>}

          {(product.tags || []).length > 0 && (
            <div className="mb-7 flex flex-wrap gap-2">
              {product.tags!.map((tag) => (
                <span key={tag} className="rounded-full bg-[var(--c-soft)] px-3.5 py-1 text-[11px] font-black uppercase tracking-[0.12em] border border-[var(--c-line)]/30">{tag}</span>
              ))}
            </div>
          )}

          {variable && (
            <ProductOptionSelector product={product} selections={selections} setSelections={setSelections} />
          )}

          {/* Buy box */}
          <div ref={buyBoxRef} className="mb-6 rounded-2xl bg-[var(--c-surface)] p-5 shadow-sm border border-[var(--c-line)]/25">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-[0.15em] opacity-45">{c.quantity}</span>
              {displayStock <= 5 && displayStock > 0 && (
                <span className="rounded-full bg-orange-50 px-2.5 py-1 text-[11px] font-bold text-orange-600">{c.onlyLeft.replace('{n}', String(displayStock))}</span>
              )}
              {displayStock <= 0 && (
                <span className="rounded-full bg-red-50 px-2.5 py-1 text-[11px] font-bold text-red-600">{c.soldOut}</span>
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
                disabled={!purchasable}
                className={cn(getCtaClass(buttonStyleOf(store)), 'flex-1 h-12 shadow-md')}
                onClick={() => addToCart(product.id, quantity, chosenVariant?.id)}
              >
                {ctaLabel}
              </button>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex items-center gap-3 rounded-xl bg-[var(--c-surface)] p-4 text-sm font-bold border border-[var(--c-line)]/25">
              <Truck className="h-5 w-5 opacity-60 shrink-0" />
              <span>{c.jordanDelivery}</span>
            </div>
            <div className="flex items-center gap-3 rounded-xl bg-[var(--c-surface)] p-4 text-sm font-bold border border-[var(--c-line)]/25">
              <ShieldCheck className="h-5 w-5 opacity-60 shrink-0" />
              <span>{c.cod}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Sticky mobile buy bar */}
      <AnimatePresence>
        {!buyBoxVisible && displayStock > 0 && (
          <motion.div
            initial={{ y: 80 }}
            animate={{ y: 0 }}
            exit={{ y: 80 }}
            transition={{ type: 'spring', stiffness: 380, damping: 36 }}
            className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--c-line)]/30 bg-[var(--c-bg)]/90 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-2xl lg:hidden"
          >
            <div className="mx-auto flex max-w-2xl items-center gap-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-black">{product.name}</p>
                <p className="text-sm font-bold opacity-60">{money(displayPrice, store.currency)}</p>
              </div>
              <button
                type="button"
                disabled={!purchasable}
                className={cn(getCtaClass(buttonStyleOf(store)), 'w-auto shrink-0 px-6 h-11')}
                onClick={() => {
                  if (variable && !chosenVariant) {
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                    return;
                  }
                  addToCart(product.id, quantity, chosenVariant?.id);
                }}
              >
                {ctaLabel}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Product details grid */}
      {(detailRows.length > 0 || (details.highlights || []).length > 0 || (details.specifications || []).length > 0) && (
        <Reveal>
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
        </Reveal>
      )}

      {related.length > 0 && (
        <Reveal>
          <section className="mt-16 border-t border-[var(--c-line)]/20 pt-12 sm:mt-20 sm:pt-14">
            <h2 className="mb-8 text-2xl font-black tracking-tight sm:text-3xl" style={{ fontFamily: theme.hero }}>{c.related}</h2>
            {/* Horizontal snap on mobile, grid on desktop */}
            <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:snap-none sm:grid-cols-2 sm:gap-4 sm:overflow-visible sm:px-0 lg:grid-cols-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {related.map((item) => (
                <div key={item.id} className="w-[70vw] max-w-[16rem] shrink-0 snap-start sm:w-auto sm:max-w-none">
                  <ProductCard product={item} store={store} addToCart={addToCart} templateId={template.id as TemplateId} />
                </div>
              ))}
            </div>
          </section>
        </Reveal>
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
    <div className="lg:sticky lg:top-24 space-y-3 self-start">
      <div className="aspect-square w-full overflow-hidden rounded-3xl border border-[var(--c-line)]/20 bg-[var(--c-surface)] shadow-xl shadow-black/5">
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
                      'min-h-10 rounded-full border px-4 text-sm font-black transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-30',
                      selected ? 'border-[var(--c-text)] bg-[var(--c-text)] text-[var(--c-bg)] shadow-sm' : 'border-[var(--c-line)]/40 bg-[var(--c-surface)] hover:border-[var(--c-text)]/60',
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
    <section className="mx-auto max-w-4xl px-4 py-14 sm:px-6 sm:py-16 lg:px-8">
      <Reveal>
        <p className="mb-4 text-[11px] font-black uppercase tracking-[0.2em] text-[var(--c-primary)]">{c.aboutTitle}</p>
        <h1 className="mb-10 text-4xl font-black tracking-tighter sm:text-6xl" style={{ fontFamily: theme.hero }}>{store.name}</h1>
        <div className="grid gap-6 md:grid-cols-[1.2fr_0.8fr]">
          <div className="whitespace-pre-line rounded-3xl bg-[var(--c-surface)] p-7 text-base font-medium leading-relaxed shadow-sm border border-[var(--c-line)]/25 sm:p-8">
            {store.about || store.tagline}
          </div>
          <div className="space-y-4">
            <div className="rounded-3xl bg-[var(--c-surface)] p-6 shadow-sm border border-[var(--c-line)]/25">
              <p className="mb-3 flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.18em] opacity-45"><Truck className="h-4 w-4" /> {c.shippingReturns}</p>
              <p className="text-sm font-medium leading-relaxed opacity-65">{shippingPolicyText(store)}</p>
            </div>
            {store.address && (
              <div className="rounded-3xl bg-[var(--c-surface)] p-6 shadow-sm border border-[var(--c-line)]/25">
                <p className="mb-3 text-[11px] font-black uppercase tracking-[0.18em] opacity-45">{c.location}</p>
                <p className="text-sm font-medium leading-relaxed opacity-65">{store.address}</p>
              </div>
            )}
          </div>
        </div>
      </Reveal>
    </section>
  );
}

function CartPage({ store, products, cartItems, summary, activeDiscount, setQuantity, openCheckout }: {
  store: Store;
  products: Product[];
  cartItems: CartItem[];
  summary: ReturnType<typeof computeOrderSummary>;
  activeDiscount?: Discount;
  setQuantity: (productId: string, quantity: number, variantId?: string) => void;
  openCheckout: () => void;
}) {
  const c = useCopy();
  return (
    <section className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="mb-8 text-4xl font-black tracking-tight sm:text-5xl">{c.cart}</h1>
      {cartItems.length === 0 ? (
        <EmptyState title={c.emptyCart} body={c.emptyCartHint} action={
          <Link to={`/s/${store.slug}`} className={cn(getCtaClass(buttonStyleOf(store)), 'w-auto px-8')}>{c.shop}</Link>
        } />
      ) : (
        <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
          <CartLines store={store} products={products} cartItems={cartItems} setQuantity={setQuantity} />
          <div className="rounded-2xl bg-[var(--c-surface)] p-6 shadow-sm border border-[var(--c-line)]/25 h-fit lg:sticky lg:top-24">
            <FreeShippingProgress store={store} summary={summary} />
            <SummaryRows store={store} summary={summary} activeDiscount={activeDiscount} />
            <button
              type="button"
              onClick={openCheckout}
              className={cn(getCtaClass(buttonStyleOf(store)), 'mt-6 shadow-md')}
            >
              {c.checkout}
            </button>
          </div>
        </div>
      )}
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

  if (!order) return (
    <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
      <EmptyState title="Order not found" body="Refresh protection for guest order lookup is deferred until the public lookup endpoint exists." />
    </div>
  );

  const invoiceNumber = order.invoiceNumber || `DRAFT-${order.id.slice(0, 8).toUpperCase()}`;
  return (
    <section className="mx-auto max-w-4xl px-4 py-14 sm:px-6 lg:px-8">
      <div className="mb-8 rounded-3xl bg-[var(--c-surface)] p-10 text-center shadow-sm border border-[var(--c-line)]/25">
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 18 }}
          className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-green-100"
        >
          <CheckCircle2 className="h-8 w-8 text-green-600" />
        </motion.div>
        <h1 className="text-3xl font-black tracking-tighter sm:text-4xl">{c.confirmed}</h1>
        <p className="mt-3 text-sm font-medium opacity-50">{c.reference}: <span className="font-mono font-bold opacity-100">{order.id}</span></p>
      </div>

      <div id="invoice" className="rounded-3xl bg-white p-6 text-neutral-950 shadow-xl border border-black/5 sm:p-8 print:shadow-none print:border-none print:p-0">
        <div className="mb-7 flex flex-col justify-between gap-5 border-b border-neutral-100 pb-7 sm:flex-row">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-neutral-400">{c.invoice}</p>
            <h2 className="mt-2 text-2xl font-black tracking-tight">{store.name}</h2>
            <p className="mt-1.5 text-sm text-neutral-500">{store.address}</p>
          </div>
          <div className="text-start sm:text-end">
            <p className="font-mono text-sm font-bold text-neutral-800">{invoiceNumber}</p>
            <p className="mt-1 text-sm text-neutral-500">{date(order.createdAt)}</p>
            <p className="mt-3 inline-block rounded-md bg-neutral-100 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-neutral-600">{order.paymentMethod || 'COD'}</p>
          </div>
        </div>
        <div className="mb-7 grid gap-7 sm:grid-cols-2">
          <InvoiceBlock title={c.customer} lines={[order.customerName, order.customerPhone, order.customerEmail].filter(Boolean) as string[]} />
          <InvoiceBlock title={c.delivery} lines={[order.shippingAddress || 'COD delivery address on file', order.note].filter(Boolean) as string[]} />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-100 text-start text-[11px] font-black uppercase tracking-[0.14em] text-neutral-400">
                <th className="py-4 text-start">Item</th>
                <th className="py-4 text-end">Qty</th>
                <th className="py-4 text-end">Unit</th>
                <th className="py-4 text-end">Line</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item, index) => (
                <tr key={`${item.productName}-${index}`} className="border-b border-neutral-50 last:border-0">
                  <td className="py-3.5 font-bold text-neutral-800">{item.productName}</td>
                  <td className="py-3.5 text-end font-medium text-neutral-600">{item.quantity}</td>
                  <td className="py-3.5 text-end font-medium text-neutral-600">{money(item.priceCents, order.currency || store.currency)}</td>
                  <td className="py-3.5 text-end font-black text-neutral-900">{money(item.priceCents * item.quantity, order.currency || store.currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="ms-auto mt-7 max-w-sm space-y-2.5 text-sm rounded-2xl bg-neutral-50 p-5">
          <InvoiceRow label={c.subtotal} value={money(order.subtotalCents, order.currency || store.currency)} />
          {(order.discountCents ?? 0) > 0 && <InvoiceRow label={c.discount} value={`-${money(order.discountCents ?? 0, order.currency || store.currency)}`} />}
          <InvoiceRow label={c.shipping} value={money(order.shippingCents ?? 0, order.currency || store.currency)} />
          <div className="border-t border-neutral-200 pt-4 mt-2">
            <InvoiceRow label={c.total} value={money(order.totalCents, order.currency || store.currency)} strong />
          </div>
        </div>
      </div>
      <div className="mt-7 flex flex-col gap-3 sm:flex-row print:hidden">
        <button type="button" onClick={() => window.print()} className="inline-flex h-12 flex-1 items-center justify-center gap-2.5 rounded-xl bg-[var(--c-text)] text-[11px] font-black uppercase tracking-[0.14em] text-[var(--c-bg)] transition-transform hover:scale-[1.02] active:scale-[0.98] shadow-lg">
          <Printer className="h-4 w-4" />{c.print}
        </button>
        <Link to={`/s/${store.slug}`} className="inline-flex h-12 flex-1 items-center justify-center rounded-xl bg-[var(--c-surface)] text-[11px] font-black uppercase tracking-[0.14em] border border-[var(--c-line)]/40 transition-colors hover:bg-[var(--c-soft)]">
          {c.continueShopping}
        </Link>
      </div>
    </section>
  );
}

/* ── Cart drawer ────────────────────────────────────────────────────── */

function FreeShippingProgress({ store, summary }: { store: Store; summary: ReturnType<typeof computeOrderSummary> }) {
  const c = useCopy();
  const threshold = store.shipping?.type === 'FREE_OVER' ? store.shipping.freeOverCents : undefined;
  if (!threshold || summary.subtotalCents <= 0) return null;
  const unlocked = summary.subtotalCents >= threshold || summary.freeShipping;
  const progress = Math.min(1, summary.subtotalCents / threshold);
  return (
    <div className="mb-4">
      <p className={cn('mb-2 text-xs font-bold', unlocked ? 'text-green-600' : 'opacity-60')}>
        {unlocked ? `✓ ${c.freeShipUnlocked}` : c.freeShipRemaining.replace('{amount}', money(threshold - summary.subtotalCents, store.currency))}
      </p>
      <div className="h-1.5 overflow-hidden rounded-full bg-[var(--c-soft)]">
        <motion.div
          className={cn('h-full rounded-full', unlocked ? 'bg-green-500' : 'bg-[var(--c-primary)]')}
          initial={false}
          animate={{ width: `${progress * 100}%` }}
          transition={{ type: 'spring', stiffness: 120, damping: 22 }}
        />
      </div>
    </div>
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
  activeDiscount?: Discount;
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
  const { dir } = useI18n();
  const reduce = useReducedMotion();
  const firstFocusable = useRef<HTMLButtonElement | null>(null);
  useEffect(() => { if (props.open) firstFocusable.current?.focus(); }, [props.open]);

  return (
    <AnimatePresence>
      {props.open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm"
            onMouseDown={(e) => { if (e.target === e.currentTarget) props.close(); }}
          />
          <motion.aside
            initial={reduce ? false : { x: dir === 'rtl' ? '-100%' : '100%' }}
            animate={{ x: 0 }}
            exit={reduce ? undefined : { x: dir === 'rtl' ? '-100%' : '100%' }}
            transition={{ type: 'spring', stiffness: 360, damping: 40 }}
            role="dialog"
            aria-modal="true"
            aria-label={props.checkoutOpen ? c.checkout : c.cart}
            className="fixed top-0 end-0 z-[101] flex h-full w-full max-w-[30rem] flex-col bg-[var(--c-bg)] text-[var(--c-text)] shadow-2xl"
          >
            <div className="flex h-16 shrink-0 items-center justify-between border-b border-[var(--c-line)]/30 bg-[var(--c-surface)]/80 backdrop-blur-xl px-5">
              <h2 className="flex items-center gap-2.5 text-xl font-black tracking-tight">
                {props.checkoutOpen ? c.checkout : c.cart}
                {!props.checkoutOpen && props.cartItems.length > 0 && (
                  <span className="rounded-full bg-[var(--c-soft)] px-2.5 py-0.5 text-xs font-black opacity-70">
                    {props.cartItems.reduce((sum, item) => sum + item.quantity, 0)}
                  </span>
                )}
              </h2>
              <button ref={firstFocusable} type="button" aria-label="Close" onClick={props.close} className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--c-soft)] hover:bg-[var(--c-line)]/30 transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              {props.checkoutOpen
                ? <CheckoutForm {...props} />
                : props.cartItems.length === 0
                  ? (
                    <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
                      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--c-soft)]"><ShoppingBag className="h-7 w-7 opacity-40" /></span>
                      <div>
                        <p className="text-lg font-black">{c.emptyCart}</p>
                        <p className="mt-1 text-sm font-medium opacity-50">{c.emptyCartHint}</p>
                      </div>
                      <button type="button" onClick={props.close} className={cn(getCtaClass(buttonStyleOf(props.store)), 'w-auto px-8')}>
                        {c.continueShopping}
                      </button>
                    </div>
                  )
                  : <CartLines store={props.store} products={props.products} cartItems={props.cartItems} setQuantity={props.setQuantity} />
              }
            </div>
            {props.cartItems.length > 0 && (
              <div className="shrink-0 border-t border-[var(--c-line)]/30 bg-[var(--c-surface)] p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] space-y-4">
                <FreeShippingProgress store={props.store} summary={props.summary} />
                <PromoBox {...props} />
                <SummaryRows store={props.store} summary={props.summary} activeDiscount={props.activeDiscount} />
                {props.checkoutError && (
                  <p className="rounded-xl bg-red-50 p-4 text-sm font-bold text-red-700 border border-red-200">{props.checkoutError}</p>
                )}
                <button
                  type={props.checkoutOpen ? 'submit' : 'button'}
                  form={props.checkoutOpen ? 'cod-checkout-form' : undefined}
                  disabled={props.submitting || props.summary.items.length === 0}
                  onClick={props.checkoutOpen ? undefined : props.openCheckout}
                  className={cn(getCtaClass(buttonStyleOf(props.store)), 'h-12 shadow-lg disabled:cursor-wait')}
                >
                  {props.checkoutOpen ? (props.submitting ? 'Placing order…' : c.placeOrder) : c.checkout}
                </button>
              </div>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

function CartLines({ store, products, cartItems, setQuantity }: { store: Store; products: Product[]; cartItems: CartItem[]; setQuantity: (productId: string, quantity: number, variantId?: string) => void }) {
  const c = useCopy();
  if (cartItems.length === 0) return <EmptyState title={c.emptyCart} body={c.emptyCartHint} />;
  return (
    <div className="space-y-3">
      {cartItems.map((item) => {
        const product = products.find((p) => p.id === item.productId);
        if (!product) return null;
        const variant = findCartVariant(product, item);
        const unitPrice = lineUnitPrice(product, variant);
        const max = lineMaxQuantity(product, variant);
        return (
          <div key={cartLineKey(item)} className="grid grid-cols-[5rem_1fr] gap-4 rounded-2xl bg-[var(--c-surface)] p-3.5 border border-[var(--c-line)]/25 shadow-sm">
            {variant?.imageUrl
              ? <img src={variant.imageUrl} alt={variant.title} className="aspect-square rounded-xl bg-[var(--c-bg)] object-cover" />
              : <ProductThumb product={product} className="aspect-square rounded-xl bg-[var(--c-bg)] overflow-hidden" />
            }
            <div className="min-w-0 flex flex-col justify-between">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <Link to={`/s/${store.slug}/p/${product.id}`} className="block truncate text-sm font-black hover:opacity-70 transition-opacity">{product.name}</Link>
                  {variant && <p className="mt-0.5 truncate text-[11px] font-bold uppercase tracking-[0.1em] opacity-40">{variant.title}</p>}
                  <p className="mt-0.5 text-xs font-medium opacity-55">{money(unitPrice, store.currency)}</p>
                </div>
                <button type="button" aria-label={c.remove} className="rounded-full p-1.5 opacity-35 hover:opacity-100 hover:bg-[var(--c-soft)] transition-all shrink-0" onClick={() => setQuantity(product.id, 0, item.variantId)}>
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <QuantityStepper value={item.quantity} max={max} onChange={(v) => setQuantity(product.id, v, item.variantId)} compact />
                <p className="text-sm font-black">{money(unitPrice * item.quantity, store.currency)}</p>
              </div>
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
    <form id="cod-checkout-form" className="space-y-5" onSubmit={form.handleSubmit(submitCheckout)}>
      <div className="rounded-xl bg-[var(--c-soft)] p-4 border border-[var(--c-line)]/20">
        <p className="flex items-center gap-2.5 text-sm font-black"><ShieldCheck className="h-5 w-5 shrink-0" /> {c.cod}</p>
        <p className="mt-1.5 text-xs font-medium leading-relaxed opacity-55">Stock, discounts, and shipping are verified server-side before the order is confirmed.</p>
      </div>
      <Field form={form} name="customerName" label={c.fullName} />
      <Field form={form} name="customerPhone" label={c.phone} type="tel" placeholder="0790000000" />
      <Field form={form} name="customerEmail" label={c.emailOptional} type="email" />
      <label className="block">
        <span className="mb-1.5 block text-[11px] font-black uppercase tracking-[0.14em] opacity-45">{c.governorate}</span>
        <select {...form.register('governorate')} className="h-11 w-full rounded-xl border border-[var(--c-line)]/40 bg-[var(--c-surface)] px-3.5 text-sm font-medium focus:border-[var(--c-text)]/50 focus:ring-1 focus:ring-[var(--c-text)]/30 outline-none">
          {GOVERNORATES.map((g) => <option key={g} value={g}>{g}</option>)}
        </select>
        <FieldError form={form} name="governorate" />
      </label>
      <label className="block">
        <span className="mb-1.5 block text-[11px] font-black uppercase tracking-[0.14em] opacity-45">{c.shipping}</span>
        <select {...form.register('shippingOption')} className="h-11 w-full rounded-xl border border-[var(--c-line)]/40 bg-[var(--c-surface)] px-3.5 text-sm font-medium focus:border-[var(--c-text)]/50 focus:ring-1 focus:ring-[var(--c-text)]/30 outline-none">
          <option value={store.shipping?.type === 'PICKUP' ? 'PICKUP' : 'DELIVERY'}>{store.shipping?.type === 'PICKUP' ? 'Pickup' : 'Delivery'}</option>
        </select>
      </label>
      <Field form={form} name="address" label={c.address} />
      <label className="block">
        <span className="mb-1.5 block text-[11px] font-black uppercase tracking-[0.14em] opacity-45">{c.note}</span>
        <textarea {...form.register('note')} rows={3} className="w-full rounded-xl border border-[var(--c-line)]/40 bg-[var(--c-surface)] px-3.5 py-2.5 text-sm font-medium focus:border-[var(--c-text)]/50 focus:ring-1 focus:ring-[var(--c-text)]/30 outline-none resize-none" />
        <FieldError form={form} name="note" />
      </label>
      <button type="button" onClick={backToCart} className="inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.12em] opacity-45 hover:opacity-100 transition-opacity">
        <ArrowLeft className="h-3.5 w-3.5 rtl:rotate-180" /> {c.cart}
      </button>
    </form>
  );
}

function PromoBox(props: { checkoutOpen: boolean; promoInput: string; promoMessage?: string; setPromoInput: (v: string) => void; applyPromo: () => void; removePromo: () => void; summary: ReturnType<typeof computeOrderSummary> }) {
  const c = useCopy();
  if (!props.checkoutOpen) return null;
  return (
    <div>
      <div className="flex rounded-xl bg-[var(--c-surface)] border border-[var(--c-line)]/35 focus-within:border-[var(--c-text)]/50 transition-all overflow-hidden">
        <input
          value={props.promoInput}
          onChange={(e) => props.setPromoInput(e.target.value.toUpperCase())}
          placeholder={c.promo}
          className="h-10 min-w-0 flex-1 bg-transparent px-4 text-sm font-mono font-bold uppercase focus:outline-none"
        />
        {props.summary.discountCode
          ? <button type="button" onClick={props.removePromo} className="px-4 text-xs font-black uppercase tracking-[0.1em] hover:bg-red-50 hover:text-red-600 transition-colors">{c.remove}</button>
          : <button type="button" onClick={props.applyPromo} className="bg-[var(--c-text)] px-4 text-xs font-black uppercase tracking-[0.1em] text-[var(--c-bg)] transition-opacity hover:opacity-80">{c.apply}</button>
        }
      </div>
      {props.promoMessage && <p className="mt-2 text-xs font-bold opacity-60 px-1">{props.promoMessage}</p>}
    </div>
  );
}

export function SummaryRows({ store, summary, activeDiscount }: { store: Store; summary: ReturnType<typeof computeOrderSummary>; activeDiscount?: Discount }) {
  const c = useCopy();
  const isBxgy = activeDiscount?.type === 'BXGY' && summary.discountCents > 0;
  const bundleTotal = isBxgy ? summary.subtotalCents - summary.discountCents : 0;
  return (
    <div className="space-y-2.5 text-sm">
      <SummaryRow label={c.subtotal} value={money(summary.subtotalCents, store.currency)} />
      {isBxgy && <SummaryRow label={`Bundle price${summary.discountCode ? ` (${summary.discountCode})` : ''}`} value={money(bundleTotal, store.currency)} highlight />}
      {!isBxgy && summary.discountCents > 0 && <SummaryRow label={`${c.discount}${summary.discountCode ? ` (${summary.discountCode})` : ''}`} value={`-${money(summary.discountCents, store.currency)}`} />}
      <SummaryRow label={c.shipping} value={summary.shippingCents === 0 ? c.free : money(summary.shippingCents, store.currency)} />
      <div className="border-t border-[var(--c-line)]/20 pt-3 mt-1">
        <SummaryRow label={c.total} value={money(summary.totalCents, store.currency)} strong />
      </div>
    </div>
  );
}

/* ── Product grid + cards ───────────────────────────────────────────── */

function ProductGrid({ products, store, addToCart, templateId = 'editorial' }: {
  products: Product[];
  store: Store;
  addToCart: (productId: string, quantity?: number, variantId?: string) => void;
  templateId?: TemplateId;
}) {
  return (
    <div className={cn(
      'grid',
      templateId === 'market' ? 'grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 md:grid-cols-4 lg:grid-cols-5' :
      templateId === 'boutique' ? 'grid-cols-2 gap-3 gap-y-8 sm:gap-5 lg:grid-cols-3 lg:gap-6' :
      templateId === 'lookbook' ? 'grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4 [&>*:first-child]:col-span-2 [&>*:first-child]:sm:col-span-2' :
      'grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4',
    )}>
      {products.map((product, index) => (
        <ProductCard
          key={product.id}
          product={product}
          store={store}
          addToCart={addToCart}
          templateId={templateId}
          featured={templateId === 'lookbook' && index === 0}
        />
      ))}
    </div>
  );
}

function ProductCard({ product, store, addToCart, templateId, featured = false }: {
  product: Product;
  store: Store;
  addToCart: (productId: string, quantity?: number, variantId?: string) => void;
  templateId: TemplateId;
  featured?: boolean;
}) {
  const c = useCopy();
  const variable = isVariableProduct(product);
  const soldOut = productStock(product) <= 0;
  const priceRange = productPriceRange(product);
  const swatches = colorValues(product);
  const sale = isOnSale(product);
  const btnStyle = buttonStyleOf(store);
  const isCompact = templateId === 'market';
  const isBoutique = templateId === 'boutique';
  const images = productImages(product);
  const hoverImage = images[1]?.url;

  return (
    <article className={cn(
      'group flex flex-col overflow-hidden transition-all duration-300',
      isBoutique
        ? 'bg-transparent'
        : cn(
            'bg-[var(--c-surface)] border border-[var(--c-line)]/30 hover:-translate-y-1 hover:shadow-xl hover:shadow-[var(--c-text)]/8 hover:border-[var(--c-line)]/60',
            isCompact ? 'rounded-xl' : 'rounded-2xl',
          ),
    )}>
      {/* Image */}
      <Link to={`/s/${store.slug}/p/${product.id}`} className={cn('relative block overflow-hidden', isBoutique && 'rounded-2xl border border-[var(--c-line)]/20')}>
        <div className={cn(
          'relative overflow-hidden bg-[var(--c-soft)]',
          featured ? 'aspect-[16/9]' :
          templateId === 'market' ? 'aspect-square' :
          isBoutique ? 'aspect-[3/4]' :
          'aspect-[4/5]',
        )}>
          {productPrimaryImage(product)
            ? (
              <>
                <img src={productPrimaryImage(product)!} alt={product.name} loading="lazy" decoding="async" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.05]" />
                {hoverImage && (
                  <img src={hoverImage} alt="" aria-hidden loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
                )}
              </>
            )
            : <div className="h-full w-full flex items-center justify-center transition-transform duration-700 group-hover:scale-[1.05]">
                <span className="text-4xl opacity-40">{product.imageEmoji || '📦'}</span>
              </div>
          }
        </div>
        {/* Sold-out overlay */}
        {soldOut && (
          <div className="absolute inset-0 bg-[var(--c-bg)]/70 backdrop-blur-[1px] flex items-center justify-center">
            <span className="rounded-full bg-[var(--c-text)] px-4 py-1.5 text-[10px] font-black uppercase tracking-widest text-[var(--c-bg)]">{c.soldOut}</span>
          </div>
        )}
        {/* Badges */}
        {sale && !soldOut && (
          <span className="absolute start-3 top-3 rounded-full bg-red-600 px-2.5 py-1 text-[9px] font-black uppercase tracking-widest text-white shadow-sm">
            -{salePercent(product)}%
          </span>
        )}
        {/* Desktop hover quick-add (simple products only — variants need the detail page) */}
        {!soldOut && !variable && (
          <button
            type="button"
            aria-label={`${c.quickAdd}: ${product.name}`}
            onClick={(event) => { event.preventDefault(); addToCart(product.id); }}
            className="absolute bottom-3 end-3 hidden h-10 w-10 items-center justify-center rounded-full bg-[var(--c-text)] text-[var(--c-bg)] shadow-lg transition-all duration-300 sm:flex sm:translate-y-2 sm:opacity-0 sm:group-hover:translate-y-0 sm:group-hover:opacity-100 focus-visible:translate-y-0 focus-visible:opacity-100 hover:scale-105 active:scale-95"
          >
            <Plus className="h-4 w-4" />
          </button>
        )}
      </Link>

      {/* Info */}
      <div className={cn('flex flex-col flex-1', isCompact ? 'p-2.5' : isBoutique ? 'px-1 pt-3 pb-1' : 'p-3.5 sm:p-4')}>
        <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.16em] opacity-35 truncate">{productCategory(product, store)}</p>
        <Link
          to={`/s/${store.slug}/p/${product.id}`}
          className={cn('mt-0.5 font-black leading-snug hover:opacity-60 transition-opacity', isCompact ? 'text-xs line-clamp-2' : 'text-sm sm:text-[15px] line-clamp-2')}
        >
          {product.name}
        </Link>
        <div className={cn('mt-1 flex items-baseline gap-2 font-bold', isCompact ? 'text-xs' : 'text-sm')}>
          {priceRange.min !== priceRange.max
            ? <span>From {money(priceRange.min, store.currency)}</span>
            : <>
                <span>{money(priceRange.min, store.currency)}</span>
                {product.compareAtCents && product.compareAtCents > product.priceCents && (
                  <span className="line-through opacity-35 font-medium">{money(product.compareAtCents, store.currency)}</span>
                )}
              </>
          }
        </div>
        {swatches.length > 0 && (
          <div className="mt-2 flex gap-1">
            {swatches.slice(0, 6).map((s) => (
              <span key={s.id} title={s.value} className="h-3 w-3 rounded-full ring-1 ring-[var(--c-line)]/60" style={{ backgroundColor: s.colorHex }} />
            ))}
            {swatches.length > 6 && <span className="text-[10px] font-bold opacity-40">+{swatches.length - 6}</span>}
          </div>
        )}
      </div>

      {/* CTA */}
      <div className={cn(isCompact ? 'px-2.5 pb-2.5' : isBoutique ? 'px-1 pb-1 pt-2' : 'px-3.5 pb-3.5 sm:px-4 sm:pb-4')}>
        {variable ? (
          <Link
            to={`/s/${store.slug}/p/${product.id}`}
            className={cn(getCtaClass(btnStyle), isCompact ? 'h-9 text-[10px]' : '')}
          >
            {c.chooseOptions}
          </Link>
        ) : (
          <button
            type="button"
            disabled={soldOut}
            onClick={() => !soldOut && addToCart(product.id)}
            className={cn(getCtaClass(btnStyle), isCompact ? 'h-9 text-[10px]' : '')}
          >
            {soldOut ? c.soldOut : c.addToCart}
          </button>
        )}
      </div>
    </article>
  );
}

function ProductThumb({ product, className = '' }: { product: Product; className?: string }) {
  const image = productPrimaryImage(product);
  return (
    <div className={cn('relative grid place-items-center overflow-hidden', className)}>
      {image
        ? <img src={image} alt={product.name} className="h-full w-full object-cover" loading="lazy" decoding="async" />
        : <span className="text-5xl opacity-25">{product.imageEmoji || '📦'}</span>
      }
    </div>
  );
}

function ProductLogo({ store, large = false }: { store: Store; large?: boolean }) {
  if (store.logoUrl) {
    return <img src={store.logoUrl} alt={store.name} className={cn('object-cover rounded-xl border border-[var(--c-line)]/20', large ? 'h-32 w-32 rounded-2xl' : 'h-9 w-9')} />;
  }
  return (
    <span className={cn('grid place-items-center rounded-xl bg-[var(--c-soft)] border border-[var(--c-line)]/30', large ? 'h-32 w-32 rounded-2xl text-6xl' : 'h-9 w-9 text-xl')}>
      {store.logoEmoji || '🛍️'}
    </span>
  );
}

function QuantityStepper({ value, max, onChange, compact = false }: { value: number; max: number; onChange: (v: number) => void; compact?: boolean }) {
  return (
    <div className={cn('inline-flex items-center rounded-full bg-[var(--c-surface)] border border-[var(--c-line)]/35', compact ? 'h-9' : 'h-12')}>
      <button type="button" aria-label="Decrease" disabled={value <= 1} onClick={() => onChange(value - 1)} className="grid h-full w-10 place-items-center rounded-s-full hover:bg-[var(--c-soft)] transition-colors disabled:opacity-25 active:scale-90">
        <Minus className="h-3.5 w-3.5" />
      </button>
      <span className={cn('w-9 text-center font-black tabular-nums', compact ? 'text-sm' : 'text-base')}>{value}</span>
      <button type="button" aria-label="Increase" disabled={value >= max} onClick={() => onChange(value + 1)} className="grid h-full w-10 place-items-center rounded-e-full hover:bg-[var(--c-soft)] transition-colors disabled:opacity-25 active:scale-90">
        <Plus className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function Field({ form, name, label, type = 'text', placeholder }: { form: UseFormReturn<CheckoutValues>; name: FieldPath<CheckoutValues>; label: string; type?: string; placeholder?: string }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-black uppercase tracking-[0.14em] opacity-45">{label}</span>
      <input type={type} placeholder={placeholder} {...form.register(name)} className="h-11 w-full rounded-xl border border-[var(--c-line)]/40 bg-[var(--c-surface)] px-3.5 text-sm font-medium focus:border-[var(--c-text)]/50 focus:ring-1 focus:ring-[var(--c-text)]/30 outline-none placeholder:opacity-30" />
      <FieldError form={form} name={name} />
    </label>
  );
}

function FieldError({ form, name }: { form: UseFormReturn<CheckoutValues>; name: FieldPath<CheckoutValues> }) {
  const error = form.formState.errors[name]?.message;
  return error ? <span className="mt-1.5 block text-[11px] font-bold text-red-500">{String(error)}</span> : null;
}

function SummaryRow({ label, value, strong = false, highlight = false }: { label: string; value: string; strong?: boolean; highlight?: boolean }) {
  return (
    <div className={cn('flex items-center justify-between gap-4', strong && 'text-base font-black tracking-tight')}>
      <span className={cn('font-medium', highlight ? 'opacity-100 text-[var(--c-accent)]' : 'opacity-55')}>{label}</span>
      <span className={cn('font-black', highlight ? 'text-[var(--c-accent)]' : !strong && 'opacity-75')}>{value}</span>
    </div>
  );
}

function InvoiceRow({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={cn('flex justify-between gap-4', strong && 'text-base font-black text-neutral-900')}>
      <span className="text-neutral-500">{label}</span>
      <span className="font-bold text-neutral-800">{value}</span>
    </div>
  );
}

function InvoiceBlock({ title, lines }: { title: string; lines: string[] }) {
  return (
    <div>
      <h3 className="mb-2.5 text-[11px] font-black uppercase tracking-[0.18em] text-neutral-400">{title}</h3>
      <div className="space-y-1">
        {lines.map((line) => <p key={line} className="text-sm font-medium text-neutral-700">{line}</p>)}
      </div>
    </div>
  );
}

function ProductInfoList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-2xl bg-[var(--c-surface)] p-5 shadow-sm border border-[var(--c-line)]/25">
      <h3 className="mb-4 text-[11px] font-black uppercase tracking-[0.18em] opacity-45">{title}</h3>
      <ul className="space-y-2">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-3 text-sm font-medium">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--c-primary)] opacity-70" />
            <span className="opacity-70">{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ProductSpecs({ title, rows }: { title: string; rows: [string, string][] }) {
  return (
    <div className="rounded-2xl bg-[var(--c-surface)] p-5 shadow-sm border border-[var(--c-line)]/25">
      <h3 className="mb-4 text-[11px] font-black uppercase tracking-[0.18em] opacity-45">{title}</h3>
      <dl className="space-y-2.5">
        {rows.map(([k, v]) => (
          <div key={k} className="grid grid-cols-2 gap-3 text-sm">
            <dt className="font-black opacity-40">{k}</dt>
            <dd className="font-medium opacity-70 break-words">{v}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function ProductInfoText({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl bg-[var(--c-surface)] p-5 shadow-sm border border-[var(--c-line)]/25">
      <h3 className="mb-4 text-[11px] font-black uppercase tracking-[0.18em] opacity-45">{title}</h3>
      <p className="whitespace-pre-line text-sm font-medium leading-relaxed opacity-65">{body}</p>
    </div>
  );
}

function FilterChip({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        'rounded-full px-4 py-1.5 text-[11px] font-black uppercase tracking-[0.12em] border transition-all active:scale-95',
        active ? 'border-[var(--c-text)] bg-[var(--c-text)] text-[var(--c-bg)] shadow-sm' : 'border-[var(--c-line)]/40 bg-[var(--c-surface)] opacity-55 hover:opacity-100',
      )}
    >
      {label}
    </button>
  );
}

function EmptyState({ title, body, action }: { title: string; body: string; action?: React.ReactNode }) {
  return (
    <div className="rounded-3xl bg-[var(--c-surface)] p-12 text-center border border-[var(--c-line)]/25 shadow-sm">
      <span className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--c-soft)]">
        <Search className="h-6 w-6 opacity-30" />
      </span>
      <h3 className="text-2xl font-black tracking-tight">{title}</h3>
      {body && <p className="mx-auto mt-2.5 max-w-md text-sm font-medium opacity-45">{body}</p>}
      {action && <div className="mt-7 flex justify-center">{action}</div>}
    </div>
  );
}

function StorefrontSkeleton() {
  return (
    <div className="min-h-screen animate-pulse bg-neutral-50">
      <div className="h-16 bg-white border-b border-black/5" />
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 space-y-8">
        <div className="grid gap-8 lg:grid-cols-2">
          <div className="space-y-4 py-10">
            <div className="h-6 w-32 rounded-full bg-black/5" />
            <div className="h-16 w-4/5 rounded-2xl bg-black/5" />
            <div className="h-16 w-3/5 rounded-2xl bg-black/5" />
            <div className="h-12 w-44 rounded-full bg-black/10" />
          </div>
          <div className="aspect-[4/5] max-h-[28rem] rounded-3xl bg-black/5" />
        </div>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="aspect-[4/5] rounded-2xl bg-black/5" />
              <div className="h-4 w-3/4 rounded bg-black/5" />
              <div className="h-4 w-1/3 rounded bg-black/5" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Unavailable({ title, body, actionLabel, onAction }: { title: string; body: string; actionLabel?: string; onAction?: () => void }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 p-6 text-neutral-950">
      <div className="w-full max-w-md rounded-2xl bg-white p-10 text-center shadow-xl border border-black/5">
        <AlertCircle className="mx-auto mb-5 h-10 w-10 text-neutral-300" />
        <h1 className="text-3xl font-black tracking-tight">{title}</h1>
        <p className="mt-3 text-sm font-medium leading-relaxed text-neutral-500">{body}</p>
        <div className="mt-8 flex flex-col gap-3">
          {onAction && (
            <button type="button" onClick={onAction} className="h-12 rounded-xl bg-black text-sm font-black text-white transition-transform active:scale-95 shadow-lg">{actionLabel}</button>
          )}
          <Link to="/" className="inline-flex h-12 items-center justify-center rounded-xl bg-neutral-100 text-sm font-bold transition-colors hover:bg-neutral-200">Home</Link>
        </div>
      </div>
    </div>
  );
}

function OfflineBanner({ message }: { message: string }) {
  return (
    <div className="fixed inset-x-0 top-0 z-[120] bg-yellow-400 px-4 py-3 text-center text-[11px] font-black uppercase tracking-[0.14em] text-yellow-950 shadow-md">
      {message}
    </div>
  );
}

function shippingPolicyText(store: Store) {
  const s = store.shipping;
  if (!s || s.type === 'FLAT') return `Delivery is available across Jordan. Shipping is ${money(s?.flatCents ?? 0, store.currency)} and Cash on Delivery is supported.`;
  if (s.type === 'FREE_OVER') return `Delivery is ${money(s.flatCents ?? 0, store.currency)} and free over ${money(s.freeOverCents ?? 0, store.currency)}. Cash on Delivery is supported.`;
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
