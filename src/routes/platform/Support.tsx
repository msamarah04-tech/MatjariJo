import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Inbox, Search, Send, UserCheck } from 'lucide-react';
import { useStore } from '@/lib/store';
import { timeAgo } from '@/lib/format';
import { SupportTicket, TicketPriority, TicketStatus } from '@/lib/types';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Drawer } from '@/components/ui/Drawer';
import { Textarea } from '@/components/ui/Textarea';
import { toast } from '@/components/ui/Toast';
import { cn } from '@/lib/cn';
import { PageHeader, SegmentedControl, StatusPill, useFocusParam } from './shared';
import { apiFetch } from '@/api/client';

type StatusFilter = 'OPEN_ANY' | TicketStatus | 'ALL';
type PriorityFilter = 'ALL' | TicketPriority;

const priorityTone = (p: TicketPriority) => (p === 'HIGH' ? 'red' : p === 'MEDIUM' ? 'amber' : 'neutral');
const statusTone = (s: TicketStatus) => (s === 'RESOLVED' ? 'green' : s === 'IN_PROGRESS' ? 'blue' : 'amber');
const HOUR = 3600000;

export default function Support() {
  const supportTickets = useStore((s) => s.supportTickets);
  const stores = useStore((s) => s.stores);
  const currentUser = useStore((s) => s.currentUser);
  const replyToTicket = useStore((s) => s.replyToTicket);
  const setTicketStatus = useStore((s) => s.setTicketStatus);
  const assignTicket = useStore((s) => s.assignTicket);

  const [status, setStatus] = useState<StatusFilter>('OPEN_ANY');
  const [priority, setPriority] = useState<PriorityFilter>('ALL');
  const [query, setQuery] = useState('');
  const [activeId, setActiveId] = useState<string | null>(null);
  const [focusId, clearFocus] = useFocusParam();

  useEffect(() => {
    if (focusId) {
      setStatus('ALL');
      setActiveId(focusId);
      clearFocus();
    }
  }, [focusId, clearFocus]);

  const storeName = (id?: string) => stores.find((s) => s.id === id)?.name || 'Platform';

  const counts = {
    OPEN_ANY: supportTickets.filter((t) => t.status !== 'RESOLVED').length,
    RESOLVED: supportTickets.filter((t) => t.status === 'RESOLVED').length,
    ALL: supportTickets.length,
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return supportTickets
      .filter((t) => (status === 'OPEN_ANY' ? t.status !== 'RESOLVED' : status === 'ALL' ? true : t.status === status))
      .filter((t) => priority === 'ALL' || t.priority === priority)
      .filter((t) => !q || `${t.subject} ${t.message} ${storeName(t.storeId)}`.toLowerCase().includes(q))
      .sort((a, b) => b.createdAt - a.createdAt);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supportTickets, status, priority, query, stores]);

  const active = activeId ? supportTickets.find((t) => t.id === activeId) : undefined;

  return (
    <div className="space-y-6">
      <PageHeader title="Support" subtitle="Reply to owner and customer tickets, set status, and assign them to yourself." />

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <SegmentedControl<StatusFilter>
          value={status}
          onChange={setStatus}
          options={[
            { label: 'Open', value: 'OPEN_ANY', count: counts.OPEN_ANY },
            { label: 'Resolved', value: 'RESOLVED', count: counts.RESOLVED },
            { label: 'All', value: 'ALL', count: counts.ALL },
          ]}
        />
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <SegmentedControl<PriorityFilter>
            value={priority}
            onChange={setPriority}
            options={[
              { label: 'Any', value: 'ALL' },
              { label: 'High', value: 'HIGH' },
              { label: 'Medium', value: 'MEDIUM' },
              { label: 'Low', value: 'LOW' },
            ]}
          />
          <label className="relative block w-full sm:w-60">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search tickets"
              className="h-10 w-full rounded-xl border border-line bg-surface pl-9 pr-3 text-sm font-semibold text-ink focus:outline-none focus:ring-1 focus:ring-accent"
            />
          </label>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={Inbox} title="Inbox zero" description="No tickets match this filter." />
      ) : (
        <div className="space-y-3">
          {filtered.map((ticket) => {
            const waitingHours = Math.floor((Date.now() - ticket.createdAt) / HOUR);
            const breached = ticket.status !== 'RESOLVED' && waitingHours >= 24;
            const unread = ticket.status === 'OPEN';
            return (
              <button
                key={ticket.id}
                onClick={() => setActiveId(ticket.id)}
                className="flex w-full items-center gap-4 rounded-2xl border border-line bg-surface p-4 text-left shadow-sm transition-shadow hover:shadow-md"
              >
                <span className={cn('h-2.5 w-2.5 shrink-0 rounded-full', unread ? 'bg-accent' : 'bg-line')} aria-hidden />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={cn('truncate', unread ? 'font-black text-ink' : 'font-bold text-ink')}>{ticket.subject}</span>
                    <StatusPill label={ticket.priority} tone={priorityTone(ticket.priority)} />
                    <StatusPill label={ticket.status} tone={statusTone(ticket.status)} />
                  </div>
                  <p className="truncate text-sm text-muted">{storeName(ticket.storeId)} · {ticket.message}</p>
                </div>
                <div className="hidden shrink-0 text-right sm:block">
                  {ticket.assignedTo && <p className="text-[10px] font-bold uppercase tracking-widest text-muted">{ticket.assignedTo}</p>}
                  <p className={cn('text-xs font-bold', breached ? 'text-red-600' : 'text-muted')}>{ticket.status === 'RESOLVED' ? 'Resolved' : `Waiting ${waitingHours}h`}</p>
                </div>
              </button>
            );
          })}
        </div>
      )}

      <Drawer
        isOpen={Boolean(active)}
        onClose={() => setActiveId(null)}
        title={active?.subject || 'Ticket'}
        description={active ? `${storeName(active.storeId)} · opened ${timeAgo(active.createdAt)}` : undefined}
      >
        {active && (
          <Conversation
            ticket={active}
            operatorName={currentUser?.name || 'Operator'}
            onReply={(body) => replyToTicket(active.id, body)}
            onStatus={(next) => { setTicketStatus(active.id, next); toast({ title: `Marked ${next.replace('_', ' ').toLowerCase()}`, type: 'success' }); }}
            onAssign={(name) => { assignTicket(active.id, name); toast({ title: 'Assigned to you', type: 'success' }); }}
            onResolve={async (replyBody) => {
              try {
                await apiFetch(`/platform/support/tickets/${active.id}/resolve`, { method: 'PATCH', body: JSON.stringify({ replyBody: replyBody || undefined }) });
                setTicketStatus(active.id, 'RESOLVED');
                toast({ title: replyBody ? 'Resolved — reply sent to owner' : 'Ticket resolved', type: 'success' });
              } catch {
                toast({ title: 'Could not resolve ticket', type: 'error' });
              }
            }}
          />
        )}
      </Drawer>
    </div>
  );
}

