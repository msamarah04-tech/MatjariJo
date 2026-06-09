import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { formatMoney, DEFAULT_CURRENCY } from '@shared/money';
import { setMoneyLocale } from '@/lib/format';

export type Lang = 'en' | 'ar';
const STORAGE_KEY = 'plinth-lang';
export const AMMAN_TZ = 'Asia/Amman';

const localeFor = (lang: Lang) => (lang === 'ar' ? 'ar-JO' : 'en-JO');

type Dict = Record<string, string>;

const en: Dict = {
  // ── lang toggle ──────────────────────────────────────────────────────────
  language: 'العربية',

  // ── global chrome ────────────────────────────────────────────────────────
  signIn: 'Sign in',
  signOut: 'Sign out',
  signingIn: 'Signing in…',
  usernameOrEmail: 'Username or email',
  password: 'Password',
  clearLocalSession: 'Clear local session',
  clearSessionPrompt: 'Clear local session?',
  backendConnected: 'Backend connected',

  // ── storefront ───────────────────────────────────────────────────────────
  products: 'Products',
  cart: 'Cart',
  checkout: 'Checkout',
  addToCart: 'Add to cart',
  outOfStock: 'Out of stock',
  emptyCart: 'Your cart is empty',
  placeOrder: 'Place order',
  subtotal: 'Subtotal',
  discount: 'Discount',
  tax: 'Tax',
  shipping: 'Shipping',
  total: 'Total',
  free: 'Free',
  pickup: 'Pickup',
  orderPlaced: 'Order placed',
  continueShopping: 'Continue shopping',
  customerName: 'Full name',
  customerEmail: 'Email',
  customerPhone: 'Mobile (07…)',
  address: 'Address',
  discountCode: 'Discount code',
  apply: 'Apply',
  note: 'Note (optional)',
  taxIncluded: 'incl. tax',
  codNote: 'Pay with cash on delivery',

  // ── landing – nav ────────────────────────────────────────────────────────
  navFeatures: 'Features',
  navHowItWorks: 'How it works',
  navBrands: 'Brands',
  navLogIn: 'Log in',
  navStartSelling: 'Start Selling',

  // ── landing – hero ───────────────────────────────────────────────────────
  heroBadge: "Powering Jordan's next generation of commerce",
  heroLine1: 'Your brand.',
  heroLine2: 'Your',
  heroLine3: 'storefront.',
  heroSub: 'A self-hosted multi-store commerce platform built for Jordanian entrepreneurs. Launch a premium storefront in minutes, not months.',
  heroCtaPrimary: 'Request your store',
  heroCtaSecondary: 'Explore features',

  // ── landing – stats ──────────────────────────────────────────────────────
  statThemesLabel: 'Premium Themes',
  statAnalyticsLabel: 'Day Analytics Window',
  statDiscountLabel: 'Discount Types',
  statUptimeLabel: 'Uptime SLA',

  // ── landing – features ───────────────────────────────────────────────────
  featuresTag: 'Platform Features',
  featuresTitle: 'Everything you need to sell online in Jordan.',
  featStorefrontTitle: 'Luxury Storefronts',
  featStorefrontDesc: 'Five exclusive themes — Mono, Sunset, Forest, Mocha, Noir — applied instantly at runtime. Preview live before you publish.',
  featAnalyticsTitle: 'Real-Time Analytics',
  featAnalyticsDesc: 'Track views, cart additions, and AOV with a 90-day funnel. Understand exactly where your customers drop off.',
  featOrdersTitle: 'Smart Order Flow',
  featOrdersDesc: 'A built-in approval queue lets you review orders before fulfillment — ideal for COD and custom delivery workflows.',
  featDiscountsTitle: 'Flexible Discounts',
  featDiscountsDesc: 'Percentage, fixed-amount, or free-shipping codes. Set usage limits, minimum carts, and expiry dates.',
  featShippingTitle: 'Local Shipping',
  featShippingDesc: 'Flat-rate or free-over-threshold shipping rules built for Jordanian governorates and regional couriers.',
  featSecurityTitle: 'Enterprise Security',
  featSecurityDesc: 'JWT auth, httpOnly cookies, per-account brute-force lockout, and server-authoritative stock checks at checkout.',

  // ── landing – themes ─────────────────────────────────────────────────────
  themesTag: 'Storefront Design',
  themesTitle: 'Five themes.\nInfinite personality.',
  themesSub: 'Switch between Mono, Sunset, Forest, Mocha, and Noir with a single click. Every theme is optimised for conversion and previewed live before you publish.',
  themesGetStore: 'Get your store',

  // ── landing – how it works ───────────────────────────────────────────────
  howTag: 'How it works',
  howTitle: 'Launch in four simple steps.',
  howSub: 'From idea to live storefront — no code, no server setup, no waiting weeks for an agency.',
  step01Title: 'Request',
  step01Body: 'Submit your brand name, category, and a short pitch to get approved on the platform.',
  step02Title: 'Design',
  step02Body: 'Pick a theme, upload your logo, and set your announcement bar — all from a clean sidebar.',
  step03Title: 'Stock',
  step03Body: 'Upload products with images, variants, and pricing. Organise into collections.',
  step04Title: 'Launch',
  step04Body: 'Open your storefront and start accepting orders on the same day.',

  // ── landing – brands ─────────────────────────────────────────────────────
  brandsTag: 'Showcase',
  brandsTitle: 'Built for brand leaders.',
  brandsJoin: 'Join them',

  // ── landing – faq ────────────────────────────────────────────────────────
  faqTag: 'FAQ',
  faqTitle: 'Common questions.',
  faq1Q: 'Is Plinth optimised for businesses in Jordan?',
  faq1A: 'Yes. Every detail — from JOD currency with 3-decimal precision to the COD approval workflow and Jordan phone validation — is purpose-built for the local market.',
  faq2Q: 'How customisable are the storefronts?',
  faq2A: 'Completely. Switch themes instantly, upload your logo, configure announcements, set your brand colours, and preview every change live before publishing.',
  faq3Q: 'Can I run discount campaigns and track their impact?',
  faq3A: 'Yes. Create percentage, fixed-amount, or free-shipping codes with usage caps, minimum cart thresholds, and expiry dates. Analytics shows revenue impact per campaign.',
  faq4Q: 'Do I need to install anything?',
  faq4A: 'No software, no plugins. Plinth runs entirely in the browser — manage your store from any device, anywhere.',

  // ── landing – cta ────────────────────────────────────────────────────────
  ctaBadge: 'Ready to launch?',
  ctaTitle1: 'Start selling in',
  ctaTitle2: 'Jordan today.',
  ctaSub: 'Join a growing community of Jordanian brands using Plinth to run their online business with zero complexity.',
  ctaPrimary: 'Request your store',
  ctaSecondary: 'Merchant login',

  // ── landing – footer ─────────────────────────────────────────────────────
  footerCopyright: `© ${new Date().getFullYear()} Plinth. Built for Jordan.`,
  footerStartSelling: 'Start Selling',
  footerMerchantLogin: 'Merchant Login',
  footerFeatures: 'Features',
  footerHowItWorks: 'How it works',

  // ── admin nav ────────────────────────────────────────────────────────────
  navOverview: 'Overview',
  navProducts: 'Products',
  navOrders: 'Orders',
  navDiscounts: 'Discounts',
  navAnalytics: 'Analytics',
  navAppearance: 'Appearance',
  adminStoreDashboard: 'Store dashboard',
  adminSearch: 'Search',
  adminStorefront: 'Storefront',
  adminViewStorefront: 'View storefront',
  adminBackToPlatform: 'Back to platform',
  adminRequestWebsite: 'Request website',
  adminNoStoresTitle: 'No stores yet',
  adminNoStoresDesc: "You don't have any stores. Send a website request and the team will set one up for you.",
  adminRequestFirst: 'Request your first website',
  adminNoAccessTitle: 'Store not available',
  adminNoAccessDesc: "This store doesn't exist or you don't have access to it.",
  adminGoToMyStores: 'Go to my stores',
  adminMaintenanceMsg: 'Maintenance mode is on — your storefront shows a maintenance notice to customers.',

  // ── platform nav ─────────────────────────────────────────────────────────
  navShopRequests: 'Shop Requests',
  navStores: 'Stores',
  navModeration: 'Moderation',
  navSupport: 'Support',
  navAuditLog: 'Audit Log',
  navSettings: 'Settings',
  platformControlCenter: 'Control Center',
  platformSearch: 'Search',
  platformMaintenanceMsg: 'Maintenance mode is on — storefronts show a maintenance notice to customers.',
  platformWorkspace: 'Backend-connected workspace',
};

