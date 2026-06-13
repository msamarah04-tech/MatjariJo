import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Copy, ExternalLink, KeyRound, LayoutGrid, Search, Settings2, Star, Trash2 } from 'lucide-react';
import { useStore } from '@/lib/store';
import { storefrontUrl } from '@/lib/tenant';
import { money } from '@/lib/format';
import { Order, OwnerStatus, PlanStatus, Store, StorePlan, StoreStatus } from '@/lib/types';
import { PLAN_DEFS, PLAN_ORDER } from '@shared/plans';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Drawer } from '@/components/ui/Drawer';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Modal } from '@/components/ui/Modal';
import { toast } from '@/components/ui/Toast';
import { cn } from '@/lib/cn';
import { PageHeader, SegmentedControl, StatusPill, StoreAvatar, useFocusParam } from './shared';
import { resetStoreOwnerPassword } from '@/api/platform.api';

type StatusFilter = 'ALL' | StoreStatus;
type SortKey = 'newest' | 'gmv' | 'orders' | 'name';

const REVENUE_STATUSES: Order['status'][] = ['APPROVED', 'FULFILLED'];

const ownerName = (ownerId: string) => ownerId;
const ownerTone = (status: OwnerStatus) => (status === 'ACTIVE' ? 'green' : status === 'RESTRICTED' ? 'amber' : 'red');
const planTone = (status?: PlanStatus) => (status === 'ACTIVE' ? 'green' : status === 'PAST_DUE' ? 'amber' : 'blue');

