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
      <nav className="fixed top-0 start-0 end-0 z-50 flex items-center justify-between px-6 py-4 md:px-12 backdrop-blur-xl bg-white/90 border-b border-stone-200/80 shadow-[0_1px_0_rgba(0,0,0,0.04)]">
        <Link to="/" className="font-heading text-xl font-black tracking-tighter text-stone-900">
          PLINTH<span className="text-orange-500">.</span>
        </Link>
        <div className="hidden md:flex items-center gap-8 text-xs font-bold uppercase tracking-widest text-stone-400">
          <a href="#features" className="transition-colors hover:text-stone-900">{t('navFeatures')}</a>
          <a href="#how-it-works" className="transition-colors hover:text-stone-900">{t('navHowItWorks')}</a>
          <a href="#brands" className="transition-colors hover:text-stone-900">{t('navBrands')}</a>
        </div>
        <div className="flex items-center gap-3">
          <LangToggle variant="light" />
          <Link
            to="/sign-in"
            className="hidden sm:block text-xs font-bold uppercase tracking-widest text-stone-400 hover:text-stone-900 transition-colors"
          >
            {t('navLogIn')}
          </Link>
          <Link
            to="/request-website"
            className="inline-flex items-center gap-2 rounded-full bg-orange-500 px-5 py-2.5 text-xs font-bold uppercase tracking-widest text-white hover:bg-orange-600 transition-all hover:scale-105 shadow-[0_4px_14px_rgba(249,115,22,0.35)]"
          >
            {t('navStartSelling')} <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section ref={heroRef} className="relative min-h-screen flex flex-col justify-center items-center text-center px-6 pt-24 overflow-hidden">
        {/* background decorations */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[700px] w-[700px] rounded-full bg-orange-100/60 blur-[120px]" />
          <div className="absolute top-1/2 left-1/4 h-[400px] w-[400px] rounded-full bg-violet-100/40 blur-[100px]" />
          <svg className="absolute inset-0 h-full w-full opacity-[0.06]" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
                <path d="M 60 0 L 0 0 0 60" fill="none" stroke="#78716c" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>

        <motion.div style={{ opacity: heroOpacity, y: heroY }} className="relative z-10 max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2.5 rounded-full border border-stone-200 bg-white px-4 py-2 mb-10 shadow-sm"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-orange-500 animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-widest text-stone-500">
              {t('heroBadge')}
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="font-heading text-[clamp(3rem,10vw,8rem)] font-black leading-[0.9] tracking-tighter mb-8 text-stone-900"
          >
            {t('heroLine1')}{' '}
            <span className="text-stone-300 italic font-light">{t('heroLine2')}</span>
            <br />
            <span className="bg-gradient-to-r from-orange-500 to-orange-600 bg-clip-text text-transparent">
              {t('heroLine3')}
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="max-w-xl mx-auto text-lg leading-relaxed text-stone-500 mb-12"
          >
            {t('heroSub')}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <Link
              to="/request-website"
              className="group inline-flex items-center justify-center gap-2 rounded-full bg-orange-500 px-8 py-4 text-sm font-bold text-white hover:bg-orange-600 transition-all hover:scale-105 shadow-[0_8px_30px_rgba(249,115,22,0.35)]"
            >
              {t('heroCtaPrimary')}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <a
              href="#features"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-stone-200 bg-white px-8 py-4 text-sm font-bold text-stone-600 hover:text-stone-900 hover:border-stone-300 hover:bg-stone-50 transition-all shadow-sm"
            >
              {t('heroCtaSecondary')}
            </a>
          </motion.div>
        </motion.div>

        {/* Dashboard preview */}
        <motion.div
          initial={{ opacity: 0, y: 60 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="relative z-10 mt-24 w-full max-w-5xl mx-auto px-4"
        >
          <div className="rounded-2xl border border-stone-200 bg-white p-1 shadow-[0_20px_80px_-10px_rgba(0,0,0,0.12)]">
            <div className="rounded-xl bg-stone-50 overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-stone-200 bg-white">
                <div className="flex gap-1.5">
                  <div className="h-3 w-3 rounded-full bg-stone-200" />
                  <div className="h-3 w-3 rounded-full bg-stone-200" />
                  <div className="h-3 w-3 rounded-full bg-stone-200" />
                </div>
                <div className="flex-1 mx-4 rounded-md bg-stone-100 px-3 py-1 text-xs text-stone-400 text-center">
                  plinth.io/admin
                </div>
              </div>
              <div className="p-6 grid grid-cols-3 gap-4">
                {[
                  { label: 'Total Revenue', val: 'JOD 12,450', up: true, icon: TrendingUp },
                  { label: 'Orders Today', val: '34', up: true, icon: ShoppingBag },
                  { label: 'Active Products', val: '128', up: false, icon: Package },
                ].map((card) => (
                  <div key={card.label} className="rounded-xl bg-white border border-stone-200 p-4 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs text-stone-400 uppercase tracking-wider">{card.label}</span>
                      <card.icon className="h-4 w-4 text-stone-300" />
                    </div>
                    <div className="text-xl font-black text-stone-900">{card.val}</div>
                    <div className={`text-xs mt-1 font-medium ${card.up ? 'text-emerald-500' : 'text-stone-400'}`}>
                      {card.up ? '↑ 12% this week' : 'No change'}
                    </div>
                  </div>
                ))}
                <div className="col-span-3 rounded-xl bg-white border border-stone-200 p-4 h-28 flex items-end gap-1 shadow-sm">
                  {[40, 65, 45, 80, 55, 90, 70, 85, 60, 95, 75, 100, 82, 68, 88].map((h, i) => (
                    <div
                      key={i}
                      className="flex-1 rounded-sm bg-orange-400/60"
                      style={{ height: `${h}%` }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* scroll hint */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5, duration: 0.6 }}
          className="absolute bottom-8 start-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-stone-300"
        >
          <span className="text-xs uppercase tracking-widest">Scroll</span>
          <motion.div animate={{ y: [0, 6, 0] }} transition={{ repeat: Infinity, duration: 1.6 }}>
            <ChevronDown className="h-4 w-4" />
          </motion.div>
        </motion.div>
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
