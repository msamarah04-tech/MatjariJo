import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Lock, User } from 'lucide-react';
import { useStore } from '@/lib/store';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/cn';
import { useI18n } from '@/lib/i18n';
import { LangToggle } from '@/components/ui/LangToggle';

export default function SignIn() {
  const signIn = useStore((s) => s.signIn);
  const clearSession = useStore((s) => s.clearSession);
  const apiError = useStore((s) => s.apiError);
  const navigate = useNavigate();
  const { t } = useI18n();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await signIn(identifier, password);
      navigate(user.role === 'PLATFORM_OWNER' ? '/platform' : '/admin');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not sign in.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-paper">
      {/* ── Left brand panel (hidden on mobile) ─────────────────── */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-[55%] relative flex-col justify-between overflow-hidden bg-ink p-12">
        {/* Background texture */}
        <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '32px 32px' }} />
        <div className="absolute top-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-accent/20 blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-accent/10 blur-[100px]" />

        {/* Logo */}
        <div className="relative z-10">
          <img src="/logo.png" alt="Matjari" className="h-14 w-auto brightness-0 invert" />
        </div>

        {/* Center copy */}
        <div className="relative z-10 space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 backdrop-blur-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
            <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/60">Jordan's Commerce Platform</span>
          </div>
          <h1 className="text-5xl font-black leading-[1.1] tracking-tight text-white">
            Your brand.<br />
            <span className="text-accent">Your storefront.</span>
          </h1>
          <p className="max-w-sm text-base leading-relaxed text-white/50">
            Launch a premium online store in minutes. Built for Jordanian entrepreneurs who mean business.
          </p>
        </div>

        {/* Bottom stat row */}
        <div className="relative z-10 flex gap-8 border-t border-white/10 pt-8">
          {[
            { value: '50+', label: 'Brands live' },
            { value: 'JOD', label: 'Native currency' },
            { value: '24/7', label: 'Uptime' },
          ].map((stat) => (
            <div key={stat.label}>
              <p className="text-2xl font-black text-white">{stat.value}</p>
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/40">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Right form panel ─────────────────────────────────────── */}
      <div className="flex flex-1 flex-col">
        {/* Top bar */}
        <div className="flex items-center justify-between px-6 py-5 sm:px-10">
          {/* Mobile logo */}
          <img src="/logo.png" alt="Matjari" className="h-10 w-auto lg:hidden" />
          <div className="hidden lg:block" />
          <LangToggle variant="light" />
        </div>

        {/* Form centered */}
        <div className="flex flex-1 items-center justify-center px-6 py-12 sm:px-10">
          <div className="w-full max-w-sm space-y-8">
            {/* Heading */}
            <div className="space-y-2">
              <h2 className="text-3xl font-black tracking-tight text-ink">Welcome back</h2>
              <p className="text-sm text-muted">Sign in to manage your store dashboard.</p>
            </div>

            {/* Form */}
            <form onSubmit={submit} className="space-y-5">
              {/* Username */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-black uppercase tracking-widest text-muted">
                  {t('usernameOrEmail')}
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted pointer-events-none" />
                  <input
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    autoComplete="username"
                    placeholder="username or email"
                    required
                    className={cn(
                      'w-full rounded-xl border bg-surface py-3 pl-10 pr-4 text-sm font-medium text-ink placeholder:text-muted/60 transition-all',
                      'focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent',
                      'border-line hover:border-ink/20'
                    )}
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-black uppercase tracking-widest text-muted">
                    {t('password')}
                  </label>
                  <Link to="/forgot-password" className="text-[11px] font-bold text-accent hover:text-accent/80 transition-colors">
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted pointer-events-none" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    required
                    className={cn(
                      'w-full rounded-xl border bg-surface py-3 pl-10 pr-11 text-sm font-medium text-ink placeholder:text-muted/60 transition-all',
                      'focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent',
                      'border-line hover:border-ink/20'
                    )}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted hover:text-ink transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Error */}
              {(error || apiError) && (
                <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
                  <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-red-500" />
                  <p className="text-sm font-semibold text-red-700">{error || apiError}</p>
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className={cn(
                  'w-full rounded-xl bg-ink py-3.5 text-sm font-black text-white tracking-wide transition-all',
                  'hover:bg-ink/90 active:scale-[0.99]',
                  'focus:outline-none focus:ring-2 focus:ring-ink/40 focus:ring-offset-2',
                  'disabled:opacity-60 disabled:cursor-not-allowed'
                )}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    Signing in…
                  </span>
                ) : t('signIn')}
              </button>
            </form>

            {/* Divider + session reset */}
            <div className="space-y-4 border-t border-line pt-6">
              <p className="text-center text-xs text-muted">{t('clearSessionPrompt')}</p>
              <Button
                variant="quiet"
                size="sm"
                className="w-full"
                onClick={() => { clearSession(); window.location.reload(); }}
              >
                {t('clearLocalSession')}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
