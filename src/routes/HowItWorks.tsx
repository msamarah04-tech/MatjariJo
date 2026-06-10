import { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, useInView } from 'framer-motion';
import {
  ArrowRight,
  Box,
  CheckCircle2,
  ChevronDown,
  LayoutTemplate,
  Package,
  Palette,
  ShieldCheck,
  ShoppingBag,
  Store,
  Tag,
  TrendingUp,
  Truck,
  Zap,
} from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { PublicNav } from '@/components/layout/PublicNav';

function FadeIn({ children, delay = 0, className = '' }: { children: React.ReactNode; delay?: number; className?: string }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 28 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function FaqItem({ q, a, index }: { q: string; a: string; index: number }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-30px' });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 16 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.4, delay: index * 0.07 }}
      className="border-b border-stone-200"
    >
      <button onClick={() => setOpen(!open)} className="flex w-full items-center justify-between gap-4 py-6 text-left">
        <span className="text-base font-semibold text-stone-800">{q}</span>
        <ChevronDown className={`h-5 w-5 shrink-0 text-stone-400 transition-transform duration-300 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="overflow-hidden"
        >
          <p className="pb-6 text-sm leading-relaxed text-stone-500">{a}</p>
        </motion.div>
      )}
    </motion.div>
  );
}

/* ── MOCK UI COMPONENTS ── */

function RequestFormMock() {
  return (
    <div className="rounded-2xl border border-stone-200 bg-white shadow-xl p-6 space-y-4 text-sm">
      <div className="flex items-center gap-2 mb-2">
        <div className="h-2.5 w-2.5 rounded-full bg-red-400" />
        <div className="h-2.5 w-2.5 rounded-full bg-yellow-400" />
        <div className="h-2.5 w-2.5 rounded-full bg-green-400" />
        <span className="ms-2 text-xs text-stone-400 font-medium">New Store Request</span>
      </div>
      {[
        { label: 'Store Name', placeholder: 'Sultan Perfumes', filled: true },
        { label: 'Category', placeholder: 'Fragrance & Beauty', filled: true },
        { label: 'Your Email', placeholder: 'sultan@example.com', filled: true },
      ].map((f) => (
        <div key={f.label}>
          <div className="text-xs font-semibold text-stone-400 mb-1">{f.label}</div>
          <div className={`rounded-lg border px-3 py-2.5 text-sm font-medium ${f.filled ? 'border-stone-300 text-stone-700 bg-stone-50' : 'border-stone-200 text-stone-300'}`}>
            {f.placeholder}
          </div>
        </div>
      ))}
      <div className="rounded-lg bg-teal-700 text-white text-center text-xs font-bold uppercase tracking-widest py-3 mt-2 shadow-sm shadow-teal-200">
        Submit Request →
      </div>
    </div>
  );
}

function ThemeMock() {
  const themes = [
    { name: 'Midnight', bg: 'bg-stone-900', ring: true },
    { name: 'Pearl', bg: 'bg-stone-100' },
    { name: 'Clay', bg: 'bg-amber-50' },
    { name: 'Sage', bg: 'bg-emerald-50' },
  ];
  return (
    <div className="rounded-2xl border border-stone-200 bg-white shadow-xl p-6 space-y-4 text-sm">
      <div className="flex items-center gap-2 mb-2">
        <div className="h-2.5 w-2.5 rounded-full bg-red-400" />
        <div className="h-2.5 w-2.5 rounded-full bg-yellow-400" />
        <div className="h-2.5 w-2.5 rounded-full bg-green-400" />
        <span className="ms-2 text-xs text-stone-400 font-medium">Appearance · Theme</span>
      </div>
      <div className="text-xs font-semibold text-stone-500 uppercase tracking-wider">Choose Theme</div>
      <div className="grid grid-cols-2 gap-3">
        {themes.map((t) => (
          <div key={t.name} className={`rounded-xl border-2 p-3 cursor-pointer transition-all ${t.ring ? 'border-teal-500 shadow-md shadow-teal-100' : 'border-stone-200 hover:border-stone-300'}`}>
            <div className={`h-12 rounded-lg mb-2 ${t.bg}`} />
            <div className="text-xs font-semibold text-stone-700 text-center">{t.name}</div>
          </div>
        ))}
      </div>
      <div className="text-xs text-stone-400 text-center">+ Custom colors, fonts & logo upload</div>
    </div>
  );
}

function ProductsMock() {
  const products = [
    { emoji: '✨', name: 'Oud Collection', price: 'JOD 45', stock: 12 },
    { emoji: '🌹', name: 'Rose Elixir', price: 'JOD 32', stock: 8 },
    { emoji: '🖤', name: 'Noir Intense', price: 'JOD 58', stock: 5 },
  ];
  return (
    <div className="rounded-2xl border border-stone-200 bg-white shadow-xl p-6 space-y-3 text-sm">
      <div className="flex items-center gap-2 mb-2">
        <div className="h-2.5 w-2.5 rounded-full bg-red-400" />
        <div className="h-2.5 w-2.5 rounded-full bg-yellow-400" />
        <div className="h-2.5 w-2.5 rounded-full bg-green-400" />
        <span className="ms-2 text-xs text-stone-400 font-medium">Products · All (3)</span>
      </div>
      {products.map((p) => (
        <div key={p.name} className="flex items-center gap-3 rounded-xl border border-stone-100 bg-stone-50 px-4 py-3">
          <span className="text-2xl">{p.emoji}</span>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-stone-800 text-xs truncate">{p.name}</div>
            <div className="text-xs text-stone-400">{p.stock} in stock</div>
          </div>
          <div className="text-sm font-bold text-teal-700">{p.price}</div>
        </div>
      ))}
      <div className="flex items-center justify-center gap-2 rounded-lg border border-dashed border-stone-300 py-3 text-xs font-semibold text-stone-400 hover:border-teal-300 hover:text-teal-700 cursor-pointer transition-colors">
        + Add product
      </div>
    </div>
  );
}

function ShippingMock() {
  return (
    <div className="rounded-2xl border border-stone-200 bg-white shadow-xl p-6 space-y-4 text-sm">
      <div className="flex items-center gap-2 mb-2">
        <div className="h-2.5 w-2.5 rounded-full bg-red-400" />
        <div className="h-2.5 w-2.5 rounded-full bg-yellow-400" />
        <div className="h-2.5 w-2.5 rounded-full bg-green-400" />
        <span className="ms-2 text-xs text-stone-400 font-medium">Settings · Shipping & Discounts</span>
      </div>
      <div className="rounded-xl border border-stone-200 p-4 space-y-2">
        <div className="text-xs font-bold text-stone-600">Shipping Rule</div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-stone-500">Flat rate</span>
          <span className="text-xs font-bold text-stone-800">JOD 3.00</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-stone-500">Free over</span>
          <span className="text-xs font-bold text-emerald-600">JOD 25</span>
        </div>
      </div>
      <div className="rounded-xl border border-teal-200 bg-teal-50 p-4 space-y-2">
        <div className="text-xs font-bold text-teal-900">Discount Code</div>
        <div className="flex items-center justify-between">
          <span className="font-mono text-xs font-bold text-teal-800 bg-white border border-teal-200 rounded px-2 py-1">RAMADAN20</span>
          <span className="text-xs font-bold text-teal-800">-20%</span>
        </div>
        <div className="text-xs text-stone-400">Used 0 / 100 times</div>
      </div>
    </div>
  );
}

function StorefrontMock() {
  return (
    <div className="rounded-2xl border border-stone-200 bg-white shadow-xl overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 bg-stone-100 border-b border-stone-200">
        <div className="h-2.5 w-2.5 rounded-full bg-red-400" />
        <div className="h-2.5 w-2.5 rounded-full bg-yellow-400" />
        <div className="h-2.5 w-2.5 rounded-full bg-green-400" />
        <div className="flex-1 mx-3 rounded-md bg-white border border-stone-200 px-3 py-1 text-xs text-stone-400 font-mono">
          sultan.matjari.jo
        </div>
      </div>
      <div className="bg-stone-900 p-5">
        <div className="flex items-center justify-between mb-4">
          <span className="text-white font-black text-sm tracking-tight">SULTAN.</span>
          <div className="flex gap-2 text-xs text-stone-400">
            <span>Shop</span>
            <span>About</span>
          </div>
        </div>
        <div className="text-center py-4">
          <span className="text-2xl mb-2 block">✨</span>
          <div className="text-white font-bold text-sm">Oud Collection 2025</div>
          <div className="text-stone-400 text-xs mt-1">Limited Edition · 12 pieces left</div>
          <div className="mt-4 rounded-full bg-teal-700 text-white text-xs font-bold py-2 px-6 inline-block">
            Shop Now →
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 mt-2">
          {[
            { emoji: '🌹', name: 'Rose Oud', price: 'JOD 45' },
            { emoji: '🖤', name: 'Noir', price: 'JOD 62' },
          ].map((p) => (
            <div key={p.name} className="rounded-xl bg-stone-800 p-3 text-center">
              <span className="text-lg">{p.emoji}</span>
              <div className="text-white text-xs font-semibold mt-1">{p.name}</div>
              <div className="text-teal-500 text-xs font-bold">{p.price}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AnalyticsMock() {
  const bars = [40, 65, 50, 80, 55, 90, 70];
  const days = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  return (
    <div className="rounded-2xl border border-stone-200 bg-white shadow-xl p-6 space-y-4 text-sm">
      <div className="flex items-center gap-2 mb-2">
        <div className="h-2.5 w-2.5 rounded-full bg-red-400" />
        <div className="h-2.5 w-2.5 rounded-full bg-yellow-400" />
        <div className="h-2.5 w-2.5 rounded-full bg-green-400" />
        <span className="ms-2 text-xs text-stone-400 font-medium">Analytics · Last 7 days</span>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Views', value: '1,240', color: 'text-violet-600' },
          { label: 'Orders', value: '38', color: 'text-emerald-600' },
          { label: 'Revenue', value: 'JOD 892', color: 'text-teal-800' },
        ].map((s) => (
          <div key={s.label} className="text-center rounded-xl bg-stone-50 border border-stone-100 py-3">
            <div className={`text-base font-black ${s.color}`}>{s.value}</div>
            <div className="text-xs text-stone-400 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>
      <div className="flex items-end gap-1.5 h-16 pt-2">
        {bars.map((h, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <div
              className="w-full rounded-t-sm bg-gradient-to-t from-teal-700 to-teal-300 opacity-80"
              style={{ height: `${h}%` }}
            />
            <span className="text-[9px] text-stone-400">{days[i]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── STEP SECTION ── */

interface StepSectionProps {
  number: string;
  title: string;
  subtitle: string;
  description: string;
  bullets: string[];
  visual: React.ReactNode;
  flip?: boolean;
  accent: string;
}

function StepSection({ number, title, subtitle, description, bullets, visual, flip = false, accent }: StepSectionProps) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <section ref={ref} className="py-20 md:py-28 border-b border-stone-100 last:border-0">
      <div className="max-w-6xl mx-auto px-6 md:px-12">
        <div className={`grid md:grid-cols-2 gap-12 md:gap-20 items-center ${flip ? 'md:[&>*:first-child]:order-2' : ''}`}>

          {/* text side */}
          <motion.div
            initial={{ opacity: 0, x: flip ? 40 : -40 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="space-y-6"
          >
            <div className="flex items-center gap-3">
              <span className={`inline-flex items-center justify-center h-10 w-10 rounded-xl text-sm font-black ${accent}`}>
                {number}
              </span>
              <span className="text-xs font-bold uppercase tracking-widest text-stone-400">{subtitle}</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-black tracking-tight text-stone-900 leading-tight">
              {title}
            </h2>
            <p className="text-base text-stone-500 leading-relaxed">{description}</p>
            <ul className="space-y-2.5">
              {bullets.map((b) => (
                <li key={b} className="flex items-start gap-2.5 text-sm text-stone-600">
                  <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-emerald-500" />
                  {b}
                </li>
              ))}
            </ul>
          </motion.div>

          {/* visual side */}
          <motion.div
            initial={{ opacity: 0, x: flip ? -40 : 40 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          >
            {visual}
          </motion.div>
        </div>
      </div>
    </section>
  );
}

/* ── MAIN ── */

export default function HowItWorks() {
  const { t, lang } = useI18n();

  const STEPS = [
    {
      number: '01',
      subtitle: lang === 'ar' ? 'الانطلاقة' : 'Getting Started',
      title: lang === 'ar' ? 'اطلب متجرك في دقيقتين' : 'Request your store in 2 minutes',
      description: lang === 'ar'
        ? 'أرسل طلبك مع اسم متجرك وفئتك وبريدك الإلكتروني. يراجع فريق متجري كل طلب يدويًا لضمان الجودة، ثم يُنشئ لك متجرك الإلكتروني.'
        : 'Fill out a quick form with your store name, category, and contact details. The Matjari team reviews every request manually to ensure quality, then sets up your storefront.',
      bullets: lang === 'ar'
        ? ['نموذج سريع — أقل من دقيقتين', 'مراجعة يدوية من قِبَل فريقنا', 'إشعار فوري عبر البريد عند الموافقة', 'اختر اسم مستخدم مميزًا لمتجرك']
        : ['Quick form — under 2 minutes', 'Manual review by our team', 'Instant email notification on approval', 'Reserve your unique store username'],
      visual: <RequestFormMock />,
      accent: 'bg-teal-100 text-teal-800',
    },
    {
      number: '02',
      subtitle: lang === 'ar' ? 'الهوية البصرية' : 'Visual Identity',
      title: lang === 'ar' ? 'صمّم هوية متجرك بحرية' : 'Design your storefront identity',
      description: lang === 'ar'
        ? 'اختر من بين ثيمات احترافية متعددة، ارفع شعارك، وخصّص الألوان والنصوص. لا حاجة لمصمم أو مطور.'
        : 'Choose from multiple professional themes, upload your logo, and customize colors and text. No designer or developer needed.',
      bullets: lang === 'ar'
        ? ['5 ثيمات احترافية جاهزة', 'ألوان مخصصة وشعار قابل للرفع', 'شريط إعلانات قابل للتخصيص', 'معاينة فورية قبل النشر']
        : ['5 professional pre-built themes', 'Custom brand colors and logo upload', 'Customizable announcement bar', 'Live preview before publishing'],
      visual: <ThemeMock />,
      flip: true,
      accent: 'bg-violet-100 text-violet-600',
    },
    {
      number: '03',
      subtitle: lang === 'ar' ? 'كتالوج المنتجات' : 'Your Catalog',
      title: lang === 'ar' ? 'أضف منتجاتك بسهولة' : 'Add your products effortlessly',
      description: lang === 'ar'
        ? 'أنشئ منتجات بصور وأوصاف وأسعار وتتبع المخزون. أضف متغيرات (اللون والمقاس) لكل منتج. ادعم المنتجات المميزة لتظهر في مقدمة متجرك.'
        : 'Create products with images, descriptions, prices, and inventory tracking. Add variants (color, size) to any product. Feature products to appear front-and-center in your store.',
      bullets: lang === 'ar'
        ? ['صور ورموز إيموجي للمنتجات', 'متغيرات بمخزون منفصل لكل خيار', 'مجموعات وتصنيفات منظّمة', 'تحكم كامل بالمخزون والتوفر']
        : ['Product images and emoji support', 'Variants with per-option stock tracking', 'Collections and category organization', 'Full stock and availability control'],
      visual: <ProductsMock />,
      accent: 'bg-emerald-100 text-emerald-600',
    },
    {
      number: '04',
      subtitle: lang === 'ar' ? 'التوصيل والعروض' : 'Shipping & Deals',
      title: lang === 'ar' ? 'اضبط التوصيل وكودات الخصم' : 'Set up shipping and discount codes',
      description: lang === 'ar'
        ? 'حدّد سعر شحن ثابتًا أو مجانيًا عند حد معين. أنشئ كودات خصم بنسبة مئوية أو مبلغ ثابت، وحدّد حد الاستخدام وتاريخ الانتهاء.'
        : 'Set a flat shipping rate or offer free shipping over a threshold. Create discount codes with percentage or fixed amounts, usage caps, and expiry dates.',
      bullets: lang === 'ar'
        ? ['شحن مجاني عند حد الطلب', 'كودات خصم نسبية أو ثابتة', 'تحديد عدد مرات الاستخدام', 'تاريخ انتهاء اختياري للكوبونات']
        : ['Free shipping threshold rules', 'Percentage and fixed discount codes', 'Usage caps per code', 'Optional expiry dates on coupons'],
      visual: <ShippingMock />,
      flip: true,
      accent: 'bg-sky-100 text-sky-600',
    },
    {
      number: '05',
      subtitle: lang === 'ar' ? 'الإطلاق' : 'Go Live',
      title: lang === 'ar' ? 'انشر متجرك للعالم' : 'Publish your store to the world',
      description: lang === 'ar'
        ? 'بمجرد اكتمال الإعداد، يراجع فريقنا متجرك ويفعّله. تحصل على رابط مميز جاهز للمشاركة على كل منصات التواصل الاجتماعي.'
        : 'Once setup is complete, our team reviews and activates your store. You get a shareable link ready to post on every social media platform.',
      bullets: lang === 'ar'
        ? ['رابط مميز (اسمك.matjari.jo)', 'عرض متجانس على الجوال والشاشات الكبيرة', 'جاهز للمشاركة على إنستغرام وواتساب', 'يدعم العربية والإنجليزية']
        : ['Unique link (yourname.matjari.jo)', 'Seamless mobile and desktop experience', 'Ready to share on Instagram and WhatsApp', 'Arabic and English support built-in'],
      visual: <StorefrontMock />,
      accent: 'bg-rose-100 text-rose-600',
    },
    {
      number: '06',
      subtitle: lang === 'ar' ? 'النمو' : 'Grow',
      title: lang === 'ar' ? 'تتبع وادرس وانمُ' : 'Track, analyze, and grow',
      description: lang === 'ar'
        ? 'تابع عدد الزوار والطلبات والإيرادات من لوحة التحكم. راجع تفاصيل كل طلب وتاريخ العميل وأداء المنتجات.'
        : 'Monitor visitors, orders, and revenue from your dashboard. Review each order\'s details, customer history, and product performance over time.',
      bullets: lang === 'ar'
        ? ['إحصاءات زيارات آنية', 'لوحة إيرادات لآخر 90 يومًا', 'تفاصيل كاملة لكل طلب', 'تتبع أداء المنتجات والمجموعات']
        : ['Real-time visitor analytics', '90-day revenue dashboard', 'Full per-order detail view', 'Product and collection performance tracking'],
      visual: <AnalyticsMock />,
      flip: true,
      accent: 'bg-amber-100 text-amber-600',
    },
  ];

  const FAQS = [
    {
      q: lang === 'ar' ? 'كم يستغرق إطلاق متجري؟' : 'How long does it take to launch my store?',
      a: lang === 'ar'
        ? 'يستغرق ملء الطلب أقل من دقيقتين. يراجع فريقنا الطلب خلال 24-48 ساعة. بعد الموافقة، يمكنك إعداد متجرك والانطلاق في نفس اليوم.'
        : 'Filling out the request takes under 2 minutes. Our team reviews within 24–48 hours. After approval, you can set up your store and launch the same day.',
    },
    {
      q: lang === 'ar' ? 'هل أحتاج إلى خبرة تقنية؟' : 'Do I need any technical experience?',
      a: lang === 'ar'
        ? 'لا. متجري مصمم للتجار غير التقنيين. كل شيء من الثيمات إلى المنتجات إلى الشحن يتم عبر واجهة بسيطة وسهلة.'
        : 'None at all. Matjari is designed for non-technical merchants. Everything from themes to products to shipping is managed through a simple, intuitive interface.',
    },
    {
      q: lang === 'ar' ? 'ما طرق الدفع المدعومة؟' : 'What payment methods are supported?',
      a: lang === 'ar'
        ? 'يدعم متجري حاليًا الدفع عند الاستلام (COD)، وهو الطريقة الأكثر شيوعًا في السوق الأردني. سيتم إضافة بوابات الدفع الإلكتروني قريبًا.'
        : 'Matjari currently supports cash on delivery (COD), the most widely used payment method in Jordan. Electronic payment gateways are coming soon.',
    },
    {
      q: lang === 'ar' ? 'هل يدعم النظام العربية؟' : 'Does the platform support Arabic?',
      a: lang === 'ar'
        ? 'نعم. لوحة التحكم والواجهة العامة تدعمان العربية بالكامل مع اتجاه RTL صحيح.'
        : 'Yes. The admin dashboard and public interface fully support Arabic with correct RTL text direction.',
    },
  ];

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 overflow-x-hidden selection:bg-teal-200 selection:text-teal-950">
      <PublicNav />

      {/* ── HERO ── */}
      <section className="mt-[67px] bg-gradient-to-b from-stone-100 to-stone-50 border-b border-stone-200 py-20 md:py-28 text-center">
        <div className="max-w-3xl mx-auto px-6">
          <FadeIn>
            <span className="inline-flex items-center gap-2 rounded-full bg-teal-50 border border-teal-200 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-teal-800 mb-6">
              <span className="h-1.5 w-1.5 rounded-full bg-teal-700 animate-pulse" />
              {lang === 'ar' ? 'دليل خطوة بخطوة' : 'Step-by-step guide'}
            </span>
          </FadeIn>
          <FadeIn delay={0.05}>
            <h1 className="text-4xl md:text-6xl font-black tracking-tighter text-stone-900 leading-tight mb-5">
              {lang === 'ar' ? 'كيف يعمل متجري' : 'How Matjari Works'}
            </h1>
          </FadeIn>
          <FadeIn delay={0.1}>
            <p className="text-lg text-stone-500 leading-relaxed mb-8 max-w-xl mx-auto">
              {lang === 'ar'
                ? 'من الطلب إلى الإطلاق في خطوات واضحة. تعرّف على كل ما تحتاجه لبناء متجرك الإلكتروني في الأردن.'
                : 'From request to launch in clear steps. Everything you need to know to build your online store in Jordan.'}
            </p>
          </FadeIn>
          <FadeIn delay={0.15}>
            <Link
              to="/request-website"
              className="inline-flex items-center gap-2 rounded-full bg-teal-700 text-white px-8 py-3.5 text-sm font-bold shadow-lg shadow-teal-200 hover:bg-teal-800 transition-all hover:scale-105"
            >
              {lang === 'ar' ? 'ابدأ الآن' : 'Start for free'} <ArrowRight className="h-4 w-4" />
            </Link>
          </FadeIn>
        </div>
      </section>

      {/* ── STEP INDEX ── */}
      <div className="border-b border-stone-200 bg-white sticky top-[67px] z-40 overflow-x-auto">
        <div className="flex items-stretch max-w-6xl mx-auto">
          {STEPS.map((s, i) => (
            <a
              key={s.number}
              href={`#step-${s.number}`}
              className="flex-1 min-w-[100px] flex flex-col items-center justify-center gap-1 py-4 px-2 text-center border-e border-stone-100 last:border-e-0 hover:bg-stone-50 transition-colors group"
            >
              <span className={`h-6 w-6 rounded-lg text-[10px] font-black flex items-center justify-center ${s.accent} group-hover:scale-110 transition-transform`}>
                {s.number}
              </span>
              <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider hidden sm:block leading-tight">
                {s.subtitle}
              </span>
            </a>
          ))}
        </div>
      </div>

      {/* ── STEPS ── */}
      {STEPS.map((s, i) => (
        <div key={s.number} id={`step-${s.number}`}>
          <StepSection
            number={s.number}
            title={s.title}
            subtitle={s.subtitle}
            description={s.description}
            bullets={s.bullets}
            visual={s.visual}
            flip={s.flip}
            accent={s.accent}
          />
        </div>
      ))}

      {/* ── FEATURE GRID ── */}
      <section className="py-20 md:py-28 bg-white border-y border-stone-100">
        <div className="max-w-6xl mx-auto px-6 md:px-12">
          <FadeIn className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-black tracking-tight text-stone-900 mb-3">
              {lang === 'ar' ? 'كل ما تحتاجه في مكان واحد' : 'Everything you need, built in'}
            </h2>
            <p className="text-stone-400 text-base max-w-xl mx-auto">
              {lang === 'ar'
                ? 'لا حاجة لأدوات خارجية. كل ميزة مدمجة من اليوم الأول.'
                : 'No external tools needed. Every feature is built in from day one.'}
            </p>
          </FadeIn>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[
              { icon: Palette, label: lang === 'ar' ? 'ثيمات احترافية' : 'Pro themes', accent: 'bg-violet-50 text-violet-600 ring-1 ring-violet-100' },
              { icon: Package, label: lang === 'ar' ? 'إدارة الطلبات' : 'Order management', accent: 'bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100' },
              { icon: Tag, label: lang === 'ar' ? 'كودات الخصم' : 'Discount codes', accent: 'bg-teal-50 text-teal-800 ring-1 ring-teal-100' },
              { icon: Truck, label: lang === 'ar' ? 'قواعد الشحن' : 'Shipping rules', accent: 'bg-rose-50 text-rose-600 ring-1 ring-rose-100' },
              { icon: TrendingUp, label: lang === 'ar' ? 'تحليلات متقدمة' : 'Advanced analytics', accent: 'bg-sky-50 text-sky-600 ring-1 ring-sky-100' },
              { icon: ShieldCheck, label: lang === 'ar' ? 'أمان كامل' : 'Full security', accent: 'bg-slate-100 text-slate-600 ring-1 ring-slate-200' },
              { icon: ShoppingBag, label: lang === 'ar' ? 'متغيرات المنتج' : 'Product variants', accent: 'bg-pink-50 text-pink-600 ring-1 ring-pink-100' },
              { icon: Store, label: lang === 'ar' ? 'رابط متجر مميز' : 'Custom store URL', accent: 'bg-amber-50 text-amber-600 ring-1 ring-amber-100' },
              { icon: Zap, label: lang === 'ar' ? 'إشعارات فورية' : 'Instant notifications', accent: 'bg-lime-50 text-lime-600 ring-1 ring-lime-100' },
            ].map(({ icon: Icon, label, accent }, i) => (
              <FadeIn key={label} delay={i * 0.04}>
                <div className="flex items-center gap-3 rounded-2xl border border-stone-100 bg-stone-50/50 p-4 hover:bg-white hover:border-stone-200 hover:shadow-sm transition-all">
                  <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${accent}`}>
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="text-sm font-semibold text-stone-700">{label}</span>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="py-20 md:py-28">
        <div className="max-w-2xl mx-auto px-6">
          <FadeIn className="text-center mb-12">
            <h2 className="text-3xl font-black tracking-tight text-stone-900 mb-2">
              {lang === 'ar' ? 'أسئلة شائعة' : 'Common questions'}
            </h2>
          </FadeIn>
          {FAQS.map((f, i) => (
            <FaqItem key={i} q={f.q} a={f.a} index={i} />
          ))}
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-20 md:py-28 bg-stone-900 text-white text-center">
        <div className="max-w-xl mx-auto px-6">
          <FadeIn>
            <div className="text-5xl mb-6">🚀</div>
            <h2 className="text-3xl md:text-4xl font-black tracking-tight mb-4">
              {lang === 'ar' ? 'جاهز للبدء؟' : 'Ready to get started?'}
            </h2>
            <p className="text-stone-400 mb-8 leading-relaxed">
              {lang === 'ar'
                ? 'انضم إلى التجار الأردنيين الذين يبنون متاجرهم على متجري.'
                : 'Join Jordanian entrepreneurs already building their brands on Matjari.'}
            </p>
            <Link
              to="/request-website"
              className="inline-flex items-center gap-2 rounded-full bg-teal-700 text-white px-8 py-4 text-sm font-bold shadow-lg shadow-teal-700/30 hover:bg-teal-500 transition-all hover:scale-105"
            >
              {lang === 'ar' ? 'اطلب متجرك الآن' : 'Request your store'} <ArrowRight className="h-4 w-4" />
            </Link>
          </FadeIn>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="bg-stone-900 border-t border-stone-800 py-8 text-center text-xs text-stone-500">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <span className="font-heading font-black tracking-tighter text-white text-sm">
            Matjari<span className="text-amber-400">.</span>
          </span>
          <span>© {new Date().getFullYear()} Matjari. {lang === 'ar' ? 'جميع الحقوق محفوظة.' : 'All rights reserved.'}</span>
          <div className="flex gap-4">
            <Link to="/" className="hover:text-stone-300 transition-colors">{lang === 'ar' ? 'الرئيسية' : 'Home'}</Link>
            <Link to="/brands" className="hover:text-stone-300 transition-colors">{lang === 'ar' ? 'المتاجر' : 'Brands'}</Link>
            <Link to="/sign-in" className="hover:text-stone-300 transition-colors">{lang === 'ar' ? 'تسجيل الدخول' : 'Sign in'}</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
