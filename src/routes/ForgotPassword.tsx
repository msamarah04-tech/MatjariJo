import { FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { forgotPassword } from '@/api/auth.api';
import { CheckCircle2, ArrowLeft } from 'lucide-react';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await forgotPassword(email.trim().toLowerCase());
      setSent(true);
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
          {sent ? (
            <div className="flex flex-col items-center gap-4 py-4 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-50">
                <CheckCircle2 className="h-7 w-7 text-green-600" />
              </div>
              <h2 className="text-lg font-bold text-ink">Check your inbox</h2>
              <p className="text-sm text-muted leading-relaxed">
                If an account with <span className="font-semibold text-ink">{email}</span> exists, we've sent a password reset link. It expires in 1 hour.
              </p>
              <p className="text-xs text-muted">Didn't receive it? Check your spam folder, or</p>
              <Button variant="quiet" size="sm" onClick={() => { setSent(false); setEmail(''); }}>
                Try a different email
              </Button>
            </div>
          ) : (
            <>
              <h2 className="mb-1 text-center text-lg font-bold text-ink">Reset your password</h2>
              <p className="mb-6 text-center text-sm text-muted">Enter the email address on your account and we'll send you a reset link.</p>

              <form onSubmit={submit} className="flex flex-col gap-4">
                <label className="space-y-2">
                  <span className="text-xs font-black uppercase tracking-widest text-muted">Email address</span>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    placeholder="you@example.com"
                    required
                  />
                </label>

                {error && (
                  <p className="rounded-md bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{error}</p>
                )}

                <Button size="lg" variant="solid" type="submit" disabled={loading || !email.trim()}>
                  {loading ? 'Sending…' : 'Send reset link'}
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
