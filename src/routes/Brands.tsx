import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, useInView } from 'framer-motion';
import { ArrowRight, ArrowUpRight, Search, SlidersHorizontal, Store } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { PublicNav } from '@/components/layout/PublicNav';
import { getPublicStores } from '@/api/storefront.api';
import type { Store as StoreType } from '@/lib/types';
import { storefrontUrl } from '@/lib/tenant';

function FadeIn({ children, delay = 0, className = '' }: { children: React.ReactNode; delay?: number; className?: string }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 24 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function StoreCard({ store, index }: { store: StoreType; index: number }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });

  const categoryColors: Record<string, string> = {
    fragrance: 'bg-violet-50 text-violet-700 border-violet-100',
    fashion: 'bg-pink-50 text-pink-700 border-pink-100',
    food: 'bg-amber-50 text-amber-700 border-amber-100',
    beauty: 'bg-rose-50 text-rose-700 border-rose-100',
    electronics: 'bg-sky-50 text-sky-700 border-sky-100',
    home: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    sports: 'bg-lime-50 text-lime-700 border-lime-100',
    art: 'bg-teal-50 text-teal-900 border-teal-100',
  };

  const cat = (store.category ?? '').toLowerCase();
  const colorClass = Object.entries(categoryColors).find(([k]) => cat.includes(k))?.[1]
    ?? 'bg-stone-100 text-stone-600 border-stone-200';

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 28 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.45, delay: (index % 6) * 0.06, ease: [0.22, 1, 0.36, 1] }}
    >
      <a
        href={storefrontUrl(store.slug)}
        className="group flex flex-col rounded-2xl border border-stone-200 bg-white hover:border-teal-200 hover:shadow-lg hover:shadow-teal-50 transition-all duration-300 overflow-hidden"
      >
        {/* top banner */}
        <div className="relative h-28 bg-gradient-to-br from-stone-100 to-stone-200 flex items-center justify-center overflow-hidden">
          {store.logoUrl ? (
            <img
              src={store.logoUrl}
              alt={store.name}
              className="h-16 w-16 object-contain rounded-xl"
            />
          ) : (
            <span className="text-5xl select-none group-hover:scale-110 transition-transform duration-300">
              {store.logoEmoji ?? '🏪'}
            </span>
          )}
          {store.isFeatured && (
            <span className="absolute top-3 end-3 rounded-full bg-teal-700 text-white text-[9px] font-black uppercase tracking-widest px-2 py-0.5 shadow">
              ★ Featured
            </span>
          )}
        </div>

        {/* body */}
        <div className="p-5 flex flex-col gap-2.5 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-black text-stone-900 text-sm leading-snug group-hover:text-teal-800 transition-colors">
              {store.name}
            </h3>
            <ArrowUpRight className="h-4 w-4 shrink-0 text-stone-300 group-hover:text-teal-700 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-all mt-0.5" />
          </div>
          {store.tagline && (
            <p className="text-xs text-stone-400 leading-relaxed line-clamp-2">{store.tagline}</p>
          )}
          <div className="mt-auto pt-1">
            {store.category && (
              <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest ${colorClass}`}>
                {store.category}
              </span>
            )}
          </div>
        </div>
      </a>
    </motion.div>
  );
}

function SkeletonCard() {
  return (
    <div className="rounded-2xl border border-stone-200 bg-white overflow-hidden animate-pulse">
      <div className="h-28 bg-stone-100" />
      <div className="p-5 space-y-3">
        <div className="h-4 bg-stone-100 rounded-lg w-2/3" />
        <div className="h-3 bg-stone-100 rounded-lg w-full" />
        <div className="h-3 bg-stone-100 rounded-lg w-4/5" />
        <div className="h-5 bg-stone-100 rounded-full w-20 mt-2" />
      </div>
    </div>
  );
}

export default function Brands() {
  const { lang } = useI18n();
  const [stores, setStores] = useState<StoreType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');

  useEffect(() => {
    setLoading(true);
    getPublicStores()
      .then((data) => {
        setStores(data.stores);
        setLoading(false);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Failed to load stores');
        setLoading(false);
      });
  }, []);

  const categories = ['all', ...Array.from(new Set(stores.map((s) => s.category).filter(Boolean) as string[]))];

  const filtered = stores.filter((s) => {
    const matchesCat = activeCategory === 'all' || s.category === activeCategory;
    const q = search.toLowerCase();
    const matchesSearch = !q || s.name.toLowerCase().includes(q) || (s.tagline ?? '').toLowerCase().includes(q) || (s.category ?? '').toLowerCase().includes(q);
    return matchesCat && matchesSearch;
  });

  const featured = filtered.filter((s) => s.isFeatured);
  const rest = filtered.filter((s) => !s.isFeatured);
  const ordered = [...featured, ...rest];

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 overflow-x-hidden selection:bg-teal-200 selection:text-teal-950">
      <PublicNav />

      {/* ── HERO ── */}
      <section className="mt-[67px] bg-gradient-to-b from-stone-100 to-stone-50 border-b border-stone-200 py-16 md:py-24 text-center">
        <div className="max-w-3xl mx-auto px-6">
          <FadeIn>
            <span className="inline-flex items-center gap-2 rounded-full bg-teal-50 border border-teal-200 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-teal-800 mb-5">
              <span className="h-1.5 w-1.5 rounded-full bg-teal-700 animate-pulse" />
              {lang === 'ar' ? 'متاجر حقيقية — بُنيت على متجري' : 'Real stores — built on Matjari'}
            </span>
          </FadeIn>
          <FadeIn delay={0.06}>
            <h1 className="text-4xl md:text-6xl font-black tracking-tighter text-stone-900 leading-tight mb-4">
              {lang === 'ar' ? 'المتاجر على متجري' : 'Brands on Matjari'}
            </h1>
          </FadeIn>
          <FadeIn delay={0.12}>
            <p className="text-lg text-stone-400 leading-relaxed max-w-xl mx-auto mb-8">
              {lang === 'ar'
                ? 'تصفّح المتاجر الأردنية التي أطلقت متاجرها الإلكترونية على منصة متجري.'
                : 'Discover Jordanian entrepreneurs who launched their online stores on Matjari.'}
            </p>
          </FadeIn>
          <FadeIn delay={0.16}>
            <Link
              to="/request-website"
              className="inline-flex items-center gap-2 rounded-full bg-stone-900 text-white px-7 py-3.5 text-sm font-bold hover:bg-stone-700 transition-all hover:scale-105"
            >
              {lang === 'ar' ? 'أضف متجرك' : 'Add your brand'} <ArrowRight className="h-4 w-4" />
            </Link>
          </FadeIn>
        </div>
      </section>

      {/* ── FILTERS ── */}
      <div className="sticky top-[67px] z-40 bg-white border-b border-stone-200 shadow-sm">
        <div className="max-w-6xl mx-auto px-6 md:px-12 py-3 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">

          {/* search */}
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={lang === 'ar' ? 'ابحث عن متجر...' : 'Search stores...'}
              className="w-full rounded-xl border border-stone-200 bg-stone-50 ps-9 pe-4 py-2.5 text-sm placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-teal-300 focus:border-teal-300 transition-all"
            />
          </div>

          {/* category chips */}
          <div className="flex items-center gap-2 overflow-x-auto pb-0.5 sm:pb-0 flex-1">
            <SlidersHorizontal className="h-4 w-4 shrink-0 text-stone-400" />
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-bold capitalize transition-all ${
                  activeCategory === cat
                    ? 'bg-teal-700 text-white shadow-sm shadow-teal-200'
                    : 'bg-stone-100 text-stone-500 hover:bg-stone-200'
                }`}
              >
                {cat === 'all' ? (lang === 'ar' ? 'الكل' : 'All') : cat}
              </button>
            ))}
          </div>

          {!loading && (
            <span className="shrink-0 text-xs text-stone-400 font-medium">
              {ordered.length} {lang === 'ar' ? 'متجر' : ordered.length === 1 ? 'store' : 'stores'}
            </span>
          )}
        </div>
      </div>

      {/* ── GRID ── */}
      <section className="py-12 md:py-16">
        <div className="max-w-6xl mx-auto px-6 md:px-12">

          {/* loading */}
          {loading && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
              {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          )}

          {/* error */}
          {error && !loading && (
            <div className="text-center py-24">
              <div className="text-4xl mb-4">⚠️</div>
              <p className="text-stone-500 text-sm">{error}</p>
            </div>
          )}

          {/* empty */}
          {!loading && !error && ordered.length === 0 && (
            <div className="text-center py-24">
              <Store className="h-12 w-12 mx-auto text-stone-200 mb-4" />
              <h3 className="font-bold text-stone-700 mb-2">
                {search || activeCategory !== 'all'
                  ? (lang === 'ar' ? 'لا توجد نتائج' : 'No results found')
                  : (lang === 'ar' ? 'لا توجد متاجر بعد' : 'No stores yet')}
              </h3>
              <p className="text-stone-400 text-sm">
                {search || activeCategory !== 'all'
                  ? (lang === 'ar' ? 'حاول بحثًا مختلفًا أو اختر فئة أخرى.' : 'Try a different search or category.')
                  : (lang === 'ar' ? 'كن أول من يطلق متجره على متجري.' : 'Be the first to launch your store on Matjari.')}
              </p>
              {(search || activeCategory !== 'all') && (
                <button
                  onClick={() => { setSearch(''); setActiveCategory('all'); }}
                  className="mt-4 text-xs font-bold text-teal-700 hover:underline"
                >
                  {lang === 'ar' ? 'مسح الفلاتر' : 'Clear filters'}
                </button>
              )}
            </div>
          )}

          {/* grid */}
          {!loading && !error && ordered.length > 0 && (
            <>
              {featured.length > 0 && (activeCategory === 'all' && !search) && (
                <div className="mb-10">
                  <FadeIn>
                    <div className="flex items-center gap-3 mb-5">
                      <h2 className="text-xs font-black uppercase tracking-widest text-stone-400">
                        {lang === 'ar' ? '★ متاجر مميزة' : '★ Featured stores'}
                      </h2>
                      <div className="flex-1 h-px bg-stone-200" />
                    </div>
                  </FadeIn>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
                    {featured.map((s, i) => <StoreCard key={s.id} store={s} index={i} />)}
                  </div>
                  {rest.length > 0 && (
                    <FadeIn className="mt-10 mb-5">
                      <div className="flex items-center gap-3">
                        <h2 className="text-xs font-black uppercase tracking-widest text-stone-400">
                          {lang === 'ar' ? 'جميع المتاجر' : 'All stores'}
                        </h2>
                        <div className="flex-1 h-px bg-stone-200" />
                      </div>
                    </FadeIn>
                  )}
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5 mt-5">
                    {rest.map((s, i) => <StoreCard key={s.id} store={s} index={i} />)}
                  </div>
                </div>
              )}
              {(activeCategory !== 'all' || search || featured.length === 0) && (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
                  {ordered.map((s, i) => <StoreCard key={s.id} store={s} index={i} />)}
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {/* ── CTA BANNER ── */}
      {!loading && (
        <section className="py-16 md:py-20 bg-stone-900 text-white text-center">
          <div className="max-w-xl mx-auto px-6">
            <FadeIn>
              <h2 className="text-2xl md:text-3xl font-black tracking-tight mb-3">
                {lang === 'ar' ? 'هل متجرك غير موجود هنا؟' : "Your store not here yet?"}
              </h2>
              <p className="text-stone-400 text-sm mb-6 leading-relaxed">
                {lang === 'ar'
                  ? 'اطلب متجرك الإلكتروني اليوم وانضم إلى مجتمع التجار الأردنيين.'
                  : 'Request your online store today and join the community of Jordanian merchants.'}
              </p>
              <Link
                to="/request-website"
                className="inline-flex items-center gap-2 rounded-full bg-teal-700 text-white px-7 py-3.5 text-sm font-bold hover:bg-teal-500 transition-all hover:scale-105 shadow-lg shadow-teal-700/30"
              >
                {lang === 'ar' ? 'اطلب متجرك الآن' : 'Request your store'} <ArrowRight className="h-4 w-4" />
              </Link>
            </FadeIn>
          </div>
        </section>
      )}

      {/* ── FOOTER ── */}
      <footer className="bg-stone-900 border-t border-stone-800 py-8 text-center text-xs text-stone-500">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <span className="font-heading font-black tracking-tighter text-white text-sm">
            Matjari<span className="text-amber-400">.</span>
          </span>
          <span>© {new Date().getFullYear()} Matjari. {lang === 'ar' ? 'جميع الحقوق محفوظة.' : 'All rights reserved.'}</span>
          <div className="flex gap-4">
            <Link to="/" className="hover:text-stone-300 transition-colors">{lang === 'ar' ? 'الرئيسية' : 'Home'}</Link>
            <Link to="/how-it-works" className="hover:text-stone-300 transition-colors">{lang === 'ar' ? 'كيف يعمل' : 'How it works'}</Link>
            <Link to="/sign-in" className="hover:text-stone-300 transition-colors">{lang === 'ar' ? 'تسجيل الدخول' : 'Sign in'}</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
