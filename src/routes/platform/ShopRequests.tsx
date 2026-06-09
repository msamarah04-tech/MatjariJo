import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, ClipboardList, Copy, Search, XCircle } from 'lucide-react';
import { useStore } from '@/lib/store';
import { THEMES } from '@/lib/themes';
import { timeAgo } from '@/lib/format';
import { ShopRequest, ShopRequestStatus } from '@/lib/types';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Drawer } from '@/components/ui/Drawer';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Modal } from '@/components/ui/Modal';
import { toast } from '@/components/ui/Toast';
import { cn } from '@/lib/cn';
import { PageHeader, SegmentedControl, StatusPill, useFocusParam } from './shared';

type FilterKey = 'ALL' | ShopRequestStatus;

const statusTone = (status: ShopRequestStatus) =>
  status === 'APPROVED' ? 'green' : status === 'REJECTED' ? 'red' : status === 'IN_REVIEW' ? 'blue' : 'amber';

export default function ShopRequests() {
  const shopRequests = useStore((s) => s.shopRequests);
  const stores = useStore((s) => s.stores);
  const approveShopRequest = useStore((s) => s.approveShopRequest);
  const rejectShopRequest = useStore((s) => s.rejectShopRequest);
  const updateShopRequestStatus = useStore((s) => s.updateShopRequestStatus);
  const shopCredentials = useStore((s) => s.shopCredentials);
  const clearShopCredentials = useStore((s) => s.clearShopCredentials);

  const [filter, setFilter] = useState<FilterKey>('PENDING');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [activeId, setActiveId] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<{ ids: string[] } | null>(null);
  const [focusId, clearFocus] = useFocusParam();

  // Auto-open the drawer when arriving via a deep link.
  useEffect(() => {
    if (focusId) {
      setActiveId(focusId);
      clearFocus();
    }
  }, [focusId, clearFocus]);

  const counts = useMemo(() => ({
    ALL: shopRequests.length,
    PENDING: shopRequests.filter((r) => r.status === 'PENDING').length,
    IN_REVIEW: shopRequests.filter((r) => r.status === 'IN_REVIEW').length,
    APPROVED: shopRequests.filter((r) => r.status === 'APPROVED').length,
    REJECTED: shopRequests.filter((r) => r.status === 'REJECTED').length,
  }), [shopRequests]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return shopRequests
      .filter((r) => filter === 'ALL' || r.status === filter)
      .filter((r) => !q || `${r.storeName} ${r.ownerName} ${r.ownerEmail} ${r.category}`.toLowerCase().includes(q))
      .sort((a, b) => b.createdAt - a.createdAt);
  }, [shopRequests, filter, query]);

  const active = activeId ? shopRequests.find((r) => r.id === activeId) : undefined;
  const selectablePending = filtered.filter((r) => r.status === 'PENDING' || r.status === 'IN_REVIEW');

  const toggleSelect = (id: string) => {
    setSelected((current) => {
      const next = new Set(current);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const approve = (request: ShopRequest) => {
    const storeId = approveShopRequest(request.id);
    if (storeId) toast({ title: 'Store created', description: `${request.storeName} is now live for its owner.`, type: 'success' });
    setActiveId(null);
  };

  const confirmReject = (reason?: string) => {
    if (!rejecting) return;
    rejecting.ids.forEach((id) => rejectShopRequest(id, reason || 'Not a fit at this time'));
    toast({ title: rejecting.ids.length > 1 ? `${rejecting.ids.length} requests rejected` : 'Request rejected' });
    setRejecting(null);
    setSelected(new Set());
    setActiveId(null);
  };

  const bulkApprove = () => {
    const ids = Array.from(selected);
    let created = 0;
    ids.forEach((id) => {
      const request = shopRequests.find((r) => r.id === id);
      if (request && request.status !== 'APPROVED' && approveShopRequest(id)) created += 1;
    });
    if (created) toast({ title: `${created} stores created`, type: 'success' });
    setSelected(new Set());
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Shop Requests"
        subtitle="Review merchant applications, then approve to create their store or reject with a reason."
      />

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <SegmentedControl<FilterKey>
          value={filter}
          onChange={setFilter}
          options={[
            { label: 'Pending', value: 'PENDING', count: counts.PENDING },
            { label: 'In review', value: 'IN_REVIEW', count: counts.IN_REVIEW },
            { label: 'Approved', value: 'APPROVED', count: counts.APPROVED },
            { label: 'Rejected', value: 'REJECTED', count: counts.REJECTED },
            { label: 'All', value: 'ALL', count: counts.ALL },
          ]}
        />
        <label className="relative block w-full md:w-72">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search applicant or store"
            className="h-10 w-full rounded-xl border border-line bg-surface pl-9 pr-3 text-sm font-semibold text-ink focus:outline-none focus:ring-1 focus:ring-accent"
          />
        </label>
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-accent/30 bg-accent-soft/50 px-4 py-3">
          <span className="text-sm font-bold text-ink">{selected.size} selected</span>
          <div className="flex gap-2">
            <Button size="sm" variant="accent" onClick={bulkApprove}>Approve selected</Button>
            <Button size="sm" variant="ghost" className="border border-line text-red-600" onClick={() => setRejecting({ ids: Array.from(selected) })}>Reject selected</Button>
            <Button size="sm" variant="quiet" onClick={() => setSelected(new Set())}>Clear</Button>
          </div>
        </div>
      )}

      {filtered.length === 0 ? (
        <EmptyState icon={ClipboardList} title="No requests here" description="Applications submitted from the public request form will show up in this queue." />
      ) : (
        <div className="space-y-3">
          {selectablePending.length > 0 && (
            <label className="flex items-center gap-2 px-1 text-xs font-bold uppercase tracking-widest text-muted">
              <input
                type="checkbox"
                className="accent-accent"
                checked={selectablePending.every((r) => selected.has(r.id))}
                onChange={(event) => setSelected(event.target.checked ? new Set(selectablePending.map((r) => r.id)) : new Set())}
              />
              Select all pending
            </label>
          )}
          {filtered.map((request) => {
            const selectable = request.status === 'PENDING' || request.status === 'IN_REVIEW';
            return (
              <div key={request.id} className="flex items-center gap-4 rounded-2xl border border-line bg-surface p-4 shadow-sm transition-shadow hover:shadow-md">
                {selectable ? (
                  <input type="checkbox" className="accent-accent" checked={selected.has(request.id)} onChange={() => toggleSelect(request.id)} aria-label={`Select ${request.storeName}`} />
                ) : (
                  <span className="w-3.5" />
                )}
                <button onClick={() => setActiveId(request.id)} className="flex min-w-0 flex-1 items-center gap-4 text-left">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="truncate font-heading text-xl font-black text-ink">{request.storeName}</span>
                      <StatusPill label={request.status} tone={statusTone(request.status)} />
                      {request.plan && <StatusPill label={request.plan} tone="neutral" />}
                    </div>
                    <p className="truncate text-sm text-muted">{request.ownerName} · {request.category} · {timeAgo(request.createdAt)}</p>
                  </div>
                </button>
                <div className="hidden shrink-0 gap-2 sm:flex">
                  {request.status !== 'APPROVED' && request.status !== 'REJECTED' && (
                    <>
                      <Button size="sm" variant="accent" onClick={() => approve(request)}>Approve</Button>
                      <Button size="sm" variant="ghost" className="border border-line text-red-600" onClick={() => setRejecting({ ids: [request.id] })}>Reject</Button>
                    </>
                  )}
                  <Button size="sm" variant="ghost" className="border border-line" onClick={() => setActiveId(request.id)}>Details</Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Detail drawer */}
      <Drawer
        isOpen={Boolean(active)}
        onClose={() => setActiveId(null)}
        title={active?.storeName || 'Request'}
        description={active ? `${active.ownerName} · ${active.ownerEmail}` : undefined}
        footer={active && active.status !== 'APPROVED' && active.status !== 'REJECTED' ? (
          <div className="flex gap-2">
            <Button variant="accent" className="flex-1" onClick={() => approve(active)}>
              <CheckCircle2 className="mr-1.5 h-4 w-4" /> Approve & create store
            </Button>
            <Button variant="ghost" className="border border-line text-red-600" onClick={() => setRejecting({ ids: [active.id] })}>
              <XCircle className="mr-1.5 h-4 w-4" /> Reject
            </Button>
          </div>
        ) : undefined}
      >
        {active && <RequestDetail request={active} storeSlug={stores.find((s) => s.id === active.storeId)?.slug} onMarkReview={() => updateShopRequestStatus(active.id, 'IN_REVIEW')} />}
      </Drawer>

      <ConfirmDialog
        isOpen={Boolean(rejecting)}
        title={rejecting && rejecting.ids.length > 1 ? `Reject ${rejecting.ids.length} requests?` : 'Reject request?'}
        description="The applicant's request will be marked rejected. This is logged to the audit trail."
        confirmLabel="Reject"
        destructive
        reasonLabel="Reason for rejection"
        onCancel={() => setRejecting(null)}
        onConfirm={confirmReject}
      />

      <Modal
        isOpen={Boolean(shopCredentials)}
        onClose={clearShopCredentials}
        title={shopCredentials?.password ? 'Shop admin credentials' : 'Store approved'}
        description={shopCredentials?.password
          ? 'Share these with the shop owner now. The password is only shown once.'
          : 'The owner can sign in with the username and password they chose when requesting the store.'}
      >
        {shopCredentials && (
          <div className="space-y-4">
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-900">
              {shopCredentials.password
                ? 'Save this password before closing. The backend stores only the hashed password.'
                : 'No password to relay — the owner set their own. Only the bcrypt hash is stored.'}
            </div>
            <CredentialRow label="Store" value={shopCredentials.storeName} />
            <CredentialRow label="Email" value={shopCredentials.email} copy />
            <CredentialRow label="Username" value={shopCredentials.username} copy />
            {shopCredentials.password && <CredentialRow label="Password" value={shopCredentials.password} copy secret />}
            <Button variant="solid" className="w-full" onClick={clearShopCredentials}>Done</Button>
          </div>
        )}
      </Modal>
    </div>
  );
}

function CredentialRow({ label, value, copy = false, secret = false }: { label: string; value: string; copy?: boolean; secret?: boolean }) {
  const copyValue = async () => {
    await navigator.clipboard.writeText(value);
    toast({ title: `${label} copied`, type: 'success' });
  };

  return (
    <div>
      <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-muted">{label}</p>
      <div className="flex items-center gap-2 rounded-xl border border-line bg-paper p-2">
        <code className="min-w-0 flex-1 overflow-x-auto whitespace-nowrap text-sm font-black text-ink">
          {secret ? value : value}
        </code>
        {copy && (
          <Button size="sm" variant="ghost" className="shrink-0 border border-line" onClick={copyValue}>
            <Copy className="mr-1.5 h-3.5 w-3.5" /> Copy
          </Button>
        )}
      </div>
    </div>
  );
}

function RequestDetail({ request, storeSlug, onMarkReview }: { request: ShopRequest; storeSlug?: string; onMarkReview: () => void }) {
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        <StatusPill label={request.status} tone={statusTone(request.status)} />
        {request.plan && <StatusPill label={`${request.plan} plan`} tone="neutral" />}
      </div>

      <DetailField label="Requested store">{request.storeName} · /{request.storeName.toLowerCase().replace(/\s+/g, '-')}</DetailField>
      <DetailField label="Category">{request.category}</DetailField>
      <DetailField label="Tagline">{request.tagline}</DetailField>
      <DetailField label="Applicant">{request.ownerName} · {request.ownerEmail}</DetailField>
      {request.notes && (
        <div>
          <p className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-muted">Message</p>
          <p className="rounded-xl border border-line bg-paper p-3 text-sm text-ink/80">{request.notes}</p>
        </div>
      )}
      {request.rejectionReason && (
        <div>
          <p className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-muted">Rejection reason</p>
          <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{request.rejectionReason}</p>
        </div>
      )}
      {request.storeId && storeSlug && (
        <div className="rounded-xl border border-green-200 bg-green-50 p-3">
          <p className="text-sm font-bold text-green-800">Store created — /{storeSlug}</p>
          <Button size="sm" variant="ghost" className="mt-2 border border-green-200 bg-white/70 text-green-800" onClick={() => window.open(`/#/s/${storeSlug}`, '_blank')}>
            Open storefront
          </Button>
        </div>
      )}
      {request.status === 'PENDING' && (
        <Button variant="ghost" className={cn('w-full border border-line')} onClick={onMarkReview}>Mark as in review</Button>
      )}
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted/70">
        Themes available on approval: {THEMES.map((t) => t.name).join(', ')}
      </p>
    </div>
  );
}

function DetailField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-muted">{label}</p>
      <p className="text-sm font-semibold text-ink">{children}</p>
    </div>
  );
}
