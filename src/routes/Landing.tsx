import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, useInView, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import {
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Box,
  CheckCircle2,
  ChevronDown,
  Globe,
  LayoutTemplate,
  Palette,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Store,
  Tag,
  TrendingUp,
  Zap,
  Package,
  Users,
  Star,
  CreditCard,
  Truck,
} from 'lucide-react';

/* ─────────────────────── DATA ─────────────────────── */

const STATS = [
  { value: '5', label: 'Premium Themes', suffix: '' },
  { value: '90', label: 'Day Analytics Window', suffix: '-day' },
  { value: '3', label: 'Discount Types', suffix: '' },
  { value: '100', label: 'Uptime SLA', suffix: '%' },
];

const FEATURES = [
  {
    icon: Palette,
    title: 'Luxury Storefronts',
    description:
      'Five exclusive themes — Mono, Sunset, Forest, Mocha, Noir — applied instantly at runtime. Preview live before you publish.',
    color: 'from-violet-500/10 to-purple-500/5',
    iconColor: 'text-violet-400',
  },
  {
    icon: BarChart3,
    title: 'Real-Time Analytics',
    description:
      'Track views, cart additions, and AOV with a 90-day funnel. Understand exactly where your customers drop off.',
    color: 'from-sky-500/10 to-blue-500/5',
    iconColor: 'text-sky-400',
  },
  {
    icon: Package,
    title: 'Smart Order Flow',
    description:
      'A built-in approval queue lets you review orders before fulfillment — ideal for COD and custom delivery workflows.',
    color: 'from-emerald-500/10 to-teal-500/5',
    iconColor: 'text-emerald-400',
  },
  {
    icon: Tag,
    title: 'Flexible Discounts',
    description:
      'Percentage, fixed-amount, or free-shipping codes. Set usage limits, minimum carts, and expiry dates.',
    color: 'from-orange-500/10 to-amber-500/5',
    iconColor: 'text-orange-400',
  },
  {
    icon: Truck,
    title: 'Local Shipping',
    description:
      'Flat-rate or free-over-threshold shipping rules built for Jordanian governorates and regional couriers.',
    color: 'from-rose-500/10 to-pink-500/5',
    iconColor: 'text-rose-400',
  },
  {
    icon: ShieldCheck,
    title: 'Enterprise Security',
    description:
      'JWT auth, httpOnly cookies, per-account brute-force lockout, and server-authoritative stock checks at checkout.',
    color: 'from-slate-500/10 to-gray-500/5',
    iconColor: 'text-slate-400',
  },
];

const STEPS = [
  { n: '01', icon: Store, title: 'Request', body: 'Submit your brand name, category, and a short pitch to get approved on the platform.' },
  { n: '02', icon: LayoutTemplate, title: 'Design', body: 'Pick a theme, upload your logo, and set your announcement bar — all from a clean sidebar.' },
  { n: '03', icon: Box, title: 'Stock', body: 'Upload products with images, variants, and pricing. Organise into collections.' },
  { n: '04', icon: Zap, title: 'Launch', body: 'Open your storefront and start accepting orders on the same day.' },
];

const BRANDS = [
  { emoji: '✨', name: 'Sultan Perfumes', tag: 'Luxury Fragrance' },
  { emoji: '☕', name: 'Amman Roasters', tag: 'Artisanal Coffee' },
  { emoji: '⬛', name: 'Ayla Apparel', tag: 'Modern Fashion' },
  { emoji: '🕯️', name: 'Wadi Noir', tag: 'Home Décor' },
  { emoji: '🌿', name: 'Balad Greens', tag: 'Organic Produce' },
  { emoji: '📷', name: 'Retro Frames', tag: 'Photography' },
];

const FAQS = [
  {
    q: 'Is Plinth optimised for businesses in Jordan?',
    a: 'Yes. Every detail — from JOD currency with 3-decimal precision to the COD approval workflow and Jordan phone validation — is purpose-built for the local market.',
  },
  {
    q: 'How customisable are the storefronts?',
    a: 'Completely. Switch themes instantly, upload your logo, configure announcements, set your brand colours, and preview every change live before publishing.',
  },
  {
    q: 'Can I run discount campaigns and track their impact?',
    a: 'Yes. Create percentage, fixed-amount, or free-shipping codes with usage caps, minimum cart thresholds, and expiry dates. Analytics shows revenue impact per campaign.',
  },
  {
    q: 'Do I need to install anything?',
    a: 'No software, no plugins. Plinth runs entirely in the browser — manage your store from any device, anywhere.',
  },
];

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
      className="flex flex-col gap-1 border-l border-white/10 pl-8 first:border-l-0 first:pl-0"
    >
      <span className="text-5xl font-black tracking-tighter text-white">
        {inView ? count : 0}{suffix}
      </span>
      <span className="text-sm font-medium text-white/40 uppercase tracking-widest">{label}</span>
    </motion.div>
  );
}

