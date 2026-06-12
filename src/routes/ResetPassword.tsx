import { FormEvent, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { resetPassword } from '@/api/auth.api';
import { CheckCircle2, ArrowLeft, Eye, EyeOff, XCircle } from 'lucide-react';

export default function ResetPassword() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const mismatch = confirm.length > 0 && password !== confirm;
  const weak = password.length > 0 && password.length < 10;
  const canSubmit = token && password.length >= 10 && password === confirm && !loading;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setError('');
    setLoading(true);
    try {
      await resetPassword(token, password);
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-paper relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-accent/5 blur-[100px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-accent-soft/40 blur-[100px]" />

      <Card className="w-full max-w-md relative z-10 animate-fade-up">
        <CardHeader className="text-center pb-6 pt-10">
          <CardTitle>
            <img src="/logo.png" alt="Matjari Jordan" className="mx-auto h-24 w-auto -my-4" />
          </CardTitle>
        </CardHeader>

        <CardContent className="pb-10 px-8">
          {!token ? (
            <div className="flex flex-col items-center gap-4 py-4 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-50">
                <XCircle className="h-7 w-7 text-red-500" />
              </div>
              <h2 className="text-lg font-bold text-ink">Invalid reset link</h2>
              <p className="text-sm text-muted">This link is missing or malformed. Please request a new one.</p>
              <Link to="/forgot-password">
                <Button variant="solid" size="sm">Request a new link</Button>
              </Link>
            </div>
          ) : done ? (
            <div className="flex flex-col items-center gap-4 py-4 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-50">
                <CheckCircle2 className="h-7 w-7 text-green-600" />
              </div>
              <h2 className="text-lg font-bold text-ink">Password updated</h2>
              <p className="text-sm text-muted leading-relaxed">
                Your password has been changed successfully. All other sessions have been signed out.
              </p>
              <Link to="/sign-in">
                <Button variant="solid" size="sm">Sign in with new password</Button>
              </Link>
            </div>
          ) : (
            <>
              <h2 className="mb-1 text-center text-lg font-bold text-ink">Set a new password</h2>
              <p className="mb-6 text-center text-sm text-muted">Choose a strong password — at least 10 characters.</p>

              <form onSubmit={submit} className="flex flex-col gap-4">
                <label className="space-y-2">
                  <span className="text-xs font-black uppercase tracking-widest text-muted">New password</span>
                  <div className="relative">
                    <Input
                      type={showPw ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete="new-password"
                      placeholder="At least 10 characters"
                      className="pe-10"
                      required
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => setShowPw((v) => !v)}
                      className="absolute inset-y-0 end-0 flex items-center px-3 text-muted hover:text-ink"
                    >
                      {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {weak && <p className="text-xs text-red-600 font-semibold">Too short — use at least 10 characters.</p>}
                </label>

                <label className="space-y-2">
                  <span className="text-xs font-black uppercase tracking-widest text-muted">Confirm password</span>
                  <Input
                    type={showPw ? 'text' : 'password'}
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    autoComplete="new-password"
                    placeholder="Repeat password"
                    required
                  />
                  {mismatch && <p className="text-xs text-red-600 font-semibold">Passwords don't match.</p>}
                </label>

                {error && (
                  <p className="rounded-md bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{error}</p>
                )}

                <Button size="lg" variant="solid" type="submit" disabled={!canSubmit}>
                  {loading ? 'Updating…' : 'Update password'}
                </Button>
              </form>
            </>
          )}

          <div className="mt-8 pt-6 border-t border-line text-center">
            <Link to="/sign-in" className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-ink transition-colors">
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to sign in
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
