import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useStore } from '@/lib/store';
import { toast } from '@/components/ui/Toast';
import { ArrowLeft, ArrowRight, CheckCircle2, Eye, EyeOff, Sparkles } from 'lucide-react';
import { PLAN_DEFS, PLAN_ORDER, TRIAL_DAYS } from '@shared/plans';
import { cn } from '@/lib/cn';
import { useI18n } from '@/lib/i18n';
import { LangToggle } from '@/components/ui/LangToggle';

const requestSchema = z.object({
  ownerName: z.string().min(2, 'Name is required'),
  ownerEmail: z.string().email('Valid email required'),
  storeName: z.string().min(2, 'Store name is required'),
  category: z.string().min(1, 'Category is required'),
  tagline: z.string().min(3, 'Tagline is required'),
  plan: z.enum(['STARTER', 'GROWTH', 'SCALE']),
  notes: z.string().optional(),
  username: z.string().trim().toLowerCase()
    .min(3, 'At least 3 characters').max(60)
    .regex(/^[a-z0-9][a-z0-9-]*[a-z0-9]$/, 'Lowercase letters, numbers, and hyphens only'),
  password: z.string()
    .min(10, 'At least 10 characters')
    .regex(/[A-Za-z]/, 'Include at least one letter')
    .regex(/[0-9]/, 'Include at least one number'),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  path: ['confirmPassword'],
  message: 'Passwords do not match',
});

type RequestValues = z.infer<typeof requestSchema>;

