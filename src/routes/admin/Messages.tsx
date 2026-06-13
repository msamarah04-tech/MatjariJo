import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  Inbox,
  MessageSquare,
  Plus,
  Send,
  X,
} from 'lucide-react';
import { useStore } from '@/lib/store';
import { timeAgo } from '@/lib/format';
import { SupportTicket, TicketStatus } from '@/lib/types';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Textarea } from '@/components/ui/Textarea';
import { toast } from '@/components/ui/Toast';
import { cn } from '@/lib/cn';
import { PageHeader } from '@/components/ui/dashboard';
import { createSupportTicket } from '@/api/admin.api';
import { useAdminContext } from './shared';

type Filter = 'active' | 'resolved' | 'all';

const TICKET_CATEGORIES = [
  { value: 'BILLING', label: 'Billing & payment' },
  { value: 'TECHNICAL', label: 'Technical issue' },
  { value: 'ACCOUNT', label: 'Account' },
  { value: 'FEATURE_REQUEST', label: 'Feature request' },
  { value: 'OTHER', label: 'Other' },
] as const;

const statusTone = (s: TicketStatus) =>
  s === 'RESOLVED' ? 'bg-green-100 text-green-700' : s === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-800';

const statusLabel = (s: TicketStatus) =>
  s === 'RESOLVED' ? 'Resolved' : s === 'IN_PROGRESS' ? 'In progress' : 'Open';

/** True when the platform replied last and the owner hasn't responded yet. */
function hasUnreadPlatformReply(ticket: SupportTicket): boolean {
  const messages = ticket.messages ?? [];
  if (messages.length === 0) return false;
  return messages[messages.length - 1].from === 'PLATFORM';
}