function FeatureCard({ icon: Icon, title, description, color, iconColor, index }: typeof FEATURES[0] & { index: number }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 32 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay: (index % 3) * 0.1 }}
      className={`group relative overflow-hidden rounded-2xl bg-gradient-to-br ${color} p-px`}
    >
      <div className="relative h-full rounded-2xl bg-[#0d0d0d] p-8 flex flex-col gap-5 transition-transform duration-300 group-hover:-translate-y-1">
        <div className={`inline-flex w-fit rounded-xl bg-white/5 p-3 ${iconColor}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
          <p className="text-sm leading-relaxed text-white/50">{description}</p>
        </div>
      </div>
    </motion.div>
  );
}

function StepCard({ n, icon: Icon, title, body, index }: typeof STEPS[0] & { index: number }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, x: -16 }}
      animate={inView ? { opacity: 1, x: 0 } : {}}
      transition={{ duration: 0.45, delay: index * 0.08 }}
      className="group flex gap-6 items-start"
    >
      <div className="shrink-0 flex flex-col items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-500/10 text-orange-400 ring-1 ring-orange-500/20 group-hover:bg-orange-500 group-hover:text-white transition-all duration-300">
          <Icon className="h-5 w-5" />
        </div>
        {index < STEPS.length - 1 && (
          <div className="h-12 w-px bg-gradient-to-b from-white/10 to-transparent" />
        )}
      </div>
      <div className="pb-8">
        <div className="mb-1 text-xs font-bold uppercase tracking-widest text-white/20">{n}</div>
        <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
        <p className="text-sm leading-relaxed text-white/40">{body}</p>
      </div>
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
      className="border-b border-white/8"
    >
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between gap-4 py-6 text-left"
      >
        <span className="text-base font-semibold text-white/90">{q}</span>
        <ChevronDown
          className={`h-5 w-5 shrink-0 text-white/30 transition-transform duration-300 ${open ? 'rotate-180' : ''}`}
        />
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
            <p className="pb-6 text-sm leading-relaxed text-white/40">{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ─────────────────────── MARQUEE ─────────────────────── */

function Marquee() {
  const items = [...BRANDS, ...BRANDS];
  return (
    <div className="relative overflow-hidden py-6 border-y border-white/5">
      <div className="pointer-events-none absolute left-0 top-0 h-full w-32 bg-gradient-to-r from-[#080808] to-transparent z-10" />
      <div className="pointer-events-none absolute right-0 top-0 h-full w-32 bg-gradient-to-l from-[#080808] to-transparent z-10" />
      <motion.div
        animate={{ x: ['0%', '-50%'] }}
        transition={{ duration: 28, repeat: Infinity, ease: 'linear' }}
        className="flex gap-12 w-max"
      >
        {items.map((b, i) => (
          <div key={i} className="flex items-center gap-3 shrink-0">
            <span className="text-2xl">{b.emoji}</span>
            <div>
              <div className="text-sm font-bold text-white/70">{b.name}</div>
              <div className="text-xs text-white/25 uppercase tracking-widest">{b.tag}</div>
            </div>
            <div className="ml-8 h-4 w-px bg-white/10" />
          </div>
        ))}
      </motion.div>
    </div>
  );
}

/* ─────────────────────── MAIN ─────────────────────── */

export default function Landing() {
  const heroRef = useRef(null);
  const { scrollY } = useScroll();
  const heroOpacity = useTransform(scrollY, [0, 400], [1, 0]);
  const heroY = useTransform(scrollY, [0, 400], [0, 80]);

  return (
    <div className="min-h-screen bg-[#080808] text-white overflow-x-hidden">

      {/* ── NAV ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-5 md:px-12 backdrop-blur-xl bg-[#080808]/80 border-b border-white/[0.04]">
        <Link to="/" className="font-heading text-xl font-black tracking-tighter text-white">
          PLINTH<span className="text-orange-500">.</span>
        </Link>
        <div className="hidden md:flex items-center gap-10 text-xs font-bold uppercase tracking-widest text-white/40">
          <a href="#features" className="transition-colors hover:text-white">Features</a>
          <a href="#how-it-works" className="transition-colors hover:text-white">How it works</a>
          <a href="#brands" className="transition-colors hover:text-white">Brands</a>
        </div>
        <div className="flex items-center gap-4">
          <Link
            to="/sign-in"
            className="hidden sm:block text-xs font-bold uppercase tracking-widest text-white/40 hover:text-white transition-colors"
          >
            Log in
          </Link>
          <Link
            to="/request-website"
            className="inline-flex items-center gap-2 rounded-full bg-orange-500 px-5 py-2.5 text-xs font-bold uppercase tracking-widest text-white hover:bg-orange-400 transition-all hover:scale-105"
          >
            Start Selling <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section ref={heroRef} className="relative min-h-screen flex flex-col justify-center items-center text-center px-6 pt-24 overflow-hidden">
        {/* bg glow */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[600px] w-[600px] rounded-full bg-orange-600/10 blur-[120px]" />
          <div className="absolute top-1/2 left-1/4 h-[400px] w-[400px] rounded-full bg-violet-600/8 blur-[100px]" />
          {/* grid lines */}
          <svg className="absolute inset-0 h-full w-full opacity-[0.03]" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
                <path d="M 60 0 L 0 0 0 60" fill="none" stroke="white" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>

        <motion.div
          style={{ opacity: heroOpacity, y: heroY }}
          className="relative z-10 max-w-6xl mx-auto"
        >
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2.5 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 mb-10"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-orange-500 animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-widest text-white/50">
              Powering Jordan's next generation of commerce
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="font-heading text-[clamp(3rem,10vw,8rem)] font-black leading-[0.9] tracking-tighter mb-8"
          >
            Your brand.{' '}
            <span className="text-white/20 italic font-light">Your</span>
            <br />
            <span className="bg-gradient-to-r from-orange-400 to-orange-600 bg-clip-text text-transparent">
              storefront.
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="max-w-xl mx-auto text-lg leading-relaxed text-white/40 mb-12"
          >
            A self-hosted multi-store commerce platform built for Jordanian entrepreneurs. Launch a premium storefront in minutes, not months.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <Link
              to="/request-website"
              className="group inline-flex items-center justify-center gap-2 rounded-full bg-orange-500 px-8 py-4 text-sm font-bold text-white hover:bg-orange-400 transition-all hover:scale-105 shadow-[0_0_40px_rgba(249,115,22,0.3)]"
            >
              Request your store
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <a
              href="#features"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-8 py-4 text-sm font-bold text-white/70 hover:text-white hover:bg-white/[0.08] transition-all"
            >
              Explore features
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
          <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-1 shadow-[0_0_80px_rgba(0,0,0,0.6)]">
            <div className="rounded-xl bg-[#111] overflow-hidden">
              {/* fake browser bar */}
              <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5">
                <div className="flex gap-1.5">
                  <div className="h-3 w-3 rounded-full bg-white/10" />
                  <div className="h-3 w-3 rounded-full bg-white/10" />
                  <div className="h-3 w-3 rounded-full bg-white/10" />
                </div>
                <div className="flex-1 mx-4 rounded-md bg-white/5 px-3 py-1 text-xs text-white/20 text-center">
                  plinth.io/admin
                </div>
              </div>
              {/* fake dashboard */}
              <div className="p-6 grid grid-cols-3 gap-4">
                {[
                  { label: 'Total Revenue', val: 'JOD 12,450', up: true, icon: TrendingUp },
                  { label: 'Orders Today', val: '34', up: true, icon: ShoppingBag },
                  { label: 'Active Products', val: '128', up: false, icon: Package },
                ].map((card) => (
                  <div key={card.label} className="rounded-xl bg-white/[0.04] border border-white/5 p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs text-white/30 uppercase tracking-wider">{card.label}</span>
                      <card.icon className="h-4 w-4 text-white/20" />
                    </div>
                    <div className="text-xl font-black text-white">{card.val}</div>
                    <div className={`text-xs mt-1 font-medium ${card.up ? 'text-emerald-400' : 'text-white/20'}`}>
                      {card.up ? '↑ 12% this week' : 'No change'}
                    </div>
                  </div>
                ))}
                <div className="col-span-3 rounded-xl bg-white/[0.04] border border-white/5 p-4 h-28 flex items-end gap-1">
                  {[40, 65, 45, 80, 55, 90, 70, 85, 60, 95, 75, 100, 82, 68, 88].map((h, i) => (
                    <div
                      key={i}
                      className="flex-1 rounded-sm bg-orange-500/40 transition-all"
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
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-white/20"
        >
          <span className="text-xs uppercase tracking-widest">Scroll</span>
          <motion.div animate={{ y: [0, 6, 0] }} transition={{ repeat: Infinity, duration: 1.6 }}>
            <ChevronDown className="h-4 w-4" />
          </motion.div>
        </motion.div>
      </section>

      {/* ── STATS ── */}
      <section className="py-20 border-y border-white/5 bg-white/[0.01]">
        <div className="mx-auto max-w-5xl px-6 grid grid-cols-2 md:grid-cols-4 gap-y-10 gap-x-4">
          {STATS.map((s) => (
            <StatCard key={s.label} {...s} />
          ))}
        </div>
      </section>

      {/* ── MARQUEE ── */}
      <Marquee />

      {/* ── FEATURES ── */}
      <section id="features" className="py-32 px-6 mx-auto max-w-7xl">
        <div className="mb-16 max-w-xl">
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-xs font-bold uppercase tracking-widest text-orange-500 mb-4"
          >
            Platform Features
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="font-heading text-5xl font-black tracking-tighter text-white leading-tight"
          >
            Everything you need to sell online in Jordan.
          </motion.h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map((f, i) => (
            <FeatureCard key={f.title} {...f} index={i} />
          ))}
        </div>
      </section>

      {/* ── SPLIT SECTION: DESIGN ── */}
      <section className="py-20 px-6 border-y border-white/5 overflow-hidden">
        <div className="mx-auto max-w-7xl grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, x: -32 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <p className="text-xs font-bold uppercase tracking-widest text-violet-400 mb-4">Storefront Design</p>
            <h2 className="font-heading text-5xl font-black tracking-tighter text-white leading-tight mb-6">
              Five themes.<br />Infinite personality.
            </h2>
            <p className="text-white/40 leading-relaxed mb-8 max-w-md">
              Switch between Mono, Sunset, Forest, Mocha, and Noir with a single click. Every theme is optimised for conversion — from typography to touch targets — and previewed live before you publish.
            </p>
            <div className="flex flex-wrap gap-3 mb-10">
              {['Mono', 'Sunset', 'Forest', 'Mocha', 'Noir'].map((t) => (
                <span
                  key={t}
                  className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-bold text-white/60"
                >
                  {t}
                </span>
              ))}
            </div>
            <Link
              to="/request-website"
              className="inline-flex items-center gap-2 text-sm font-bold text-white hover:text-orange-400 transition-colors group"
            >
              Get your store <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </Link>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: 32 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="relative"
          >
            {/* Theme color swatches */}
            <div className="grid grid-cols-5 gap-2 mb-4">
              {[
                { name: 'Mono', bg: 'bg-neutral-900', ring: 'ring-neutral-600' },
                { name: 'Sunset', bg: 'bg-rose-950', ring: 'ring-rose-700' },
                { name: 'Forest', bg: 'bg-green-950', ring: 'ring-green-700' },
                { name: 'Mocha', bg: 'bg-amber-950', ring: 'ring-amber-800' },
                { name: 'Noir', bg: 'bg-black', ring: 'ring-white/20' },
              ].map((theme) => (
                <div key={theme.name} className={`aspect-square rounded-xl ${theme.bg} ring-1 ${theme.ring} flex items-end p-2`}>
                  <span className="text-[10px] font-bold text-white/40">{theme.name}</span>
                </div>
              ))}
            </div>
            {/* Fake storefront preview */}
            <div className="rounded-2xl border border-white/8 bg-[#0d0d0d] overflow-hidden">
              <div className="bg-neutral-900 p-4 border-b border-white/5 flex items-center justify-between">
                <div className="font-black text-white tracking-tighter">SULTAN<span className="text-orange-400">.</span></div>
                <div className="flex gap-3 text-xs text-white/30">
                  <span>Shop</span><span>About</span><span>Contact</span>
                </div>
              </div>
              <div className="p-6">
                <div className="h-40 rounded-xl bg-neutral-800 mb-4 flex items-center justify-center text-5xl">✨</div>
                <div className="h-4 w-2/3 rounded-full bg-white/10 mb-2" />
                <div className="h-3 w-full rounded-full bg-white/5 mb-1" />
                <div className="h-3 w-4/5 rounded-full bg-white/5 mb-5" />
                <div className="flex gap-3">
                  <div className="h-8 flex-1 rounded-full bg-orange-500/80" />
                  <div className="h-8 w-8 rounded-full bg-white/10" />
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="how-it-works" className="py-32 px-6 mx-auto max-w-7xl">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-24 items-start">
          <div className="lg:sticky lg:top-32">
            <motion.p
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              className="text-xs font-bold uppercase tracking-widest text-orange-500 mb-4"
            >
              How it works
            </motion.p>
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="font-heading text-5xl font-black tracking-tighter text-white leading-tight mb-6"
            >
              Launch in four simple steps.
            </motion.h2>
            <p className="text-white/40 leading-relaxed max-w-sm">
              From idea to live storefront — no code, no server setup, no waiting weeks for an agency.
            </p>
          </div>
          <div className="flex flex-col gap-0 pt-4">
            {STEPS.map((s, i) => (
              <StepCard key={s.n} {...s} index={i} />
            ))}
          </div>
        </div>
      </section>

      {/* ── BRANDS ── */}
      <section id="brands" className="py-32 px-6 border-t border-white/5">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-16">
            <div>
              <motion.p
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                className="text-xs font-bold uppercase tracking-widest text-orange-500 mb-4"
              >
                Showcase
              </motion.p>
              <motion.h2
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="font-heading text-5xl font-black tracking-tighter text-white"
              >
                Built for brand leaders.
              </motion.h2>
            </div>
            <Link
              to="/request-website"
              className="shrink-0 inline-flex items-center gap-2 rounded-full border border-white/10 px-6 py-3 text-xs font-bold uppercase tracking-widest text-white/60 hover:text-white hover:border-white/30 transition-all"
            >
              Join them <ArrowRight className="h-3.5 w-3.5" />
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
                className="group relative overflow-hidden rounded-2xl border border-white/8 bg-white/[0.02] hover:bg-white/[0.04] transition-all duration-300 hover:-translate-y-1"
              >
                <div className="h-48 flex items-center justify-center bg-white/[0.03] text-6xl border-b border-white/5 transition-transform duration-500 group-hover:scale-110 overflow-hidden">
                  {store.emoji}
                </div>
                <div className="p-6 flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-white text-lg">{store.name}</h3>
                    <p className="text-xs font-bold uppercase tracking-widest text-orange-500 mt-1">{store.tag}</p>
                  </div>
                  <div className="h-9 w-9 rounded-full border border-white/10 flex items-center justify-center text-white/30 group-hover:border-orange-500/30 group-hover:text-orange-400 group-hover:bg-orange-500/10 transition-all">
                    <ArrowUpRight className="h-4 w-4" />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section id="faq" className="py-32 px-6 border-t border-white/5">
        <div className="mx-auto max-w-3xl">
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-xs font-bold uppercase tracking-widest text-orange-500 mb-4 text-center"
          >
            FAQ
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="font-heading text-5xl font-black tracking-tighter text-white text-center mb-16"
          >
            Common questions.
          </motion.h2>
          <div>
            {FAQS.map((f, i) => (
              <FaqItem key={f.q} q={f.q} a={f.a} index={i} />
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-32 px-6">
        <div className="mx-auto max-w-4xl text-center relative">
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="h-[400px] w-[600px] rounded-full bg-orange-600/10 blur-[100px]" />
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
              <span className="text-xs font-bold uppercase tracking-widest text-orange-400">Ready to launch?</span>
            </div>
            <h2 className="font-heading text-[clamp(2.5rem,7vw,6rem)] font-black tracking-tighter text-white leading-[0.95] mb-6">
              Start selling in<br />
              <span className="text-orange-500">Jordan today.</span>
            </h2>
            <p className="text-white/40 max-w-md mx-auto mb-10 leading-relaxed">
              Join a growing community of Jordanian brands using Plinth to run their online business with zero complexity.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/request-website"
                className="group inline-flex items-center justify-center gap-2 rounded-full bg-orange-500 px-10 py-4 text-sm font-bold text-white hover:bg-orange-400 transition-all hover:scale-105 shadow-[0_0_50px_rgba(249,115,22,0.35)]"
              >
                Request your store
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
              <Link
                to="/sign-in"
                className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/[0.04] px-10 py-4 text-sm font-bold text-white/60 hover:text-white hover:bg-white/[0.08] transition-all"
              >
                Merchant login
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-white/5 px-6 py-12">
        <div className="mx-auto max-w-7xl flex flex-col md:flex-row items-center justify-between gap-6">
          <Link to="/" className="font-heading text-2xl font-black tracking-tighter text-white">
            PLINTH<span className="text-orange-500">.</span>
          </Link>
          <div className="flex flex-wrap justify-center gap-8 text-xs font-bold uppercase tracking-widest text-white/25">
            <Link to="/request-website" className="hover:text-white transition-colors">Start Selling</Link>
            <Link to="/sign-in" className="hover:text-white transition-colors">Merchant Login</Link>
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-white transition-colors">How it works</a>
          </div>
          <p className="text-xs text-white/15">© {new Date().getFullYear()} Plinth. Built for Jordan.</p>
        </div>
      </footer>
    </div>
  );
}
