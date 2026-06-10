import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Area, AreaChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import {
  AlertTriangle,
  ArrowRight,
  BadgePercent,
  CheckCircle2,
  Clock,
  ExternalLink,
  LayoutGrid,
  LucideIcon,
  MousePointerClick,
  PackageSearch,
  Receipt,
  ShoppingBag,
  Wallet,
  XCircle,
} from 'lucide-react';
import { useStore } from '@/lib/store';
import { storefrontUrl } from '@/lib/tenant';
import { money, timeAgo } from '@/lib/format';
import { getStoreInsights } from '@/lib/analytics';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { StatusBadge } from '@/components/ui/Badge';
import { toast } from '@/components/ui/Toast';
import { cn } from '@/lib/cn';
import { CHART_COLORS, ChartCard, PageHeader, Sparkline } from '@/components/ui/dashboard';
import { LOW_STOCK_THRESHOLD, useAdminContext, useStoreDiscounts, useStoreOrders, useStoreProducts } from './shared';

const WEEK_MS = 7 * 86400000;

export default function Overview() {
  const { storeId, store } = useAdminContext();
  const scopedOrders = useStoreOrders(storeId);
  const scopedProducts = useStoreProducts(storeId);
  const scopedDiscounts = useStoreDiscounts(storeId);
  const events = useStore((s) => s.analyticsEvents);
  const approveOrder = useStore((s) => s.approveOrder);
  const rejectOrder = useStore((s) => s.rejectOrder);
  const fulfillOrder = useStore((s) => s.fulfillOrder);
  const navigate = useNavigate();

  const insights = useMemo(() => getStoreInsights(30, storeId, store.currency, scopedOrders, scopedProducts, events, store.createdAt), [storeId, store.currency, store.createdAt, scopedOrders, scopedProducts, events]);

  const storeOrders = useMemo(() => [...scopedOrders].sort((a, b) => b.createdAt - a.createdAt), [scopedOrders]);
  const pendingOrders = storeOrders.filter((o) => o.status === 'PENDING');
  const approvedOrders = storeOrders.filter((o) => o.status === 'APPROVED');
  const lowStock = scopedProducts.filter((p) => p.isActive && p.stock <= LOW_STOCK_THRESHOLD).sort((a, b) => a.stock - b.stock);
  const expiringDiscounts = scopedDiscounts.filter((d) => d.active && d.expiresAt && d.expiresAt > Date.now() && d.expiresAt < Date.now() + WEEK_MS);

  const kpis: { label: string; value: string; icon: LucideIcon; spark?: number[]; tone?: 'amber' }[] = [
    { label: 'Revenue', value: money(insights.kpis.revenueCents, store.currency), icon: Wallet, spark: insights.revenueSpark },
    { label: 'Orders', value: `${insights.kpis.ordersCount}`, icon: ShoppingBag, spark: insights.ordersSpark },
    { label: 'Pending', value: `${pendingOrders.length}`, icon: Clock, tone: pendingOrders.length > 0 ? 'amber' : undefined },
    { label: 'Products', value: `${insights.kpis.productCount}`, icon: PackageSearch },
    { label: 'Conversion', value: `${(insights.kpis.conversionRate * 100).toFixed(1)}%`, icon: MousePointerClick },
    { label: 'Avg order', value: money(insights.kpis.avgOrderValueCents, store.currency), icon: Receipt, spark: insights.aovSpark },
  ];

  const statusData = insights.statusCounts.filter((entry) => entry.value > 0);
  const actionTotal = pendingOrders.length + approvedOrders.length + lowStock.length + expiringDiscounts.length;
  const base = `/admin/${storeId}`;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Overview"
        subtitle={`How ${store.name} is doing across the last 30 days.`}
        action={
          <Button variant="ghost" className="gap-2 border border-line" onClick={() => window.open(storefrontUrl(store.slug), '_blank')}>
            <ExternalLink className="h-4 w-4" /> View storefront
          </Button>
        }
      />

      {/* KPI row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {kpis.map((kpi) => <KpiCard key={kpi.label} {...kpi} />)}
      </div>

      {/* Action center */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-heading text-2xl font-black tracking-tight text-ink">Needs your attention</h2>
          <span className={cn('rounded-full px-3 py-1 text-xs font-black', actionTotal > 0 ? 'bg-accent text-white' : 'bg-paper text-muted')}>{actionTotal} open</span>
        </div>

        {actionTotal === 0 ? (
          <EmptyState icon={CheckCircle2} title="All caught up" description="No pending orders, low stock, or expiring discounts right now." />
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <ActionPanel icon={ShoppingBag} title="Orders to review" count={pendingOrders.length} to={`${base}/orders`}>
              {pendingOrders.slice(0, 4).map((order) => (
                <div key={order.id} className="flex items-center justify-between gap-3 py-2.5">
                  <button onClick={() => navigate(`${base}/orders?focus=${order.id}`)} className="min-w-0 text-left">
                    <p className="truncate text-sm font-bold text-ink">{order.customerName} · {money(order.totalCents, store.currency)}</p>
                    <p className="truncate text-xs text-muted">{timeAgo(order.createdAt)}</p>
                  </button>
                  <div className="flex shrink-0 gap-1.5">
                    <Button size="sm" variant="accent" className="h-8 px-2.5" onClick={() => { approveOrder(storeId, order.id); toast({ title: 'Order approved', type: 'success' }); }}>
                      <CheckCircle2 className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="ghost" className="h-8 border border-line px-2.5" onClick={() => { rejectOrder(storeId, order.id); toast({ title: 'Order rejected' }); }}>
                      <XCircle className="h-4 w-4 text-red-600" />
                    </Button>
                  </div>
                </div>
              ))}
            </ActionPanel>

            <ActionPanel icon={CheckCircle2} title="Ready to fulfill" count={approvedOrders.length} to={`${base}/orders`}>
              {approvedOrders.slice(0, 4).map((order) => (
                <div key={order.id} className="flex items-center justify-between gap-3 py-2.5">
                  <button onClick={() => navigate(`${base}/orders?focus=${order.id}`)} className="min-w-0 text-left">
                    <p className="truncate text-sm font-bold text-ink">{order.customerName} · {money(order.totalCents, store.currency)}</p>
                    <p className="truncate text-xs text-muted">{timeAgo(order.createdAt)}</p>
                  </button>
                  <Button size="sm" variant="accent" className="h-8 shrink-0 gap-1.5 px-2.5" onClick={() => { fulfillOrder(storeId, order.id); toast({ title: 'Order fulfilled', type: 'success' }); }}>
                    Fulfill
                  </Button>
                </div>
              ))}
            </ActionPanel>

            <ActionPanel icon={AlertTriangle} title="Low stock" count={lowStock.length} to={`${base}/products`}>
              {lowStock.slice(0, 4).map((product) => (
                <ActionRow
                  key={product.id}
                  title={product.name}
                  subtitle={product.stock === 0 ? 'Out of stock' : `${product.stock} left`}
                  to={`${base}/products?focus=${product.id}`}
                  cta="Restock"
                />
              ))}
            </ActionPanel>

            <ActionPanel icon={BadgePercent} title="Expiring discounts" count={expiringDiscounts.length} to={`${base}/discounts`}>
              {expiringDiscounts.slice(0, 4).map((discount) => (
                <ActionRow
                  key={discount.id}
                  title={discount.code}
                  subtitle={`Expires ${new Date(discount.expiresAt!).toLocaleDateString()}`}
                  to={`${base}/discounts?focus=${discount.id}`}
                  cta="Edit"
                />
              ))}
            </ActionPanel>
          </div>
        )}
      </section>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <ChartCard title="Sales — last 30 days" subtitle="Approved and fulfilled revenue">
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={insights.series}>
                <defs>
                  <linearGradient id="adminSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={CHART_COLORS[0]} stopOpacity={0.4} />
                    <stop offset="95%" stopColor={CHART_COLORS[0]} stopOpacity={0.03} />
                  </linearGradient>
                </defs>
                <Tooltip formatter={(value) => money(Number(value), store.currency)} contentStyle={{ borderRadius: 12, borderColor: '#E7E0D3' }} labelStyle={{ fontWeight: 700 }} />
                <Area type="monotone" dataKey="revenueCents" stroke={CHART_COLORS[0]} strokeWidth={3} fill="url(#adminSales)" />
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

      {/* Recent orders */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-heading text-2xl font-black tracking-tight text-ink">Recent orders</h2>
          <Link to={`${base}/orders`} className="flex items-center gap-1 text-xs font-bold uppercase tracking-widest text-muted hover:text-ink">
            All orders <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        {storeOrders.length === 0 ? (
          <EmptyState icon={LayoutGrid} title="No orders yet" description="Share your storefront link to start receiving orders." />
        ) : (
          <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-sm">
            {storeOrders.slice(0, 6).map((order) => (
              <button
                key={order.id}
                onClick={() => navigate(`${base}/orders?focus=${order.id}`)}
                className="flex w-full items-center justify-between gap-3 border-b border-line/60 p-4 text-left transition-colors last:border-b-0 hover:bg-paper/60"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-ink">{order.customerName}</p>
                  <p className="truncate text-xs text-muted">{order.items.map((i) => i.productName).join(', ') || '—'} · {timeAgo(order.createdAt)}</p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span className="text-sm font-bold text-ink">{money(order.totalCents, store.currency)}</span>
                  <StatusBadge status={order.status} />
                </div>
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function KpiCard({ label, value, icon: Icon, spark, tone }: { label: string; value: string; icon: LucideIcon; spark?: number[]; tone?: 'amber' }) {
  return (
    <div className={cn('rounded-2xl border bg-surface p-5 shadow-sm', tone === 'amber' ? 'border-amber-200 bg-amber-50/40' : 'border-line')}>
      <div className="mb-3 flex items-center justify-between">
        <span className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-muted">
          <Icon className="h-3.5 w-3.5" /> {label}
        </span>
      </div>
      <div className="flex items-end justify-between gap-2">
        <span className="text-3xl font-black text-ink">{value}</span>
        {spark && spark.some((n) => n > 0) && <Sparkline data={spark} color={CHART_COLORS[0]} className="mb-1" />}
      </div>
    </div>
  );
}

function ActionPanel({ icon: Icon, title, count, to, children }: { icon: LucideIcon; title: string; count: number; to: string; children: React.ReactNode }) {
  if (count === 0) return null;
  return (
    <div className="rounded-2xl border border-line bg-surface p-5 shadow-sm">
      <div className="mb-2 flex items-center justify-between">
        <span className="flex items-center gap-2 text-sm font-black text-ink">
          <Icon className="h-4 w-4 text-accent" /> {title}
          <span className="rounded-full bg-paper px-2 py-0.5 text-[10px] font-black text-muted">{count}</span>
        </span>
        <Link to={to} className="text-[10px] font-bold uppercase tracking-widest text-muted hover:text-ink">View all</Link>
      </div>
      <div className="divide-y divide-line/60">{children}</div>
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