const ar: Dict = {
  // ── lang toggle ──────────────────────────────────────────────────────────
  language: 'English',

  // ── global chrome ────────────────────────────────────────────────────────
  signIn: 'تسجيل الدخول',
  signOut: 'تسجيل الخروج',
  signingIn: 'جارٍ تسجيل الدخول…',
  usernameOrEmail: 'اسم المستخدم أو البريد الإلكتروني',
  password: 'كلمة المرور',
  clearLocalSession: 'مسح الجلسة المحلية',
  clearSessionPrompt: 'مسح الجلسة المحلية؟',
  backendConnected: 'متصل بالخادم',

  // ── storefront ───────────────────────────────────────────────────────────
  products: 'المنتجات',
  cart: 'السلة',
  checkout: 'إتمام الشراء',
  addToCart: 'أضِف إلى السلة',
  outOfStock: 'غير متوفر',
  emptyCart: 'سلتك فارغة',
  placeOrder: 'تأكيد الطلب',
  subtotal: 'المجموع الفرعي',
  discount: 'الخصم',
  tax: 'الضريبة',
  shipping: 'الشحن',
  total: 'الإجمالي',
  free: 'مجاني',
  pickup: 'استلام',
  orderPlaced: 'تم استلام الطلب',
  continueShopping: 'متابعة التسوق',
  customerName: 'الاسم الكامل',
  customerEmail: 'البريد الإلكتروني',
  customerPhone: 'الجوال (07…)',
  address: 'العنوان',
  discountCode: 'رمز الخصم',
  apply: 'تطبيق',
  note: 'ملاحظة (اختياري)',
  taxIncluded: 'شامل الضريبة',
  codNote: 'الدفع نقدًا عند الاستلام',

  // ── landing – nav ────────────────────────────────────────────────────────
  navFeatures: 'المميزات',
  navHowItWorks: 'كيف يعمل',
  navBrands: 'العلامات',
  navLogIn: 'تسجيل الدخول',
  navStartSelling: 'ابدأ البيع',

  // ── landing – hero ───────────────────────────────────────────────────────
  heroBadge: 'نحو جيل جديد من التجارة الإلكترونية في الأردن',
  heroLine1: 'علامتك.',
  heroLine2: 'متجرك',
  heroLine3: 'الخاص.',
  heroSub: 'منصة تجارة إلكترونية متعددة المتاجر، مبنية للمنتجين الأردنيين. أطلق متجرك المميز في دقائق لا في أشهر.',
  heroCtaPrimary: 'اطلب متجرك',
  heroCtaSecondary: 'استكشف المميزات',

  // ── landing – stats ──────────────────────────────────────────────────────
  statThemesLabel: 'قالب متميز',
  statAnalyticsLabel: 'يوم نافذة تحليلات',
  statDiscountLabel: 'أنواع الخصومات',
  statUptimeLabel: 'ضمان التشغيل',

  // ── landing – features ───────────────────────────────────────────────────
  featuresTag: 'مميزات المنصة',
  featuresTitle: 'كل ما تحتاجه للبيع عبر الإنترنت في الأردن.',
  featStorefrontTitle: 'واجهات متجر فاخرة',
  featStorefrontDesc: 'خمسة قوالب حصرية — Mono وSunset وForest وMocha وNoir — تُطبَّق فوراً. معاينة مباشرة قبل النشر.',
  featAnalyticsTitle: 'تحليلات فورية',
  featAnalyticsDesc: 'تتبّع الزيارات وإضافات السلة ومتوسط قيمة الطلب لمدة 90 يوماً. اعرف أين يتوقف عملاؤك.',
  featOrdersTitle: 'إدارة الطلبات بذكاء',
  featOrdersDesc: 'قائمة موافقة مدمجة تتيح مراجعة الطلبات قبل تنفيذها — مثالية لنظام الدفع عند الاستلام.',
  featDiscountsTitle: 'خصومات مرنة',
  featDiscountsDesc: 'رموز نسبة مئوية أو مبلغ ثابت أو شحن مجاني. حدّد حدود الاستخدام والحد الأدنى للسلة وتاريخ الانتهاء.',
  featShippingTitle: 'شحن محلي',
  featShippingDesc: 'قواعد شحن بسعر ثابت أو مجاني عند تجاوز حد معين، مبنية لمحافظات الأردن.',
  featSecurityTitle: 'أمان على مستوى المؤسسات',
  featSecurityDesc: 'مصادقة JWT وملفات تعريف الارتباط httpOnly وقفل الحسابات ومراجعة المخزون من طرف الخادم.',

  // ── landing – themes ─────────────────────────────────────────────────────
  themesTag: 'تصميم الواجهة',
  themesTitle: 'خمسة قوالب.\nلا حدود للشخصية.',
  themesSub: 'بدّل بين Mono وSunset وForest وMocha وNoir بنقرة واحدة. كل قالب محسَّن للتحويل ويمكن معاينته مباشرة قبل النشر.',
  themesGetStore: 'احصل على متجرك',

  // ── landing – how it works ───────────────────────────────────────────────
  howTag: 'كيف يعمل',
  howTitle: 'أطلق في أربع خطوات بسيطة.',
  howSub: 'من الفكرة إلى متجر حي — بدون كود، بدون إعداد خوادم، بدون انتظار أسابيع.',
  step01Title: 'الطلب',
  step01Body: 'أرسل اسم علامتك التجارية وفئتها ونبذة قصيرة للحصول على الموافقة.',
  step02Title: 'التصميم',
  step02Body: 'اختر قالباً وارفع شعارك وضع شريط الإعلانات — كل ذلك من لوحة جانبية سهلة.',
  step03Title: 'المخزون',
  step03Body: 'ارفع المنتجات بالصور والمتغيرات والأسعار. نظّمها في مجموعات.',
  step04Title: 'الإطلاق',
  step04Body: 'افتح متجرك وابدأ استقبال الطلبات في نفس اليوم.',

  // ── landing – brands ─────────────────────────────────────────────────────
  brandsTag: 'معرض',
  brandsTitle: 'مبنية لقادة العلامات التجارية.',
  brandsJoin: 'انضم إليهم',

  // ── landing – faq ────────────────────────────────────────────────────────
  faqTag: 'الأسئلة الشائعة',
  faqTitle: 'أسئلة شائعة.',
  faq1Q: 'هل Plinth محسَّن للشركات في الأردن؟',
  faq1A: 'نعم. كل تفصيل — من عملة JOD بدقة 3 خانات عشرية إلى سير عمل الموافقة على الدفع عند الاستلام والتحقق من أرقام الهاتف الأردنية — مبني خصيصاً للسوق المحلية.',
  faq2Q: 'ما مدى قابلية تخصيص واجهات المتاجر؟',
  faq2A: 'كلياً. بدّل القوالب فوراً، ارفع شعارك، اضبط الإعلانات، وعاين كل تغيير مباشرةً قبل النشر.',
  faq3Q: 'هل يمكنني إدارة حملات الخصم وتتبّع تأثيرها؟',
  faq3A: 'نعم. أنشئ رموز نسبة مئوية أو مبلغ ثابت أو شحن مجاني مع حدود استخدام وحد أدنى للسلة وتواريخ انتهاء. تُظهر التحليلات تأثير الإيرادات لكل حملة.',
  faq4Q: 'هل أحتاج إلى تثبيت أي شيء؟',
  faq4A: 'لا برامج ولا إضافات. يعمل Plinth بالكامل في المتصفح — أدر متجرك من أي جهاز وأي مكان.',

  // ── landing – cta ────────────────────────────────────────────────────────
  ctaBadge: 'هل أنت مستعد للإطلاق؟',
  ctaTitle1: 'ابدأ البيع في',
  ctaTitle2: 'الأردن اليوم.',
  ctaSub: 'انضم إلى مجتمع متنامٍ من العلامات التجارية الأردنية التي تستخدم Plinth لإدارة أعمالها الإلكترونية بكل سهولة.',
  ctaPrimary: 'اطلب متجرك',
  ctaSecondary: 'دخول التجار',

  // ── landing – footer ─────────────────────────────────────────────────────
  footerCopyright: `© ${new Date().getFullYear()} Plinth. مبني للأردن.`,
  footerStartSelling: 'ابدأ البيع',
  footerMerchantLogin: 'دخول التجار',
  footerFeatures: 'المميزات',
  footerHowItWorks: 'كيف يعمل',

  // ── admin nav ────────────────────────────────────────────────────────────
  navOverview: 'نظرة عامة',
  navProducts: 'المنتجات',
  navOrders: 'الطلبات',
  navDiscounts: 'الخصومات',
  navAnalytics: 'التحليلات',
  navAppearance: 'المظهر',
  adminStoreDashboard: 'لوحة المتجر',
  adminSearch: 'بحث',
  adminStorefront: 'واجهة المتجر',
  adminViewStorefront: 'عرض واجهة المتجر',
  adminBackToPlatform: 'العودة للمنصة',
  adminRequestWebsite: 'طلب موقع',
  adminNoStoresTitle: 'لا توجد متاجر بعد',
  adminNoStoresDesc: 'ليس لديك أي متاجر. أرسل طلب موقع وسيقوم الفريق بإعداد واحد لك.',
  adminRequestFirst: 'اطلب موقعك الأول',
  adminNoAccessTitle: 'المتجر غير متاح',
  adminNoAccessDesc: 'هذا المتجر غير موجود أو ليس لديك صلاحية الوصول إليه.',
  adminGoToMyStores: 'الذهاب إلى متاجري',
  adminMaintenanceMsg: 'وضع الصيانة مفعّل — واجهة متجرك تعرض إشعار صيانة للعملاء.',

  // ── platform nav ─────────────────────────────────────────────────────────
  navShopRequests: 'طلبات المتاجر',
  navStores: 'المتاجر',
  navModeration: 'الإشراف',
  navSupport: 'الدعم',
  navAuditLog: 'سجل المراجعة',
  navSettings: 'الإعدادات',
  platformControlCenter: 'مركز التحكم',
  platformSearch: 'بحث',
  platformMaintenanceMsg: 'وضع الصيانة مفعّل — واجهات المتاجر تعرض إشعار صيانة للعملاء.',
  platformWorkspace: 'بيئة عمل متصلة بالخادم',
};

