import { useNavigate } from 'react-router-dom';
import { useStore } from '@/lib/store';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

export default function SignIn() {
  const { signInAs, resetDemo } = useStore();
  const navigate = useNavigate();

  const handleShopOwnerSignIn = () => {
    signInAs('SHOP_OWNER');
    navigate('/admin');
  };

  const handleCreateShop = () => {
    signInAs('SHOP_OWNER');
    navigate('/request-website');
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-paper relative overflow-hidden">
      {/* Decorative background shapes */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-accent/5 blur-[100px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-accent-soft/40 blur-[100px]" />

      <Card className="w-full max-w-md relative z-10 animate-fade-up">
        <CardHeader className="text-center pb-8 pt-10">
          <CardTitle className="text-5xl font-logo !font-black !tracking-tighter">PLINTH<span className="text-accent">.</span></CardTitle>
          <p className="text-muted mt-4 text-[10px] uppercase font-bold tracking-widest">Prototype Demonstration</p>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 pb-10 px-8">
          <Button 
            size="lg"
            variant="solid" 
            onClick={handleShopOwnerSignIn}
          >
            Continue as Shop Owner Admin
          </Button>
          <Button
            size="lg"
            variant="soft"
            className="font-bold"
            onClick={handleCreateShop}
          >
            Request a Website
          </Button>

          <div className="mt-8 pt-8 border-t border-line text-center">
            <p className="text-sm text-muted mb-4">Need to start over?</p>
            <Button
              variant="quiet"
              size="sm"
              onClick={() => {
                resetDemo();
                window.location.reload();
              }}
            >
              Reset Demo Data
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
