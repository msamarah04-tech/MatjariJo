import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Bell } from 'lucide-react';
import { useStore } from '@/lib/store';
import { timeAgo } from '@/lib/format';
import { cn } from '@/lib/cn';
import { usePlatformNotifications } from './shared';

/** Notifications bell with an unread badge and a dropdown of actionable items. */
export function NotificationsBell() {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const notifications = usePlatformNotifications();
  const markSeen = useStore((s) => s.markNotificationsSeen);
  const unreadCount = notifications.filter((n) => n.unread).length;

  // Close on outside click / Escape.
  useEffect(() => {
    if (!open) return;
    const onClick = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next && unreadCount > 0) markSeen();
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={toggle}
        aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ''}`}
        aria-expanded={open}
        className="relative flex h-10 w-10 items-center justify-center rounded-full border border-line bg-surface text-ink transition-colors hover:bg-paper"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-black text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.16 }}
            className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-2xl border border-line bg-surface shadow-2xl"
            role="menu"
          >
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted">Notifications</span>
              <span className="text-[10px] font-bold text-muted">{notifications.length} actionable</span>
            </div>
            <div className="max-h-[60vh] overflow-y-auto">
              {notifications.length === 0 ? (
                <p className="px-4 py-10 text-center text-sm text-muted">You're all caught up.</p>
              ) : (
                notifications.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      role="menuitem"
                      onClick={() => {
                        setOpen(false);
                        navigate(item.to);
                      }}
                      className="flex w-full items-start gap-3 border-b border-line/60 px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-paper"
                    >
                      <span className={cn('mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', item.unread ? 'bg-accent-soft text-accent' : 'bg-paper text-muted')}>
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <span className="truncate text-sm font-bold text-ink">{item.title}</span>
                          {item.unread && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />}
                        </span>
                        <span className="block truncate text-xs text-muted">{item.subtitle}</span>
                        <span className="mt-0.5 block text-[10px] font-bold uppercase tracking-widest text-muted/70">{timeAgo(item.ts)}</span>
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
