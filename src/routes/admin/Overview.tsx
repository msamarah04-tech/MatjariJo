import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  BadgePercent,
  CheckCircle2,
  Clock,
  ExternalLink,
  Globe,
  LayoutGrid,
  LucideIcon,
  MousePointerClick,
  Package,
  PackageSearch,
  PartyPopper,
  Receipt,
  ShoppingBag,
  Tag,
  TrendingUp,
  Users,
  Wallet,
  X,
  XCircle,
} from 'lucide-react';
import { useStore } from '@/lib/store';
import { storefrontUrl } from '@/lib/tenant';
import { money, timeAgo } from '@/lib/format';
import { getStoreInsights } from '@/lib/analytics';
import { useI18n } from '@/lib/i18n';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { StatusBadge } from '@/components/ui/Badge';
import { toast } from '@/components/ui/Toast';
import { cn } from '@/lib/cn';
import { PageHeader } from '@/components/ui/dashboard';
import { LOW_STOCK_THRESHOLD, useAdminContext, useStoreDiscounts, useStoreOrders, useStoreProducts } from './shared';

const WEEK_MS = 7 * 86400000;
const REVENUE_STATUSES = ['APPROVED', 'FULFILLED'] as const;

export default function Overview() {
  const { storeId, store, isPlatformViewer } = useAdminContext();
  const scopedOrders = useStoreOrders(storeId);
  const scopedProducts = useStoreProducts(storeId);
  const scopedDiscounts = useStoreDiscounts(storeId);
  const events = useStore((s) => s.analyticsEvents);
  const approveOrder = useStore((s) => s.approveOrder);
  const rejectOrder = useStore((s) => s.rejectOrder);
  const fulfillOrder = useStore((s) => s.fulfillOrder);
  const dismissWelcome = useStore((s) => s.dismissWelcome);
  const navigate = useNavigate();
  const { t } = useI18n();

  const insights = useMemo(
    () => getStoreInsights(30, storeId, store.currency, scopedOrders, scopedProducts, events, store.createdAt),
    [storeId, store.currency, store.createdAt, scopedOrders, scopedProducts, events]
  );

  const storeOrders = useMemo(() => [...scopedOrders].sort((a, b) => b.createdAt - a.createdAt), [scopedOrders]);
  const pendingOrders = storeOrders.filter((o) => o.status === 'PENDING');
  const approvedOrders = storeOrders.filter((o) => o.status === 'APPROVED');
  const lowStock = scopedProducts.filter((p) => p.isActive && p.stock <= LOW_STOCK_THRESHOLD).sort((a, b) => a.stock - b.stock);
  const expiringDiscounts = scopedDiscounts.filter((d) => d.active && d.expiresAt && d.expiresAt > Date.now() && d.expiresAt < Date.now() + WEEK_MS);
  const actionTotal = pendingOrders.length + approvedOrders.length + lowStock.length + expiringDiscounts.length;

  const allTimeRevenue = useMemo(
    () => scopedOrders.filter((o) => (REVENUE_STATUSES as readonly string[]).includes(o.status)).reduce((sum, o) => sum + o.totalCents, 0),
    [scopedOrders]
  );
  const uniqueCustomers = useMemo(
    () => new Set(scopedOrders.map((o) => o.customerEmail || o.customerName)).size,
    [scopedOrders]
  );

  const base = `/admin/${storeId}`;

  const kpis: { label: string; value: string; icon: LucideIcon; tone?: 'amber' | 'green' }[] = [
    { label: t('ovRevenue30d'), value: money(insights.kpis.revenueCents, store.currency), icon: Wallet, tone: insights.kpis.revenueCents > 0 ? 'green' : undefined },
    { label: t('ovOrders30d'), value: `${insights.kpis.ordersCount}`, icon: ShoppingBag },
    { label: t('ovAvgOrderValue'), value: money(insights.kpis.avgOrderValueCents, store.currency), icon: Receipt },
    { label: t('ovPendingReview'), value: `${pendingOrders.length}`, icon: Clock, tone: pendingOrders.length > 0 ? 'amber' : undefined },
    { label: t('ovReadyToFulfill'), value: `${approvedOrders.length}`, icon: Package, tone: approvedOrders.length > 0 ? 'green' : undefined },
    { label: t('ovActiveProducts'), value: `${insights.kpis.productCount}`, icon: PackageSearch },
  ];

  const showWelcome = !store.welcomeDismissed && !isPlatformViewer;

  return (
    <div className="space-y-8">
      {showWelcome && (
        <div className="flex items-start justify-between gap-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500 text-white">
              <PartyPopper className="h-5 w-5" />
            </div>
            <div>
              <p className="font-heading text-base font-black text-emerald-900">{t('ovWelcomeTitle')}</p>
              <p className="mt-0.5 text-sm text-emerald-700">{t('ovWelcomeDesc')}</p>
              <a
                href={storefrontUrl(store.slug)}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 underline-offset-2 hover:underline"
              >
                <Globe className="h-3.5 w-3.5" /> {storefrontUrl(store.slug).replace(/^https?:\/\//, '')}
              </a>
            </div>
          </div>
          <button
            onClick={() => dismissWelcome(storeId)}
            aria-label="Dismiss"
            className="shrink-0 rounded-lg p-1.5 text-emerald-600 transition-colors hover:bg-emerald-100 hover:text-emerald-900"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <PageHeader
        title={t('ovTitle')}
        subtitle={t('ovSubtitle').replace('{store}', store.name)}
        action={
          <Button variant="ghost" className="gap-2 border border-line" onClick={() => window.open(storefrontUrl(store.slug), '_blank')}>
            <ExternalLink className="h-4 w-4" /> {t('ovViewStorefront')}
          </Button>
        }
      />

      {/* ── KPI strip ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        {kpis.map((kpi) => <KpiCard key={kpi.label} {...kpi} />)}
      </div>

      {/* ── Action center ───────────────────────────────────────────── */}
      <section>
        <SectionHeader title={t('ovNeedsAttention')} badge={actionTotal} badgeTone={actionTotal > 0 ? 'accent' : 'muted'} />
        {actionTotal === 0 ? (
          <EmptyState icon={CheckCircle2} title={t('ovAllCaughtUp')} description={t('ovAllCaughtUpDesc')} />
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {pendingOrders.length > 0 && (
              <ActionPanel icon={ShoppingBag} title={t('ovOrdersToReview')} count={pendingOrders.length} to={`${base}/orders`} viewAllLabel={t('ovViewAll')}>
                {pendingOrders.slice(0, 5).map((order) => (
                  <div key={order.id} className="flex items-center justify-between gap-3 py-2.5">
                    <button onClick={() => navigate(`${base}/orders?focus=${order.id}`)} className="min-w-0 text-left">
                      <p className="truncate text-sm font-bold text-ink">{order.customerName} · {money(order.totalCents, store.currency)}</p>
                      <p className="truncate text-xs text-muted">{timeAgo(order.createdAt)}</p>
                    </button>
                    <div className="flex shrink-0 gap-1.5">
                      <Button size="sm" variant="accent" className="h-8 px-2.5" onClick={() => { approveOrder(storeId, order.id); toast({ title: t('ovOrderApproved'), type: 'success' }); }}>
                        <CheckCircle2 className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-8 border border-line px-2.5" onClick={() => { rejectOrder(storeId, order.id); toast({ title: t('ovOrderRejected') }); }}>
                        <XCircle className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                ))}
              </ActionPanel>
            )}

            {approvedOrders.length > 0 && (
              <ActionPanel icon={CheckCircle2} title={t('ovReadyToFulfillTitle')} count={approvedOrders.length} to={`${base}/orders`} viewAllLabel={t('ovViewAll')}>
                {approvedOrders.slice(0, 5).map((order) => (
                  <div key={order.id} className="flex items-center justify-between gap-3 py-2.5">
                    <button onClick={() => navigate(`${base}/orders?focus=${order.id}`)} className="min-w-0 text-left">
                      <p className="truncate text-sm font-bold text-ink">{order.customerName} · {money(order.totalCents, store.currency)}</p>
                      <p className="truncate text-xs text-muted">{timeAgo(order.createdAt)}</p>
                    </button>
                    <Button size="sm" variant="accent" className="h-8 shrink-0 gap-1.5 px-2.5" onClick={() => { fulfillOrder(storeId, order.id); toast({ title: t('ovOrderFulfilledMsg'), type: 'success' }); }}>
                      {t('ovFulfill')}
                    </Button>
                  </div>
                ))}
              </ActionPanel>
            )}

            {lowStock.length > 0 && (
              <ActionPanel icon={AlertTriangle} title={t('ovLowStock')} count={lowStock.length} to={`${base}/products`} viewAllLabel={t('ovViewAll')}>
                {lowStock.slice(0, 5).map((product) => (
                  <div key={product.id} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-ink">{product.name}</p>
                      <p className="truncate text-xs text-muted">
                        {product.stock === 0 ? t('outOfStock') : t('ovLeftInStock').replace('{n}', String(product.stock))}
                      </p>
                    </div>
                    <Button size="sm" variant="ghost" className="h-8 shrink-0 gap-1 border border-line" onClick={() => navigate(`${base}/products?focus=${product.id}`)}>
                      {t('ovRestock')} <ArrowRight className="h-3.5 w-3.5 rtl:rotate-180" />
                    </Button>
                  </div>
                ))}
              </ActionPanel>
            )}

            {expiringDiscounts.length > 0 && (
              <ActionPanel icon={BadgePercent} title={t('ovExpiringSoon')} count={expiringDiscounts.length} to={`${base}/discounts`} viewAllLabel={t('ovViewAll')}>
                {expiringDiscounts.slice(0, 5).map((discount) => (
                  <div key={discount.id} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-ink font-mono">{discount.code}</p>
                      <p className="truncate text-xs text-muted">{t('ovExpires')} {new Date(discount.expiresAt!).toLocaleDateString()}</p>
                    </div>
                    <Button size="sm" variant="ghost" className="h-8 shrink-0 gap-1 border border-line" onClick={() => navigate(`${base}/discounts?focus=${discount.id}`)}>
                      {t('ovEditBtn')} <ArrowRight className="h-3.5 w-3.5 rtl:rotate-180" />
                    </Button>
                  </div>
                ))}
              </ActionPanel>
            )}
          </div>
        )}
      </section>

      {/* ── Recent orders + Top products ────────────────────────────── */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-5">
        {/* Recent orders */}
        <section className="xl:col-span-3">
          <SectionHeader title={t('ovRecentOrders')} to={`${base}/orders`} toLabel={t('ovAllOrders')} />
          {storeOrders.length === 0 ? (
            <EmptyState icon={LayoutGrid} title={t('ovNoOrdersYet')} description={t('ovNoOrdersDesc')} />
          ) : (
            <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-sm">
              {storeOrders.slice(0, 8).map((order, i) => (
                <button
                  key={order.id}
                  onClick={() => navigate(`${base}/orders?focus=${order.id}`)}
                  className={cn(
                    'flex w-full items-center gap-3 border-b border-line/60 px-4 py-3.5 text-left transition-colors last:border-b-0 hover:bg-paper/60',
                    i % 2 === 1 && 'bg-paper/30'
                  )}
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ink/5 text-[10px] font-black text-muted">
                    #{i + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-ink">{order.customerName}</p>
                    <p className="truncate text-xs text-muted">{order.items.map((item) => item.productName).join(', ') || '—'}</p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <span className="text-sm font-black text-ink">{money(order.totalCents, store.currency)}</span>
                    <StatusBadge status={order.status} />
                  </div>
                  <span className="hidden shrink-0 text-[10px] text-muted sm:block">{timeAgo(order.createdAt)}</span>
                </button>
              ))}
            </div>
          )}
        </section>

        {/* Top products */}
        <section className="xl:col-span-2">
          <SectionHeader title={t('ovTopProducts')} sub={t('ovLast30Days')} to={`${base}/products`} toLabel={t('ovAllProducts')} />
          {insights.topProducts.length === 0 ? (
            <EmptyState icon={PackageSearch} title={t('ovNoSalesYet')} description={t('ovNoSalesDesc')} />
          ) : (
            <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-sm">
              {[...insights.topProducts].sort((a, b) => b.revenueCents - a.revenueCents || b.units - a.units).slice(0, 5).map((product, i) => (
                <div
                  key={product.product}
                  className={cn(
                    'flex items-center gap-3 border-b border-line/60 px-4 py-3.5 last:border-b-0',
                    i % 2 === 1 && 'bg-paper/30'
                  )}
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent/10 text-[11px] font-black text-accent">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-ink">{product.product}</p>
                    <p className="text-xs text-muted">
                      {product.units} {t(product.units !== 1 ? 'ovUnitsSold' : 'ovUnitSold')}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm font-black text-ink">{money(product.revenueCents, store.currency)}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* ── Store at a glance ───────────────────────────────────────── */}
      <section>
        <SectionHeader title={t('ovStoreAtGlance')} />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <GlanceCard icon={TrendingUp} label={t('ovAllTimeRevenue')} value={money(allTimeRevenue, store.currency)} />
          <GlanceCard icon={ShoppingBag} label={t('ovTotalOrders')} value={`${scopedOrders.length}`} />
          <GlanceCard icon={Users} label={t('ovUniqueCustomers')} value={`${uniqueCustomers}`} />
          <GlanceCard icon={MousePointerClick} label={t('ovConversionRate')} value={`${(insights.kpis.conversionRate * 100).toFixed(1)}%`} sub={t('ovLast30Days')} />
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="flex items-center gap-3 rounded-2xl border border-line bg-surface px-5 py-4 shadow-sm">
            <Globe className="h-5 w-5 shrink-0 text-accent" />
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted">{t('ovStorefrontUrl')}</p>
              <a href={storefrontUrl(store.slug)} target="_blank" rel="noreferrer" className="truncate text-sm font-bold text-ink hover:text-accent transition-colors">
                {storefrontUrl(store.slug).replace(/^https?:\/\//, '')}
              </a>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-2xl border border-line bg-surface px-5 py-4 shadow-sm">
            <Tag className="h-5 w-5 shrink-0 text-accent" />
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted">{t('ovCurrencyLabel')}</p>
              <p className="text-sm font-bold text-ink">{store.currency}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-2xl border border-line bg-surface px-5 py-4 shadow-sm">
            <Package className="h-5 w-5 shrink-0 text-accent" />
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted">{t('ovPlanLabel')}</p>
              <p className="text-sm font-bold text-ink capitalize">{store.plan?.toLowerCase() ?? 'Starter'} · <span className={cn('text-xs', store.planStatus === 'PAST_DUE' ? 'text-red-500' : store.planStatus === 'TRIAL' ? 'text-amber-600' : 'text-emerald-600')}>{store.planStatus?.toLowerCase()}</span></p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function KpiCard({ label, value, icon: Icon, tone }: { label: string; value: string; icon: LucideIcon; tone?: 'amber' | 'green' }) {
  return (
    <div className={cn(
      'rounded-2xl border bg-surface p-4 shadow-sm',
      tone === 'amber' ? 'border-amber-200 bg-amber-50/40' : tone === 'green' ? 'border-emerald-200 bg-emerald-50/30' : 'border-line'
    )}>
      <div className="mb-3 flex items-center gap-2">
        <Icon className={cn('h-3.5 w-3.5', tone === 'amber' ? 'text-amber-500' : tone === 'green' ? 'text-emerald-600' : 'text-muted')} />
        <span className="text-[10px] font-bold uppercase tracking-widest text-muted">{label}</span>
      </div>
      <span className="text-2xl font-black text-ink">{value}</span>
    </div>
  );
}

function GlanceCard({ icon: Icon, label, value, sub }: { icon: LucideIcon; label: string; value: string; sub?: string }) {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-line bg-surface px-5 py-4 shadow-sm">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/10">
        <Icon className="h-5 w-5 text-accent" />
      </div>
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted">{label}{sub && <span className="ml-1 normal-case">· {sub}</span>}</p>
        <p className="text-xl font-black text-ink">{value}</p>
      </div>
    </div>
  );
}

function SectionHeader({ title, sub, badge, badgeTone, to, toLabel }: { title: string; sub?: string; badge?: number; badgeTone?: 'accent' | 'muted'; to?: string; toLabel?: string }) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <h2 className="font-heading text-xl font-black tracking-tight text-ink">{title}</h2>
        {sub && <span className="text-xs text-muted">{sub}</span>}
        {badge !== undefined && (
          <span className={cn('rounded-full px-2.5 py-0.5 text-[10px] font-black', badgeTone === 'accent' ? 'bg-accent text-white' : 'bg-paper text-muted')}>
            {badge}
          </span>
        )}
      </div>
      {to && toLabel && (
        <Link to={to} className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-muted hover:text-ink">
          {toLabel} <ArrowRight className="h-3.5 w-3.5 rtl:rotate-180" />
        </Link>
      )}
    </div>
  );
}

function ActionPanel({ icon: Icon, title, count, to, viewAllLabel, children }: { icon: LucideIcon; title: string; count: number; to: string; viewAllLabel: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <span className="flex items-center gap-2 text-sm font-black text-ink">
          <Icon className="h-4 w-4 text-accent" /> {title}
          <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-black text-accent">{count}</span>
        </span>
        <Link to={to} className="text-[10px] font-bold uppercase tracking-widest text-muted hover:text-ink">{viewAllLabel}</Link>
      </div>
      <div className="divide-y divide-line/60">{children}</div>
    </div>
  );
}
