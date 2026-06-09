import { useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Funnel,
  FunnelChart,
  LabelList,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { BarChart3, MousePointerClick, Receipt, ShoppingBag, Wallet } from 'lucide-react';
import { useStore } from '@/lib/store';
import { money } from '@/lib/format';
import { PlatformRange, getStoreInsights } from '@/lib/analytics';
import { Stat } from '@/components/ui/Stat';
import { EmptyState } from '@/components/ui/EmptyState';
import { CHART_COLORS, ChartCard, PageHeader, SegmentedControl } from '@/components/ui/dashboard';
import { useAdminContext } from './shared';

const axisTick = { fill: '#857C6E', fontSize: 12 };
const tooltipStyle = { borderRadius: 12, borderColor: '#E7E0D3' } as const;

export default function Analytics() {
  const { storeId, store } = useAdminContext();
  const orders = useStore((s) => s.orders);
  const products = useStore((s) => s.products);
  const events = useStore((s) => s.analyticsEvents);
  const [range, setRange] = useState<PlatformRange>(30);

  const insights = useMemo(
    () => getStoreInsights(range, storeId, store.currency, orders, products, events, store.createdAt),
    [range, storeId, store.currency, store.createdAt, orders, products, events]
  );
  const statusData = insights.statusCounts.filter((entry) => entry.value > 0);
  const fmt = (value: unknown) => money(Number(value), store.currency);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Analytics"
        subtitle={`Sales, traffic, and conversion for ${store.name}.`}
        action={
          <SegmentedControl<PlatformRange>
            value={range}
            onChange={setRange}
            options={[{ label: '7D', value: 7 }, { label: '30D', value: 30 }, { label: '90D', value: 90 }, { label: 'All', value: 'all' }]}
          />
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Revenue" value={money(insights.kpis.revenueCents, store.currency)} icon={Wallet} />
        <Stat label="Orders" value={insights.kpis.ordersCount} icon={ShoppingBag} />
        <Stat label="Avg order value" value={money(insights.kpis.avgOrderValueCents, store.currency)} icon={Receipt} />
        <Stat label="Conversion" value={`${(insights.kpis.conversionRate * 100).toFixed(1)}%`} icon={MousePointerClick} />
      </div>

      {!insights.hasData ? (
        <EmptyState icon={BarChart3} title="No analytics in this range" description="Storefront visits and orders in the selected window will appear here." />
      ) : (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <ChartCard title="Revenue over time" subtitle="Approved & fulfilled revenue">
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={insights.series}>
                <defs>
                  <linearGradient id="storeRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={CHART_COLORS[0]} stopOpacity={0.45} />
                    <stop offset="95%" stopColor={CHART_COLORS[0]} stopOpacity={0.04} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#E7E0D3" strokeDasharray="3 3" />
                <XAxis dataKey="day" tick={axisTick} axisLine={false} tickLine={false} />
                <YAxis tick={axisTick} axisLine={false} tickLine={false} tickFormatter={(v) => `$${Math.round(Number(v) / 100)}`} />
                <Tooltip formatter={fmt} contentStyle={tooltipStyle} />
                <Area type="monotone" dataKey="revenueCents" stroke={CHART_COLORS[0]} strokeWidth={3} fill="url(#storeRev)" />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Average order value" subtitle="Trend across the range">
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={insights.series}>
                <CartesianGrid stroke="#E7E0D3" strokeDasharray="3 3" />
                <XAxis dataKey="day" tick={axisTick} axisLine={false} tickLine={false} />
                <YAxis tick={axisTick} axisLine={false} tickLine={false} tickFormatter={(v) => `$${Math.round(Number(v) / 100)}`} />
                <Tooltip formatter={fmt} contentStyle={tooltipStyle} />
                <Line type="monotone" dataKey="aovCents" name="AOV" stroke={CHART_COLORS[3]} strokeWidth={3} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Top products" subtitle="Units sold in this range">
            {insights.topProducts.length === 0 ? (
              <p className="py-16 text-center text-sm text-muted">No sales yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={insights.topProducts} layout="vertical" margin={{ left: 18, right: 24 }}>
                  <CartesianGrid stroke="#E7E0D3" strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" tick={axisTick} axisLine={false} tickLine={false} allowDecimals={false} />
                  <YAxis type="category" dataKey="product" width={120} tick={{ fill: '#3F352B', fontSize: 12 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="units" name="Units" fill={CHART_COLORS[7]} radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          <ChartCard title="Order status" subtitle="Outcome distribution">
            {statusData.length === 0 ? (
              <p className="py-16 text-center text-sm text-muted">No orders yet.</p>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie data={statusData} dataKey="value" nameKey="name" innerRadius={65} outerRadius={100} paddingAngle={3}>
                      {statusData.map((entry, index) => <Cell key={entry.name} fill={CHART_COLORS[index % CHART_COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
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

          <div className="xl:col-span-2">
            <ChartCard title="Conversion funnel" subtitle="From storefront views to completed orders">
              {insights.funnel.every((step) => step.value === 0) ? (
                <p className="py-16 text-center text-sm text-muted">No customer events captured in this range.</p>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <FunnelChart>
                    <Tooltip contentStyle={tooltipStyle} />
                    <Funnel dataKey="value" data={insights.funnel} isAnimationActive>
                      <LabelList position="right" fill="#3F352B" stroke="none" dataKey="name" className="text-xs font-bold" />
                      <LabelList position="left" fill="#857C6E" stroke="none" dataKey="value" />
                      {insights.funnel.map((entry, index) => <Cell key={entry.name} fill={CHART_COLORS[index % CHART_COLORS.length]} />)}
                    </Funnel>
                  </FunnelChart>
                </ResponsiveContainer>
              )}
            </ChartCard>
          </div>
        </div>
      )}
    </div>
  );
}
