import { useMemo, useState } from 'react';
import { Navigate, NavLink, Route, Routes } from 'react-router-dom';
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
import { AppTopBar } from '@/components/layout/AppTopBar';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/Badge';
import { Stat } from '@/components/ui/Stat';
import { toast } from '@/components/ui/Toast';
import { ShopApprovalSetup, useStore } from '@/lib/store';
import { money, timeAgo } from '@/lib/format';
import { DateRangeDays, getPlatformAnalytics } from '@/lib/analytics';
import { THEMES } from '@/lib/themes';
import { ShippingType } from '@/lib/types';
import { AlertTriangle, CheckCircle2, ClipboardList, Clock, DollarSign, ExternalLink, FileText, Landmark, MessageSquare, Search, Settings, ShieldCheck, Store as StoreIcon, UserCog, Wallet, XCircle } from 'lucide-react';

const COLORS = ['#D97706', '#059669', '#DC2626', '#111827'];

type RequestSetupState = {
  logoEmoji: string;
  themeId: string;
  announcement: string;
  about: string;
  shippingType: ShippingType;
  flatCents: string;
  freeOverCents: string;
  productsText: string;
  confirmed: boolean;
};

const defaultRequestSetup = (): RequestSetupState => ({
  logoEmoji: '',
  themeId: 'mono',
  announcement: '',
  about: '',
  shippingType: 'FLAT',
  flatCents: '',
  freeOverCents: '',
  productsText: '',
  confirmed: false,
});

const parseCents = (value: string) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
};

const parseStarterProducts = (productsText: string): ShopApprovalSetup['products'] => productsText
  .split('\n')
  .map((line) => line.trim())
  .filter(Boolean)
  .map((line, index) => {
    const [name = '', price = '', collection = 'Launch', imageEmoji = '🛍️', description = 'Prepared by the website team for the standard storefront template.'] = line.split('|').map((part) => part.trim());
    if (!name) return null;
    return {
      name,
      priceCents: parseCents(price),
      collection: collection || 'Launch',
      imageEmoji: imageEmoji || '🛍️',
      description,
      stock: 24,
      isActive: true,
      isFeatured: index < 2,
    };
  })
  .filter(Boolean) as ShopApprovalSetup['products'];

export default function Platform() {
  return (
    <div className="min-h-screen flex flex-col bg-paper">
      <AppTopBar />
      <main className="flex-1 p-8 md:p-12">
        <div className="max-w-6xl mx-auto animate-fade-in">
          <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-line pb-6">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-muted mb-3">Website Owner Workspace</p>
              <h1 className="font-heading font-black text-6xl tracking-tight leading-[0.9] text-ink">Platform Control</h1>
              <p className="text-muted mt-4 text-lg max-w-xl">Control the website: review customer order requests, oversee all shop-owner stores, and monitor marketplace performance.</p>
            </div>
            <nav className="flex max-w-full flex-wrap gap-2 bg-surface border border-line p-1 rounded-xl shadow-xs">
              {[
                ['Analytics', '/platform/analytics'],
                ['Website Requests', '/platform/shop-requests'],
                ['Stores', '/platform/stores'],
                ['Requests', '/platform/requests'],
                ['Governance', '/platform/governance'],
                ['Finance', '/platform/finance'],
                ['Owners', '/platform/owners'],
                ['Moderation', '/platform/moderation'],
                ['Support', '/platform/support'],
                ['Settings', '/platform/settings'],
                ['Audit', '/platform/audit'],
              ].map(([label, to]) => (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) => `px-3 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-colors ${isActive ? 'bg-ink text-surface' : 'text-muted hover:text-ink hover:bg-paper'}`}
                >
                  {label}
                </NavLink>
              ))}
            </nav>
          </div>

          <Routes>
            <Route path="/" element={<Navigate to="/platform/analytics" replace />} />
            <Route path="/analytics" element={<PlatformAnalytics />} />
            <Route path="/shop-requests" element={<PlatformShopRequests />} />
            <Route path="/stores" element={<PlatformStores />} />
            <Route path="/requests" element={<PlatformRequests />} />
            <Route path="/governance" element={<PlatformGovernance />} />
            <Route path="/finance" element={<PlatformFinance />} />
            <Route path="/owners" element={<PlatformOwners />} />
            <Route path="/moderation" element={<PlatformModeration />} />
            <Route path="/support" element={<PlatformSupport />} />
            <Route path="/settings" element={<PlatformSettings />} />
            <Route path="/audit" element={<PlatformAudit />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}

