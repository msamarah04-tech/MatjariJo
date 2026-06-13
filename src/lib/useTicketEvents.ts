import { useEffect, useRef } from 'react';
import { useStore } from './store';
import { SupportTicket } from './types';
import { API_BASE } from '@/api/client';

const BASE_DELAY_MS = 2_000;
const MAX_DELAY_MS = 30_000;

interface UseTicketEventsOptions {
  /** SSE endpoint path relative to API_BASE, e.g. '/platform/events' */
  path: string;
}

/**
 * Opens a Server-Sent Events connection that keeps the `supportTickets` slice
 * in the Zustand store up to date without a full bootstrap reload.
 *
 * Reconnects automatically with exponential back-off on any error or
 * unexpected close.  Tears down cleanly when the component unmounts or when
 * the token changes.
 */
export function useTicketEvents({ path }: UseTicketEventsOptions) {
  const token = useStore((s) => s.token);
  const applyTicketUpdate = useStore((s) => s.applyTicketUpdate);
  const delayRef = useRef(BASE_DELAY_MS);
  const esRef = useRef<EventSource | null>(null);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!token) return;

    let cancelled = false;

    function connect() {
      if (cancelled) return;

      const url = `${API_BASE}${path}?token=${encodeURIComponent(token!)}`;
      const es = new EventSource(url);
      esRef.current = es;

      es.addEventListener('ticket.update', (e: MessageEvent) => {
        try {
          const data = JSON.parse(e.data) as { ticket: SupportTicket };
          if (data?.ticket) {
            applyTicketUpdate(data.ticket);
            delayRef.current = BASE_DELAY_MS;
          }
        } catch {
          // malformed event — ignore
        }
      });

      es.addEventListener('error', () => {
        es.close();
        esRef.current = null;
        if (cancelled) return;
        retryTimerRef.current = setTimeout(() => {
          delayRef.current = Math.min(delayRef.current * 2, MAX_DELAY_MS);
          connect();
        }, delayRef.current);
      });
    }

    connect();

    return () => {
      cancelled = true;
      if (retryTimerRef.current !== null) clearTimeout(retryTimerRef.current);
      if (esRef.current) { esRef.current.close(); esRef.current = null; }
      delayRef.current = BASE_DELAY_MS;
    };
  }, [token, path, applyTicketUpdate]);
}
