import { FormEvent, useState } from 'react';
import { useStore } from '@/lib/store';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

/**
 * Forced first-login password rotation. Shown when the signed-in user still holds
 * a one-time password (currentUser.mustChangePassword). Until it succeeds, the
 * backend blocks every app surface, so this is the only thing the owner can do.
 */
export function ChangePassword() {
  const changePassword = useStore((s) => s.changePassword);
  const signOut = useStore((s) => s.signOut);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    if (newPassword !== confirm) {
      setError('New passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      await changePassword(currentPassword, newPassword);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not change password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-paper">
      <Card className="w-full max-w-md relative z-10 animate-fade-up">
        <CardHeader className="text-center pb-6 pt-10">
          <CardTitle className="text-3xl font-logo !font-black !tracking-tighter">Set your password</CardTitle>
          <p className="text-muted mt-4 text-xs font-semibold leading-6">
            Your account uses a one-time password. Choose a new password to finish activating it.
          </p>
        </CardHeader>
        <CardContent className="pb-10 px-8">
          <form onSubmit={submit} className="flex flex-col gap-4">
            <label className="space-y-2">
              <span className="text-xs font-black uppercase tracking-widest text-muted">Current (one-time) password</span>
              <Input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} autoComplete="current-password" />
            </label>
            <label className="space-y-2">
              <span className="text-xs font-black uppercase tracking-widest text-muted">New password</span>
              <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} autoComplete="new-password" />
              <span className="text-[11px] text-muted">At least 10 characters, including a letter and a number.</span>
            </label>
            <label className="space-y-2">
              <span className="text-xs font-black uppercase tracking-widest text-muted">Confirm new password</span>
              <Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" />
            </label>

            {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{error}</p>}

            <Button size="lg" variant="solid" type="submit" disabled={loading}>
              {loading ? 'Saving...' : 'Set password & continue'}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <Button variant="quiet" size="sm" onClick={() => signOut()}>Sign out</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
