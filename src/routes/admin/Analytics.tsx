import { useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { getOwnerAnalytics, DateRangeDays } from '@/lib/analytics';
import { useStore } from '@/lib/store';
import { money } from '@/lib/format';
import { Stat } from '@/components/ui/Stat';
import { EmptyState } from '@/components/ui/EmptyState';
import { BarChart3, ClipboardList, Eye, LineChart, MousePointerClick, Wallet } from 'lucide-react';

const COLORS = ['#111827', '#D97706', '#059669', '#DC2626', '#6B7280'];

export default function Analytics() {
  const storeId = useOutletContext<string>();
  const { stores, orders, products, analyticsEvents } = useStore();
  const [range, setRange] = useState<DateRangeDays>(30);
  const store = stores.find((s) => s.id === storeId);

  const analytics = useMemo(() => {
    if (!store) return null;
    return getOwnerAnalytics(store.id, store.currency, range, orders, products, analyticsEvents);
  }, [store, range, orders, products, analyticsEvents]);

  if (!store || !analytics) return null;

  return (
    <div className="animate-fade-in flex flex-col h-full space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between border-b border-line pb-6 gap-4">
        <div>
          <h2 className="font-heading font-black text-4xl text-ink tracking-tight mb-2">Analytics</h2>
          <p className="text-muted text-lg">Sales, traffic, and conversion signals for {store.name}.</p>
        </div>
        <RangePicker value={range} onChange={setRange} />
      </div>

      {!analytics.hasData ? (
        <EmptyState icon={BarChart3} title="No analytics yet" description="Storefront visits and orders in this date range will appear here." />
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <Stat label="Revenue" value={money(analytics.kpis.revenueCents, store.currency)} icon={Wallet} />
            <Stat label="Orders" value={analytics.kpis.ordersCount} icon={ClipboardList} />
            <Stat label="Avg order value" value={money(analytics.kpis.avgOrderValueCents, store.currency)} icon={LineChart} />
            <Stat label="Conversion" value={`${(analytics.kpis.conversionRate * 100).toFixed(1)}%`} icon={MousePointerClick} />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <ChartCard title="Sales over time" subtitle="Approved and fulfilled revenue by day">
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={analytics.salesByDay}>
                  <defs>
                    <linearGradient id="salesFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#D97706" stopOpacity={0.45} />
                      <stop offset="95%" stopColor="#D97706" stopOpacity={0.04} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#E7E0D3" strokeDasharray="3 3" />
                  <XAxis dataKey="day" tick={{ fill: '#7C7367', fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#7C7367', fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={(value) => `$${Math.round(Number(value) / 100)}`} />
                  <Tooltip formatter={(value) => money(Number(value), store.currency)} contentStyle={{ borderRadius: 12, borderColor: '#E7E0D3' }} />
                  <Area type="monotone" dataKey="revenueCents" stroke="#D97706" strokeWidth={3} fill="url(#salesFill)" />
                </AreaChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Top products" subtitle="Units sold in this range">
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={analytics.topProducts} layout="vertical" margin={{ left: 12, right: 24 }}>
                  <CartesianGrid stroke="#E7E0D3" strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" tick={{ fill: '#7C7367', fontSize: 12 }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <YAxis type="category" dataKey="product" width={120} tick={{ fill: '#3F352B', fontSize: 12 }} axisLine={false} tickLine={false} />
                  <Tooltip formatter={(value, name) => [value, name === 'units' ? 'Units' : name]} contentStyle={{ borderRadius: 12, borderColor: '#E7E0D3' }} />
                  <Bar dataKey="units" fill="#111827" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Order status breakdown" subtitle="Current outcomes in this date range">
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={analytics.statusCounts.filter((entry) => entry.value > 0)} dataKey="value" nameKey="name" innerRadius={70} outerRadius={105} paddingAngle={3}>
                    {analytics.statusCounts.map((_, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 12, borderColor: '#E7E0D3' }} />
                </PieChart>
              </ResponsiveContainer>
              <Legend rows={analytics.statusCounts} />
            </ChartCard>

            <ChartCard title="Conversion funnel" subtitle="Views to completed order requests">
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={analytics.funnel}>
                  <CartesianGrid stroke="#E7E0D3" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: '#7C7367', fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#7C7367', fontSize: 12 }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={{ borderRadius: 12, borderColor: '#E7E0D3' }} />
                  <Bar dataKey="value" fill="#059669" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>
        </>
      )}
    </div>
  );
}

function RangePicker({ value, onChange }: { value: DateRangeDays; onChange: (value: DateRangeDays) => void }) {
  const ranges: DateRangeDays[] = [7, 30, 90];
  return (
    <div className="flex gap-2 bg-surface border border-line p-1 rounded-xl shadow-xs">
      {ranges.map((range) => (
        <button
          key={range}
          onClick={() => onChange(range)}
          className={`px-3 py-2 rounded-lg text-xs font-bold transition-colors ${value === range ? 'bg-ink text-surface' : 'text-muted hover:text-ink hover:bg-paper'}`}
        >
          {range}D
        </button>
      ))}
    </div>
  );
}

function ChartCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="bg-surface border border-line rounded-2xl shadow-sm p-5 md:p-6 min-w-0">
      <div className="mb-5">
        <h3 className="font-heading font-black text-2xl text-ink tracking-tight">{title}</h3>
        {subtitle && <p className="text-sm text-muted mt-1">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

function Legend({ rows }: { rows: { name: string; value: number }[] }) {
  return (
    <div className="flex flex-wrap gap-3 mt-2">
      {rows.map((row, index) => (
        <div key={row.name} className="flex items-center gap-2 text-xs font-bold text-muted uppercase tracking-widest">
          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
          {row.name} {row.value}
        </div>
      ))}
    </div>
  );
}
