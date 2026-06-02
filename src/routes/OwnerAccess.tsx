import { useNavigate } from 'react-router-dom';
import { useStore } from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ShieldCheck } from 'lucide-react';

export default function OwnerAccess() {
  const signInAs = useStore((s) => s.signInAs);
  const navigate = useNavigate();

  const enterPlatform = () => {
    signInAs('PLATFORM_OWNER');
    navigate('/platform/analytics');
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-ink text-surface">
      <Card className="w-full max-w-md bg-surface text-ink animate-fade-up">
        <CardHeader className="text-center pb-6 pt-10">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-soft text-accent">
            <ShieldCheck className="h-7 w-7" />
          </div>
          <CardTitle className="text-4xl">Owner Access</CardTitle>
          <p className="text-muted mt-3 text-sm font-semibold leading-6">
            Private website-owner entry for controlling stores and requests.
          </p>
        </CardHeader>
        <CardContent className="pb-10 px-8">
          <Button size="lg" className="w-full" onClick={enterPlatform}>
            Enter Platform Control
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
