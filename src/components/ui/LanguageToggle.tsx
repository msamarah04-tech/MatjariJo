import { Languages } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/cn';

/** Switches between English (LTR) and Arabic (RTL). The label shows the other language. */
export function LanguageToggle({ className }: { className?: string }) {
  const { toggle, t } = useI18n();
  return (
    <button
      type="button"
      onClick={toggle}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-xs font-bold text-ink hover:bg-paper',
        className,
      )}
      aria-label="Toggle language"
    >
      <Languages className="h-3.5 w-3.5" />
      {t('language')}
    </button>
  );
}