export default function Stores() {
  const stores = useStore((s) => s.stores);
  const orders = useStore((s) => s.orders);
  const products = useStore((s) => s.products);
  const settings = useStore((s) => s.platformSettings);
  const ownerStatuses = useStore((s) => s.ownerStatuses);

  const setStoreStatus = useStore((s) => s.setStoreStatus);
  const setStorePlan = useStore((s) => s.setStorePlan);
  const recordPlanPayment = useStore((s) => s.recordPlanPayment);
  const toggleFeatured = useStore((s) => s.toggleFeatured);
  const setOwnerStatus = useStore((s) => s.setOwnerStatus);
  const deletePlatformStore = useStore((s) => s.deletePlatformStore);

  const [params, setParams] = useSearchParams();
  const ownerParam = params.get('owner');
  const [status, setStatus] = useState<StatusFilter>('ALL');
  const [sort, setSort] = useState<SortKey>('newest');
  const [query, setQuery] = useState('');
  const [activeId, setActiveId] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<null | { kind: 'suspend' | 'ban' | 'restrict' | 'delete'; store: Store }>(null);
  const [credentials, setCredentials] = useState<null | { storeName: string; email: string; username: string; password: string }>(null);
  const [focusId, clearFocus] = useFocusParam();

  useEffect(() => {
    if (focusId) {
      setActiveId(focusId);
      clearFocus();
    }
  }, [focusId, clearFocus]);

  // Per-store rollups.
  const rows = useMemo(() => {
    return stores.map((store) => {
      const storeOrders = orders.filter((o) => o.storeId === store.id);
      const revenueOrders = storeOrders.filter((o) => REVENUE_STATUSES.includes(o.status));
      return {
        store,
        orderCount: storeOrders.length,
        pending: storeOrders.filter((o) => o.status === 'PENDING').length,
        gmvCents: revenueOrders.reduce((sum, o) => sum + o.totalCents, 0),
        productCount: products.filter((p) => p.storeId === store.id).length,
      };
    });
  }, [stores, orders, products, settings]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows
      .filter((row) => status === 'ALL' || row.store.status === status)
      .filter((row) => !ownerParam || row.store.ownerId === ownerParam)
      .filter((row) => !q || `${row.store.name} ${row.store.slug} ${row.store.category}`.toLowerCase().includes(q))
      .sort((a, b) => {
        if (sort === 'gmv') return b.gmvCents - a.gmvCents;
        if (sort === 'orders') return b.orderCount - a.orderCount;
        if (sort === 'name') return a.store.name.localeCompare(b.store.name);
        return b.store.createdAt - a.store.createdAt;
      });
  }, [rows, status, ownerParam, query, sort]);

  const activeRow = activeId ? rows.find((row) => row.store.id === activeId) : undefined;

  const clearOwnerFilter = () => {
    const next = new URLSearchParams(params);
    next.delete('owner');
    setParams(next, { replace: true });
  };

  const counts = {
    ALL: stores.length,
    ACTIVE: stores.filter((s) => s.status === 'ACTIVE').length,
    SUSPENDED: stores.filter((s) => s.status === 'SUSPENDED').length,
  };

  const runConfirm = async () => {
    if (!confirm) return;
    const { kind, store } = confirm;
    setConfirm(null);
    if (kind === 'suspend') {
      setStoreStatus(store.id, 'SUSPENDED');
      toast({ title: 'Store suspended' });
    } else if (kind === 'ban') {
      setOwnerStatus(store.ownerId, 'BANNED');
      toast({ title: 'Owner banned' });
    } else if (kind === 'restrict') {
      setOwnerStatus(store.ownerId, 'RESTRICTED');
      toast({ title: 'Owner restricted' });
    } else if (kind === 'delete') {
      setActiveId(null);
      try {
        await deletePlatformStore(store.id);
        toast({ title: 'Store deleted', type: 'success' });
      } catch (error) {
        toast({ title: 'Could not delete store', description: error instanceof Error ? error.message : undefined, type: 'error' });
      }
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Stores" subtitle="Every store on the marketplace. Open one to manage status, plan, and its owner." />

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <SegmentedControl<StatusFilter>
          value={status}
          onChange={setStatus}
          options={[
            { label: 'All', value: 'ALL', count: counts.ALL },
            { label: 'Active', value: 'ACTIVE', count: counts.ACTIVE },
            { label: 'Suspended', value: 'SUSPENDED', count: counts.SUSPENDED },
          ]}
        />
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <SegmentedControl<SortKey>
            value={sort}
            onChange={setSort}
            options={[
              { label: 'Newest', value: 'newest' },
              { label: 'GMV', value: 'gmv' },
              { label: 'Orders', value: 'orders' },
              { label: 'Name', value: 'name' },
            ]}
          />
          <label className="relative block w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search stores"
              className="h-10 w-full rounded-xl border border-line bg-surface pl-9 pr-3 text-sm font-semibold text-ink focus:outline-none focus:ring-1 focus:ring-accent"
            />
          </label>
        </div>
      </div>

      {ownerParam && (
        <div className="flex items-center justify-between rounded-xl border border-line bg-paper px-4 py-2.5 text-sm">
          <span className="font-bold text-ink">Filtered to owner: {ownerName(ownerParam)}</span>
          <button onClick={clearOwnerFilter} className="text-xs font-bold uppercase tracking-widest text-muted hover:text-ink">Clear</button>
        </div>
      )}

      {filtered.length === 0 ? (
        <EmptyState icon={LayoutGrid} title="No stores found" description="Try a different status, owner, or search term." />
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden overflow-hidden rounded-2xl border border-line bg-surface shadow-sm lg:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-[10px] font-bold uppercase tracking-widest text-muted">
                  <th className="px-4 py-3">Store</th>
                  <th className="px-4 py-3">Owner</th>
                  <th className="px-4 py-3 text-right">Products</th>
                  <th className="px-4 py-3 text-right">Orders</th>
                  <th className="px-4 py-3 text-right">GMV</th>
                  <th className="px-4 py-3 text-right">Plan</th>
                  <th className="px-4 py-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => (
                  <tr key={row.store.id} onClick={() => setActiveId(row.store.id)} className="cursor-pointer border-b border-line/60 transition-colors last:border-b-0 hover:bg-paper/60">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <StoreAvatar emoji={row.store.logoEmoji} url={row.store.logoUrl} name={row.store.name} size="sm" />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 font-bold text-ink">
                            <span className="truncate">{row.store.name}</span>
                            {row.store.isFeatured && <Star className="h-3.5 w-3.5 fill-accent text-accent" />}
                          </div>
                          <div className="truncate text-xs text-muted">/{row.store.slug} · {row.store.category}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted">{ownerName(row.store.ownerId)}</td>
                    <td className="px-4 py-3 text-right font-semibold">{row.productCount}</td>
                    <td className="px-4 py-3 text-right font-semibold">{row.orderCount}</td>
                    <td className="px-4 py-3 text-right font-semibold">{money(row.gmvCents, row.store.currency)}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <span className="font-semibold">{row.store.plan ?? 'STARTER'}</span>
                        <StatusPill label={row.store.planStatus ?? 'TRIAL'} tone={planTone(row.store.planStatus)} />
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <StatusPill label={row.store.status} tone={row.store.status === 'ACTIVE' ? 'green' : 'red'} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="space-y-3 lg:hidden">
            {filtered.map((row) => (
              <button key={row.store.id} onClick={() => setActiveId(row.store.id)} className="flex w-full items-center gap-3 rounded-2xl border border-line bg-surface p-4 text-left shadow-sm">
                <StoreAvatar emoji={row.store.logoEmoji} url={row.store.logoUrl} name={row.store.name} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 font-bold text-ink">
                    <span className="truncate">{row.store.name}</span>
                    {row.store.isFeatured && <Star className="h-3.5 w-3.5 fill-accent text-accent" />}
                  </div>
                  <p className="truncate text-xs text-muted">{money(row.gmvCents, row.store.currency)} · {row.orderCount} orders · {row.store.plan ?? 'STARTER'}</p>
                </div>
                <StatusPill label={row.store.planStatus ?? 'TRIAL'} tone={planTone(row.store.planStatus)} />
                <StatusPill label={row.store.status} tone={row.store.status === 'ACTIVE' ? 'green' : 'red'} />
              </button>
            ))}
          </div>
        </>
      )}

      <Drawer
        isOpen={Boolean(activeRow)}
        onClose={() => setActiveId(null)}
        title={activeRow?.store.name || 'Store'}
        description={activeRow ? `/${activeRow.store.slug} · ${activeRow.store.category}` : undefined}
      >
        {activeRow && (
          <StoreDetail
            row={activeRow}
            ownerStatus={ownerStatuses[activeRow.store.ownerId] || 'ACTIVE'}
            onReactivate={() => { setStoreStatus(activeRow.store.id, 'ACTIVE'); toast({ title: 'Store reactivated', type: 'success' }); }}
            onSuspend={() => setConfirm({ kind: 'suspend', store: activeRow.store })}
            onToggleFeatured={() => { toggleFeatured(activeRow.store.id); toast({ title: activeRow.store.isFeatured ? 'Store unfeatured' : 'Store featured', type: 'success' }); }}
                      onSetPlan={async (plan) => {
              const ok = await setStorePlan(activeRow.store.id, plan);
              toast(ok ? { title: `Plan changed to ${plan}`, type: 'success' } : { title: 'Could not change plan', type: 'error' });
            }}
            onRecordPayment={async () => {
              const ok = await recordPlanPayment(activeRow.store.id);
              toast(ok ? { title: 'Payment recorded', description: 'Paid-until extended by one month.', type: 'success' } : { title: 'Could not record payment', type: 'error' });
            }}
            onOwner={(next) => {
              if (next === 'ACTIVE') { setOwnerStatus(activeRow.store.ownerId, 'ACTIVE'); toast({ title: 'Owner reactivated', type: 'success' }); }
              else setConfirm({ kind: next === 'BANNED' ? 'ban' : 'restrict', store: activeRow.store });
            }}
            onResetPassword={async () => {
              const result = await resetStoreOwnerPassword(activeRow.store.id);
              setCredentials({ storeName: activeRow.store.name, ...result.credentials });
              toast({ title: 'Password reset', description: 'A new one-time password was generated.', type: 'success' });
            }}
            onDelete={() => setConfirm({ kind: 'delete', store: activeRow.store })}
          />
        )}
      </Drawer>

      <ConfirmDialog
        isOpen={Boolean(confirm)}
        title={
          confirm?.kind === 'suspend' ? 'Suspend this store?'
            : confirm?.kind === 'ban' ? 'Ban this owner?'
              : confirm?.kind === 'restrict' ? 'Restrict this owner?'
                : `Delete ${confirm?.store.name ?? 'this store'}?`
        }
        description={
          confirm?.kind === 'suspend'
            ? 'The shop will go offline immediately. You can reactivate it later.'
            : confirm?.kind === 'ban'
              ? 'The owner loses access to all their stores. This is logged.'
              : confirm?.kind === 'restrict'
                ? 'The owner is flagged for review with limited actions. This is logged.'
                : 'Permanently deletes the store and ALL its data (products, orders, discounts, analytics) and the owner account. This cannot be undone.'
        }
        confirmLabel={
          confirm?.kind === 'suspend' ? 'Suspend'
            : confirm?.kind === 'ban' ? 'Ban owner'
              : confirm?.kind === 'restrict' ? 'Restrict owner'
                : 'Delete store'
        }
        destructive
        onCancel={() => setConfirm(null)}
        onConfirm={runConfirm}
      />

      <Modal
        isOpen={Boolean(credentials)}
        onClose={() => setCredentials(null)}
        title="New shop owner password"
        description="Share this password with the shop owner now. It is only shown once."
      >
        {credentials && (
          <div className="space-y-4">
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-900">
              Save this password before closing. The backend stores only the hashed password.
            </div>
            <CredentialRow label="Store" value={credentials.storeName} />
            <CredentialRow label="Email" value={credentials.email} copy />
            <CredentialRow label="Username" value={credentials.username} copy />
            <CredentialRow label="Password" value={credentials.password} copy />
            <Button variant="solid" className="w-full" onClick={() => setCredentials(null)}>Done</Button>
          </div>
        )}
      </Modal>
    </div>
  );
}

