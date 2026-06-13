import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, CheckCircle2, Inbox, Mail, MessageSquare, Search, Send, UserCheck } from 'lucide-react';
import { useStore } from '@/lib/store';
import { timeAgo } from '@/lib/format';
import { SupportTicket, TicketPriority, TicketStatus } from '@/lib/types';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
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
  const [showList, setShowList] = useState(true);
  const [focusId, clearFocus] = useFocusParam();

  useEffect(() => {
    if (focusId) {
      setStatus('ALL');
      setActiveId(focusId);
      setShowList(false);
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

  const openTicket = (id: string) => {
    setActiveId(id);
    setShowList(false);
  };

  return (
    <div className="flex flex-col gap-4">
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
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search conversations"
              className="h-10 w-full rounded-xl border border-line bg-surface pl-9 pr-3 text-sm font-semibold text-ink focus:outline-none focus:ring-1 focus:ring-accent"
            />
          </label>
        </div>
      </div>

      {/* Two-panel chat layout */}
      <div className="flex h-[calc(100vh-280px)] min-h-[500px] overflow-hidden rounded-2xl border border-line bg-surface shadow-sm">

        {/* Left — conversation list */}
        <div className={cn(
          'flex flex-col border-e border-line bg-paper/40',
          showList ? 'flex w-full' : 'hidden',
          'md:flex md:w-72 lg:w-80',
        )}>
          {filtered.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center">
              <Inbox className="h-8 w-8 text-line" />
              <p className="text-sm font-bold text-muted">Inbox zero</p>
              <p className="text-xs text-muted">No tickets match this filter.</p>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto">
              {filtered.map((ticket) => {
                const waitingHours = Math.floor((Date.now() - ticket.createdAt) / HOUR);
                const breached = ticket.status !== 'RESOLVED' && waitingHours >= 24;
                const unread = ticket.status === 'OPEN';
                const isActive = ticket.id === activeId;
                return (
                  <button
                    key={ticket.id}
                    onClick={() => openTicket(ticket.id)}
                    className={cn(
                      'flex w-full items-start gap-3 border-b border-line/60 px-4 py-3.5 text-left transition-colors last:border-b-0',
                      isActive ? 'bg-accent/10' : 'hover:bg-paper/80',
                    )}
                  >
                    <span className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full', unread ? 'bg-accent' : 'border border-line bg-transparent')} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-1">
                        <span className={cn('truncate text-sm', unread ? 'font-black text-ink' : 'font-semibold text-ink/70')}>
                          {storeName(ticket.storeId)}
                        </span>
                        <span className={cn('shrink-0 text-[10px] font-bold tabular-nums', breached ? 'text-red-500' : 'text-muted')}>
                          {timeAgo(ticket.createdAt)}
                        </span>
                      </div>
                      <p className={cn('truncate text-sm', unread ? 'font-bold text-ink' : 'text-muted')}>
                        {ticket.subject}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-muted">{ticket.message}</p>
                      <div className="mt-1.5 flex gap-1">
                        <StatusPill label={ticket.priority} tone={priorityTone(ticket.priority)} />
                        <StatusPill label={ticket.status} tone={statusTone(ticket.status)} />
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Right — active chat */}
        <div className={cn(
          'min-w-0 flex-1 flex-col',
          showList ? 'hidden md:flex' : 'flex',
        )}>
          {active ? (
            <ChatPanel
              key={active.id}
              ticket={active}
              storeName={storeName(active.storeId)}
              operatorName={currentUser?.name || 'Operator'}
              onBack={() => setShowList(true)}
              onReply={(body) => replyToTicket(active.id, body)}
              onStatus={(next) => {
                setTicketStatus(active.id, next);
                toast({ title: `Marked ${next.replace('_', ' ').toLowerCase()}`, type: 'success' });
              }}
              onAssign={(name) => {
                assignTicket(active.id, name);
                toast({ title: 'Assigned to you', type: 'success' });
              }}
              onResolve={async (replyBody, sendEmail) => {
                try {
                  if (sendEmail) {
                    await apiFetch(`/platform/support/tickets/${active.id}/resolve`, {
                      method: 'PATCH',
                      body: JSON.stringify({ replyBody: replyBody || undefined }),
                    });
                  }
                  setTicketStatus(active.id, 'RESOLVED');
                  toast({ title: sendEmail && replyBody ? 'Resolved — email sent to owner' : 'Ticket resolved', type: 'success' });
                } catch {
                  toast({ title: 'Could not resolve ticket', type: 'error' });
                }
              }}
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <EmptyState
                icon={MessageSquare}
                title="Select a conversation"
                description="Pick a ticket from the list to start chatting."
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ChatPanel({
  ticket,
  storeName,
  operatorName,
  onBack,
  onReply,
  onStatus,
  onAssign,
  onResolve,
}: {
  ticket: SupportTicket;
  storeName: string;
  operatorName: string;
  onBack: () => void;
  onReply: (body: string) => void;
  onStatus: (next: TicketStatus) => void;
  onAssign: (name: string) => void;
  onResolve: (replyBody: string, sendEmail: boolean) => Promise<void>;
}) {
  const [reply, setReply] = useState('');
  const [resolving, setResolving] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messages = ticket.messages || [];

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, ticket.id]);

  useEffect(() => {
    setReply('');
    setTimeout(() => textareaRef.current?.focus(), 50);
  }, [ticket.id]);

  const send = () => {
    const body = reply.trim();
    if (!body) return;
    onReply(body);
    setReply('');
    textareaRef.current?.focus();
  };

  const handleResolve = async (sendEmail: boolean) => {
    setResolving(true);
    try {
      await onResolve(reply.trim(), sendEmail);
      setReply('');
    } finally {
      setResolving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const waitingHours = Math.floor((Date.now() - ticket.createdAt) / HOUR);
  const breached = ticket.status !== 'RESOLVED' && waitingHours >= 24;

  return (
    <div className="flex h-full flex-col">
      {/* Chat header */}
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-line px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <button
            onClick={onBack}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full hover:bg-paper text-muted hover:text-ink md:hidden"
            aria-label="Back to list"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="min-w-0">
            <p className="truncate font-bold text-ink">{storeName}</p>
            <p className="truncate text-xs text-muted">{ticket.subject}</p>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {breached && (
            <span className="text-[10px] font-bold uppercase tracking-widest text-red-500">SLA breached</span>
          )}
          <StatusPill label={ticket.status} tone={statusTone(ticket.status)} />
          <StatusPill label={ticket.priority} tone={priorityTone(ticket.priority)} />
          {ticket.assignedTo ? (
            <StatusPill label={ticket.assignedTo} tone="blue" />
          ) : (
            <button
              onClick={() => onAssign(operatorName)}
              className="inline-flex items-center gap-1 rounded-full border border-line bg-paper px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-muted hover:text-ink"
            >
              <UserCheck className="h-3 w-3" /> Assign to me
            </button>
          )}
          {ticket.status !== 'RESOLVED' && (
            <button
              onClick={() => onStatus(ticket.status === 'OPEN' ? 'IN_PROGRESS' : 'OPEN')}
              className="text-[10px] font-bold uppercase tracking-widest text-muted hover:text-ink"
            >
              {ticket.status === 'OPEN' ? 'Mark in progress' : 'Reopen'}
            </button>
          )}
        </div>
      </div>

      {/* Message thread */}
      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
        {/* Initial message from owner */}
        <div className="flex flex-col items-start">
          <div className="max-w-[75%] rounded-2xl rounded-tl-sm border border-line bg-paper px-4 py-2.5 text-sm text-ink">
            {ticket.message}
          </div>
          <span className="mt-1.5 text-[10px] font-bold uppercase tracking-widest text-muted/60">
            {storeName} · {timeAgo(ticket.createdAt)}
          </span>
        </div>

        {messages.map((message) => {
          const isPlatform = message.from === 'PLATFORM';
          return (
            <div key={message.id} className={cn('flex flex-col', isPlatform ? 'items-end' : 'items-start')}>
              <div className={cn(
                'max-w-[75%] px-4 py-2.5 text-sm',
                isPlatform
                  ? 'rounded-2xl rounded-tr-sm bg-accent text-white'
                  : 'rounded-2xl rounded-tl-sm border border-line bg-paper text-ink',
              )}>
                {message.body}
              </div>
              <span className="mt-1.5 text-[10px] font-bold uppercase tracking-widest text-muted/60">
                {isPlatform ? operatorName : storeName} · {timeAgo(message.ts)}
              </span>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      {ticket.status !== 'RESOLVED' ? (
        <div className="shrink-0 border-t border-line bg-paper/60 px-4 py-3 space-y-2">
          <textarea
            ref={textareaRef}
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={2}
            placeholder="Type a message… (Enter to send · Shift+Enter for new line)"
            className="w-full resize-none rounded-xl border border-line bg-surface px-3 py-2.5 text-sm font-semibold text-ink placeholder:font-normal focus:outline-none focus:ring-1 focus:ring-accent"
          />
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted">
              {ticket.priority} priority · {waitingHours}h waiting
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5 border border-line"
                onClick={send}
                disabled={!reply.trim()}
              >
                <Send className="h-3.5 w-3.5" /> Send
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5 border border-line"
                onClick={() => handleResolve(false)}
                disabled={resolving}
              >
                <CheckCircle2 className="h-3.5 w-3.5" /> Resolve
              </Button>
              <Button
                variant="accent"
                size="sm"
                className="gap-1.5"
                onClick={() => handleResolve(true)}
                disabled={resolving}
                title="Resolve and send reply as an email to the owner"
              >
                <Mail className="h-3.5 w-3.5" />
                {resolving ? 'Sending…' : reply.trim() ? 'Email & resolve' : 'Email owner'}
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="shrink-0 flex items-center justify-between border-t border-line bg-paper/60 px-4 py-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <span className="text-sm font-bold text-green-700">Resolved</span>
          </div>
          <Button variant="ghost" size="sm" className="border border-line" onClick={() => onStatus('OPEN')}>
            Reopen
          </Button>
        </div>
      )}
    </div>
  );
}
