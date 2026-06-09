import { useI18n } from '@/lib/i18n';
import { Languages } from 'lucide-react';
import { cn } from '@/lib/cn';

interface LangToggleProps {
  variant?: 'light' | 'dark';
  className?: string;
}

export function LangToggle({ variant = 'light', className }: LangToggleProps) {
  const { t, toggle, lang } = useI18n();
  return (
    <button
      onClick={toggle}
      aria-label="Toggle language"
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition-all',
        variant === 'dark'
          ? 'border border-white/10 bg-white/[0.06] text-white/60 hover:text-white hover:bg-white/[0.12]'
          : 'border border-stone-200 bg-white text-stone-500 hover:text-stone-900 hover:border-stone-300 shadow-sm',
        className,
      )}
    >
      <Languages className="h-3.5 w-3.5 shrink-0" />
      <span>{t('language')}</span>
      {lang === 'ar' && <span className="text-[10px] opacity-50">EN</span>}
      {lang === 'en' && <span className="text-[10px] opacity-50">AR</span>}
    </button>
  );
}