function PlatformStores() {
  const { stores, orders, products, setStoreStatus } = useStore();
  const [query, setQuery] = useState('');
  const filteredStores = stores
    .filter((store) => `${store.name} ${store.slug} ${store.category}`.toLowerCase().includes(query.trim().toLowerCase()))
    .sort((a, b) => b.createdAt - a.createdAt);

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Stores"
        subtitle="Browse every shop-owner store on the website and manage availability."
        className="mb-2 pb-0"
        rightSlot={
          <label className="relative block w-full md:w-80">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search stores"
              className="w-full h-10 rounded-xl border border-line bg-surface pl-9 pr-3 text-sm font-semibold text-ink focus:outline-none focus:ring-1 focus:ring-accent"
            />
          </label>
        }
      />

      {filteredStores.length === 0 ? (
        <EmptyState icon={StoreIcon} title="No stores found" description="Try a different store name, slug, or category." />
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {filteredStores.map((store) => {
            const storeOrders = orders.filter((order) => order.storeId === store.id);
            const revenueCents = storeOrders
              .filter((order) => order.status === 'APPROVED' || order.status === 'FULFILLED')
              .reduce((sum, order) => sum + order.totalCents, 0);
            const pendingCount = storeOrders.filter((order) => order.status === 'PENDING').length;
            const productCount = products.filter((product) => product.storeId === store.id).length;

            return (
              <div key={store.id} className="bg-surface border border-line rounded-2xl p-5 shadow-sm flex flex-col gap-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-12 h-12 rounded-xl bg-paper border border-line flex items-center justify-center text-2xl overflow-hidden shrink-0">
                      {store.logoUrl ? <img src={store.logoUrl} alt={store.name} className="w-full h-full object-cover" /> : store.logoEmoji || '🛍️'}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-heading font-black text-2xl text-ink tracking-tight truncate">{store.name}</h3>
                      <p className="text-sm text-muted truncate">/{store.slug} · {store.category}</p>
                    </div>
                  </div>
                  <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-full border ${store.status === 'ACTIVE' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                    {store.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <MiniMetric label="Revenue" value={money(revenueCents, store.currency)} />
                  <MiniMetric label="Orders" value={storeOrders.length} />
                  <MiniMetric label="Pending" value={pendingCount} />
                  <MiniMetric label="Products" value={productCount} />
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-line">
                  <div className="text-xs text-muted font-bold uppercase tracking-widest">
                    Theme {store.themeId} · Created {new Date(store.createdAt).toLocaleDateString()}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="border border-line gap-2"
                      onClick={() => window.open(`/#/s/${store.slug}`, '_blank')}
                    >
                      <ExternalLink className="w-4 h-4" /> Store
                    </Button>
                    <Button
                      size="sm"
                      variant={store.status === 'ACTIVE' ? 'ghost' : 'accent'}
                      className={store.status === 'ACTIVE' ? 'border border-line text-red-600' : ''}
                      onClick={() => setStoreStatus(store.id, store.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE')}
                    >
                      {store.status === 'ACTIVE' ? 'Suspend' : 'Activate'}
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function PlatformShopRequests() {
  const { shopRequests, approveShopRequest, updateShopRequestStatus, stores, products } = useStore();
  const [setups, setSetups] = useState<Record<string, RequestSetupState>>({});
  const sortedRequests = [...shopRequests].sort((a, b) => b.createdAt - a.createdAt);
  const updateSetup = (requestId: string, patch: Partial<RequestSetupState>) => {
    setSetups((current) => ({
      ...current,
      [requestId]: { ...(current[requestId] || defaultRequestSetup()), ...patch },
    }));
  };

  return (
    <div className="space-y-6">
      <SectionHeader title="Website Requests" subtitle="Requests from people who need a commerce website. Your team reviews the customer needs, fills the standard website template, then creates the store for Admin." className="mb-2 pb-0" />
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Stat label="Pending" value={shopRequests.filter((request) => request.status === 'PENDING').length} icon={Clock} />
        <Stat label="In review" value={shopRequests.filter((request) => request.status === 'IN_REVIEW').length} icon={ClipboardList} />
        <Stat label="Approved" value={shopRequests.filter((request) => request.status === 'APPROVED').length} icon={CheckCircle2} />
        <Stat label="Rejected" value={shopRequests.filter((request) => request.status === 'REJECTED').length} icon={XCircle} />
      </div>

      {sortedRequests.length === 0 ? (
        <EmptyState icon={ClipboardList} title="No website requests yet" description="Requests submitted from the public website request form will appear here." />
      ) : (
        <div className="space-y-4">
          {sortedRequests.map((request) => {
            const createdStore = request.storeId ? stores.find((store) => store.id === request.storeId) : undefined;
            const createdProducts = createdStore ? products.filter((product) => product.storeId === createdStore.id) : [];
            const setup = setups[request.id] || defaultRequestSetup();
            const setupComplete = request.status === 'IN_REVIEW'
              && setup.confirmed
              && setup.logoEmoji.trim().length > 0
              && setup.about.trim().length >= 20
              && (setup.shippingType === 'PICKUP' || setup.flatCents.trim().length > 0)
              && (setup.shippingType !== 'FREE_OVER' || setup.freeOverCents.trim().length > 0);
            const shipping: ShopApprovalSetup['shipping'] = setup.shippingType === 'FREE_OVER'
              ? { type: 'FREE_OVER', flatCents: parseCents(setup.flatCents), freeOverCents: parseCents(setup.freeOverCents) }
              : setup.shippingType === 'PICKUP'
                ? { type: 'PICKUP' }
                : { type: 'FLAT', flatCents: parseCents(setup.flatCents) };
            return (
              <div key={request.id} className="bg-surface border border-line rounded-2xl p-5 grid grid-cols-1 xl:grid-cols-[1fr_1.2fr_180px] gap-5">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <h3 className="font-heading font-black text-2xl text-ink">{request.storeName}</h3>
                    <StatusPill label={request.status} tone={request.status === 'APPROVED' ? 'green' : request.status === 'REJECTED' ? 'red' : 'amber'} />
                  </div>
                  <p className="text-sm font-semibold text-muted">{request.ownerName} · {request.ownerEmail}</p>
                  <p className="text-sm font-semibold text-muted mt-1">{request.category} · {request.tagline}</p>
                  {request.notes && <p className="mt-3 rounded-xl bg-paper border border-line p-3 text-sm text-muted">{request.notes}</p>}
                  {createdStore && (
                    <div className="mt-3 rounded-xl border border-green-200 bg-green-50 p-3">
                      <p className="text-sm font-bold text-green-800">
                        Standard storefront created: {createdStore.name} /{createdStore.slug}
                      </p>
                      <p className="mt-1 text-xs font-semibold text-green-700">
                        {createdStore.themeId} theme · {createdProducts.length} team-added products
                      </p>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="mt-3 border border-green-200 bg-white/70 text-green-800"
                        onClick={() => window.open(`/#/s/${createdStore.slug}`, '_blank')}
                      >
                        Open storefront
                      </Button>
                    </div>
                  )}
                </div>

                <div className={request.status === 'APPROVED' ? 'hidden' : 'rounded-2xl border border-line bg-paper p-4'}>
                  <div className="mb-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted">Standard website setup</p>
                    <p className="mt-1 text-sm font-semibold text-muted">Start review, then manually fill this template. Nothing is created from defaults.</p>
                  </div>
                  {request.status === 'PENDING' && (
                    <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm font-bold text-amber-800">
                      Move this request into review before creating a website.
                    </div>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <label className="block">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-muted">Logo emoji required</span>
                      <input value={setup.logoEmoji} onChange={(event) => updateSetup(request.id, { logoEmoji: event.target.value, confirmed: false })} placeholder="Team chooses" className="mt-1 w-full h-10 rounded-xl border border-line bg-surface px-3 text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-accent" />
                    </label>
                    <label className="block">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-muted">Theme</span>
                      <select value={setup.themeId} onChange={(event) => updateSetup(request.id, { themeId: event.target.value, confirmed: false })} className="mt-1 w-full h-10 rounded-xl border border-line bg-surface px-3 text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-accent">
                        {THEMES.map((theme) => <option key={theme.id} value={theme.id}>{theme.name}</option>)}
                      </select>
                    </label>
                    <label className="block md:col-span-2">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-muted">Announcement</span>
                      <input value={setup.announcement} onChange={(event) => updateSetup(request.id, { announcement: event.target.value, confirmed: false })} placeholder="Optional top bar text" className="mt-1 w-full h-10 rounded-xl border border-line bg-surface px-3 text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-accent" />
                    </label>
                    <label className="block md:col-span-2">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-muted">About / policies required</span>
                      <textarea value={setup.about} onChange={(event) => updateSetup(request.id, { about: event.target.value, confirmed: false })} rows={4} placeholder="Team writes the website copy after reviewing the request" className="mt-1 w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-accent" />
                    </label>
                    <label className="block">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-muted">Shipping</span>
                      <select value={setup.shippingType} onChange={(event) => updateSetup(request.id, { shippingType: event.target.value as ShippingType, confirmed: false })} className="mt-1 w-full h-10 rounded-xl border border-line bg-surface px-3 text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-accent">
                        <option value="FLAT">Flat</option>
                        <option value="FREE_OVER">Free over</option>
                        <option value="PICKUP">Pickup</option>
                      </select>
                    </label>
                    {setup.shippingType !== 'PICKUP' && (
                      <label className="block">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-muted">Flat cents required</span>
                        <input value={setup.flatCents} onChange={(event) => updateSetup(request.id, { flatCents: event.target.value, confirmed: false })} inputMode="numeric" placeholder="e.g. 500" className="mt-1 w-full h-10 rounded-xl border border-line bg-surface px-3 text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-accent" />
                      </label>
                    )}
                    {setup.shippingType === 'FREE_OVER' && (
                      <label className="block md:col-span-2">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-muted">Free over cents required</span>
                        <input value={setup.freeOverCents} onChange={(event) => updateSetup(request.id, { freeOverCents: event.target.value, confirmed: false })} inputMode="numeric" placeholder="e.g. 7500" className="mt-1 w-full h-10 rounded-xl border border-line bg-surface px-3 text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-accent" />
                      </label>
                    )}
                    <label className="block md:col-span-2">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-muted">Starter products</span>
                      <textarea
                        value={setup.productsText}
                        onChange={(event) => updateSetup(request.id, { productsText: event.target.value, confirmed: false })}
                        rows={4}
                        placeholder="One per line: Name | price cents | collection | emoji | description"
                        className="mt-1 w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-accent"
                      />
                    </label>
                    <label className="md:col-span-2 flex items-start gap-3 rounded-xl border border-line bg-surface p-3">
                      <input
                        type="checkbox"
                        checked={setup.confirmed}
                        onChange={(event) => updateSetup(request.id, { confirmed: event.target.checked })}
                        disabled={request.status !== 'IN_REVIEW'}
                        className="mt-1 h-4 w-4"
                      />
                      <span className="text-sm font-bold text-ink">
                        My team reviewed the customer request and manually completed this website setup.
                      </span>
                    </label>
                  </div>
                </div>

                <div className="flex flex-wrap xl:flex-col gap-2 xl:w-44">
                  <Button size="sm" variant="ghost" className="border border-line" onClick={() => updateShopRequestStatus(request.id, 'IN_REVIEW')} disabled={request.status === 'APPROVED'}>In review</Button>
                  <Button
                    size="sm"
                    variant="accent"
                    onClick={() => {
                      const storeId = approveShopRequest(request.id, {
                        logoEmoji: setup.logoEmoji,
                        themeId: setup.themeId,
                        announcement: setup.announcement,
                        about: setup.about,
                        shipping,
                        products: parseStarterProducts(setup.productsText),
                      });
                      if (storeId) toast({ title: 'Shop created', description: 'The shop owner can now manage it in Admin.', type: 'success' });
                    }}
                    disabled={!setupComplete}
                  >
                    Create website
                  </Button>
                  <Button size="sm" variant="ghost" className="border border-line text-red-600" onClick={() => updateShopRequestStatus(request.id, 'REJECTED')} disabled={request.status === 'APPROVED'}>Reject</Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function PlatformAnalytics() {
  const { stores, orders } = useStore();
  const [range, setRange] = useState<DateRangeDays>(30);
  const analytics = useMemo(() => getPlatformAnalytics(range, stores, orders), [range, stores, orders]);

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Analytics"
        subtitle="Track website GMV, shop activity, and platform-level order outcomes."
        rightSlot={<RangePicker value={range} onChange={setRange} />}
        className="mb-2 pb-0"
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <Stat label="Total GMV" value={money(analytics.kpis.totalGmvCents)} icon={Wallet} />
        <Stat label="Total orders" value={analytics.kpis.totalOrders} icon={ClipboardList} />
        <Stat label="Pending approvals" value={analytics.kpis.pendingApprovals} icon={Clock} className={analytics.kpis.pendingApprovals > 0 ? 'border-amber-200 bg-amber-50/30' : ''} />
        <Stat label="Active stores" value={analytics.kpis.activeStores} icon={StoreIcon} />
      </div>

              {!analytics.hasData ? (
                <EmptyState icon={Landmark} title="No platform analytics yet" description="Orders and new stores in this range will appear here." />
              ) : (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                  <ChartCard title="GMV over time" subtitle="Approved and fulfilled order value by day">
                    <ResponsiveContainer width="100%" height={280}>
                      <AreaChart data={analytics.gmvByDay}>
                        <defs>
                          <linearGradient id="platformGmvFill" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#D97706" stopOpacity={0.45} />
                            <stop offset="95%" stopColor="#D97706" stopOpacity={0.04} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid stroke="#E7E0D3" strokeDasharray="3 3" />
                        <XAxis dataKey="day" tick={{ fill: '#7C7367', fontSize: 12 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: '#7C7367', fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={(value) => `$${Math.round(Number(value) / 100)}`} />
                        <Tooltip formatter={(value) => money(Number(value))} contentStyle={{ borderRadius: 12, borderColor: '#E7E0D3' }} />
                        <Area type="monotone" dataKey="gmvCents" stroke="#D97706" strokeWidth={3} fill="url(#platformGmvFill)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </ChartCard>

                  <ChartCard title="Orders by store" subtitle="Top stores by order volume">
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart data={analytics.ordersByStore} layout="vertical" margin={{ left: 18, right: 24 }}>
                        <CartesianGrid stroke="#E7E0D3" strokeDasharray="3 3" horizontal={false} />
                        <XAxis type="number" tick={{ fill: '#7C7367', fontSize: 12 }} axisLine={false} tickLine={false} allowDecimals={false} />
                        <YAxis type="category" dataKey="store" width={130} tick={{ fill: '#3F352B', fontSize: 12 }} axisLine={false} tickLine={false} />
                        <Tooltip contentStyle={{ borderRadius: 12, borderColor: '#E7E0D3' }} />
                        <Bar dataKey="orders" fill="#111827" radius={[0, 6, 6, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartCard>

                  <ChartCard title="New stores over time" subtitle="Store launches by day">
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart data={analytics.newStoresByDay}>
                        <CartesianGrid stroke="#E7E0D3" strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="day" tick={{ fill: '#7C7367', fontSize: 12 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: '#7C7367', fontSize: 12 }} axisLine={false} tickLine={false} allowDecimals={false} />
                        <Tooltip contentStyle={{ borderRadius: 12, borderColor: '#E7E0D3' }} />
                        <Bar dataKey="stores" fill="#059669" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartCard>

                  <ChartCard title="Pending vs approved vs declined" subtitle="Order outcomes in this range">
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
                </div>
              )}
    </div>
  );
}

function PlatformRequests() {
  const { stores, orders, approveOrder, rejectOrder } = useStore();
  const pendingOrders = orders.filter((order) => order.status === 'PENDING').sort((a, b) => b.createdAt - a.createdAt);
  const getStore = (storeId: string) => stores.find((store) => store.id === storeId);

  return (
    <div>
      <SectionHeader
        title="Requests"
        subtitle="Review pending customer orders before shop owners fulfill them."
        className="mb-2 pb-0"
      />
            {pendingOrders.length === 0 ? (
              <EmptyState
                icon={ClipboardList}
                title="No pending requests"
                description="New checkout requests will appear here for approval."
              />
            ) : (
              <div className="space-y-4">
                {pendingOrders.map((order) => {
                  const store = getStore(order.storeId);
                  const currency = store?.currency || 'USD';
                  return (
                    <div key={order.id} className="bg-surface border border-line p-5 rounded-2xl flex flex-col lg:flex-row justify-between gap-5 transition-all hover:shadow-sm">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-3 mb-3">
                          <span className="font-bold text-ink">{store?.name || 'Unknown store'}</span>
                          <span className="text-sm text-muted">{order.customerName} · {order.customerEmail}</span>
                          <span className="text-[10px] font-bold uppercase tracking-widest opacity-40">• {timeAgo(order.createdAt)}</span>
                          <StatusBadge status={order.status} />
                        </div>

                        <div className="text-sm text-muted bg-paper p-3 rounded-lg border border-line/50">
                          <ul className="space-y-1">
                            {order.items.map((item, idx) => (
                              <li key={idx} className="flex justify-between font-medium gap-4">
                                <span><span className="text-ink/60">{item.quantity}x</span> {item.productName}</span>
                                <span>{money(item.priceCents * item.quantity, currency)}</span>
                              </li>
                            ))}
                          </ul>
                          <div className="mt-3 pt-3 border-t border-line border-dashed space-y-1 font-bold">
                            <SummaryLine label="Subtotal" value={money(order.subtotalCents, currency)} />
                            {(order.discountCents || order.discountCode) && (
                              <SummaryLine label={`Discount${order.discountCode ? ` (${order.discountCode})` : ''}`} value={order.discountCents ? `-${money(order.discountCents, currency)}` : 'Free shipping'} />
                            )}
                            <SummaryLine label="Shipping" value={order.shippingCents ? money(order.shippingCents, currency) : 'Free'} />
                            <SummaryLine label="Total" value={money(order.totalCents, currency)} strong />
                          </div>
                          {order.note && (
                            <div className="mt-3 pt-3 border-t border-line/60">
                              <p className="text-[10px] font-bold uppercase tracking-widest text-muted mb-1">Customer note</p>
                              <p className="text-sm text-ink/80">{order.note}</p>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex lg:flex-col gap-2 shrink-0 lg:w-40">
                        <Button
                          size="sm"
                          variant="accent"
                          className="font-bold gap-2 flex-1 lg:flex-none"
                          onClick={() => {
                            approveOrder(order.id);
                            toast({ title: 'Order approved', type: 'success' });
                          }}
                        >
                          <CheckCircle2 className="w-4 h-4" /> Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="font-bold gap-2 border border-line flex-1 lg:flex-none"
                          onClick={() => {
                            rejectOrder(order.id);
                            toast({ title: 'Order rejected' });
                          }}
                        >
                          <XCircle className="w-4 h-4 text-red-600" /> Reject
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
    </div>
  );
}

function PlatformGovernance() {
  const { stores, reviewStore, suspendStore, setStoreStatus } = useStore();
  const pending = stores.filter((store) => store.reviewStatus === 'PENDING_REVIEW');

  return (
    <div className="space-y-6">
      <SectionHeader title="Governance" subtitle="Approve new shops, enforce policy status, and document review decisions." className="mb-2 pb-0" />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Stat label="Pending review" value={pending.length} icon={ShieldCheck} />
        <Stat label="Needs changes" value={stores.filter((store) => store.reviewStatus === 'NEEDS_CHANGES').length} icon={AlertTriangle} />
        <Stat label="Suspended" value={stores.filter((store) => store.status === 'SUSPENDED').length} icon={XCircle} />
      </div>
      <div className="space-y-3">
        {stores.map((store) => (
          <div key={store.id} className="bg-surface border border-line rounded-2xl p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <h3 className="font-heading font-black text-2xl text-ink">{store.name}</h3>
                <StatusPill label={store.reviewStatus || 'APPROVED'} tone={store.reviewStatus === 'APPROVED' ? 'green' : store.reviewStatus === 'NEEDS_CHANGES' ? 'amber' : 'red'} />
                <StatusPill label={store.status} tone={store.status === 'ACTIVE' ? 'green' : 'red'} />
              </div>
              <p className="text-sm text-muted font-semibold">{store.category} · /{store.slug}</p>
              {(store.suspensionReason || store.internalNote) && (
                <p className="text-sm text-muted mt-2">{store.suspensionReason || store.internalNote}</p>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="accent" onClick={() => reviewStore(store.id, 'APPROVED', 'Approved by website owner')}>Approve</Button>
              <Button size="sm" variant="ghost" className="border border-line" onClick={() => reviewStore(store.id, 'NEEDS_CHANGES', 'Needs policy or quality changes')}>Needs changes</Button>
              <Button size="sm" variant="ghost" className="border border-line text-red-600" onClick={() => suspendStore(store.id, 'Suspended by website owner review')}>Suspend</Button>
              {store.status === 'SUSPENDED' && <Button size="sm" variant="soft" onClick={() => setStoreStatus(store.id, 'ACTIVE')}>Reactivate</Button>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PlatformFinance() {
  const { stores, orders, platformSettings } = useStore();
  const approvedOrders = orders.filter((order) => order.status === 'APPROVED' || order.status === 'FULFILLED');
  const gmv = approvedOrders.reduce((sum, order) => sum + order.totalCents, 0);
  const fees = Math.round(gmv * (platformSettings.commissionRateBps / 10000));

  return (
    <div className="space-y-6">
      <SectionHeader title="Finance" subtitle="Estimate platform fees, store payouts, and revenue exposure." className="mb-2 pb-0" />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Stat label="GMV" value={money(gmv)} icon={Wallet} />
        <Stat label="Platform fees" value={money(fees)} icon={DollarSign} />
        <Stat label="Take rate" value={`${(platformSettings.commissionRateBps / 100).toFixed(2)}%`} icon={Landmark} />
      </div>
      <div className="bg-surface border border-line rounded-2xl overflow-hidden">
        {stores.map((store) => {
          const storeOrders = approvedOrders.filter((order) => order.storeId === store.id);
          const storeGmv = storeOrders.reduce((sum, order) => sum + order.totalCents, 0);
          const storeFee = Math.round(storeGmv * (platformSettings.commissionRateBps / 10000));
          return (
            <div key={store.id} className="p-5 border-b border-line last:border-b-0 grid grid-cols-1 md:grid-cols-4 gap-3 items-center">
              <div>
                <div className="font-black text-ink">{store.name}</div>
                <div className="text-xs font-bold text-muted">{storeOrders.length} approved/fulfilled orders</div>
              </div>
              <MiniMetric label="GMV" value={money(storeGmv, store.currency)} />
              <MiniMetric label="Platform fee" value={money(storeFee, store.currency)} />
              <MiniMetric label="Est. payout" value={money(storeGmv - storeFee, store.currency)} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PlatformOwners() {
  const { stores, ownerStatuses, setOwnerStatus } = useStore();
  const ownerIds = Array.from(new Set(stores.map((store) => store.ownerId)));

  return (
    <div className="space-y-6">
      <SectionHeader title="Shop Owners" subtitle="Review shop owner accounts, restrictions, and store ownership." className="mb-2 pb-0" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {ownerIds.map((ownerId) => {
          const ownerStores = stores.filter((store) => store.ownerId === ownerId);
          const status = ownerStatuses[ownerId] || 'ACTIVE';
          return (
            <div key={ownerId} className="bg-surface border border-line rounded-2xl p-5">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <h3 className="font-heading font-black text-2xl text-ink">{ownerId === 'user-shop-1' ? 'Demo Merchant' : ownerId}</h3>
                  <p className="text-sm font-semibold text-muted">{ownerStores.length} stores owned</p>
                </div>
                <StatusPill label={status} tone={status === 'ACTIVE' ? 'green' : status === 'RESTRICTED' ? 'amber' : 'red'} />
              </div>
              <div className="space-y-2 mb-5">
                {ownerStores.map((store) => (
                  <div key={store.id} className="flex items-center justify-between rounded-xl bg-paper border border-line p-3 text-sm">
                    <span className="font-bold">{store.name}</span>
                    <span className="text-muted font-semibold">{store.status}</span>
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="accent" onClick={() => setOwnerStatus(ownerId, 'ACTIVE')}>Active</Button>
                <Button size="sm" variant="ghost" className="border border-line" onClick={() => setOwnerStatus(ownerId, 'RESTRICTED')}>Restrict</Button>
                <Button size="sm" variant="ghost" className="border border-line text-red-600" onClick={() => setOwnerStatus(ownerId, 'BANNED')}>Ban</Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PlatformModeration() {
  const { stores, products, productFlags, addProductFlag, resolveProductFlag, updateProduct } = useStore();
  const flaggedProductIds = new Set(productFlags.filter((flag) => flag.status === 'OPEN').map((flag) => flag.productId));

  return (
    <div className="space-y-6">
      <SectionHeader title="Moderation" subtitle="Review products, hide suspicious items, and resolve moderation flags." className="mb-2 pb-0" />
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {products.map((product) => {
          const store = stores.find((s) => s.id === product.storeId);
          const isFlagged = flaggedProductIds.has(product.id);
          return (
            <div key={product.id} className="bg-surface border border-line rounded-2xl p-5 flex gap-4">
              <div className="w-16 h-16 rounded-xl bg-paper border border-line flex items-center justify-center text-3xl shrink-0 overflow-hidden">
                {product.imageUrl ? <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" /> : product.imageEmoji || '🛍️'}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <h3 className="font-black text-ink">{product.name}</h3>
                  {isFlagged && <StatusPill label="FLAGGED" tone="amber" />}
                  {!product.isActive && <StatusPill label="HIDDEN" tone="red" />}
                </div>
                <p className="text-sm text-muted font-semibold mb-3">{store?.name || 'Unknown store'} · {product.collection || 'No collection'}</p>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="ghost" className="border border-line" onClick={() => addProductFlag({ productId: product.id, storeId: product.storeId, reason: 'Manual website owner review' })}>Flag</Button>
                  <Button size="sm" variant={product.isActive ? 'ghost' : 'accent'} className={product.isActive ? 'border border-line text-red-600' : ''} onClick={() => updateProduct(product.id, { isActive: !product.isActive })}>
                    {product.isActive ? 'Hide' : 'Show'}
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="bg-surface border border-line rounded-2xl p-5">
        <h3 className="font-heading font-black text-2xl mb-4">Open flags</h3>
        {productFlags.filter((flag) => flag.status === 'OPEN').length === 0 ? (
          <p className="text-sm font-semibold text-muted">No open moderation flags.</p>
        ) : (
          <div className="space-y-2">
            {productFlags.filter((flag) => flag.status === 'OPEN').map((flag) => (
              <div key={flag.id} className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-paper border border-line rounded-xl p-3">
                <div>
                  <div className="font-bold">{products.find((p) => p.id === flag.productId)?.name || flag.productId}</div>
                  <div className="text-sm text-muted">{flag.reason}</div>
                </div>
                <Button size="sm" variant="accent" onClick={() => resolveProductFlag(flag.id)}>Resolve</Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function PlatformSupport() {
  const { stores, supportTickets, addSupportTicket, updateSupportTicket } = useStore();

  return (
    <div className="space-y-6">
      <SectionHeader title="Support" subtitle="Track shop owner support issues and internal follow-up." className="mb-2 pb-0" />
      <div className="flex justify-end">
        <Button variant="accent" onClick={() => addSupportTicket({ storeId: stores[0]?.id, subject: 'Manual follow-up', message: 'Website owner created a support follow-up.', status: 'OPEN', priority: 'LOW' })}>New follow-up</Button>
      </div>
      <div className="space-y-3">
        {supportTickets.map((ticket) => (
          <div key={ticket.id} className="bg-surface border border-line rounded-2xl p-5 flex flex-col lg:flex-row justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <h3 className="font-black text-ink">{ticket.subject}</h3>
                <StatusPill label={ticket.priority} tone={ticket.priority === 'HIGH' ? 'red' : ticket.priority === 'MEDIUM' ? 'amber' : 'green'} />
                <StatusPill label={ticket.status} tone={ticket.status === 'RESOLVED' ? 'green' : ticket.status === 'IN_PROGRESS' ? 'amber' : 'red'} />
              </div>
              <p className="text-sm text-muted font-semibold">{stores.find((store) => store.id === ticket.storeId)?.name || 'Platform'} · {ticket.message}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="ghost" className="border border-line" onClick={() => updateSupportTicket(ticket.id, { status: 'IN_PROGRESS' })}>In progress</Button>
              <Button size="sm" variant="accent" onClick={() => updateSupportTicket(ticket.id, { status: 'RESOLVED' })}>Resolve</Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PlatformSettings() {
  const { platformSettings, updatePlatformSettings } = useStore();
  const [commission, setCommission] = useState((platformSettings.commissionRateBps / 100).toString());
  const [announcement, setAnnouncement] = useState(platformSettings.globalAnnouncement || '');
  const [supportEmail, setSupportEmail] = useState(platformSettings.supportEmail);
  const [maintenanceMode, setMaintenanceMode] = useState(platformSettings.maintenanceMode);

  const save = () => {
    updatePlatformSettings({
      commissionRateBps: Math.round(parseFloat(commission || '0') * 100),
      globalAnnouncement: announcement,
      supportEmail,
      maintenanceMode,
    });
    toast({ title: 'Platform settings saved', type: 'success' });
  };

  return (
    <div className="space-y-6">
      <SectionHeader title="Settings" subtitle="Control global website defaults and operational settings." className="mb-2 pb-0" />
      <div className="bg-surface border border-line rounded-2xl p-6 max-w-2xl space-y-5">
        <PlatformField label="Commission rate (%)">
          <input value={commission} onChange={(event) => setCommission(event.target.value)} type="number" step="0.01" className="w-full h-10 rounded-md border border-line bg-paper px-3 text-sm font-semibold" />
        </PlatformField>
        <PlatformField label="Global announcement">
          <input value={announcement} onChange={(event) => setAnnouncement(event.target.value)} className="w-full h-10 rounded-md border border-line bg-paper px-3 text-sm font-semibold" />
        </PlatformField>
        <PlatformField label="Support email">
          <input value={supportEmail} onChange={(event) => setSupportEmail(event.target.value)} className="w-full h-10 rounded-md border border-line bg-paper px-3 text-sm font-semibold" />
        </PlatformField>
        <label className="flex items-center gap-3 rounded-xl border border-line bg-paper p-3">
          <input type="checkbox" checked={maintenanceMode} onChange={(event) => setMaintenanceMode(event.target.checked)} className="accent-accent" />
          <span className="text-sm font-bold">Maintenance mode</span>
        </label>
        <Button variant="accent" onClick={save}>Save settings</Button>
      </div>
    </div>
  );
}

function PlatformAudit() {
  const auditLogs = useStore((s) => s.auditLogs);

  return (
    <div className="space-y-6">
      <SectionHeader title="Audit Log" subtitle="Track platform actions taken by the website owner." className="mb-2 pb-0" />
      <div className="bg-surface border border-line rounded-2xl overflow-hidden">
        {auditLogs.map((log) => (
          <div key={log.id} className="p-4 border-b border-line last:border-b-0 grid grid-cols-1 md:grid-cols-[180px_1fr_180px] gap-3">
            <div className="text-xs font-bold text-muted">{new Date(log.ts).toLocaleString()}</div>
            <div>
              <div className="font-black text-ink">{log.action}</div>
              <div className="text-sm text-muted">{log.target}{log.detail ? ` · ${log.detail}` : ''}</div>
            </div>
            <div className="text-sm font-bold text-muted md:text-right">{log.actor}</div>
          </div>
        ))}
      </div>
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

function SummaryLine({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={`flex justify-between gap-4 ${strong ? 'text-ink pt-2 mt-2 border-t border-line' : ''}`}>
      <span className={strong ? 'text-xs uppercase tracking-widest' : ''}>{label}</span>
      <span className={strong ? 'text-base' : ''}>{value}</span>
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-paper border border-line/70 rounded-xl p-3">
      <div className="text-[10px] font-bold uppercase tracking-widest text-muted mb-1">{label}</div>
      <div className="font-black text-lg text-ink truncate">{value}</div>
    </div>
  );
}

function StatusPill({ label, tone }: { label: string; tone: 'green' | 'amber' | 'red' }) {
  const classes = {
    green: 'bg-green-50 text-green-700 border-green-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
    red: 'bg-red-50 text-red-700 border-red-200',
  };
  return (
    <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-full border ${classes[tone]}`}>
      {label.replaceAll('_', ' ')}
    </span>
  );
}

function PlatformField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[10px] font-bold uppercase tracking-widest text-muted mb-2">{label}</span>
      {children}
    </label>
  );
}
