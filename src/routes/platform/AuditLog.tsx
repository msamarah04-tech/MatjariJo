import { useMemo, useState } from 'react';
import { Download, ScrollText, Search } from 'lucide-react';
import { useStore } from '@/lib/store';
import { AuditLog as AuditLogEntry } from '@/lib/types';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { toast } from '@/components/ui/Toast';
import { PageHeader, SegmentedControl } from './shared';

type RangeKey = 7 | 30 | 90 | 'all';
const DAY = 86400000;
const PAGE_SIZE = 20;

const EVENT_TYPES = [
  { label: 'All events', value: 'ALL' },
  { label: 'Store', value: 'store' },
  { label: 'Order', value: 'order' },
  { label: 'Product', value: 'product' },
  { label: 'Payment', value: 'payment' },
  { label: 'Ticket', value: 'ticket' },
  { label: 'User / account', value: 'user' },
  { label: 'Request', value: 'request' },
  { label: 'Settings', value: 'settings' },
  { label: 'Announcement', value: 'announcement' },
] as const;

type EventTypeKey = typeof EVENT_TYPES[number]['value'];

const EVENT_KEYWORDS: Record<Exclude<EventTypeKey, 'ALL'>, string[]> = {
  store: ['store', 'suspend', 'reactivat', 'featur'],
  order: ['order'],
  product: ['product', 'flag', 'moderat'],
  payment: ['payment', 'plan', 'billing'],
  ticket: ['ticket', 'support'],
  user: ['user', 'password', 'owner', 'account', 'login'],
  request: ['request', 'approv', 'reject'],
  settings: ['settings', 'config'],
  announcement: ['announc', 'message', 'notif'],
};

function matchesEventType(action: string, eventType: EventTypeKey): boolean {
  if (eventType === 'ALL') return true;
  const lower = action.toLowerCase();
  return EVENT_KEYWORDS[eventType].some((kw) => lower.includes(kw));
}