type StoreRow = { store: Store; orderCount: number; pending: number; gmvCents: number; productCount: number };

function StoreDetail({
  row,
  ownerStatus,
  onReactivate,
  onSuspend,
  onToggleFeatured,
  onSetPlan,
  onRecordPayment,
  onOwner,
  onResetPassword,
  onDelete,
}: {
  row: StoreRow;
  ownerStatus: OwnerStatus;
  onReactivate: () => void;
  onSuspend: () => void;
  onToggleFeatured: () => void;
  onSetPlan: (plan: StorePlan) => void;
  onRecordPayment: () => void;
  onOwner: (next: OwnerStatus) => void;
  onResetPassword: () => void;
  onDelete: () => void;
}) {
  const { store } = row;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        <StatusPill label={store.status} tone={store.status === 'ACTIVE' ? 'green' : 'red'} />
        <StatusPill label={`Owner ${ownerStatus}`} tone={ownerTone(ownerStatus)} />
        {store.isFeatured && <StatusPill label="Featured" tone="amber" />}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Metric label="GMV" value={money(row.gmvCents, store.currency)} />
        <Metric label="Orders" value={`${row.orderCount}`} />
        <Metric label="Pending" value={`${row.pending}`} />
        <Metric label="Products" value={`${row.productCount}`} />
      </div>

      <div className="flex gap-2">
        <Button variant="ghost" className="flex-1 gap-2 border border-line" onClick={() => window.open(storefrontUrl(store.slug), '_blank')}>
          <ExternalLink className="h-4 w-4" /> Shop
        </Button>
        <Button variant="ghost" className="flex-1 gap-2 border border-line" onClick={() => window.open(`/#/admin/${store.id}`, '_blank')}>
          <Settings2 className="h-4 w-4" /> Admin
        </Button>
      </div>

      {/* Subscription (manual billing) */}
      <div className="rounded-xl border border-line bg-paper p-4">
        <div className="mb-1 flex items-center justify-between gap-2">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted">Subscription</p>
          <StatusPill label={store.planStatus ?? 'TRIAL'} tone={planTone(store.planStatus)} />
        </div>
        <p className="mb-3 text-xs text-muted">
          {store.planPaidUntil
            ? `${store.planStatus === 'TRIAL' ? 'Trial ends' : store.planStatus === 'PAST_DUE' ? 'Lapsed' : 'Paid until'} ${new Date(store.planPaidUntil).toLocaleDateString()}`
            : 'No billing date recorded yet.'}
        </p>
        <div className="mb-3 grid grid-cols-3 gap-2">
          {PLAN_ORDER.map((plan) => (
            <button
              key={plan}
              type="button"
              onClick={() => plan !== store.plan && onSetPlan(plan)}
              className={cn(
                'rounded-lg border px-2 py-2 text-center transition-colors',
                store.plan === plan ? 'border-accent bg-accent-soft text-accent' : 'border-line bg-surface hover:border-ink/30',
              )}
            >
              <span className="block text-xs font-black">{plan}</span>
              <span className="block text-[10px] font-bold text-muted">JOD {PLAN_DEFS[plan].priceMonthlyJod}/mo</span>
            </button>
          ))}
        </div>
        <Button variant="accent" className="w-full" onClick={onRecordPayment}>Record payment (+1 month)</Button>
      </div>


      {/* Store actions */}
      <div className="space-y-2">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted">Store</p>
        <div className="flex flex-wrap gap-2">
          {store.status === 'ACTIVE' ? (
            <Button variant="ghost" className="border border-line text-red-600" onClick={onSuspend}>Suspend</Button>
          ) : (
            <Button variant="accent" onClick={onReactivate}>Reactivate</Button>
          )}
          <Button variant="ghost" className="gap-1.5 border border-line" onClick={onToggleFeatured}>
            <Star className={cn('h-4 w-4', store.isFeatured && 'fill-accent text-accent')} /> {store.isFeatured ? 'Unfeature' : 'Feature'}
          </Button>
        </div>
      </div>

      {/* Owner actions */}
      <div className="space-y-2">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted">Owner · {ownerName(store.ownerId)}</p>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant={ownerStatus === 'ACTIVE' ? 'accent' : 'ghost'} className={ownerStatus === 'ACTIVE' ? '' : 'border border-line'} onClick={() => onOwner('ACTIVE')}>Active</Button>
          <Button size="sm" variant="ghost" className="border border-line" onClick={() => onOwner('RESTRICTED')}>Restrict</Button>
          <Button size="sm" variant="ghost" className="border border-line text-red-600" onClick={() => onOwner('BANNED')}>Ban</Button>
          <Button size="sm" variant="ghost" className="gap-1.5 border border-line" onClick={onResetPassword}>
            <KeyRound className="h-3.5 w-3.5" /> Reset password
          </Button>
        </div>
      </div>

      {/* Danger zone */}
      <div className="space-y-2 rounded-xl border border-red-200 bg-red-50/60 p-4">
        <p className="text-[10px] font-bold uppercase tracking-widest text-red-700">Danger zone</p>
        <p className="text-xs font-semibold leading-5 text-red-700/80">
          Permanently delete this store and all its data, plus the owner account. This cannot be undone.
        </p>
        <Button size="sm" variant="ghost" className="gap-1.5 border border-red-300 bg-surface text-red-600 hover:bg-red-50" onClick={onDelete}>
          <Trash2 className="h-3.5 w-3.5" /> Delete store
        </Button>
      </div>
    </div>
  );
}

function CredentialRow({ label, value, copy = false }: { label: string; value: string; copy?: boolean }) {
  const copyValue = async () => {
    await navigator.clipboard.writeText(value);
    toast({ title: `${label} copied`, type: 'success' });
  };

  return (
    <div>
      <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-muted">{label}</p>
      <div className="flex items-center gap-2 rounded-xl border border-line bg-paper p-2">
        <code className="min-w-0 flex-1 overflow-x-auto whitespace-nowrap text-sm font-black text-ink">{value}</code>
        {copy && (
          <Button size="sm" variant="ghost" className="shrink-0 border border-line" onClick={copyValue}>
            <Copy className="mr-1.5 h-3.5 w-3.5" /> Copy
          </Button>
        )}
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-line bg-paper p-3">
      <div className="mb-1 text-[10px] font-bold uppercase tracking-widest text-muted">{label}</div>
      <div className="truncate font-black text-lg text-ink">{value}</div>
    </div>
  );
}
