import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { formatMoney, DEFAULT_CURRENCY } from '@shared/money';
import { setMoneyLocale } from '@/lib/format';

/**
 * Self-contained i18n (no external service). Provides Arabic + English with full
 * RTL direction switching, locale-aware money/number/date formatting in the
 * Asia/Amman timezone, and an Arabic-Indic numeral option (via the ar-JO locale).
 *
 * Coverage note: the infrastructure, the storefront, and shared chrome are wired
 * here; translating every admin/platform string is incremental — add keys to the
 * dictionaries and call `t()`. Unknown keys fall back to English then to the key.
 */

export type Lang = 'en' | 'ar';
const STORAGE_KEY = 'plinth-lang';
export const AMMAN_TZ = 'Asia/Amman';

const localeFor = (lang: Lang) => (lang === 'ar' ? 'ar-JO' : 'en-JO');

type Dict = Record<string, string>;

const en: Dict = {
  // chrome
  signIn: 'Sign in', signOut: 'Sign out', language: 'العربية', // toggle shows the OTHER language
  // storefront
  products: 'Products', cart: 'Cart', checkout: 'Checkout', addToCart: 'Add to cart',
  outOfStock: 'Out of stock', emptyCart: 'Your cart is empty', placeOrder: 'Place order',
  subtotal: 'Subtotal', discount: 'Discount', tax: 'Tax', shipping: 'Shipping', total: 'Total',
  free: 'Free', pickup: 'Pickup', orderPlaced: 'Order placed', continueShopping: 'Continue shopping',
  customerName: 'Full name', customerEmail: 'Email', customerPhone: 'Mobile (07…)', address: 'Address',
  discountCode: 'Discount code', apply: 'Apply', note: 'Note (optional)',
  taxIncluded: 'incl. tax', codNote: 'Pay with cash on delivery',
};

const ar: Dict = {
  signIn: 'تسجيل الدخول', signOut: 'تسجيل الخروج', language: 'English',
  products: 'المنتجات', cart: 'السلة', checkout: 'إتمام الشراء', addToCart: 'أضِف إلى السلة',
  outOfStock: 'غير متوفر', emptyCart: 'سلتك فارغة', placeOrder: 'تأكيد الطلب',
  subtotal: 'المجموع الفرعي', discount: 'الخصم', tax: 'الضريبة', shipping: 'الشحن', total: 'الإجمالي',
  free: 'مجاني', pickup: 'استلام', orderPlaced: 'تم استلام الطلب', continueShopping: 'متابعة التسوق',
  customerName: 'الاسم الكامل', customerEmail: 'البريد الإلكتروني', customerPhone: 'الجوال (07…)', address: 'العنوان',
  discountCode: 'رمز الخصم', apply: 'تطبيق', note: 'ملاحظة (اختياري)',
  taxIncluded: 'شامل الضريبة', codNote: 'الدفع نقدًا عند الاستلام',
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
    setMoneyLocale(locale); // make app-wide money() locale-aware
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