function download(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function toCsv(rows: AuditLogEntry[]) {
  const header = ['timestamp', 'actor', 'action', 'target', 'detail'];
  const escape = (value: string) => `"${(value || '').replaceAll('"', '""')}"`;
  const lines = rows.map((row) => [new Date(row.ts).toISOString(), row.actor, row.action, row.target, row.detail || ''].map(escape).join(','));
  return [header.join(','), ...lines].join('\n');
}

export default function AuditLog() {
  const auditLogs = useStore((s) => s.auditLogs);
  const auditCap = useStore((s) => s.platformSettings.auditCap);
  const stores = useStore((s) => s.stores);

  const [query, setQuery] = useState('');
  const [actor, setActor] = useState('ALL');
  const [storeFilter, setStoreFilter] = useState('ALL');
  const [eventType, setEventType] = useState<EventTypeKey>('ALL');
  const [range, setRange] = useState<RangeKey>('all');
  const [page, setPage] = useState(0);

  const actors = useMemo(() => Array.from(new Set(auditLogs.map((log) => log.actor))), [auditLogs]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const cutoff = range === 'all' ? 0 : Date.now() - range * DAY;
    const storeName = storeFilter !== 'ALL' ? stores.find((s) => s.id === storeFilter)?.name?.toLowerCase() : null;
    return auditLogs
      .filter((log) => log.ts >= cutoff)
      .filter((log) => actor === 'ALL' || log.actor === actor)
      .filter((log) => !storeName || log.target.toLowerCase().includes(storeName))
      .filter((log) => matchesEventType(log.action, eventType))
      .filter((log) => !q || `${log.action} ${log.target} ${log.detail || ''}`.toLowerCase().includes(q))
      .sort((a, b) => b.ts - a.ts);
  }, [auditLogs, query, actor, storeFilter, eventType, range, stores]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const pageRows = filtered.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);

  const exportData = (format: 'csv' | 'json') => {
    if (filtered.length === 0) {
      toast({ title: 'Nothing to export', type: 'error' });
      return;
    }
    if (format === 'csv') download('audit-log.csv', toCsv(filtered), 'text/csv');
    else download('audit-log.json', JSON.stringify(filtered, null, 2), 'application/json');
    toast({ title: `Exported ${filtered.length} entries`, type: 'success' });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit Log"
        subtitle={`Every platform action, newest first. Retaining up to ${auditCap} entries.`}
        action={
          <div className="flex gap-2">
            <Button variant="ghost" className="gap-1.5 border border-line" onClick={() => exportData('csv')}><Download className="h-4 w-4" /> CSV</Button>
            <Button variant="ghost" className="gap-1.5 border border-line" onClick={() => exportData('json')}><Download className="h-4 w-4" /> JSON</Button>
          </div>
        }
      />

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <SegmentedControl<RangeKey>
            value={range}
            onChange={(value) => { setRange(value); setPage(0); }}
            options={[
              { label: '7D', value: 7 },
              { label: '30D', value: 30 },
              { label: '90D', value: 90 },
              { label: 'All', value: 'all' },
            ]}
          />
          <label className="relative block w-full max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              value={query}
              onChange={(event) => { setQuery(event.target.value); setPage(0); }}
              placeholder="Search action or target"
              className="h-10 w-full rounded-xl border border-line bg-surface pl-9 pr-3 text-sm font-semibold text-ink focus:outline-none focus:ring-1 focus:ring-accent"
            />
          </label>
        </div>
        <div className="flex flex-wrap gap-3">
          <select
            value={actor}
            onChange={(e) => { setActor(e.target.value); setPage(0); }}
            className="h-10 rounded-xl border border-line bg-surface px-3 text-sm font-semibold text-ink focus:outline-none focus:ring-1 focus:ring-accent"
          >
            <option value="ALL">All actors</option>
            {actors.map((name) => <option key={name} value={name}>{name}</option>)}
          </select>
          <select
            value={storeFilter}
            onChange={(e) => { setStoreFilter(e.target.value); setPage(0); }}
            className="h-10 rounded-xl border border-line bg-surface px-3 text-sm font-semibold text-ink focus:outline-none focus:ring-1 focus:ring-accent"
          >
            <option value="ALL">All stores</option>
            {stores.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <select
            value={eventType}
            onChange={(e) => { setEventType(e.target.value as EventTypeKey); setPage(0); }}
            className="h-10 rounded-xl border border-line bg-surface px-3 text-sm font-semibold text-ink focus:outline-none focus:ring-1 focus:ring-accent"
          >
            {EVENT_TYPES.map((et) => <option key={et.value} value={et.value}>{et.label}</option>)}
          </select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={ScrollText} title="No matching entries" description="Adjust the filters or date range to see audit activity." />
      ) : (
        <>
          <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-sm">
            {pageRows.map((log) => (
              <div key={log.id} className="grid grid-cols-1 gap-2 border-b border-line/60 p-4 last:border-b-0 md:grid-cols-[170px_1fr_160px] md:gap-4">
                <div className="text-xs font-bold text-muted">{new Date(log.ts).toLocaleString()}</div>
                <div className="min-w-0">
                  <div className="font-bold text-ink">{log.action}</div>
                  <div className="truncate text-sm text-muted">{log.target}{log.detail ? ` · ${log.detail}` : ''}</div>
                </div>
                <div className="text-sm font-bold text-muted md:text-right">{log.actor}</div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-widest text-muted">
              {safePage * PAGE_SIZE + 1}–{Math.min(filtered.length, (safePage + 1) * PAGE_SIZE)} of {filtered.length}
            </p>
            <div className="flex gap-2">
              <Button size="sm" variant="ghost" className="border border-line" disabled={safePage === 0} onClick={() => setPage(safePage - 1)}>Previous</Button>
              <Button size="sm" variant="ghost" className="border border-line" disabled={safePage >= pageCount - 1} onClick={() => setPage(safePage + 1)}>Next</Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
