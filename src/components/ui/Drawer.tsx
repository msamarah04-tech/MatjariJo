import * as React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useI18n } from '@/lib/i18n';

interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  /** Optional sticky footer (e.g. action buttons). */
  footer?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

/**
 * Right-side slide-over panel. Shares the chrome design system with Modal but is
 * meant for record detail + actions. Closes on backdrop click and Escape, locks
 * body scroll while open, and moves focus into the panel for keyboard users.
 */
export function Drawer({ isOpen, onClose, title, description, footer, children, className }: DrawerProps) {
  const panelRef = React.useRef<HTMLDivElement>(null);
  const { dir } = useI18n();
  const exitX = dir === 'rtl' ? '-100%' : '100%';

  React.useEffect(() => {
    if (!isOpen) return;
    document.body.style.overflow = 'hidden';
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    // Move focus into the panel so Tab cycles within the drawer content.
    const id = window.setTimeout(() => panelRef.current?.focus(), 50);
    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', onKey);
      window.clearTimeout(id);
    };
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <motion.div
            className="fixed inset-0 bg-ink/40 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            tabIndex={-1}
            className={cn(
              'relative z-50 flex h-full w-full max-w-md flex-col bg-surface shadow-2xl outline-none',
              'border-s border-line',
              className
            )}
            initial={{ x: exitX }}
            animate={{ x: 0 }}
            exit={{ x: exitX }}
            transition={{ type: 'spring', stiffness: 360, damping: 38 }}
          >
            <div className="flex items-start justify-between gap-4 border-b border-line p-5">
              <div className="min-w-0">
                <h2 className="font-heading text-2xl font-black tracking-tight text-ink truncate">{title}</h2>
                {description && <p className="mt-1 text-sm text-muted">{description}</p>}
              </div>
              <button
                onClick={onClose}
                aria-label="Close panel"
                className="rounded-md p-1 text-muted transition-colors hover:bg-line/50 hover:text-ink"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5">{children}</div>
            {footer && <div className="border-t border-line bg-paper/60 p-4">{footer}</div>}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
