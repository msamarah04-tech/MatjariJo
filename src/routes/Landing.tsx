import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, useInView, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import {
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Box,
  ChevronDown,
  LayoutTemplate,
  Package,
  ShoppingBag,
  Sparkles,
  Store,
  Tag,
  TrendingUp,
  Truck,
  ShieldCheck,
  Palette,
  Zap,
} from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { LangToggle } from '@/components/ui/LangToggle';

/* ─────────────────────── HELPERS ─────────────────────── */

function useCountUp(target: number, duration = 1.5, start = false) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!start) return;
    let startTime: number | null = null;
    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / (duration * 1000), 1);
      setCount(Math.floor(progress * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target, duration, start]);
  return count;
}

function StatCard({ value, label, suffix }: { value: string; label: string; suffix: string }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-50px' });
  const num = parseInt(value, 10);
  const count = useCountUp(num, 1.2, inView);
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 24 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5 }}
      className="flex flex-col gap-1"
    >
      <span className="text-5xl font-black tracking-tighter text-stone-900">
        {inView ? count : 0}{suffix}
      </span>
      <span className="text-sm font-semibold text-stone-400 uppercase tracking-widest">{label}</span>
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
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between gap-4 py-6 text-left"
      >
        <span className="text-base font-semibold text-stone-800">{q}</span>
        <ChevronDown className={`h-5 w-5 shrink-0 text-stone-400 transition-transform duration-300 ${open ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence initial={false}>
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
      </AnimatePresence>
    </motion.div>
  );
}

/* ─────────────────────── MARQUEE ─────────────────────── */

function Marquee({ brands }: { brands: { emoji: string; name: string; tag: string }[] }) {
  const items = [...brands, ...brands];
  return (
    <div className="relative overflow-hidden py-5 border-y border-stone-100 bg-stone-50/50">
      <div className="pointer-events-none absolute start-0 top-0 h-full w-28 bg-gradient-to-r from-stone-50 to-transparent z-10" />
      <div className="pointer-events-none absolute end-0 top-0 h-full w-28 bg-gradient-to-l from-stone-50 to-transparent z-10" />
      <motion.div
        animate={{ x: ['0%', '-50%'] }}
        transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
        className="flex gap-12 w-max"
      >
        {items.map((b, i) => (
          <div key={i} className="flex items-center gap-3 shrink-0">
            <span className="text-xl">{b.emoji}</span>
            <div>
              <div className="text-sm font-bold text-stone-600">{b.name}</div>
              <div className="text-xs text-stone-400 uppercase tracking-widest">{b.tag}</div>
            </div>
            <div className="ms-8 h-4 w-px bg-stone-200" />
          </div>
        ))}
      </motion.div>
    </div>
  );
}

/* ─────────────────────── MAIN ─────────────────────── */

export default function Landing() {
  const { t, lang } = useI18n();
  const heroRef = useRef(null);
  const { scrollY } = useScroll();
  const heroOpacity = useTransform(scrollY, [0, 400], [1, 0]);
  const heroY = useTransform(scrollY, [0, 400], [0, 60]);

  const FEATURES = [
    { icon: Palette, titleKey: 'featStorefrontTitle', descKey: 'featStorefrontDesc', accent: 'bg-violet-50 text-violet-600 ring-violet-100' },
    { icon: BarChart3, titleKey: 'featAnalyticsTitle', descKey: 'featAnalyticsDesc', accent: 'bg-sky-50 text-sky-600 ring-sky-100' },
    { icon: Package, titleKey: 'featOrdersTitle', descKey: 'featOrdersDesc', accent: 'bg-emerald-50 text-emerald-600 ring-emerald-100' },
    { icon: Tag, titleKey: 'featDiscountsTitle', descKey: 'featDiscountsDesc', accent: 'bg-orange-50 text-orange-600 ring-orange-100' },
    { icon: Truck, titleKey: 'featShippingTitle', descKey: 'featShippingDesc', accent: 'bg-rose-50 text-rose-600 ring-rose-100' },
    { icon: ShieldCheck, titleKey: 'featSecurityTitle', descKey: 'featSecurityDesc', accent: 'bg-slate-100 text-slate-600 ring-slate-200' },
  ] as const;

  const STEPS = [
    { n: '01', icon: Store, titleKey: 'step01Title', bodyKey: 'step01Body' },
    { n: '02', icon: LayoutTemplate, titleKey: 'step02Title', bodyKey: 'step02Body' },
    { n: '03', icon: Box, titleKey: 'step03Title', bodyKey: 'step03Body' },
    { n: '04', icon: Zap, titleKey: 'step04Title', bodyKey: 'step04Body' },
  ] as const;

  const BRANDS = [
    { emoji: '✨', name: 'Sultan Perfumes', tag: lang === 'ar' ? 'عطور فاخرة' : 'Luxury Fragrance' },
    { emoji: '☕', name: 'Amman Roasters', tag: lang === 'ar' ? 'قهوة مختصة' : 'Artisanal Coffee' },
    { emoji: '⬛', name: 'Ayla Apparel', tag: lang === 'ar' ? 'أزياء عصرية' : 'Modern Fashion' },
    { emoji: '🕯️', name: 'Wadi Noir', tag: lang === 'ar' ? 'ديكور منزلي' : 'Home Décor' },
    { emoji: '🌿', name: 'Balad Greens', tag: lang === 'ar' ? 'منتجات عضوية' : 'Organic Produce' },
    { emoji: '📷', name: 'Retro Frames', tag: lang === 'ar' ? 'تصوير فوتوغرافي' : 'Photography' },
  ];

  const FAQS = [
    { qKey: 'faq1Q', aKey: 'faq1A' },
    { qKey: 'faq2Q', aKey: 'faq2A' },
    { qKey: 'faq3Q', aKey: 'faq3A' },
    { qKey: 'faq4Q', aKey: 'faq4A' },
  ] as const;

  const STATS = [
    { value: '5', suffix: '', labelKey: 'statThemesLabel' },
    { value: '90', suffix: '-day', labelKey: 'statAnalyticsLabel' },
    { value: '3', suffix: '', labelKey: 'statDiscountLabel' },
    { value: '100', suffix: '%', labelKey: 'statUptimeLabel' },
  ] as const;

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 overflow-x-hidden selection:bg-orange-200 selection:text-orange-900">

      {/* ── NAV ── */}
      <nav className="fixed top-0 start-0 end-0 z-50">
        {/* orange accent line */}
        <div className="h-[3px] bg-gradient-to-r from-orange-400 via-orange-500 to-amber-400" />
        {/* main bar */}
        <div className="flex h-16 items-center justify-between bg-white px-6 md:px-12 border-b border-stone-200 shadow-[0_4px_24px_rgba(0,0,0,0.06)]">

          {/* logo */}
          <Link to="/" className="flex items-center gap-2.5 shrink-0">
            <span className="font-heading text-xl font-black tracking-tighter text-stone-900">
              PLINTH<span className="text-orange-500">.</span>
            </span>
            <span className="rounded-full bg-orange-50 border border-orange-200 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-orange-600 hidden sm:inline">
              Jordan
            </span>
          </Link>

          {/* center nav links */}
          <div className="hidden md:flex items-center gap-1">
            {([
              { label: t('navFeatures'), href: '#features' },
              { label: t('navHowItWorks'), href: '#how-it-works' },
              { label: t('navBrands'), href: '#brands' },
            ] as const).map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="rounded-full px-4 py-2 text-xs font-bold uppercase tracking-widest text-stone-400 transition-all hover:bg-stone-100 hover:text-stone-900"
              >
                {link.label}
              </a>
            ))}
          </div>

          {/* right actions */}
          <div className="flex items-center gap-2 md:gap-3 shrink-0">
            <LangToggle variant="light" />
            <div className="hidden sm:block h-4 w-px bg-stone-200" />
            <Link
              to="/sign-in"
              className="hidden sm:block rounded-full px-4 py-2 text-xs font-bold text-stone-500 hover:bg-stone-100 hover:text-stone-900 transition-all"
            >
              {t('navLogIn')}
            </Link>
            <Link
              to="/request-website"
              className="inline-flex items-center gap-1.5 rounded-full bg-stone-900 px-5 py-2.5 text-xs font-bold uppercase tracking-widest text-white hover:bg-stone-800 transition-all hover:scale-[1.03] shadow-sm"
            >
              {t('navStartSelling')} <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      {/* pt-[67px] = 3px accent line + 64px bar, so hero starts cleanly below the navbar */}
      <section ref={heroRef} className="relative min-h-[calc(100vh-67px)] mt-[67px] flex items-center overflow-hidden">

        {/* ── layered background ── */}
        <div className="pointer-events-none absolute inset-0 bg-[#FAFAF8]">
          {/* color blobs */}
          <div className="absolute -top-40 -end-40 h-[700px] w-[700px] rounded-full bg-orange-200/50 blur-[130px]" />
          <div className="absolute bottom-0 -start-40 h-[500px] w-[500px] rounded-full bg-violet-100/50 blur-[110px]" />
          <div className="absolute top-1/2 left-1/2 h-[400px] w-[400px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-sky-100/30 blur-[90px]" />
          {/* subtle dot grid */}
          <svg className="absolute inset-0 h-full w-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="herodots" width="24" height="24" patternUnits="userSpaceOnUse">
                <circle cx="1" cy="1" r="1" fill="#d6d3d1" opacity="0.6" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#herodots)" />
          </svg>
          {/* top fade */}
          <div className="absolute top-0 inset-x-0 h-24 bg-gradient-to-b from-[#FAFAF8] to-transparent" />
        </div>

        <div className="relative z-10 mx-auto w-full max-w-7xl px-6 md:px-12 pt-28 pb-16 lg:py-0 lg:min-h-screen lg:flex lg:items-center">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 xl:gap-20 items-center w-full">

            {/* ── LEFT: copy ── */}
            <motion.div style={{ opacity: heroOpacity, y: heroY }}>
              {/* eyebrow */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                className="inline-flex items-center gap-2.5 rounded-full border border-stone-200 bg-white/80 backdrop-blur-sm px-4 py-2 mb-8 shadow-sm"
              >
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500" />
                </span>
                <span className="text-xs font-bold uppercase tracking-widest text-stone-500">{t('heroBadge')}</span>
              </motion.div>

              {/* headline — three stacked lines */}
              <div className="mb-8 font-heading leading-[0.87] tracking-tighter overflow-hidden">
                {[
                  { text: t('heroLine1'), cls: 'text-stone-900 font-black' },
                  { text: t('heroLine2'), cls: 'text-stone-300 font-extralight italic' },
                  { text: t('heroLine3'), cls: 'font-black bg-gradient-to-br from-orange-400 via-orange-500 to-orange-600 bg-clip-text text-transparent' },
                ].map((line, i) => (
                  <div key={i} className="overflow-hidden">
                    <motion.div
                      initial={{ y: '110%' }}
                      animate={{ y: 0 }}
                      transition={{ duration: 0.7, delay: 0.06 * i, ease: [0.22, 1, 0.36, 1] }}
                      className={`text-[clamp(3.2rem,6.5vw,6.5rem)] ${line.cls}`}
                    >
                      {line.text}
                    </motion.div>
                  </div>
                ))}
              </div>

              {/* subtitle */}
              <motion.p
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.28 }}
                className="text-[1.05rem] leading-relaxed text-stone-500 mb-10 max-w-md"
              >
                {t('heroSub')}
              </motion.p>

              {/* CTAs */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.38 }}
                className="flex flex-col sm:flex-row gap-3 mb-10"
              >
                <Link
                  to="/request-website"
                  className="group relative inline-flex items-center justify-center gap-2 rounded-full bg-orange-500 px-8 py-4 text-sm font-bold text-white hover:bg-orange-600 transition-all hover:scale-[1.03] shadow-[0_8px_32px_rgba(249,115,22,0.38)]"
                >
                  {t('heroCtaPrimary')}
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
                <a
                  href="#features"
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-stone-200 bg-white/70 backdrop-blur-sm px-8 py-4 text-sm font-bold text-stone-600 hover:text-stone-900 hover:border-stone-300 hover:bg-white transition-all shadow-sm"
                >
                  {t('heroCtaSecondary')}
                </a>
              </motion.div>

              {/* social proof */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.55 }}
                className="flex items-center gap-4"
              >
                <div className="flex -space-x-2.5">
                  {['🧑‍💼', '👩‍💻', '🧑‍🎨', '👩‍🍳', '🧑‍🚀'].map((emoji, i) => (
                    <div key={i} className="h-9 w-9 rounded-full border-2 border-white bg-gradient-to-br from-stone-100 to-stone-200 flex items-center justify-center text-sm shadow-sm">
                      {emoji}
                    </div>
                  ))}
                </div>
                <div>
                  <div className="flex gap-0.5 mb-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <svg key={i} className="h-3.5 w-3.5 fill-orange-400" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>
                  <p className="text-xs text-stone-400 font-semibold">
                    {lang === 'ar' ? 'أكثر من 50 علامة تجارية حية في الأردن' : '50+ brands already live in Jordan'}
                  </p>
                </div>
              </motion.div>
            </motion.div>

            {/* ── RIGHT: visual ── */}
            <div className="relative hidden lg:block">
              {/* glow behind the mockup */}
              <div className="absolute inset-0 scale-75 rounded-full bg-orange-200/40 blur-[60px]" />

              {/* storefront mockup */}
              <motion.div
                initial={{ opacity: 0, y: 48, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.9, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
                className="relative mx-auto max-w-[340px] rounded-[1.75rem] border border-stone-200/80 bg-white shadow-[0_32px_80px_-12px_rgba(0,0,0,0.2),0_0_0_1px_rgba(0,0,0,0.04)] overflow-hidden"
              >
                {/* browser chrome */}
                <div className="flex items-center gap-2 px-4 py-3.5 bg-stone-50 border-b border-stone-100">
                  <div className="flex gap-1.5">
                    <div className="h-2.5 w-2.5 rounded-full bg-red-300" />
                    <div className="h-2.5 w-2.5 rounded-full bg-yellow-300" />
                    <div className="h-2.5 w-2.5 rounded-full bg-green-300" />
                  </div>
                  <div className="flex-1 mx-3 rounded-full bg-white border border-stone-200 px-3 py-1.5 text-[10px] font-medium text-stone-400 text-center tracking-tight">
                    🔒 plinth.io/s/sultan
                  </div>
                </div>
                {/* store body */}
                <div className="bg-stone-950">
                  <div className="px-5 py-4 flex items-center justify-between border-b border-white/[0.07]">
                    <span className="text-white font-black tracking-tighter">SULTAN<span className="text-orange-400">.</span></span>
                    <div className="flex items-center gap-3">
                      <span className="text-white/30 text-[11px]">Shop</span>
                      <span className="text-white/30 text-[11px]">About</span>
                      <div className="w-7 h-7 rounded-full bg-white/[0.08] flex items-center justify-center">
                        <ShoppingBag className="h-3.5 w-3.5 text-white/50" />
                      </div>
                    </div>
                  </div>
                  {/* hero banner */}
                  <div className="relative overflow-hidden bg-gradient-to-br from-stone-800 via-stone-900 to-stone-950 px-6 py-7 text-center">
                    <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 70% 50%, #f97316, transparent 60%)' }} />
                    <motion.div
                      animate={{ scale: [1, 1.08, 1] }}
                      transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }}
                      className="text-4xl mb-3"
                    >✨</motion.div>
                    <div className="text-white font-bold text-sm mb-1 relative">Oud Collection 2025</div>
                    <div className="text-white/40 text-[11px] mb-4 relative">Limited Edition · 12 pieces left</div>
                    <div className="inline-flex items-center gap-1.5 rounded-full bg-orange-500 px-4 py-1.5 text-white text-xs font-bold relative">
                      Shop Now <ArrowRight className="h-3 w-3" />
                    </div>
                  </div>
                  {/* products */}
                  <div className="grid grid-cols-2 gap-2 p-3 bg-white">
                    {[
                      { emoji: '🌹', name: 'Rose Oud', price: 'JOD 45' },
                      { emoji: '🖤', name: 'Noir Intense', price: 'JOD 62' },
                      { emoji: '✨', name: 'Gold Musk', price: 'JOD 38' },
                      { emoji: '🌿', name: 'Fresh Cedar', price: 'JOD 29' },
                    ].map((p) => (
                      <div key={p.name} className="group rounded-xl bg-stone-50 p-3 border border-stone-100 hover:border-orange-200 transition-colors">
                        <div className="h-14 rounded-lg bg-white flex items-center justify-center text-2xl mb-2 border border-stone-100">{p.emoji}</div>
                        <div className="text-[11px] font-bold text-stone-700">{p.name}</div>
                        <div className="text-[10px] text-orange-500 font-bold mt-0.5">{p.price}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>

              {/* floating card: new order */}
              <motion.div
                initial={{ opacity: 0, x: -24, y: 16 }}
                animate={{ opacity: 1, x: 0, y: 0 }}
                transition={{ duration: 0.6, delay: 1.0, ease: [0.22, 1, 0.36, 1] }}
                className="absolute -start-16 top-20 w-52 rounded-2xl bg-white border border-stone-100 p-4 shadow-[0_12px_40px_rgba(0,0,0,0.12)]"
              >
                <motion.div animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 3.2, ease: 'easeInOut' }}>
                  <div className="flex items-center gap-2.5 mb-3">
                    <div className="h-8 w-8 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-base shrink-0">🛍️</div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-stone-800 leading-tight">New Order!</div>
                      <div className="text-[10px] text-stone-400">2 seconds ago</div>
                    </div>
                    <div className="ms-auto flex-shrink-0">
                      <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                    </div>
                  </div>
                  <div className="rounded-xl bg-stone-50 border border-stone-100 p-3">
                    <div className="text-[10px] text-stone-400 mb-0.5">Rose Oud · 2 units</div>
                    <div className="text-base font-black text-stone-900">JOD 90.00</div>
                  </div>
                </motion.div>
              </motion.div>

              {/* floating card: revenue */}
              <motion.div
                initial={{ opacity: 0, x: 24, y: 16 }}
                animate={{ opacity: 1, x: 0, y: 0 }}
                transition={{ duration: 0.6, delay: 1.2, ease: [0.22, 1, 0.36, 1] }}
                className="absolute -end-10 bottom-24 w-44 rounded-2xl bg-white border border-stone-100 p-4 shadow-[0_12px_40px_rgba(0,0,0,0.12)]"
              >
                <motion.div animate={{ y: [0, -6, 0] }} transition={{ repeat: Infinity, duration: 3.8, ease: 'easeInOut', delay: 0.5 }}>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-1.5">This Week</div>
                  <div className="text-2xl font-black text-stone-900 tracking-tight leading-none mb-0.5">+24%</div>
                  <div className="text-[11px] text-emerald-500 font-semibold mb-3">↑ Revenue growth</div>
                  <div className="flex items-end gap-0.5 h-8">
                    {[28, 45, 35, 62, 48, 75, 90].map((h, i) => (
                      <div key={i} className="flex-1 rounded-sm bg-orange-400/70" style={{ height: `${h}%` }} />
                    ))}
                  </div>
                </motion.div>
              </motion.div>

              {/* floating pill: themes */}
              <motion.div
                initial={{ opacity: 0, y: -14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 1.4 }}
                className="absolute end-0 top-6 rounded-full bg-white border border-stone-200 px-3.5 py-2 shadow-md flex items-center gap-2.5"
              >
                <div className="flex gap-1">
                  {['bg-neutral-800', 'bg-rose-700', 'bg-emerald-800', 'bg-amber-800', 'bg-stone-950'].map((c, i) => (
                    <div key={i} className={`h-3 w-3 rounded-full ${c} ring-1 ring-black/10`} />
                  ))}
                </div>
                <span className="text-[11px] font-bold text-stone-500">5 themes</span>
              </motion.div>

              {/* floating badge: secure */}
              <motion.div
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.45, delay: 1.6 }}
                className="absolute start-0 bottom-8 rounded-full bg-emerald-50 border border-emerald-200/70 px-3.5 py-2 flex items-center gap-2 shadow-sm"
              >
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                <span className="text-[11px] font-bold text-emerald-700">Secured &amp; hosted</span>
              </motion.div>
            </div>

          </div>
        </div>
      </section>

      {/* ── STATS ── */}
      <section className="py-16 border-y border-stone-200 bg-white">
        <div className="mx-auto max-w-5xl px-6 grid grid-cols-2 md:grid-cols-4 gap-y-10 gap-x-4 divide-x divide-stone-100">
          {STATS.map((s) => (
            <div key={s.labelKey} className="ps-8 first:ps-0 first:border-l-0">
              <StatCard value={s.value} suffix={s.suffix} label={t(s.labelKey)} />
            </div>
          ))}
        </div>
      </section>

      {/* ── MARQUEE ── */}
      <Marquee brands={BRANDS} />

      {/* ── FEATURES ── */}
      <section id="features" className="py-32 px-6 bg-white">
        <div className="mx-auto max-w-7xl">
          <div className="mb-16 max-w-xl">
            <motion.p
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              className="text-xs font-bold uppercase tracking-widest text-orange-500 mb-4"
            >
              {t('featuresTag')}
            </motion.p>
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="font-heading text-5xl font-black tracking-tighter text-stone-900 leading-tight"
            >
              {t('featuresTitle')}
            </motion.h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((f, i) => {
              const Icon = f.icon;
              return (
                <motion.div
                  key={f.titleKey}
                  initial={{ opacity: 0, y: 32 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-40px' }}
                  transition={{ duration: 0.5, delay: (i % 3) * 0.1 }}
                  className="group rounded-2xl border border-stone-200 bg-white p-8 flex flex-col gap-5 hover:shadow-md hover:-translate-y-1 transition-all duration-300"
                >
                  <div className={`inline-flex w-fit rounded-xl p-3 ring-1 ${f.accent}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-stone-900 mb-2">{t(f.titleKey)}</h3>
                    <p className="text-sm leading-relaxed text-stone-500">{t(f.descKey)}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── SPLIT SECTION: DESIGN ── */}
      <section className="py-20 px-6 bg-stone-50 border-y border-stone-100 overflow-hidden">
        <div className="mx-auto max-w-7xl grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, x: -32 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <p className="text-xs font-bold uppercase tracking-widest text-violet-500 mb-4">{t('themesTag')}</p>
            <h2 className="font-heading text-5xl font-black tracking-tighter text-stone-900 leading-tight mb-6 whitespace-pre-line">
              {t('themesTitle')}
            </h2>
            <p className="text-stone-500 leading-relaxed mb-8 max-w-md">{t('themesSub')}</p>
            <div className="flex flex-wrap gap-3 mb-10">
              {['Mono', 'Sunset', 'Forest', 'Mocha', 'Noir'].map((th) => (
                <span key={th} className="rounded-full border border-stone-200 bg-white px-4 py-2 text-xs font-bold text-stone-600 shadow-sm">
                  {th}
                </span>
              ))}
            </div>
            <Link
              to="/request-website"
              className="inline-flex items-center gap-2 text-sm font-bold text-stone-900 hover:text-orange-500 transition-colors group"
            >
              {t('themesGetStore')} <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </Link>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: 32 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <div className="grid grid-cols-5 gap-2 mb-4">
              {[
                { name: 'Mono', bg: 'bg-neutral-800', text: 'text-neutral-400' },
                { name: 'Sunset', bg: 'bg-rose-900', text: 'text-rose-300' },
                { name: 'Forest', bg: 'bg-green-900', text: 'text-green-300' },
                { name: 'Mocha', bg: 'bg-amber-900', text: 'text-amber-300' },
                { name: 'Noir', bg: 'bg-stone-950', text: 'text-stone-400' },
              ].map((theme) => (
                <div key={theme.name} className={`aspect-square rounded-xl ${theme.bg} flex items-end p-2`}>
                  <span className={`text-[10px] font-bold ${theme.text}`}>{theme.name}</span>
                </div>
              ))}
            </div>
            <div className="rounded-2xl border border-stone-200 bg-white overflow-hidden shadow-sm">
              <div className="bg-stone-900 p-4 border-b border-stone-700 flex items-center justify-between">
                <div className="font-black text-white tracking-tighter text-sm">SULTAN<span className="text-orange-400">.</span></div>
                <div className="flex gap-3 text-xs text-stone-400">
                  <span>Shop</span><span>About</span><span>Contact</span>
                </div>
              </div>
              <div className="p-6">
                <div className="h-36 rounded-xl bg-stone-100 mb-4 flex items-center justify-center text-5xl">✨</div>
                <div className="h-4 w-2/3 rounded-full bg-stone-200 mb-2" />
                <div className="h-3 w-full rounded-full bg-stone-100 mb-1" />
                <div className="h-3 w-4/5 rounded-full bg-stone-100 mb-5" />
                <div className="flex gap-3">
                  <div className="h-9 flex-1 rounded-full bg-orange-500" />
                  <div className="h-9 w-9 rounded-full bg-stone-100 border border-stone-200" />
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="how-it-works" className="py-32 px-6 bg-white">
        <div className="mx-auto max-w-7xl grid grid-cols-1 lg:grid-cols-2 gap-24 items-start">
          <div className="lg:sticky lg:top-28">
            <motion.p
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              className="text-xs font-bold uppercase tracking-widest text-orange-500 mb-4"
            >
              {t('howTag')}
            </motion.p>
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="font-heading text-5xl font-black tracking-tighter text-stone-900 leading-tight mb-6"
            >
              {t('howTitle')}
            </motion.h2>
            <p className="text-stone-500 leading-relaxed max-w-sm">{t('howSub')}</p>
          </div>
          <div className="flex flex-col gap-0 pt-4">
            {STEPS.map((s, i) => {
              const Icon = s.icon;
              return (
                <motion.div
                  key={s.n}
                  initial={{ opacity: 0, x: -16 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: '-40px' }}
                  transition={{ duration: 0.45, delay: i * 0.08 }}
                  className="group flex gap-6 items-start"
                >
                  <div className="shrink-0 flex flex-col items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-50 text-orange-500 ring-1 ring-orange-100 group-hover:bg-orange-500 group-hover:text-white transition-all duration-300">
                      <Icon className="h-5 w-5" />
                    </div>
                    {i < STEPS.length - 1 && (
                      <div className="h-12 w-px bg-gradient-to-b from-stone-200 to-transparent" />
                    )}
                  </div>
                  <div className="pb-8">
                    <div className="mb-1 text-xs font-bold uppercase tracking-widest text-stone-300">{s.n}</div>
                    <h3 className="text-xl font-bold text-stone-900 mb-2">{t(s.titleKey)}</h3>
                    <p className="text-sm leading-relaxed text-stone-500">{t(s.bodyKey)}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── BRANDS ── */}
      <section id="brands" className="py-32 px-6 bg-stone-50 border-t border-stone-100">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-16">
            <div>
              <motion.p
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                className="text-xs font-bold uppercase tracking-widest text-orange-500 mb-4"
              >
                {t('brandsTag')}
              </motion.p>
              <motion.h2
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="font-heading text-5xl font-black tracking-tighter text-stone-900"
              >
                {t('brandsTitle')}
              </motion.h2>
            </div>
            <Link
              to="/request-website"
              className="shrink-0 inline-flex items-center gap-2 rounded-full border border-stone-300 bg-white px-6 py-3 text-xs font-bold uppercase tracking-widest text-stone-600 hover:text-stone-900 hover:border-stone-400 transition-all shadow-sm"
            >
              {t('brandsJoin')} <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {BRANDS.slice(0, 3).map((store, i) => (
              <motion.div
                key={store.name}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.45, delay: i * 0.1 }}
                className="group relative overflow-hidden rounded-2xl border border-stone-200 bg-white hover:shadow-md transition-all duration-300 hover:-translate-y-1"
              >
                <div className="h-48 flex items-center justify-center bg-stone-50 text-6xl border-b border-stone-100 transition-transform duration-500 group-hover:scale-105 overflow-hidden">
                  {store.emoji}
                </div>
                <div className="p-6 flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-stone-900 text-lg">{store.name}</h3>
                    <p className="text-xs font-bold uppercase tracking-widest text-orange-500 mt-1">{store.tag}</p>
                  </div>
                  <div className="h-9 w-9 rounded-full border border-stone-200 flex items-center justify-center text-stone-400 group-hover:border-orange-200 group-hover:text-orange-500 group-hover:bg-orange-50 transition-all">
                    <ArrowUpRight className="h-4 w-4" />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section id="faq" className="py-32 px-6 bg-white border-t border-stone-100">
        <div className="mx-auto max-w-3xl">
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-xs font-bold uppercase tracking-widest text-orange-500 mb-4 text-center"
          >
            {t('faqTag')}
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="font-heading text-5xl font-black tracking-tighter text-stone-900 text-center mb-16"
          >
            {t('faqTitle')}
          </motion.h2>
          <div>
            {FAQS.map((f, i) => (
              <FaqItem key={f.qKey} q={t(f.qKey)} a={t(f.aKey)} index={i} />
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-32 px-6 bg-stone-900">
        <div className="mx-auto max-w-4xl text-center relative">
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="h-[400px] w-[600px] rounded-full bg-orange-500/10 blur-[100px]" />
          </div>
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="relative z-10"
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-orange-500/20 bg-orange-500/10 px-4 py-2 mb-8">
              <Sparkles className="h-3.5 w-3.5 text-orange-400" />
              <span className="text-xs font-bold uppercase tracking-widest text-orange-400">{t('ctaBadge')}</span>
            </div>
            <h2 className="font-heading text-[clamp(2.5rem,7vw,6rem)] font-black tracking-tighter text-white leading-[0.95] mb-6">
              {t('ctaTitle1')}<br />
              <span className="text-orange-500">{t('ctaTitle2')}</span>
            </h2>
            <p className="text-stone-400 max-w-md mx-auto mb-10 leading-relaxed">{t('ctaSub')}</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/request-website"
                className="group inline-flex items-center justify-center gap-2 rounded-full bg-orange-500 px-10 py-4 text-sm font-bold text-white hover:bg-orange-400 transition-all hover:scale-105 shadow-[0_0_50px_rgba(249,115,22,0.35)]"
              >
                {t('ctaPrimary')}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
              <Link
                to="/sign-in"
                className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/5 px-10 py-4 text-sm font-bold text-white/60 hover:text-white hover:bg-white/10 transition-all"
              >
                {t('ctaSecondary')}
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="bg-stone-900 border-t border-white/5 px-6 py-10">
        <div className="mx-auto max-w-7xl flex flex-col md:flex-row items-center justify-between gap-6">
          <Link to="/" className="font-heading text-2xl font-black tracking-tighter text-white">
            PLINTH<span className="text-orange-500">.</span>
          </Link>
          <div className="flex flex-wrap justify-center gap-8 text-xs font-bold uppercase tracking-widest text-stone-500">
            <Link to="/request-website" className="hover:text-white transition-colors">{t('footerStartSelling')}</Link>
            <Link to="/sign-in" className="hover:text-white transition-colors">{t('footerMerchantLogin')}</Link>
            <a href="#features" className="hover:text-white transition-colors">{t('footerFeatures')}</a>
            <a href="#how-it-works" className="hover:text-white transition-colors">{t('footerHowItWorks')}</a>
          </div>
          <p className="text-xs text-stone-600">{t('footerCopyright')}</p>
        </div>
      </footer>
    </div>
  );
}
