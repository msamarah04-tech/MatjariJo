import type { Request, Response } from 'express';

export type SseEventType = 'ticket.update';

export interface SseEvent {
  type: SseEventType;
  payload: unknown;
}

interface SseClient {
  res: Response;
  /** Role determines which events the client receives. */
  role: 'PLATFORM_OWNER' | 'SHOP_OWNER';
  /** For shop owners, only forward events for their store. */
  storeId?: string;
  heartbeatTimer: ReturnType<typeof setInterval>;
}

const clients = new Map<string, SseClient>();

let idSeq = 0;
function nextId() {
  return String(++idSeq);
}

/**
 * Initialise the SSE connection: send headers, register the client, and clean
 * up when the socket closes.  Returns the client id (used only for tests).
 */
export function openSseStream(
  req: Request,
  res: Response,
  role: 'PLATFORM_OWNER' | 'SHOP_OWNER',
  storeId?: string,
): string {
  res.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  res.flushHeaders();

  const clientId = nextId();

  const heartbeatTimer = setInterval(() => {
    res.write(': ping\n\n');
  }, 25_000);

  clients.set(clientId, { res, role, storeId, heartbeatTimer });

  const cleanup = () => {
    clearInterval(heartbeatTimer);
    clients.delete(clientId);
  };

  req.on('close', cleanup);
  req.on('error', cleanup);

  return clientId;
}

/**
 * Broadcast an event to all connected clients that are authorised to see it.
 * - PLATFORM_OWNER clients receive every ticket event.
 * - SHOP_OWNER clients receive only events for their own store.
 */
export function broadcastTicketUpdate(ticket: { id: string; storeId?: string | null }, payload: unknown) {
  const data = JSON.stringify(payload);
  for (const client of clients.values()) {
    if (client.role === 'PLATFORM_OWNER') {
      writeSseMessage(client.res, 'ticket.update', data);
    } else if (client.role === 'SHOP_OWNER' && client.storeId && client.storeId === ticket.storeId) {
      writeSseMessage(client.res, 'ticket.update', data);
    }
  }
}

function writeSseMessage(res: Response, event: string, data: string) {
  try {
    res.write(`event: ${event}\ndata: ${data}\n\n`);
  } catch {
    // Connection may have already dropped — cleanup happens via the 'close' event.
  }
}