export default function Messages() {
  const { storeId } = useAdminContext();
  const allTickets = useStore((s) => s.supportTickets);
  const replyToTicket = useStore((s) => s.replyToTicket);
  const loadBootstrap = useStore((s) => s.loadBootstrap);
  const currentUser = useStore((s) => s.currentUser);

  const storeTickets = useMemo(
    () => allTickets.filter((t) => t.storeId === storeId).sort((a, b) => b.createdAt - a.createdAt),
    [allTickets, storeId],
  );

  const [filter, setFilter] = useState<Filter>('active');
  const [activeId, setActiveId] = useState<string | null>(null);
  const [showList, setShowList] = useState(true);
  const [composing, setComposing] = useState(false);

  const counts = {
    active: storeTickets.filter((t) => t.status !== 'RESOLVED').length,
    resolved: storeTickets.filter((t) => t.status === 'RESOLVED').length,
    all: storeTickets.length,
  };

  const filtered = useMemo(() => {
    if (filter === 'active') return storeTickets.filter((t) => t.status !== 'RESOLVED');
    if (filter === 'resolved') return storeTickets.filter((t) => t.status === 'RESOLVED');
    return storeTickets;
  }, [storeTickets, filter]);

  const active = activeId ? storeTickets.find((t) => t.id === activeId) : undefined;

  const openTicket = (id: string) => {
    setActiveId(id);
    setComposing(false);
    setShowList(false);
  };

  const handleNewTicketCreated = async (subject: string, category: string, message: string) => {
    try {
      await createSupportTicket(storeId, { subject, message, category });
      toast({ title: 'Support request sent', description: 'Our team will reply here and by email.', type: 'success' });
      await loadBootstrap();
      setComposing(false);
      setFilter('active');
    } catch {
      toast({ title: 'Could not submit request', type: 'error' });
    }
  };

  const handleReply = (body: string) => {
    if (!active) return;
    replyToTicket(active.id, body);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <PageHeader
          title="Messages"
          subtitle="View replies from our team and send new support requests."
        />
        <Button
          variant="solid"
          size="sm"
          className="mt-1 shrink-0 gap-1.5"
          onClick={() => { setComposing(true); setShowList(false); }}
        >
          <Plus className="h-3.5 w-3.5" /> New request
        </Button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 rounded-xl border border-line bg-paper p-1 w-fit">
        {([
          { key: 'active', label: 'Active', count: counts.active },
          { key: 'resolved', label: 'Resolved', count: counts.resolved },
          { key: 'all', label: 'All', count: counts.all },
        ] as { key: Filter; label: string; count: number }[]).map(({ key, label, count }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={cn(
              'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-black transition-colors',
              filter === key ? 'bg-surface text-ink shadow-sm' : 'text-muted hover:text-ink',
            )}
          >
            {label}
            <span className={cn('rounded-full px-1.5 py-0.5 text-[10px] font-bold', filter === key ? 'bg-accent/10 text-accent' : 'bg-line/60 text-muted')}>
              {count}
            </span>
          </button>
        ))}
      </div>

      {/* Two-panel layout */}
      <div className="flex h-[calc(100vh-300px)] min-h-[480px] overflow-hidden rounded-2xl border border-line bg-surface shadow-sm">

        {/* Left — conversation list */}
        <div className={cn(
          'flex flex-col border-e border-line bg-paper/40',
          showList ? 'flex w-full' : 'hidden',
          'md:flex md:w-72 lg:w-80',
        )}>
          {filtered.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center">
              <Inbox className="h-8 w-8 text-line" />
              <p className="text-sm font-bold text-muted">No conversations yet</p>
              <p className="text-xs text-muted">Tap "New request" to contact support.</p>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto">
              {filtered.map((ticket) => {
                const unread = hasUnreadPlatformReply(ticket);
                const isActive = ticket.id === activeId && !composing;
                const lastMsg = (ticket.messages ?? []).slice(-1)[0];
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
                          {ticket.subject}
                        </span>
                        <span className="shrink-0 text-[10px] font-bold tabular-nums text-muted">
                          {timeAgo(lastMsg?.ts ?? ticket.createdAt)}
                        </span>
                      </div>
                      <p className={cn('mt-0.5 truncate text-xs', unread ? 'font-bold text-ink' : 'text-muted')}>
                        {lastMsg?.body ?? ticket.message}
                      </p>
                      <div className="mt-1.5 flex items-center gap-1.5">
                        <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-widest', statusTone(ticket.status))}>
                          {statusLabel(ticket.status)}
                        </span>
                        <span className="text-[10px] text-muted">{ticket.category?.replace('_', ' ')}</span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Right — chat panel or compose form */}
        <div className={cn(
          'min-w-0 flex-1 flex-col',
          showList ? 'hidden md:flex' : 'flex',
        )}>
          {composing ? (
            <ComposePanel
              onBack={() => { setComposing(false); setShowList(true); }}
              onSubmit={handleNewTicketCreated}
            />
          ) : active ? (
            <ChatPanel
              key={active.id}
              ticket={active}
              ownerName={currentUser?.name || 'You'}
              onBack={() => setShowList(true)}
              onReply={handleReply}
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <EmptyState
                icon={MessageSquare}
                title="Select a conversation"
                description="Choose a thread from the list or start a new support request."
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ComposePanel({
  onBack,
  onSubmit,
}: {
  onBack: () => void;
  onSubmit: (subject: string, category: string, message: string) => Promise<void>;
}) {
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState('BILLING');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) return;
    setSubmitting(true);
    try {
      await onSubmit(subject.trim(), category, message.trim());
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 items-center gap-2 border-b border-line px-4 py-3">
        <button
          onClick={onBack}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted hover:bg-paper hover:text-ink md:hidden"
          aria-label="Back to list"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <p className="font-bold text-ink">New support request</p>
        <button
          onClick={onBack}
          className="ml-auto flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted hover:bg-paper hover:text-ink"
          aria-label="Cancel"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-5 py-5">
        <form id="compose-form" onSubmit={handleSubmit} className="space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-muted">Category</span>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="h-10 w-full rounded-lg border border-line bg-surface px-3 text-sm font-semibold text-ink focus:outline-none focus:ring-1 focus:ring-accent"
            >
              {TICKET_CATEGORIES.map((cat) => (
                <option key={cat.value} value={cat.value}>{cat.label}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-muted">Subject</span>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              required
              placeholder="Briefly describe the issue"
              className="h-10 w-full rounded-lg border border-line bg-surface px-3 text-sm font-semibold text-ink focus:outline-none focus:ring-1 focus:ring-accent"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-muted">Message</span>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={6}
              required
              placeholder="Give us as much detail as possible…"
            />
          </label>
        </form>
      </div>
      <div className="shrink-0 border-t border-line bg-paper/60 px-4 py-3">
        <Button
          form="compose-form"
          type="submit"
          variant="solid"
          className="w-full gap-2"
          disabled={submitting || !subject.trim() || !message.trim()}
        >
          <Send className="h-3.5 w-3.5" />
          {submitting ? 'Sending…' : 'Send request'}
        </Button>
      </div>
    </div>
  );
}

function ChatPanel({
  ticket,
  ownerName,
  onBack,
  onReply,
}: {
  ticket: SupportTicket;
  ownerName: string;
  onBack: () => void;
  onReply: (body: string) => void;
}) {
  const [reply, setReply] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messages = ticket.messages ?? [];

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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-line px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <button
            onClick={onBack}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted hover:bg-paper hover:text-ink md:hidden"
            aria-label="Back to list"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="min-w-0">
            <p className="truncate font-bold text-ink">{ticket.subject}</p>
            <p className="truncate text-xs text-muted">{ticket.category?.replace('_', ' ')}</p>
          </div>
        </div>
        <span className={cn('shrink-0 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-widest', statusTone(ticket.status))}>
          {statusLabel(ticket.status)}
        </span>
      </div>

      {/* Message thread */}
      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
        {messages.map((message) => {
          const isOwner = message.from === 'OWNER';
          return (
            <div key={message.id} className={cn('flex flex-col', isOwner ? 'items-end' : 'items-start')}>
              <div className={cn(
                'max-w-[75%] px-4 py-2.5 text-sm',
                isOwner
                  ? 'rounded-2xl rounded-tr-sm bg-accent text-white'
                  : 'rounded-2xl rounded-tl-sm border border-line bg-paper text-ink',
              )}>
                {message.body}
              </div>
              <span className="mt-1.5 text-[10px] font-bold uppercase tracking-widest text-muted/60">
                {isOwner ? ownerName : 'Support team'} · {timeAgo(message.ts)}
              </span>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      {ticket.status !== 'RESOLVED' ? (
        <div className="shrink-0 border-t border-line bg-paper/60 px-4 py-3 space-y-2">
          <textarea
            ref={textareaRef}
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={2}
            placeholder="Type a reply… (Enter to send · Shift+Enter for new line)"
            className="w-full resize-none rounded-xl border border-line bg-surface px-3 py-2.5 text-sm font-semibold text-ink placeholder:font-normal focus:outline-none focus:ring-1 focus:ring-accent"
          />
          <div className="flex justify-end">
            <Button
              variant="solid"
              size="sm"
              className="gap-1.5"
              onClick={send}
              disabled={!reply.trim()}
            >
              <Send className="h-3.5 w-3.5" /> Send
            </Button>
          </div>
        </div>
      ) : (
        <div className="shrink-0 flex items-center gap-2 border-t border-line bg-paper/60 px-4 py-3">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <span className="text-sm font-bold text-green-700">This conversation is resolved</span>
        </div>
      )}
    </div>
  );
}
