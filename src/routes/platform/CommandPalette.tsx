import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, ClipboardList, CornerDownLeft, MessageSquare, Search, ShoppingBag, Store as StoreIcon, UserCog, LucideIcon } from 'lucide-react';
import { useStore } from '@/lib/store';
import { money } from '@/lib/format';
import { cn } from '@/lib/cn';

interface Command {
  id: string;
  group: string;
  label: string;
  hint?: string;
  icon: LucideIcon;
  to: string;
}

/**
 * ⌘K / Ctrl-K command palette. Searches across stores, owners, orders, requests
 * and tickets, then deep-links to the right place. Fully keyboard driven.
 */
export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const stores = useStore((s) => s.stores);
  const orders = useStore((s) => s.orders);
  const shopRequests = useStore((s) => s.shopRequests);
  const supportTickets = useStore((s) => s.supportTickets);

  // Global ⌘K / Ctrl-K toggle.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setOpen((value) => !value);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (open) {
      setQuery('');
      setActive(0);
      const id = window.setTimeout(() => inputRef.current?.focus(), 40);
      return () => window.clearTimeout(id);
    }
  }, [open]);

  const commands = useMemo<Command[]>(() => {
    const storeName = (id?: string) => stores.find((s) => s.id === id)?.name || 'Platform';
    const ownerIds = Array.from(new Set(stores.map((s) => s.ownerId)));
    const list: Command[] = [
      { id: 'nav-overview', group: 'Go to', label: 'Overview', icon: StoreIcon, to: '/platform' },
      { id: 'nav-analytics', group: 'Go to', label: 'Analytics', icon: StoreIcon, to: '/platform/analytics' },
      { id: 'nav-settings', group: 'Go to', label: 'Settings', icon: StoreIcon, to: '/platform/settings' },
    ];
    stores.forEach((store) => list.push({
      id: `store-${store.id}`,
      group: 'Stores',
      label: store.name,
      hint: `/${store.slug} · ${store.category}`,
      icon: StoreIcon,
      to: `/platform/stores?focus=${store.id}`,
    }));
    ownerIds.forEach((ownerId) => list.push({
      id: `owner-${ownerId}`,
      group: 'Owners',
      label: ownerId,
      hint: `${stores.filter((s) => s.ownerId === ownerId).length} stores`,
      icon: UserCog,
      to: `/platform/stores?owner=${ownerId}`,
    }));
    orders.forEach((order) => list.push({
      id: `order-${order.id}`,
      group: 'Orders',
      label: `${order.customerName} · ${money(order.totalCents)}`,
      hint: `${storeName(order.storeId)} · ${order.status}`,
      icon: ShoppingBag,
      to: '/platform',
    }));
    shopRequests.forEach((request) => list.push({
      id: `request-${request.id}`,
      group: 'Requests',
      label: request.storeName,
      hint: `${request.ownerName} · ${request.status}`,
      icon: ClipboardList,
      to: `/platform/shop-requests?focus=${request.id}`,
    }));
    supportTickets.forEach((ticket) => list.push({
      id: `ticket-${ticket.id}`,
      group: 'Tickets',
      label: ticket.subject,
      hint: `${storeName(ticket.storeId)} · ${ticket.status}`,
      icon: MessageSquare,
      to: `/platform/support?focus=${ticket.id}`,
    }));
    return list;
  }, [stores, orders, shopRequests, supportTickets]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = q
      ? commands.filter((c) => `${c.label} ${c.hint || ''} ${c.group}`.toLowerCase().includes(q))
      : commands.filter((c) => c.group === 'Go to' || c.group === 'Stores').slice(0, 8);
    return filtered.slice(0, 40);
  }, [commands, query]);

  useEffect(() => {
    if (active >= results.length) setActive(0);
  }, [results, active]);

  const go = (command?: Command) => {
    if (!command) return;
    setOpen(false);
    navigate(command.to);
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActive((value) => Math.min(value + 1, results.length - 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive((value) => Math.max(value - 1, 0));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      go(results[active]);
    } else if (event.key === 'Escape') {
      setOpen(false);
    }
  };

  // ICONS by group color handled inline.
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[60] flex items-start justify-center p-4 pt-[12vh]" role="dialog" aria-modal="true" aria-label="Command palette">
          <motion.div
            className="fixed inset-0 bg-ink/40 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={() => setOpen(false)}
          />
          <motion.div
            className="relative z-10 w-full max-w-xl overflow-hidden rounded-2xl border border-line bg-surface shadow-2xl"
            initial={{ opacity: 0, y: -12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.98 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="flex items-center gap-3 border-b border-line px-4">
              <Search className="h-4 w-4 shrink-0 text-muted" />
              <input
                ref={inputRef}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Search stores, owners, orders, requests, tickets…"
                className="h-14 w-full bg-transparent text-sm font-semibold text-ink placeholder:text-muted focus:outline-none"
                aria-label="Search the platform"
              />
              <kbd className="hidden shrink-0 rounded border border-line px-1.5 py-0.5 text-[10px] font-bold text-muted sm:inline-block">ESC</kbd>
            </div>
            <div className="max-h-[50vh] overflow-y-auto p-2">
              {results.length === 0 ? (
                <p className="px-3 py-8 text-center text-sm text-muted">No matches for “{query}”.</p>
              ) : (
                results.map((command, index) => {
                  const Icon = command.icon;
                  return (
                    <button
                      key={command.id}
                      onMouseEnter={() => setActive(index)}
                      onClick={() => go(command)}
                      className={cn(
                        'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors',
                        index === active ? 'bg-paper' : 'hover:bg-paper/60'
                      )}
                    >
                      <Icon className={cn('h-4 w-4 shrink-0', index === active ? 'text-accent' : 'text-muted')} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-bold text-ink">{command.label}</span>
                        {command.hint && <span className="block truncate text-xs text-muted">{command.hint}</span>}
                      </span>
                      <span className="shrink-0 text-[10px] font-bold uppercase tracking-widest text-muted">{command.group}</span>
                      {index === active && <CornerDownLeft className="h-3.5 w-3.5 shrink-0 text-muted" />}
                    </button>
                  );
                })
              )}
            </div>
            <div className="flex items-center gap-3 border-t border-line bg-paper/50 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-muted">
              <AlertTriangle className="h-3 w-3" /> Navigation only · actions live on each page
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
