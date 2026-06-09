import { useEffect, useMemo, useRef, useState } from 'react';
import { ShieldCheck, TriangleAlert } from 'lucide-react';
import { useStore } from '@/lib/store';
import { timeAgo } from '@/lib/format';
import { FlagSeverity, FlagStatus, ProductFlag } from '@/lib/types';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { toast } from '@/components/ui/Toast';
import { cn } from '@/lib/cn';
import { PageHeader, SegmentedControl, StatusPill, StoreAvatar, useFocusParam } from './shared';

type StatusFilter = 'OPEN' | 'RESOLVED_ANY' | 'ALL';
type SeverityFilter = 'ALL' | FlagSeverity;

const severityTone = (severity?: FlagSeverity) => (severity === 'HIGH' ? 'red' : severity === 'MEDIUM' ? 'amber' : 'neutral');
const statusTone = (status: FlagStatus) => (status === 'OPEN' ? 'amber' : status === 'ACTIONED' ? 'green' : 'neutral');

export default function Moderation() {
  const productFlags = useStore((s) => s.productFlags);
  const products = useStore((s) => s.products);
  const stores = useStore((s) => s.stores);
  const settings = useStore((s) => s.platformSettings);
  const resolveFlag = useStore((s) => s.resolveFlag);
  const unpublishProduct = useStore((s) => s.unpublishProduct);
  const setOwnerStatus = useStore((s) => s.setOwnerStatus);

  const [status, setStatus] = useState<StatusFilter>('OPEN');
  const [severity, setSeverity] = useState<SeverityFilter>('ALL');
  const [restrictFlag, setRestrictFlag] = useState<ProductFlag | null>(null);
  const [focusId, clearFocus] = useFocusParam();
  const [highlight, setHighlight] = useState<string | null>(null);
  const rowRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    if (focusId) {
      setStatus('ALL');
      setHighlight(focusId);
      clearFocus();
      const id = window.setTimeout(() => rowRefs.current[focusId]?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 80);
      return () => window.clearTimeout(id);
    }
  }, [focusId, clearFocus]);

  const product = (id: string) => products.find((p) => p.id === id);
  const store = (id: string) => stores.find((s) => s.id === id);

  // Stores at/over the auto-flag threshold.
  const hotStores = useMemo(() => {
    const map = new Map<string, number>();
    productFlags.filter((f) => f.status === 'OPEN').forEach((f) => map.set(f.storeId, (map.get(f.storeId) || 0) + 1));
    return Array.from(map.entries()).filter(([, count]) => count >= settings.autoFlagThreshold).map(([id, count]) => ({ store: store(id), count }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productFlags, settings.autoFlagThreshold, stores]);

  const counts = {
    OPEN: productFlags.filter((f) => f.status === 'OPEN').length,
    RESOLVED: productFlags.filter((f) => f.status !== 'OPEN').length,
    ALL: productFlags.length,
  };

  const filtered = useMemo(() => {
    return productFlags
      .filter((f) => (status === 'OPEN' ? f.status === 'OPEN' : status === 'RESOLVED_ANY' ? f.status !== 'OPEN' : true))
      .filter((f) => severity === 'ALL' || (f.severity || 'MEDIUM') === severity)
      .sort((a, b) => b.createdAt - a.createdAt);
  }, [productFlags, status, severity]);

  return (
    <div className="space-y-6">
      <PageHeader title="Moderation" subtitle="Review flagged products, unpublish what breaks policy, and act on repeat offenders." />

      {hotStores.length > 0 && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
          <div className="text-sm text-amber-800">
            <p className="font-bold">Auto-flag threshold reached ({settings.autoFlagThreshold}+ open flags)</p>
            <p>{hotStores.map((h) => `${h.store?.name || 'Unknown'} (${h.count})`).join(', ')} may need owner review.</p>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <SegmentedControl<StatusFilter>
          value={status}
          onChange={setStatus}
          options={[
            { label: 'Open', value: 'OPEN', count: counts.OPEN },
            { label: 'Resolved', value: 'RESOLVED_ANY', count: counts.RESOLVED },
            { label: 'All', value: 'ALL', count: counts.ALL },
          ]}
        />
        <SegmentedControl<SeverityFilter>
          value={severity}
          onChange={setSeverity}
          options={[
            { label: 'All severity', value: 'ALL' },
            { label: 'High', value: 'HIGH' },
            { label: 'Medium', value: 'MEDIUM' },
            { label: 'Low', value: 'LOW' },
          ]}
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={ShieldCheck} title="Nothing to moderate" description="No product flags match this filter. Open flags will appear here for review." />
      ) : (
        <div className="space-y-3">
          {filtered.map((flag) => {
            const item = product(flag.productId);
            const owningStore = store(flag.storeId);
            const isOpen = flag.status === 'OPEN';
            return (
              <div
                key={flag.id}
                ref={(el) => { rowRefs.current[flag.id] = el; }}
                className={cn(
                  'rounded-2xl border bg-surface p-5 shadow-sm transition-shadow',
                  highlight === flag.id ? 'border-accent ring-2 ring-accent/30' : 'border-line'
                )}
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="flex min-w-0 gap-4">
                    <StoreAvatar emoji={item?.imageEmoji} url={item?.imageUrl} name={item?.name || 'Product'} />
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-bold text-ink">{item?.name || 'Unknown product'}</h3>
                        <StatusPill label={flag.severity || 'MEDIUM'} tone={severityTone(flag.severity)} />
                        <StatusPill label={flag.status} tone={statusTone(flag.status)} />
                        {item && !item.isActive && <StatusPill label="Unpublished" tone="red" />}
                      </div>
                      <p className="mt-1 text-sm text-muted">{owningStore?.name || 'Unknown store'} · reported by {flag.reporter || 'Platform'} · {timeAgo(flag.createdAt)}</p>
                      <p className="mt-2 rounded-xl border border-line bg-paper p-3 text-sm text-ink/80">{flag.reason}</p>
                    </div>
                  </div>
                  {isOpen && (
                    <div className="flex shrink-0 flex-wrap gap-2 lg:flex-col lg:w-44">
                      <Button
                        size="sm"
                        variant="accent"
                        onClick={() => {
                          if (item) unpublishProduct(item.id);
                          resolveFlag(flag.id, 'ACTIONED');
                          toast({ title: 'Product unpublished', description: 'Flag marked as actioned.', type: 'success' });
                        }}
                      >
                        Unpublish & action
                      </Button>
                      <Button size="sm" variant="ghost" className="border border-line" onClick={() => { resolveFlag(flag.id, 'DISMISSED'); toast({ title: 'Flag dismissed' }); }}>
                        Dismiss flag
                      </Button>
                      <Button size="sm" variant="ghost" className="border border-line text-red-600" onClick={() => setRestrictFlag(flag)}>
                        Restrict owner
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        isOpen={Boolean(restrictFlag)}
        title="Restrict this store's owner?"
        description="The owner is flagged for review with limited actions. The flag is also marked actioned. This is logged."
        confirmLabel="Restrict owner"
        destructive
        onCancel={() => setRestrictFlag(null)}
        onConfirm={() => {
          if (restrictFlag) {
            const owningStore = store(restrictFlag.storeId);
            if (owningStore) setOwnerStatus(owningStore.ownerId, 'RESTRICTED');
            resolveFlag(restrictFlag.id, 'ACTIONED');
            toast({ title: 'Owner restricted', type: 'success' });
          }
          setRestrictFlag(null);
        }}
      />
    </div>
  );
}