export default function NewStore() {
  const submitShopRequest = useStore((s) => s.submitShopRequest);
  const { t } = useI18n();
  const [step, setStep] = useState(1);
  const [submitted, setSubmitted] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [showCpw, setShowCpw] = useState(false);
  const [params] = useSearchParams();
  const planParam = (params.get('plan') || '').toUpperCase();
  const initialPlan = (PLAN_ORDER as string[]).includes(planParam)
    ? (planParam as RequestValues['plan'])
    : 'STARTER';

  const STEPS = [
    { n: 1, label: t('reqStep1') },
    { n: 2, label: t('reqStep2') },
    { n: 3, label: t('reqStep3') },
  ];

  const LEFT_COPY = [
    {
      lines: [t('reqLeft1Line1'), t('reqLeft1Line2')],
      sub: t('reqLeft1Sub'),
    },
    {
      lines: [t('reqLeft2Line1'), t('reqLeft2Line2')],
      sub: t('reqLeft2Sub'),
    },
    {
      lines: [t('reqLeft3Line1'), t('reqLeft3Line2')],
      sub: t('reqLeft3Sub').replace('{n}', String(TRIAL_DAYS)),
    },
  ];

  const form = useForm<RequestValues>({
    resolver: zodResolver(requestSchema),
    defaultValues: {
      ownerName: '', ownerEmail: '', storeName: '', category: '',
      tagline: '', plan: initialPlan, notes: '',
      username: '', password: '', confirmPassword: '',
    },
    mode: 'onTouched',
  });
  const selectedPlan = form.watch('plan');
  const copy = LEFT_COPY[step - 1];

  const nextStep = async () => {
    const fields: (keyof RequestValues)[][] = [
      ['ownerName', 'ownerEmail'],
      ['storeName', 'category', 'tagline'],
      ['plan', 'username', 'password', 'confirmPassword'],
    ];
    const valid = await form.trigger(fields[step - 1]);
    if (valid) setStep((s) => s + 1);
  };

  const onSubmit = async (data: RequestValues) => {
    try {
      const { confirmPassword: _c, ...payload } = data;
      await submitShopRequest(payload);
      setSubmitted(true);
      form.reset();
      toast({ title: t('reqToastSentTitle'), description: t('reqToastSentDesc'), type: 'success' });
    } catch (err) {
      toast({ title: t('reqToastErrorTitle'), description: err instanceof Error ? err.message : t('reqToastErrorDesc'), type: 'error' });
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-white">

      {/* ── Left panel ─────────────────────────────────────────────── */}
      <div
        className="hidden lg:flex lg:w-[42%] xl:w-[44%] shrink-0 flex-col overflow-hidden"
        style={{ background: 'linear-gradient(150deg,#0a1a18 0%,#0d2b26 45%,#0f3d35 75%,#0a2820 100%)' }}
      >
        {/* Glow + grid */}
        <div className="pointer-events-none absolute inset-y-0 left-0 w-[42%] xl:w-[44%]">
          <div className="absolute right-[-5%] top-[-10%] h-[55%] w-[55%] rounded-full opacity-25"
            style={{ background: 'radial-gradient(circle,#0F766E 0%,transparent 70%)' }} />
          <div className="absolute bottom-[-5%] left-[-5%] h-[40%] w-[40%] rounded-full opacity-20"
            style={{ background: 'radial-gradient(circle,#134e4a 0%,transparent 70%)' }} />
          <div className="absolute inset-0 opacity-[0.03]"
            style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,1) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,1) 1px,transparent 1px)', backgroundSize: '48px 48px' }} />
        </div>

        <div className="relative z-10 flex h-full flex-col justify-between p-10 xl:p-12">
          {/* Logo */}
          <div className="flex items-center justify-between">
            <Link to="/"><img src="/logo.png" alt="Matjari" className="h-10 w-auto brightness-0 invert opacity-90" /></Link>
            <LangToggle variant="dark" />
          </div>

          {/* Step-specific copy */}
          <div className="space-y-5">
            <div className="inline-flex items-center gap-2.5 rounded-full px-4 py-1.5"
              style={{ background: 'rgba(15,118,110,0.25)', border: '1px solid rgba(15,118,110,0.4)' }}>
              <Sparkles className="h-3 w-3 text-emerald-400" />
              <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-300">
                {t('reqStepOf').replace('{n}', String(step)).replace('{m}', String(STEPS.length))}
              </span>
            </div>

            <h1 className="text-[2.6rem] font-black leading-[1.08] tracking-tight">
              {copy.lines.map((line, i) => (
                <span key={i} className="block">
                  {i === 0
                    ? <span className="text-white">{line}</span>
                    : <span style={{ background: 'linear-gradient(90deg,#2dd4bf,#0F766E)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{line}</span>
                  }
                </span>
              ))}
            </h1>

            <p className="max-w-xs text-[14px] leading-relaxed text-white/45">{copy.sub}</p>
          </div>

          {/* Step progress dots */}
          <div className="space-y-3">
            {STEPS.map((s) => (
              <div key={s.n} className="flex items-center gap-3">
                <div className={cn(
                  'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[11px] font-black transition-all',
                  s.n < step ? 'bg-emerald-500 text-white' : s.n === step ? 'text-emerald-300' : 'text-white/20'
                )}
                  style={s.n <= step ? { background: s.n < step ? undefined : 'rgba(15,118,110,0.3)', border: '1px solid rgba(15,118,110,0.5)' } : { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  {s.n < step ? <CheckCircle2 className="h-4 w-4" /> : `0${s.n}`}
                </div>
                <span className={cn('text-sm font-bold', s.n === step ? 'text-white' : s.n < step ? 'text-white/60' : 'text-white/20')}>
                  {s.label}
                </span>
              </div>
            ))}
          </div>

          {/* Trial note */}
          <div className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <p className="text-sm font-black text-white">
              {t('reqTrialTitle').replace('{n}', String(TRIAL_DAYS))}
            </p>
            <p className="mt-0.5 text-xs text-white/35">{t('reqTrialNote')}</p>
          </div>
        </div>
      </div>

      {/* ── Right panel ─────────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col overflow-hidden">

        {/* Mobile header */}
        <div className="flex items-center justify-between border-b border-black/5 px-6 py-4 lg:hidden">
          <Link to="/"><img src="/logo.png" alt="Matjari" className="h-9 w-auto" /></Link>
          <LangToggle variant="light" />
        </div>

        <div className="flex flex-1 items-center justify-center overflow-hidden px-6 py-8 sm:px-10 lg:px-12">
          <div className="w-full max-w-[480px]">

            {submitted ? (
              /* ── Success ── */
              <div className="flex flex-col items-center text-center">
                <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl"
                  style={{ background: 'rgba(15,118,110,0.1)' }}>
                  <CheckCircle2 className="h-8 w-8 text-accent" />
                </div>
                <h2 className="text-3xl font-black tracking-tight text-ink">{t('reqSuccessTitle')}</h2>
                <p className="mt-3 max-w-sm text-sm leading-6 text-muted">{t('reqSuccessBody')}</p>
                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <button onClick={() => { setSubmitted(false); setStep(1); }}
                    className="rounded-2xl bg-ink px-6 py-3 text-sm font-black text-white transition-opacity hover:opacity-80">
                    {t('reqSubmitAnother')}
                  </button>
                  <Link to="/" className="inline-flex items-center justify-center rounded-2xl border border-line px-6 py-3 text-sm font-bold text-muted transition-colors hover:text-ink">
                    {t('reqBackToHome')}
                  </Link>
                </div>
              </div>
            ) : (
              <form onSubmit={form.handleSubmit(onSubmit)}>

                {/* Mobile step indicator */}
                <div className="mb-6 flex items-center gap-2 lg:hidden">
                  {STEPS.map((s) => (
                    <div key={s.n} className={cn('h-1 flex-1 rounded-full transition-all', s.n <= step ? 'bg-accent' : 'bg-line')} />
                  ))}
                </div>

                {/* ── Step 1: About you ── */}
                {step === 1 && (
                  <div className="space-y-6">
                    <div>
                      <p className="mb-1 text-[11px] font-black uppercase tracking-[0.2em] text-muted">
                        {t('reqStepOf').replace('{n}', '1').replace('{m}', '3')}
                      </p>
                      <h2 className="text-[1.8rem] font-black leading-tight tracking-tight text-ink">{t('reqStep1')}</h2>
                      <p className="mt-1 text-sm text-muted/80">{t('reqStep1Sub')}</p>
                    </div>
                    <div className="space-y-4">
                      <FF label={t('reqFieldName')} error={form.formState.errors.ownerName?.message}>
                        <FI {...form.register('ownerName')} placeholder={t('reqNamePlaceholder')} autoComplete="name" />
                      </FF>
                      <FF label={t('reqFieldEmail')} error={form.formState.errors.ownerEmail?.message}>
                        <FI {...form.register('ownerEmail')} type="email" placeholder="you@example.com" autoComplete="email" />
                      </FF>
                    </div>
                    <StepActions onNext={nextStep} />
                  </div>
                )}

                {/* ── Step 2: Store details ── */}
                {step === 2 && (
                  <div className="space-y-5">
                    <div>
                      <p className="mb-1 text-[11px] font-black uppercase tracking-[0.2em] text-muted">
                        {t('reqStepOf').replace('{n}', '2').replace('{m}', '3')}
                      </p>
                      <h2 className="text-[1.8rem] font-black leading-tight tracking-tight text-ink">{t('reqStep2')}</h2>
                      <p className="mt-1 text-sm text-muted/80">{t('reqStep2Sub')}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <FF label={t('reqFieldStoreName')} error={form.formState.errors.storeName?.message}>
                        <FI {...form.register('storeName')} placeholder={t('reqStoreNamePlaceholder')} />
                      </FF>
                      <FF label={t('reqFieldCategory')} error={form.formState.errors.category?.message}>
                        <FI {...form.register('category')} placeholder={t('reqCategoryPlaceholder')} />
                      </FF>
                      <FF label={t('reqFieldTagline')} error={form.formState.errors.tagline?.message} className="col-span-2">
                        <FI {...form.register('tagline')} placeholder={t('reqTaglinePlaceholder')} />
                      </FF>
                      <FF label={t('reqFieldNotes')} error={form.formState.errors.notes?.message} className="col-span-2">
                        <textarea
                          {...form.register('notes')}
                          rows={3}
                          placeholder={t('reqNotesPlaceholder')}
                          className={cn(
                            'w-full resize-none rounded-2xl border-2 bg-[#F8F8F8] px-4 py-3 text-sm font-medium text-ink',
                            'placeholder:text-ink/25 transition-all duration-200 border-transparent hover:border-ink/10',
                            'focus:border-accent focus:bg-white focus:outline-none focus:shadow-[0_0_0_4px_rgba(15,118,110,0.08)]'
                          )}
                        />
                      </FF>
                    </div>
                    <StepActions onBack={() => setStep(1)} onNext={nextStep} />
                  </div>
                )}

                {/* ── Step 3: Plan + credentials ── */}
                {step === 3 && (
                  <div className="space-y-5">
                    <div>
                      <p className="mb-1 text-[11px] font-black uppercase tracking-[0.2em] text-muted">
                        {t('reqStepOf').replace('{n}', '3').replace('{m}', '3')}
                      </p>
                      <h2 className="text-[1.8rem] font-black leading-tight tracking-tight text-ink">{t('reqStep3')}</h2>
                      <p className="mt-1 text-sm text-muted/80">{t('reqStep3Sub')}</p>
                    </div>

                    {/* Plan picker */}
                    <div className="grid grid-cols-3 gap-2.5">
                      {PLAN_ORDER.map((plan) => {
                        const def = PLAN_DEFS[plan];
                        const active = selectedPlan === plan;
                        const productLabel = def.maxProducts === null
                          ? t('reqUnlimited')
                          : t('reqUpToProducts').replace('{n}', String(def.maxProducts));
                        return (
                          <button key={plan} type="button"
                            onClick={() => form.setValue('plan', plan, { shouldDirty: true })}
                            className={cn(
                              'relative rounded-2xl border-2 p-3.5 text-start transition-all duration-150',
                              active ? 'border-accent bg-accent/5 shadow-[0_0_0_4px_rgba(15,118,110,0.08)]' : 'border-transparent bg-[#F8F8F8] hover:border-ink/10'
                            )}>
                            {plan === 'GROWTH' && (
                              <span className="absolute end-2.5 top-2.5 rounded-full bg-accent px-1.5 py-0.5 text-[8px] font-black uppercase tracking-widest text-white">
                                {t('reqPopular')}
                              </span>
                            )}
                            <p className="text-[9px] font-black uppercase tracking-widest text-muted">{plan}</p>
                            <p className="mt-1 text-lg font-black text-ink">
                              JOD {def.priceMonthlyJod}<span className="text-xs font-bold text-muted">{t('reqPerMonth')}</span>
                            </p>
                            <p className="mt-0.5 text-[10px] text-muted">
                              {productLabel} {t('reqProducts')}
                            </p>
                          </button>
                        );
                      })}
                    </div>

                    {/* Credentials */}
                    <div className="grid grid-cols-1 gap-3">
                      <FF label={t('reqFieldUsername')} error={form.formState.errors.username?.message}>
                        <FI {...form.register('username')} autoComplete="username" placeholder={t('reqUsernamePlaceholder')} />
                      </FF>
                      <div className="grid grid-cols-2 gap-3">
                        <FF label={t('reqFieldPassword')} error={form.formState.errors.password?.message}>
                          <div className="relative">
                            <FI {...form.register('password')} type={showPw ? 'text' : 'password'} autoComplete="new-password" placeholder={t('reqPasswordPlaceholder')} className="pe-10" />
                            <button type="button" tabIndex={-1} onClick={() => setShowPw((v) => !v)}
                              className="absolute end-3.5 top-1/2 -translate-y-1/2 text-ink/30 hover:text-ink/70">
                              {showPw ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                            </button>
                          </div>
                        </FF>
                        <FF label={t('reqFieldConfirm')} error={form.formState.errors.confirmPassword?.message}>
                          <div className="relative">
                            <FI {...form.register('confirmPassword')} type={showCpw ? 'text' : 'password'} autoComplete="new-password" placeholder={t('reqConfirmPlaceholder')} className="pe-10" />
                            <button type="button" tabIndex={-1} onClick={() => setShowCpw((v) => !v)}
                              className="absolute end-3.5 top-1/2 -translate-y-1/2 text-ink/30 hover:text-ink/70">
                              {showCpw ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                            </button>
                          </div>
                        </FF>
                      </div>
                    </div>

                    <StepActions
                      onBack={() => setStep(2)}
                      submitLabel={t('reqSendRequest')}
                      isSubmitting={form.formState.isSubmitting}
                    />

                    <p className="text-center text-xs text-ink/30">
                      {t('reqAgreeTo')}{' '}
                      <Link to="/terms" className="font-bold text-accent hover:opacity-70">{t('reqTerms')}</Link>
                      {' '}&{' '}
                      <Link to="/privacy" className="font-bold text-accent hover:opacity-70">{t('reqPrivacyPolicy')}</Link>.
                    </p>
                  </div>
                )}

                {/* Already have account */}
                <p className="mt-5 text-center text-xs text-ink/30">
                  {t('reqHaveStore')}{' '}
                  <Link to="/sign-in" className="font-bold text-accent hover:opacity-70">{t('signIn')}</Link>
                </p>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Local primitives ─────────────────────────────────────────────── */

function FF({ label, error, className, children }: { label: string; error?: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={cn('space-y-1', className)}>
      <label className="text-[10px] font-black uppercase tracking-[0.15em] text-ink/40">{label}</label>
      {children}
      {error && <p className="text-[11px] font-semibold text-red-500">{error}</p>}
    </div>
  );
}

function FI({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input className={cn(
      'w-full rounded-2xl border-2 bg-[#F8F8F8] px-4 py-3 text-sm font-medium text-ink',
      'placeholder:text-ink/25 transition-all duration-200 border-transparent hover:border-ink/10',
      'focus:border-accent focus:bg-white focus:outline-none focus:shadow-[0_0_0_4px_rgba(15,118,110,0.08)]',
      className
    )} {...props} />
  );
}

function StepActions({ onBack, onNext, submitLabel, isSubmitting }: {
  onBack?: () => void;
  onNext?: () => void;
  submitLabel?: string;
  isSubmitting?: boolean;
}) {
  const { t } = useI18n();
  return (
    <div className="flex gap-3 pt-1">
      {onBack && (
        <button type="button" onClick={onBack}
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border-2 border-transparent bg-[#F8F8F8] text-muted transition-all hover:border-ink/10 hover:text-ink">
          <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
        </button>
      )}
      {onNext ? (
        <button type="button" onClick={onNext}
          className="group relative flex h-12 flex-1 items-center justify-center gap-2 overflow-hidden rounded-2xl text-sm font-black text-white transition-all duration-200 active:scale-[0.985]"
          style={{ background: 'linear-gradient(135deg,#0F766E 0%,#0d6560 50%,#0a5550 100%)' }}>
          <span className="absolute inset-0 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
            style={{ background: 'linear-gradient(135deg,#0d6560 0%,#0a5550 50%,#083f3a 100%)' }} />
          <span className="relative flex items-center gap-2">
            {t('reqContinue')} <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5 rtl:rotate-180" />
          </span>
        </button>
      ) : (
        <button type="submit" disabled={isSubmitting}
          className="group relative flex h-12 flex-1 items-center justify-center gap-2 overflow-hidden rounded-2xl text-sm font-black text-white transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-60 active:scale-[0.985]"
          style={{ background: 'linear-gradient(135deg,#0F766E 0%,#0d6560 50%,#0a5550 100%)' }}>
          <span className="absolute inset-0 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
            style={{ background: 'linear-gradient(135deg,#0d6560 0%,#0a5550 50%,#083f3a 100%)' }} />
          <span className="relative flex items-center gap-2">
            {isSubmitting
              ? <><span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" /> {t('reqSending')}</>
              : <>{submitLabel ?? t('reqSubmit')} <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5 rtl:rotate-180" /></>
            }
          </span>
        </button>
      )}
    </div>
  );
}
