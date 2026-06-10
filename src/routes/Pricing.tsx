import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, useInView } from 'framer-motion';
import { ArrowRight, Check, Sparkles } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { PublicNav } from '@/components/layout/PublicNav';
import { PLAN_DEFS, PLAN_ORDER, TRIAL_DAYS } from '@shared/plans';
import type { StorePlan } from '@/lib/types';

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

export default function Pricing() {
  const { t, lang } = useI18n();

  const descKey: Record<StorePlan, 'pricingStarterDesc' | 'pricingGrowthDesc' | 'pricingScaleDesc'> = {
    STARTER: 'pricingStarterDesc',
    GROWTH: 'pricingGrowthDesc',
    SCALE: 'pricingScaleDesc',
  };

  const featuresFor = (plan: StorePlan): string[] => {
    const def = PLAN_DEFS[plan];
    const products = def.maxProducts === null
      ? t('pricingUnlimitedProducts')
      : t('pricingUpToProducts').replace('{n}', String(def.maxProducts));
    const base = [products, t('pricingFeatureStorefront'), t('pricingFeatureThemes'), t('pricingFeatureCod'), t('pricingFeatureAnalytics')];
    if (plan === 'SCALE') base.push(t('pricingFeatureSupport'));
    return base;
  };

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 overflow-x-hidden selection:bg-teal-200 selection:text-teal-950">
      <PublicNav />

      {/* ── HERO ── */}
      <section className="mt-[67px] bg-gradient-to-b from-stone-100 to-stone-50 border-b border-stone-200 py-16 md:py-24 text-center">
        <div className="max-w-3xl mx-auto px-6">
          <FadeIn>
            <span className="inline-flex items-center gap-2 rounded-full bg-teal-50 border border-teal-200 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-teal-800 mb-6">
              <Sparkles className="h-3.5 w-3.5" />
              {lang === 'ar' ? `تجربة مجانية ${TRIAL_DAYS} يوماً` : `${TRIAL_DAYS}-day free trial`}
            </span>
          </FadeIn>
          <FadeIn delay={0.05}>
            <h1 className="text-4xl md:text-6xl font-black tracking-tighter text-stone-900 leading-tight mb-5">
              {t('pricingTitle')}
            </h1>
          </FadeIn>
          <FadeIn delay={0.1}>
            <p className="text-lg text-stone-500 leading-relaxed">{t('pricingSubtitle')}</p>
          </FadeIn>
        </div>
      </section>

      {/* ── TIERS ── */}
      <section className="py-16 md:py-20">
        <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 px-6 md:grid-cols-3 md:items-stretch">
          {PLAN_ORDER.map((plan, index) => {
            const def = PLAN_DEFS[plan];
            const popular = plan === 'GROWTH';
            return (
              <FadeIn key={plan} delay={index * 0.08} className="flex">
                <div
                  className={`relative flex w-full flex-col rounded-3xl border bg-white p-7 shadow-sm transition-shadow hover:shadow-lg ${
                    popular ? 'border-teal-300 ring-2 ring-teal-200 md:-my-3 md:py-10' : 'border-stone-200'
                  }`}
                >
                  {popular && (
                    <span className="absolute -top-3.5 start-1/2 -translate-x-1/2 rtl:translate-x-1/2 rounded-full bg-teal-700 px-4 py-1 text-[10px] font-black uppercase tracking-widest text-white shadow">
                      {t('pricingMostPopular')}
                    </span>
                  )}
                  <h2 className="text-sm font-black uppercase tracking-[0.2em] text-stone-400">{plan}</h2>
                  <div className="mt-4 flex items-baseline gap-1.5">
                    <span className="text-5xl font-black tracking-tighter text-stone-900">{def.priceMonthlyJod}</span>
                    <span className="text-sm font-bold text-stone-500">JOD{t('pricingPerMonth')}</span>
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-stone-500">{t(descKey[plan])}</p>
                  <ul className="mt-6 flex-1 space-y-3">
                    {featuresFor(plan).map((feature) => (
                      <li key={feature} className="flex items-start gap-2.5 text-sm font-semibold text-stone-700">
                        <Check className={`mt-0.5 h-4 w-4 shrink-0 ${popular ? 'text-teal-700' : 'text-stone-400'}`} />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <Link
                    to={`/request-website?plan=${plan}`}
                    className={`mt-8 inline-flex h-12 items-center justify-center gap-2 rounded-xl text-sm font-black transition-all active:scale-[0.98] ${
                      popular
                        ? 'bg-teal-700 text-white shadow-lg shadow-teal-200 hover:bg-teal-800'
                        : 'bg-stone-900 text-white hover:bg-stone-700'
                    }`}
                  >
                    {t('pricingCta')} <ArrowRight className="h-4 w-4 rtl:rotate-180" />
                  </Link>
                </div>
              </FadeIn>
            );
          })}
        </div>
        <FadeIn delay={0.2}>
          <p className="mx-auto mt-12 max-w-xl px-6 text-center text-sm font-semibold text-stone-500">
            {t('pricingTrialNote')}
          </p>
        </FadeIn>
      </section>

      {/* ── FOOTER STRIP ── */}
      <section className="border-t border-stone-200 bg-stone-900 py-14 text-center">
        <div className="mx-auto max-w-2xl px-6">
          <h2 className="text-2xl font-black tracking-tight text-white md:text-3xl">
            {lang === 'ar' ? 'جاهز لفتح متجرك؟' : 'Ready to open your shop?'}
          </h2>
          <Link
            to="/request-website"
            className="mt-6 inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-teal-700 px-8 text-sm font-black text-white transition-all hover:bg-teal-800 active:scale-[0.98]"
          >
            {t('navStartSelling')} <ArrowRight className="h-4 w-4 rtl:rotate-180" />
          </Link>
        </div>
      </section>
    </div>
  );
}
