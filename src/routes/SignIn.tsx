import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '@/lib/store';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useI18n } from '@/lib/i18n';
import { LangToggle } from '@/components/ui/LangToggle';

export default function SignIn() {
  const signIn = useStore((s) => s.signIn);
  const clearSession = useStore((s) => s.clearSession);
  const apiError = useStore((s) => s.apiError);
  const navigate = useNavigate();
  const { t } = useI18n();
  const [identifier, setIdentifier] = useState('platform-admin');
  const [password, setPassword] = useState('ChangeMe123!');
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
    <div className="min-h-screen flex items-center justify-center p-4 bg-paper relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-accent/5 blur-[100px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-accent-soft/40 blur-[100px]" />

      {/* lang toggle – top right */}
      <div className="absolute top-5 end-5 z-10">
        <LangToggle variant="light" />
      </div>

      <Card className="w-full max-w-md relative z-10 animate-fade-up">
        <CardHeader className="text-center pb-8 pt-10">
          <CardTitle className="text-5xl font-logo !font-black !tracking-tighter">
            PLINTH<span className="text-accent">.</span>
          </CardTitle>
          <p className="text-muted mt-4 text-[10px] uppercase font-bold tracking-widest">{t('backendConnected')}</p>
        </CardHeader>
        <CardContent className="pb-10 px-8">
          <form onSubmit={submit} className="flex flex-col gap-4">
            <label className="space-y-2">
              <span className="text-xs font-black uppercase tracking-widest text-muted">{t('usernameOrEmail')}</span>
              <Input value={identifier} onChange={(e) => setIdentifier(e.target.value)} autoComplete="username" />
            </label>
            <label className="space-y-2">
              <span className="text-xs font-black uppercase tracking-widest text-muted">{t('password')}</span>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
            </label>

            {(error || apiError) && (
              <p className="rounded-md bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{error || apiError}</p>
            )}

            <Button size="lg" variant="solid" type="submit" disabled={loading}>
              {loading ? t('signingIn') : t('signIn')}
            </Button>
          </form>

          <div className="mt-8 rounded-xl border border-line bg-paper p-4 text-xs font-semibold leading-6 text-muted">
            Platform: <span className="font-mono text-ink">platform-admin</span> / <span className="font-mono text-ink">ChangeMe123!</span>
            <br />
            Shop owners use the username and one-time password returned when their shop request is approved.
          </div>

          <div className="mt-8 pt-8 border-t border-line text-center">
            <p className="text-sm text-muted mb-4">{t('clearSessionPrompt')}</p>
            <Button
              variant="quiet"
              size="sm"
              onClick={() => { clearSession(); window.location.reload(); }}
            >
              {t('clearLocalSession')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
