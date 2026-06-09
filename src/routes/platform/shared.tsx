import { useMemo } from 'react';
import { AlertTriangle, ClipboardList, LucideIcon, MessageSquare, ShoppingBag, Store as StoreIcon } from 'lucide-react';
import { useStore } from '@/lib/store';
import { cn } from '@/lib/cn';

// Area-neutral dashboard primitives now live in shared modules; re-export them
// here so existing platform pages keep importing from './shared' unchanged.
export { CHART_COLORS, PageHeader, Sparkline, SegmentedControl, ChartCard, StoreAvatar } from '@/components/ui/dashboard';
export { useFocusParam } from '@/lib/useFocusParam';

// ---------------------------------------------------------------------------
// Derived selectors shared by the shell (badges, notifications) and pages.
// ---------------------------------------------------------------------------

export interface PlatformBadges {
  requests: number;
  orders: number;
  tickets: number;
  flags: number;
}

/** Pending-count badges shown on the sidebar nav. */
export function usePlatformBadges(): PlatformBadges {
  const shopRequests = useStore((s) => s.shopRequests);
  const orders = useStore((s) => s.orders);
  const supportTickets = useStore((s) => s.supportTickets);
  const productFlags = useStore((s) => s.productFlags);
  return useMemo(
    () => ({
      requests: shopRequests.filter((r) => r.status === 'PENDING' || r.status === 'IN_REVIEW').length,
      orders: orders.filter((o) => o.status === 'PENDING').length,
      tickets: supportTickets.filter((t) => t.status !== 'RESOLVED').length,
      flags: productFlags.filter((f) => f.status === 'OPEN').length,
    }),
    [shopRequests, orders, supportTickets, productFlags]
  );
}

export type NotificationKind = 'request' | 'order' | 'ticket' | 'flag';

export interface PlatformNotification {
  id: string;
  kind: NotificationKind;
  title: string;
  subtitle: string;
  ts: number;
  to: string;
  unread: boolean;
  icon: LucideIcon;
}

const KIND_ICON: Record<NotificationKind, LucideIcon> = {
  request: ClipboardList,
  order: ShoppingBag,
  ticket: MessageSquare,
  flag: AlertTriangle,
};

/** Actionable items for the notifications bell, newest first. */
export function usePlatformNotifications(): PlatformNotification[] {
  const shopRequests = useStore((s) => s.shopRequests);
  const orders = useStore((s) => s.orders);
  const supportTickets = useStore((s) => s.supportTickets);
  const productFlags = useStore((s) => s.productFlags);
  const stores = useStore((s) => s.stores);
  const products = useStore((s) => s.products);
  const lastSeen = useStore((s) => s.lastSeenNotificationsAt);

  return useMemo(() => {
    const storeName = (id?: string) => stores.find((s) => s.id === id)?.name || 'Platform';
    const items: PlatformNotification[] = [];

    shopRequests
      .filter((r) => r.status === 'PENDING')
      .forEach((r) => items.push({
        id: `request-${r.id}`,
        kind: 'request',
        title: 'New website request',
        subtitle: `${r.storeName} · ${r.ownerName}`,
        ts: r.createdAt,
        to: `/platform/shop-requests?focus=${r.id}`,
        unread: r.createdAt > lastSeen,
        icon: KIND_ICON.request,
      }));

    orders
      .filter((o) => o.status === 'PENDING')
      .forEach((o) => items.push({
        id: `order-${o.id}`,
        kind: 'order',
        title: 'Order awaiting approval',
        subtitle: `${storeName(o.storeId)} · ${o.customerName}`,
        ts: o.createdAt,
        to: '/platform',
        unread: o.createdAt > lastSeen,
        icon: KIND_ICON.order,
      }));

    supportTickets
      .filter((t) => t.status !== 'RESOLVED' && t.priority === 'HIGH')
      .forEach((t) => items.push({
        id: `ticket-${t.id}`,
        kind: 'ticket',
        title: 'High-priority ticket',
        subtitle: `${storeName(t.storeId)} · ${t.subject}`,
        ts: t.createdAt,
        to: `/platform/support?focus=${t.id}`,
        unread: t.createdAt > lastSeen,
        icon: KIND_ICON.ticket,
      }));

    productFlags
      .filter((f) => f.status === 'OPEN')
      .forEach((f) => items.push({
        id: `flag-${f.id}`,
        kind: 'flag',
        title: 'Unresolved product flag',
        subtitle: `${products.find((p) => p.id === f.productId)?.name || 'Product'} · ${storeName(f.storeId)}`,
        ts: f.createdAt,
        to: `/platform/moderation?focus=${f.id}`,
        unread: f.createdAt > lastSeen,
        icon: KIND_ICON.flag,
      }));

    return items.sort((a, b) => b.ts - a.ts).slice(0, 30);
  }, [shopRequests, orders, supportTickets, productFlags, stores, products, lastSeen]);
}

// ---------------------------------------------------------------------------
// Platform-specific presentational helpers.
// ---------------------------------------------------------------------------

export type PillTone = 'green' | 'amber' | 'red' | 'blue' | 'neutral';

export function StatusPill({ label, tone = 'neutral', className }: { label: string; tone?: PillTone; className?: string }) {
  const classes: Record<PillTone, string> = {
    green: 'bg-green-50 text-green-700 border-green-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
    red: 'bg-red-50 text-red-700 border-red-200',
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    neutral: 'bg-paper text-muted border-line',
  };
  return (
    <span className={cn('inline-flex items-center rounded-full border px-2 py-1 text-[10px] font-bold uppercase tracking-widest', classes[tone], className)}>
      {label.replaceAll('_', ' ')}
    </span>
  );
}

export { StoreIcon };
