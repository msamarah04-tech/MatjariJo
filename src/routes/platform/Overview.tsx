import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Area, AreaChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  Clock,

  LucideIcon,
  MessageSquare,
  ShoppingBag,
  Store as StoreIcon,
  Wallet,
  XCircle,
} from 'lucide-react';
import { useStore } from '@/lib/store';
import { money, timeAgo } from '@/lib/format';
import { getPlatformInsights } from '@/lib/analytics';
import { toast } from '@/components/ui/Toast';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { cn } from '@/lib/cn';
import { CHART_COLORS, ChartCard, PageHeader, Sparkline } from './shared';

export default function Overview() {
  const stores = useStore((s) => s.stores);
  const orders = useStore((s) => s.orders);
  const events = useStore((s) => s.analyticsEvents);
  const settings = useStore((s) => s.platformSettings);
  const shopRequests = useStore((s) => s.shopRequests);
  const supportTickets = useStore((s) => s.supportTickets);
  const productFlags = useStore((s) => s.productFlags);
  const auditLogs = useStore((s) => s.auditLogs);
  const approveOrder = useStore((s) => s.approveOrder);
  const rejectOrder = useStore((s) => s.rejectOrder);

  const insights = useMemo(() => getPlatformInsights(30, stores, orders, events), [stores, orders, events]);

  const openTickets = supportTickets.filter((t) => t.status !== 'RESOLVED');
  const openFlags = productFlags.filter((f) => f.status === 'OPEN');
  const pendingRequests = shopRequests.filter((r) => r.status === 'PENDING');
  const pendingOrders = orders.filter((o) => o.status === 'PENDING').sort((a, b) => b.createdAt - a.createdAt);
  const highPriorityTickets = openTickets.filter((t) => t.priority === 'HIGH');

  const storeName = (id?: string) => stores.find((s) => s.id === id)?.name || 'Unknown store';

  const kpis: { label: string; value: string; icon: LucideIcon; spark?: number[]; sparkColor?: string; tone?: 'amber' | 'red' }[] = [
    { label: 'Total GMV', value: money(insights.kpis.totalGmvCents), icon: Wallet, spark: insights.gmvSpark, sparkColor: CHART_COLORS[0] },
    { label: 'Active stores', value: `${insights.kpis.activeStores}`, icon: StoreIcon },
    { label: 'Total orders', value: `${insights.kpis.totalOrders}`, icon: ShoppingBag, spark: insights.ordersSpark, sparkColor: CHART_COLORS[3] },
    { label: 'Pending approvals', value: `${insights.kpis.pendingApprovals}`, icon: Clock, tone: insights.kpis.pendingApprovals > 0 ? 'amber' : undefined },
    { label: 'Open tickets', value: `${openTickets.length}`, icon: MessageSquare, tone: highPriorityTickets.length > 0 ? 'red' : undefined },
    { label: 'Flagged products', value: `${openFlags.length}`, icon: AlertTriangle, tone: openFlags.length > 0 ? 'amber' : undefined },
  ];

  const statusData = insights.statusCounts.filter((entry) => entry.value > 0);
  const actionTotal = pendingRequests.length + pendingOrders.length + highPriorityTickets.length + openFlags.length;

  return (
    <div className="space-y-8">
      <PageHeader title="Overview" subtitle="Everything that needs your attention across the marketplace, at a glance." />

      {/* KPI row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi) => (
          <KpiCard key={kpi.label} {...kpi} />
        ))}
      </div>

      {/* Action center */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-heading text-2xl font-black tracking-tight text-ink">Needs your attention</h2>
          <span className={cn('rounded-full px-3 py-1 text-xs font-black', actionTotal > 0 ? 'bg-accent text-white' : 'bg-paper text-muted')}>
            {actionTotal} open
          </span>
        </div>

        {actionTotal === 0 ? (
          <EmptyState icon={CheckCircle2} title="All clear" description="No pending requests, orders, tickets, or flags right now." />
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* Orders awaiting approval */}
            <ActionPanel icon={ShoppingBag} title="Orders awaiting approval" count={pendingOrders.length} to="/platform" empty="No orders waiting.">
              {pendingOrders.slice(0, 4).map((order) => (
                <div key={order.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-ink">{order.customerName} · {money(order.totalCents)}</p>
                    <p className="truncate text-xs text-muted">{storeName(order.storeId)} · {timeAgo(order.createdAt)}</p>
                  </div>
                  <div className="flex shrink-0 gap-1.5">
                    <Button size="sm" variant="accent" className="h-8 px-2.5" onClick={() => { approveOrder(order.storeId, order.id); toast({ title: 'Order approved', type: 'success' }); }}>
                      <CheckCircle2 className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="ghost" className="h-8 border border-line px-2.5" onClick={() => { rejectOrder(order.storeId, order.id); toast({ title: 'Order rejected' }); }}>
                      <XCircle className="h-4 w-4 text-red-600" />
                    </Button>
                  </div>
                </div>
              ))}
            </ActionPanel>

            {/* Shop requests */}
            <ActionPanel icon={ClipboardList} title="Pending shop requests" count={pendingRequests.length} to="/platform/shop-requests" empty="No new requests.">
              {pendingRequests.slice(0, 4).map((request) => (
                <ActionRow
                  key={request.id}
                  title={request.storeName}
                  subtitle={`${request.ownerName} · ${timeAgo(request.createdAt)}`}
                  to={`/platform/shop-requests?focus=${request.id}`}
                  cta="Review"
                />
              ))}
            </ActionPanel>

            {/* High-priority tickets */}
            <ActionPanel icon={MessageSquare} title="High-priority tickets" count={highPriorityTickets.length} to="/platform/support" empty="No urgent tickets.">
              {highPriorityTickets.slice(0, 4).map((ticket) => (
                <ActionRow
                  key={ticket.id}
                  title={ticket.subject}
                  subtitle={`${storeName(ticket.storeId)} · ${timeAgo(ticket.createdAt)}`}
                  to={`/platform/support?focus=${ticket.id}`}
                  cta="Open"
                />
              ))}
            </ActionPanel>

            {/* Unresolved flags */}
            <ActionPanel icon={AlertTriangle} title="Unresolved flags" count={openFlags.length} to="/platform/moderation" empty="No open flags.">
              {openFlags.slice(0, 4).map((flag) => (
                <ActionRow
                  key={flag.id}
                  title={flag.reason}
                  subtitle={`${storeName(flag.storeId)} · ${timeAgo(flag.createdAt)}`}
                  to={`/platform/moderation?focus=${flag.id}`}
                  cta="Review"
                />
              ))}
            </ActionPanel>
          </div>
        )}
      </section>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <ChartCard title="GMV — last 30 days" subtitle="Approved and fulfilled order value">
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={insights.series}>
                <defs>
                  <linearGradient id="overviewGmv" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={CHART_COLORS[0]} stopOpacity={0.4} />
                    <stop offset="95%" stopColor={CHART_COLORS[0]} stopOpacity={0.03} />
                  </linearGradient>
                </defs>
                <Tooltip formatter={(value) => money(Number(value))} contentStyle={{ borderRadius: 12, borderColor: '#E7E0D3' }} labelStyle={{ fontWeight: 700 }} />
                <Area type="monotone" dataKey="gmvCents" stroke={CHART_COLORS[0]} strokeWidth={3} fill="url(#overviewGmv)" />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
        <ChartCard title="Order status" subtitle="Outcomes in the last 30 days">
          {statusData.length === 0 ? (
            <p className="py-16 text-center text-sm text-muted">No orders yet.</p>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={statusData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={3}>
                    {statusData.map((entry, index) => <Cell key={entry.name} fill={CHART_COLORS[index % CHART_COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 12, borderColor: '#E7E0D3' }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-2 flex flex-wrap gap-3">
                {statusData.map((entry, index) => (
                  <span key={entry.name} className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-muted">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }} />
                    {entry.name} {entry.value}
                  </span>
                ))}
              </div>
            </>
          )}
        </ChartCard>
      </div>

      {/* Activity feed */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-heading text-2xl font-black tracking-tight text-ink">Recent activity</h2>
          <Link to="/platform/audit" className="flex items-center gap-1 text-xs font-bold uppercase tracking-widest text-muted hover:text-ink">
            Full log <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-sm">
          {auditLogs.slice(0, 8).map((log) => (
            <div key={log.id} className="flex items-start gap-3 border-b border-line/60 p-4 last:border-b-0">
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-paper text-muted">
                <ClipboardList className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-ink">{log.action}</p>
                <p className="truncate text-xs text-muted">{log.target}{log.detail ? ` · ${log.detail}` : ''}</p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-xs font-bold text-muted">{log.actor}</p>
                <p className="text-[10px] uppercase tracking-widest text-muted/70">{timeAgo(log.ts)}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function KpiCard({ label, value, icon: Icon, spark, sparkColor, tone }: { label: string; value: string; icon: LucideIcon; spark?: number[]; sparkColor?: string; tone?: 'amber' | 'red' }) {
  return (
    <div className={cn(
      'rounded-2xl border bg-surface p-5 shadow-sm',
      tone === 'amber' ? 'border-amber-200 bg-amber-50/40' : tone === 'red' ? 'border-red-200 bg-red-50/40' : 'border-line'
    )}>
      <div className="mb-3 flex items-center justify-between">
        <span className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-muted">
          <Icon className="h-3.5 w-3.5" /> {label}
        </span>
      </div>
      <div className="flex items-end justify-between gap-2">
        <span className="font-black text-3xl text-ink">{value}</span>
        {spark && spark.some((n) => n > 0) && <Sparkline data={spark} color={sparkColor} className="mb-1" />}
      </div>
    </div>
  );
}

function ActionPanel({ icon: Icon, title, count, to, empty, children }: { icon: LucideIcon; title: string; count: number; to: string; empty: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-5 shadow-sm">
      <div className="mb-2 flex items-center justify-between">
        <span className="flex items-center gap-2 text-sm font-black text-ink">
          <Icon className="h-4 w-4 text-accent" /> {title}
        </span>
        <Link to={to} className="text-[10px] font-bold uppercase tracking-widest text-muted hover:text-ink">View all</Link>
      </div>
      {count === 0 ? (
        <p className="py-4 text-sm text-muted">{empty}</p>
      ) : (
        <div className="divide-y divide-line/60">{children}</div>
      )}
    </div>
  );
}

function ActionRow({ title, subtitle, to, cta }: { title: string; subtitle: string; to: string; cta: string }) {
  const navigate = useNavigate();
  return (
    <div className="flex items-center justify-between gap-3 py-2.5">
      <div className="min-w-0">
        <p className="truncate text-sm font-bold text-ink">{title}</p>
        <p className="truncate text-xs text-muted">{subtitle}</p>
      </div>
      <Button size="sm" variant="ghost" className="h-8 shrink-0 gap-1 border border-line" onClick={() => navigate(to)}>
        {cta} <ArrowRight className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
