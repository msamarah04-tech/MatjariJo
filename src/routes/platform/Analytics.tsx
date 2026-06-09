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
import { Landmark } from 'lucide-react';
import { useStore } from '@/lib/store';
import { money } from '@/lib/format';
import { PlatformRange, getPlatformInsights } from '@/lib/analytics';
import { EmptyState } from '@/components/ui/EmptyState';
import { Stat } from '@/components/ui/Stat';
import { Wallet, DollarSign, ShoppingBag, Store as StoreIcon } from 'lucide-react';
import { CHART_COLORS, ChartCard, PageHeader, SegmentedControl } from './shared';

const axisTick = { fill: '#857C6E', fontSize: 12 };
const tooltipStyle = { borderRadius: 12, borderColor: '#E7E0D3' } as const;

export default function Analytics() {
  const stores = useStore((s) => s.stores);
  const orders = useStore((s) => s.orders);
  const events = useStore((s) => s.analyticsEvents);
  const settings = useStore((s) => s.platformSettings);
  const [range, setRange] = useState<PlatformRange>(30);

  const insights = useMemo(() => getPlatformInsights(range, stores, orders, events, settings), [range, stores, orders, events, settings]);
  const statusData = insights.statusCounts.filter((entry) => entry.value > 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Analytics"
        subtitle="Marketplace performance across every store — GMV, commission, conversion, and mix."
        action={
          <SegmentedControl<PlatformRange>
            value={range}
            onChange={setRange}
            options={[
              { label: '7D', value: 7 },
              { label: '30D', value: 30 },
              { label: '90D', value: 90 },
              { label: 'All', value: 'all' },
            ]}
          />
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="GMV" value={money(insights.kpis.totalGmvCents)} icon={Wallet} />
        <Stat label="Commission earned" value={money(insights.kpis.commissionCents)} icon={DollarSign} />
        <Stat label="Orders" value={insights.kpis.totalOrders} icon={ShoppingBag} />
        <Stat label="Active stores" value={insights.kpis.activeStores} icon={StoreIcon} />
      </div>

      {!insights.hasData ? (
        <EmptyState icon={Landmark} title="No analytics in this range" description="Orders, events, and new stores in the selected window will appear here." />
      ) : (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <ChartCard title="GMV over time" subtitle="Approved & fulfilled order value">
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={insights.series}>
                <defs>
                  <linearGradient id="aGmv" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={CHART_COLORS[0]} stopOpacity={0.45} />
                    <stop offset="95%" stopColor={CHART_COLORS[0]} stopOpacity={0.04} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#E7E0D3" strokeDasharray="3 3" />
                <XAxis dataKey="day" tick={axisTick} axisLine={false} tickLine={false} />
                <YAxis tick={axisTick} axisLine={false} tickLine={false} tickFormatter={(value) => `$${Math.round(Number(value) / 100)}`} />
                <Tooltip formatter={(value) => money(Number(value))} contentStyle={tooltipStyle} />
                <Area type="monotone" dataKey="gmvCents" stroke={CHART_COLORS[0]} strokeWidth={3} fill="url(#aGmv)" />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Revenue vs commission" subtitle="Store revenue against platform commission">
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={insights.series}>
                <CartesianGrid stroke="#E7E0D3" strokeDasharray="3 3" />
                <XAxis dataKey="day" tick={axisTick} axisLine={false} tickLine={false} />
                <YAxis tick={axisTick} axisLine={false} tickLine={false} tickFormatter={(value) => `$${Math.round(Number(value) / 100)}`} />
                <Tooltip formatter={(value) => money(Number(value))} contentStyle={tooltipStyle} />
                <Line type="monotone" dataKey="gmvCents" name="GMV" stroke={CHART_COLORS[0]} strokeWidth={3} dot={false} />
                <Line type="monotone" dataKey="commissionCents" name="Commission" stroke={CHART_COLORS[1]} strokeWidth={3} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Top stores by GMV" subtitle="Highest grossing stores in range">
            {insights.ordersByStore.length === 0 ? (
              <p className="py-16 text-center text-sm text-muted">No store revenue yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={insights.ordersByStore} layout="vertical" margin={{ left: 18, right: 24 }}>
                  <CartesianGrid stroke="#E7E0D3" strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" tick={axisTick} axisLine={false} tickLine={false} tickFormatter={(value) => `$${Math.round(Number(value) / 100)}`} />
                  <YAxis type="category" dataKey="store" width={120} tick={{ fill: '#3F352B', fontSize: 12 }} axisLine={false} tickLine={false} />
                  <Tooltip formatter={(value) => money(Number(value))} contentStyle={tooltipStyle} />
                  <Bar dataKey="gmvCents" name="GMV" fill={CHART_COLORS[7]} radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          <ChartCard title="New stores over time" subtitle="Store launches in range">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={insights.series}>
                <CartesianGrid stroke="#E7E0D3" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="day" tick={axisTick} axisLine={false} tickLine={false} />
                <YAxis tick={axisTick} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="stores" name="New stores" fill={CHART_COLORS[1]} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
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

          <ChartCard title="Category mix" subtitle="GMV share by store category">
            {insights.categoryBreakdown.length === 0 ? (
              <p className="py-16 text-center text-sm text-muted">No category revenue yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={insights.categoryBreakdown} layout="vertical" margin={{ left: 18, right: 24 }}>
                  <CartesianGrid stroke="#E7E0D3" strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" tick={axisTick} axisLine={false} tickLine={false} tickFormatter={(value) => `$${Math.round(Number(value) / 100)}`} />
                  <YAxis type="category" dataKey="name" width={110} tick={{ fill: '#3F352B', fontSize: 12 }} axisLine={false} tickLine={false} />
                  <Tooltip formatter={(value) => money(Number(value))} contentStyle={tooltipStyle} />
                  <Bar dataKey="gmvCents" name="GMV" radius={[0, 6, 6, 0]}>
                    {insights.categoryBreakdown.map((entry, index) => <Cell key={entry.name} fill={CHART_COLORS[index % CHART_COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          <div className="xl:col-span-2">
            <ChartCard title="Conversion funnel" subtitle="Cross-store journey from views to orders">
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
