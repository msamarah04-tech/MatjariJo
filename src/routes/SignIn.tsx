import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Eye, EyeOff } from 'lucide-react';
import { useStore } from '@/lib/store';
import { cn } from '@/lib/cn';
import { useI18n } from '@/lib/i18n';
import { LangToggle } from '@/components/ui/LangToggle';

export default function SignIn() {
  const signIn = useStore((s) => s.signIn);
  const apiError = useStore((s) => s.apiError);
  const navigate = useNavigate();
  const { t } = useI18n();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const FLOAT_CARDS = [
    {
      id: 1,
      emoji: '🌹',
      store: 'Sultan Oud',
      label: t('signInCardNewOrder'),
      sub: 'Rose Oud · JOD 45',
      pos: 'top-[20%] right-8',
    },
    {
      id: 2,
      emoji: '✨',
      store: 'Nour Modest',
      label: t('signInCardFulfilled'),
      sub: t('signInCardShipped'),
      pos: 'top-[46%] right-8',
    },
    {
      id: 3,
      emoji: '🌿',
      store: 'Baraka Herbs',
      label: t('signInCardNewCustomer'),
      sub: t('signInCardJoined'),
      pos: 'bottom-[22%] right-8',
    },
  ];

  const STATS = [
    { value: '50+', label: t('signInStatStores') },
    { value: 'JOD', label: t('signInStatCurrency') },
    { value: '99.9%', label: t('signInStatUptime') },
  ];

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await signIn(identifier, password);
      navigate(user.role === 'PLATFORM_OWNER' ? '/platform' : '/admin');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('signInError'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-white">

      {/* ── Left visual panel ──────────────────────────────────────── */}
      <div className="hidden lg:flex lg:w-[52%] xl:w-[56%] relative flex-col justify-between overflow-hidden p-12"
        style={{ background: 'linear-gradient(135deg, #0a1a18 0%, #0d2b26 40%, #0f3d35 70%, #0a2820 100%)' }}>

        {/* Layered glow orbs */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute top-[-15%] right-[-5%] h-[55%] w-[55%] rounded-full opacity-30"
            style={{ background: 'radial-gradient(circle, #0F766E 0%, transparent 70%)' }} />
          <div className="absolute bottom-[-10%] left-[-5%] h-[45%] w-[45%] rounded-full opacity-20"
            style={{ background: 'radial-gradient(circle, #134e4a 0%, transparent 70%)' }} />
          <div className="absolute top-[40%] left-[30%] h-[30%] w-[30%] rounded-full opacity-15"
            style={{ background: 'radial-gradient(circle, #0F766E 0%, transparent 70%)' }} />
        </div>

        {/* Subtle grid */}
        <div className="pointer-events-none absolute inset-0 opacity-[0.035]"
          style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.8) 1px, transparent 1px)', backgroundSize: '48px 48px' }} />

        {/* Logo */}
        <div className="relative z-10">
          <img src="/logo.png" alt="Matjari" className="h-12 w-auto brightness-0 invert opacity-90" />
        </div>

        {/* Floating notification cards */}
        {FLOAT_CARDS.map((card) => (
          <div
            key={card.id}
            className={cn('absolute z-20 flex items-center gap-3 rounded-2xl border border-white/10 px-4 py-3 backdrop-blur-md', card.pos)}
            style={{ background: 'rgba(255,255,255,0.07)' }}
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-lg"
              style={{ background: 'rgba(255,255,255,0.1)' }}>
              {card.emoji}
            </div>
            <div>
              <p className="text-[11px] font-black uppercase tracking-widest text-white/40">{card.label}</p>
              <p className="text-sm font-bold text-white/90">{card.store}</p>
              <p className="text-[11px] text-white/50">{card.sub}</p>
            </div>
            <span className="ml-1 h-2 w-2 shrink-0 rounded-full bg-emerald-400" />
          </div>
        ))}

        {/* Center headline */}
        <div className="relative z-10 space-y-5">
          <div className="inline-flex items-center gap-2.5 rounded-full px-4 py-1.5"
            style={{ background: 'rgba(15,118,110,0.25)', border: '1px solid rgba(15,118,110,0.4)' }}>
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-300">
              {t('signInBadge')}
            </span>
          </div>

          <h1 className="text-[3.25rem] font-black leading-[1.08] tracking-tight text-white">
            {t('signInLine1')}{' '}
            <br />
            <span style={{ background: 'linear-gradient(90deg, #2dd4bf, #0F766E)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              {t('signInLine2')}
            </span>
          </h1>

          <p className="max-w-xs text-[15px] leading-relaxed text-white/45">
            {t('signInTagline')}
          </p>
        </div>

        {/* Stats row */}
        <div className="relative z-10 flex gap-10 border-t pt-8" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
          {STATS.map((stat) => (
            <div key={stat.label}>
              <p className="text-2xl font-black text-white">{stat.value}</p>
              <p className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.16em] text-white/35">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Right form panel ────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col bg-white">

        {/* Top bar */}
        <div className="flex items-center justify-between px-8 py-6">
          <img src="/logo.png" alt="Matjari" className="h-9 w-auto lg:hidden" />
          <div className="hidden lg:block" />
          <LangToggle variant="light" />
        </div>

        {/* Centered form */}
        <div className="flex flex-1 items-center justify-center px-8 py-10">
          <div className="w-full max-w-[360px]">

            {/* Heading */}
            <div className="mb-9">
              <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.2em] text-muted">{t('signInEyebrow')}</p>
              <h2 className="text-[2rem] font-black leading-tight tracking-tight text-ink">{t('signInWelcome')}</h2>
              <p className="mt-1.5 text-sm text-muted/80">{t('signInSubtext')}</p>
            </div>

            {/* Form */}
            <form onSubmit={submit} className="space-y-4">

              {/* Username field */}
              <div>
                <label className="mb-2 block text-[11px] font-black uppercase tracking-[0.15em] text-ink/50">
                  {t('usernameOrEmail')}
                </label>
                <input
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  autoComplete="username"
                  placeholder={t('signInUsernamePlaceholder')}
                  required
                  className={cn(
                    'w-full rounded-2xl border-2 bg-[#F8F8F8] px-4 py-3.5 text-sm font-medium text-ink',
                    'placeholder:text-ink/25 transition-all duration-200',
                    'border-transparent hover:border-ink/10',
                    'focus:border-accent focus:bg-white focus:outline-none focus:shadow-[0_0_0_4px_rgba(15,118,110,0.08)]'
                  )}
                />
              </div>

              {/* Password field */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label className="text-[11px] font-black uppercase tracking-[0.15em] text-ink/50">
                    {t('password')}
                  </label>
                  <Link to="/forgot-password" className="text-[11px] font-bold text-accent transition-opacity hover:opacity-70">
                    {t('forgotPassword')}
                  </Link>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    placeholder="••••••••••"
                    required
                    className={cn(
                      'w-full rounded-2xl border-2 bg-[#F8F8F8] px-4 py-3.5 pr-12 text-sm font-medium text-ink',
                      'placeholder:text-ink/25 transition-all duration-200',
                      'border-transparent hover:border-ink/10',
                      'focus:border-accent focus:bg-white focus:outline-none focus:shadow-[0_0_0_4px_rgba(15,118,110,0.08)]'
                    )}
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-ink/30 transition-colors hover:text-ink/70"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Error */}
              {(error || apiError) && (
                <div className="flex items-center gap-3 rounded-2xl bg-red-50 px-4 py-3 ring-1 ring-red-200">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-red-500" />
                  <p className="text-sm font-semibold text-red-600">{error || apiError}</p>
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className={cn(
                  'group relative mt-2 w-full overflow-hidden rounded-2xl py-4 text-sm font-black tracking-wide text-white transition-all duration-200',
                  'focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2',
                  'disabled:cursor-not-allowed disabled:opacity-60',
                  'active:scale-[0.985]'
                )}
                style={{ background: 'linear-gradient(135deg, #0F766E 0%, #0d6560 50%, #0a5550 100%)' }}
              >
                <span className="absolute inset-0 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
                  style={{ background: 'linear-gradient(135deg, #0d6560 0%, #0a5550 50%, #083f3a 100%)' }} />
                <span className="relative flex items-center justify-center gap-2">
                  {loading ? (
                    <>
                      <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                      {t('signingIn')}
                    </>
                  ) : (
                    <>
                      {t('signIn')}
                      <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5 rtl:rotate-180" />
                    </>
                  )}
                </span>
              </button>
            </form>

            {/* Sign-up prompt */}
            <div className="mt-10 border-t border-ink/6 pt-6 text-center">
              <p className="text-sm text-ink/40">{t('noStoreYet')}</p>
              <Link
                to="/request-website"
                className="mt-2 inline-flex items-center gap-1.5 text-sm font-bold text-accent transition-opacity hover:opacity-70"
              >
                {t('requestStorefront')} <ArrowRight className="h-3.5 w-3.5 rtl:rotate-180" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