const dictionaries: Record<Lang, Dict> = { en, ar };

export type I18nValue = {
  lang: Lang;
  dir: 'ltr' | 'rtl';
  locale: string;
  setLang: (lang: Lang) => void;
  toggle: () => void;
  t: (key: keyof typeof en) => string;
  money: (minor: number, currency?: string) => string;
  date: (ts: number | string | Date) => string;
  num: (n: number) => string;
};

const I18nContext = createContext<I18nValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>(() => {
    if (typeof localStorage === 'undefined') return 'en';
    return (localStorage.getItem(STORAGE_KEY) as Lang) || 'en';
  });
  const dir = lang === 'ar' ? 'rtl' : 'ltr';
  const locale = localeFor(lang);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = dir;
    setMoneyLocale(locale);
    try { localStorage.setItem(STORAGE_KEY, lang); } catch { /* ignore */ }
  }, [lang, dir, locale]);

  const value = useMemo<I18nValue>(() => ({
    lang,
    dir,
    locale,
    setLang,
    toggle: () => setLang((l) => (l === 'en' ? 'ar' : 'en')),
    t: (key) => dictionaries[lang][key] ?? dictionaries.en[key] ?? String(key),
    money: (minor, currency = DEFAULT_CURRENCY) => formatMoney(minor, currency, locale),
    date: (ts) => new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short', timeZone: AMMAN_TZ }).format(new Date(ts)),
    num: (n) => new Intl.NumberFormat(locale).format(n),
  }), [lang, dir, locale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within a LanguageProvider');
  return ctx;
}