function Conversation({
  ticket,
  operatorName,
  onReply,
  onStatus,
  onAssign,
  onResolve,
}: {
  ticket: SupportTicket;
  operatorName: string;
  onReply: (body: string) => void;
  onStatus: (next: TicketStatus) => void;
  onAssign: (name: string) => void;
  onResolve: (replyBody: string) => Promise<void>;
}) {
  const [reply, setReply] = useState('');
  const [resolving, setResolving] = useState(false);
  const messages = ticket.messages || [];

  const send = () => {
    const body = reply.trim();
    if (!body) return;
    onReply(body);
    setReply('');
  };

  const handleResolve = async () => {
    setResolving(true);
    try {
      await onResolve(reply.trim());
      setReply('');
    } finally {
      setResolving(false);
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <StatusPill label={ticket.priority} tone={priorityTone(ticket.priority)} />
        <StatusPill label={ticket.status} tone={statusTone(ticket.status)} />
        {ticket.assignedTo ? (
          <StatusPill label={`Assigned · ${ticket.assignedTo}`} tone="blue" />
        ) : (
          <button onClick={() => onAssign(operatorName)} className="inline-flex items-center gap-1 rounded-full border border-line bg-paper px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-muted hover:text-ink">
            <UserCheck className="h-3 w-3" /> Assign to me
          </button>
        )}
      </div>

      {/* Thread */}
      <div className="flex-1 space-y-3">
        {messages.map((message) => {
          const isPlatform = message.from === 'PLATFORM';
          return (
            <div key={message.id} className={cn('flex flex-col', isPlatform ? 'items-end' : 'items-start')}>
              <div className={cn('max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm', isPlatform ? 'bg-ink text-surface' : 'border border-line bg-paper text-ink')}>
                {message.body}
              </div>
              <span className="mt-1 text-[10px] font-bold uppercase tracking-widest text-muted/70">{message.from} · {timeAgo(message.ts)}</span>
            </div>
          );
        })}
      </div>

      {/* Reply + resolve box */}
      <div className="mt-4 space-y-3 border-t border-line pt-4">
        <Textarea value={reply} onChange={(event) => setReply(event.target.value)} rows={3} placeholder="Write a reply (optional when resolving)…" />
        <div className="flex items-center justify-between gap-2">
          {ticket.status !== 'RESOLVED' ? (
            <>
              <div className="flex gap-2">
                <Button variant="ghost" className="gap-1.5 border border-line" onClick={send} disabled={!reply.trim()}>
                  <Send className="h-4 w-4" /> Send
                </Button>
                <Button variant="ghost" className="gap-1.5 border border-line text-muted" onClick={() => onStatus(ticket.status === 'OPEN' ? 'IN_PROGRESS' : 'OPEN')}>
                  {ticket.status === 'OPEN' ? 'Mark in progress' : 'Reopen'}
                </Button>
              </div>
              <Button variant="accent" className="gap-1.5" onClick={handleResolve} disabled={resolving}>
                <CheckCircle2 className="h-4 w-4" /> {resolving ? 'Resolving…' : reply.trim() ? 'Resolve & reply' : 'Resolve'}
              </Button>
            </>
          ) : (
            <div className="flex w-full items-center justify-between">
              <StatusPill label="RESOLVED" tone="green" />
              <Button variant="ghost" className="border border-line" onClick={() => onStatus('OPEN')}>Reopen</Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
