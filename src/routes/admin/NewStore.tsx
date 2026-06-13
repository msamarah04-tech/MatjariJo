import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useStore } from '@/lib/store';
import { Textarea } from '@/components/ui/Textarea';
import { toast } from '@/components/ui/Toast';
import { ArrowRight, CheckCircle2, Eye, EyeOff, Sparkles } from 'lucide-react';
import { PLAN_DEFS, PLAN_ORDER, TRIAL_DAYS } from '@shared/plans';
import { cn } from '@/lib/cn';
import { LangToggle } from '@/components/ui/LangToggle';

const requestSchema = z.object({
  ownerName: z.string().min(2, 'Name is required'),
  ownerEmail: z.string().email('Valid email required'),
  storeName: z.string().min(2, 'Website name is required'),
  category: z.string().min(1, 'Category is required'),
  tagline: z.string().min(3, 'Tagline is required'),
  plan: z.enum(['STARTER', 'GROWTH', 'SCALE']),
  notes: z.string().optional(),
  username: z.string().trim().toLowerCase()
    .min(3, 'At least 3 characters')
    .max(60)
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

const STEPS = [
  { n: '01', title: 'You request', body: 'Fill in your store details, choose a plan, and set your admin credentials.' },
  { n: '02', title: 'We build it', body: 'Our team reviews the request and sets up your storefront from the standard template.' },
  { n: '03', title: 'You take over', body: 'Once approved, log in to Admin and start adding products, orders, and more.' },
];

export default function NewStore() {
  const submitShopRequest = useStore((s) => s.submitShopRequest);
  const [submitted, setSubmitted] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [showCpw, setShowCpw] = useState(false);
  const [params] = useSearchParams();
  const planParam = (params.get('plan') || '').toUpperCase();
  const initialPlan = (PLAN_ORDER as string[]).includes(planParam) ? (planParam as RequestValues['plan']) : 'STARTER';

  const form = useForm<RequestValues>({
    resolver: zodResolver(requestSchema),
    defaultValues: {
      ownerName: '', ownerEmail: '', storeName: '', category: '',
      tagline: '', plan: initialPlan, notes: '',
      username: '', password: '', confirmPassword: '',
    },
  });
  const selectedPlan = form.watch('plan');

  const onSubmit = async (data: RequestValues) => {
    try {
      const { confirmPassword: _c, ...payload } = data;
      await submitShopRequest(payload);
      setSubmitted(true);
      form.reset();
      toast({ title: 'Request sent!', description: 'The team will review and set up your store.', type: 'success' });
    } catch (err) {
      toast({ title: 'Could not send request', description: err instanceof Error ? err.message : 'Try again later.', type: 'error' });
    }
  };

  return (
    <div className="flex min-h-screen bg-white">

      {/* ── Left panel ─────────────────────────────────────────────── */}
      <div
        className="hidden lg:flex lg:w-[44%] xl:w-[46%] shrink-0 flex-col justify-between overflow-hidden p-12"
        style={{ background: 'linear-gradient(150deg, #0a1a18 0%, #0d2b26 45%, #0f3d35 75%, #0a2820 100%)' }}
      >
        {/* Glow orbs */}
        <div className="pointer-events-none absolute inset-0 left-0 w-[44%] xl:w-[46%]">
          <div className="absolute top-[-10%] right-[-5%] h-[50%] w-[50%] rounded-full opacity-25"
            style={{ background: 'radial-gradient(circle, #0F766E 0%, transparent 70%)' }} />
          <div className="absolute bottom-[-5%] left-[-5%] h-[40%] w-[40%] rounded-full opacity-20"
            style={{ background: 'radial-gradient(circle, #134e4a 0%, transparent 70%)' }} />
        </div>
        {/* Grid texture */}
        <div className="pointer-events-none absolute inset-0 left-0 w-[44%] xl:w-[46%] opacity-[0.03]"
          style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,1) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,1) 1px,transparent 1px)', backgroundSize: '48px 48px' }} />

        {/* Logo + nav */}
        <div className="relative z-10 flex items-center justify-between">
          <Link to="/">
            <img src="/logo.png" alt="Matjari" className="h-11 w-auto brightness-0 invert opacity-90" />
          </Link>
          <LangToggle variant="dark" />
        </div>

        {/* Headline */}
        <div className="relative z-10 space-y-5">
          <div className="inline-flex items-center gap-2.5 rounded-full px-4 py-1.5"
            style={{ background: 'rgba(15,118,110,0.25)', border: '1px solid rgba(15,118,110,0.4)' }}>
            <Sparkles className="h-3 w-3 text-emerald-400" />
            <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-300">Your store, your rules</span>
          </div>

          <h1 className="text-[2.8rem] font-black leading-[1.08] tracking-tight text-white">
            Launch your<br />
            <span style={{ background: 'linear-gradient(90deg,#2dd4bf,#0F766E)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Jordanian store
            </span>
            <br />in days.
          </h1>

          <p className="max-w-xs text-[15px] leading-relaxed text-white/45">
            Tell us about your business and we'll set up a fully configured storefront ready to sell.
          </p>
        </div>

        {/* Steps */}
        <div className="relative z-10 space-y-4">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30">How it works</p>
          {STEPS.map((step, i) => (
            <div key={step.n} className="flex gap-4">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[11px] font-black text-emerald-300"
                style={{ background: 'rgba(15,118,110,0.25)', border: '1px solid rgba(15,118,110,0.35)' }}>
                {step.n}
              </div>
              <div>
                <p className="text-sm font-black text-white/90">{step.title}</p>
                <p className="mt-0.5 text-xs leading-5 text-white/40">{step.body}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Trial callout */}
        <div className="relative z-10 rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <p className="text-sm font-black text-white">
            {TRIAL_DAYS}-day free trial
          </p>
          <p className="mt-0.5 text-xs text-white/40">No payment needed to get started. Choose a plan and pay after your trial ends.</p>
        </div>
      </div>

      {/* ── Right form panel ────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col overflow-y-auto">

        {/* Mobile top bar */}
        <div className="flex items-center justify-between border-b border-black/5 px-6 py-4 lg:hidden">
          <Link to="/"><img src="/logo.png" alt="Matjari" className="h-9 w-auto" /></Link>
          <LangToggle variant="light" />
        </div>

        <div className="flex flex-1 justify-center px-6 py-10 sm:px-10 lg:px-12">
          <div className="w-full max-w-[540px]">

            {submitted ? (
              /* ── Success state ── */
              <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
                <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl"
                  style={{ background: 'rgba(15,118,110,0.1)' }}>
                  <CheckCircle2 className="h-8 w-8 text-accent" />
                </div>
                <h2 className="text-3xl font-black tracking-tight text-ink">Request received!</h2>
                <p className="mt-3 max-w-sm text-sm leading-6 text-muted">
                  Your store request is in the queue. The team will review it and get back to you with your login credentials once it's live.
                </p>
                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <button
                    onClick={() => setSubmitted(false)}
                    className="rounded-2xl bg-ink px-6 py-3 text-sm font-black text-white transition-opacity hover:opacity-80"
                  >
                    Submit another request
                  </button>
                  <Link to="/" className="inline-flex items-center justify-center rounded-2xl border border-line px-6 py-3 text-sm font-bold text-muted hover:text-ink transition-colors">
                    Back to home
                  </Link>
                </div>
              </div>
            ) : (
              /* ── Form ── */
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">

                {/* Heading */}
                <div>
                  <p className="mb-1.5 text-[11px] font-black uppercase tracking-[0.2em] text-muted">Store request</p>
                  <h2 className="text-[1.85rem] font-black leading-tight tracking-tight text-ink">Tell us about your store</h2>
                  <p className="mt-1.5 text-sm text-muted/80">Fill in the details below. This doesn't create a live site yet.</p>
                </div>

                {/* ── About you ── */}
                <FormSection label="About you">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <FormField label="Your name" error={form.formState.errors.ownerName?.message}>
                      <FormInput {...form.register('ownerName')} placeholder="Sara Ahmed" autoComplete="name" />
                    </FormField>
                    <FormField label="Email address" error={form.formState.errors.ownerEmail?.message}>
                      <FormInput {...form.register('ownerEmail')} type="email" placeholder="you@example.com" autoComplete="email" />
                    </FormField>
                  </div>
                </FormSection>

                {/* ── Store details ── */}
                <FormSection label="Store details">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <FormField label="Store name" error={form.formState.errors.storeName?.message}>
                      <FormInput {...form.register('storeName')} placeholder="e.g. Sultan Oud" />
                    </FormField>
                    <FormField label="Category" error={form.formState.errors.category?.message}>
                      <FormInput {...form.register('category')} placeholder="e.g. Fashion, Coffee, Art" />
                    </FormField>
                    <FormField label="Tagline" error={form.formState.errors.tagline?.message} className="sm:col-span-2">
                      <FormInput {...form.register('tagline')} placeholder="A short line that captures your brand" />
                    </FormField>
                    <FormField label="Notes for the team" error={form.formState.errors.notes?.message} className="sm:col-span-2">
                      <textarea
                        {...form.register('notes')}
                        rows={4}
                        placeholder="Products, style direction, pages you need, delivery areas, anything else…"
                        className={cn(
                          'w-full resize-none rounded-2xl border-2 bg-[#F8F8F8] px-4 py-3.5 text-sm font-medium text-ink',
                          'placeholder:text-ink/25 transition-all duration-200',
                          'border-transparent hover:border-ink/10',
                          'focus:border-accent focus:bg-white focus:outline-none focus:shadow-[0_0_0_4px_rgba(15,118,110,0.08)]'
                        )}
                      />
                    </FormField>
                  </div>
                </FormSection>

                {/* ── Plan ── */}
                <FormSection label={`Choose your plan — ${TRIAL_DAYS}-day free trial on all`}>
                  <div className="grid grid-cols-3 gap-3">
                    {PLAN_ORDER.map((plan) => {
                      const def = PLAN_DEFS[plan];
                      const active = selectedPlan === plan;
                      return (
                        <button
                          key={plan}
                          type="button"
                          onClick={() => form.setValue('plan', plan, { shouldDirty: true })}
                          className={cn(
                            'relative rounded-2xl border-2 p-4 text-left transition-all duration-150',
                            active
                              ? 'border-accent bg-accent/5 shadow-[0_0_0_4px_rgba(15,118,110,0.08)]'
                              : 'border-transparent bg-[#F8F8F8] hover:border-ink/10'
                          )}
                        >
                          {plan === 'GROWTH' && (
                            <span className="absolute right-3 top-3 rounded-full bg-accent px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-white">
                              Popular
                            </span>
                          )}
                          <p className="text-[10px] font-black uppercase tracking-widest text-muted">{plan}</p>
                          <p className="mt-1 text-xl font-black text-ink">
                            JOD {def.priceMonthlyJod}
                            <span className="text-xs font-bold text-muted">/mo</span>
                          </p>
                          <p className="mt-1 text-[11px] text-muted">
                            {def.maxProducts === null ? 'Unlimited products' : `Up to ${def.maxProducts} products`}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </FormSection>

                {/* ── Admin credentials ── */}
                <FormSection label="Set your admin credentials" sub="You'll use these to log in after your store is approved. Store them safely — the password is hashed and can't be recovered.">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <FormField label="Username" error={form.formState.errors.username?.message} className="sm:col-span-2">
                      <FormInput {...form.register('username')} autoComplete="username" placeholder="e.g. sultan-oud (lowercase, hyphens ok)" />
                    </FormField>
                    <FormField label="Password" error={form.formState.errors.password?.message}>
                      <div className="relative">
                        <FormInput
                          {...form.register('password')}
                          type={showPw ? 'text' : 'password'}
                          autoComplete="new-password"
                          placeholder="Min 10 chars, letter + number"
                          className="pr-11"
                        />
                        <button type="button" tabIndex={-1} onClick={() => setShowPw((v) => !v)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-ink/30 hover:text-ink/70 transition-colors">
                          {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </FormField>
                    <FormField label="Confirm password" error={form.formState.errors.confirmPassword?.message}>
                      <div className="relative">
                        <FormInput
                          {...form.register('confirmPassword')}
                          type={showCpw ? 'text' : 'password'}
                          autoComplete="new-password"
                          placeholder="Re-enter password"
                          className="pr-11"
                        />
                        <button type="button" tabIndex={-1} onClick={() => setShowCpw((v) => !v)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-ink/30 hover:text-ink/70 transition-colors">
                          {showCpw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </FormField>
                  </div>
                </FormSection>

                {/* Submit */}
                <div className="space-y-4 pb-4">
                  <button
                    type="submit"
                    disabled={form.formState.isSubmitting}
                    className={cn(
                      'group relative w-full overflow-hidden rounded-2xl py-4 text-sm font-black tracking-wide text-white transition-all duration-200',
                      'focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2',
                      'disabled:cursor-not-allowed disabled:opacity-60 active:scale-[0.985]'
                    )}
                    style={{ background: 'linear-gradient(135deg,#0F766E 0%,#0d6560 50%,#0a5550 100%)' }}
                  >
                    <span className="absolute inset-0 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
                      style={{ background: 'linear-gradient(135deg,#0d6560 0%,#0a5550 50%,#083f3a 100%)' }} />
                    <span className="relative flex items-center justify-center gap-2">
                      {form.formState.isSubmitting ? (
                        <>
                          <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                          Sending request…
                        </>
                      ) : (
                        <>Send website request <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" /></>
                      )}
                    </span>
                  </button>

                  <p className="text-center text-xs text-ink/35">
                    By submitting you agree to the{' '}
                    <Link to="/terms" className="font-bold text-accent hover:opacity-70">Terms of Service</Link>
                    {' '}and{' '}
                    <Link to="/privacy" className="font-bold text-accent hover:opacity-70">Privacy Policy</Link>.
                  </p>

                  <p className="text-center text-xs text-ink/35">
                    Already have an account?{' '}
                    <Link to="/sign-in" className="font-bold text-accent hover:opacity-70">Sign in</Link>
                  </p>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Small local primitives ─────────────────────────────────────── */

function FormSection({ label, sub, children }: { label: string; sub?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <div>
        <p className="text-[11px] font-black uppercase tracking-[0.15em] text-ink/45">{label}</p>
        {sub && <p className="mt-0.5 text-xs leading-5 text-muted/80">{sub}</p>}
      </div>
      {children}
    </div>
  );
}

function FormField({ label, error, className, children }: { label: string; error?: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <label className="text-[11px] font-black uppercase tracking-[0.15em] text-ink/45">{label}</label>
      {children}
      {error && <p className="text-xs font-semibold text-red-500">{error}</p>}
    </div>
  );
}

function FormInput({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        'w-full rounded-2xl border-2 bg-[#F8F8F8] px-4 py-3.5 text-sm font-medium text-ink',
        'placeholder:text-ink/25 transition-all duration-200',
        'border-transparent hover:border-ink/10',
        'focus:border-accent focus:bg-white focus:outline-none focus:shadow-[0_0_0_4px_rgba(15,118,110,0.08)]',
        className
      )}
      {...props}
    />
  );
}
