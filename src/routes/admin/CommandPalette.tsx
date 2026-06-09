import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { BadgePercent, BarChart3, ClipboardList, CornerDownLeft, LayoutDashboard, LucideIcon, PackageSearch, Paintbrush, Search, ShoppingBag } from 'lucide-react';
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
 * Store-scoped ⌘K / Ctrl-K command palette for the shop-owner dashboard.
 * Searches this store's products, orders, and discounts, then deep-links to the
 * right page. Mirrors the platform palette but never leaves the active store.
 */
export function CommandPalette({ storeId }: { storeId: string }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const products = useStore((s) => s.products);
  const orders = useStore((s) => s.orders);
  const discounts = useStore((s) => s.discounts);

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

  const base = `/admin/${storeId}`;
  const commands = useMemo<Command[]>(() => {
    const list: Command[] = [
      { id: 'nav-overview', group: 'Go to', label: 'Overview', icon: LayoutDashboard, to: base },
      { id: 'nav-products', group: 'Go to', label: 'Products', icon: PackageSearch, to: `${base}/products` },
      { id: 'nav-orders', group: 'Go to', label: 'Orders', icon: ClipboardList, to: `${base}/orders` },
      { id: 'nav-discounts', group: 'Go to', label: 'Discounts', icon: BadgePercent, to: `${base}/discounts` },
      { id: 'nav-analytics', group: 'Go to', label: 'Analytics', icon: BarChart3, to: `${base}/analytics` },
      { id: 'nav-appearance', group: 'Go to', label: 'Appearance', icon: Paintbrush, to: `${base}/appearance` },
    ];
    products.filter((p) => p.storeId === storeId).forEach((product) => list.push({
      id: `product-${product.id}`,
      group: 'Products',
      label: product.name,
      hint: `${money(product.priceCents)} · ${product.stock} in stock`,
      icon: PackageSearch,
      to: `${base}/products?focus=${product.id}`,
    }));
    orders.filter((o) => o.storeId === storeId).forEach((order) => list.push({
      id: `order-${order.id}`,
      group: 'Orders',
      label: `${order.customerName} · ${money(order.totalCents)}`,
      hint: order.status,
      icon: ShoppingBag,
      to: `${base}/orders?focus=${order.id}`,
    }));
    discounts.filter((d) => d.storeId === storeId).forEach((discount) => list.push({
      id: `discount-${discount.id}`,
      group: 'Discounts',
      label: discount.code,
      hint: discount.type === 'PERCENT' ? `${discount.value}% off` : discount.type === 'FIXED' ? `${money(discount.value)} off` : 'Free shipping',
      icon: BadgePercent,
      to: `${base}/discounts?focus=${discount.id}`,
    }));
    return list;
  }, [products, orders, discounts, storeId, base]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = q
      ? commands.filter((c) => `${c.label} ${c.hint || ''} ${c.group}`.toLowerCase().includes(q))
      : commands.filter((c) => c.group === 'Go to');
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
                placeholder="Search products, orders, discounts…"
                className="h-14 w-full bg-transparent text-sm font-semibold text-ink placeholder:text-muted focus:outline-none"
                aria-label="Search this store"
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
                      className={cn('flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors', index === active ? 'bg-paper' : 'hover:bg-paper/60')}
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
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
