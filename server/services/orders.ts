import type { User } from '@prisma/client';
import { prisma } from '../db.js';
import { audit } from '../audit.js';
import { badRequest, notFound } from '../errors.js';
import { assertStoreAccess } from '../policies/storeAccess.policy.js';
import { assignInvoiceNumber } from './invoices.js';

/**
 * Order state machine. Single authority: the store-scoped admin routes call this;
 * platform owners reach it via oversight store access. COD orders move through the
 * same transitions (no external payment gateway).
 *
 *   PENDING  -> APPROVED | REJECTED
 *   APPROVED -> FULFILLED
 *
 * Any other transition is rejected server-side.
 */
export type OrderTransition = 'APPROVED' | 'REJECTED' | 'FULFILLED';

export function canTransition(current: string, next: OrderTransition): boolean {
  if (current === 'PENDING' && (next === 'APPROVED' || next === 'REJECTED')) return true;
  if (current === 'APPROVED' && next === 'FULFILLED') return true;
  return false;
}

export async function changeOrderStatus(user: User, orderId: string, next: OrderTransition, reason?: string, storeId?: string) {
  const order = await prisma.order.findUnique({ where: { id: orderId }, include: { items: true, store: true } });
  if (!order) throw notFound('Order not found.');
  if (storeId && order.storeId !== storeId) throw notFound('Order not found in this store.');
  await assertStoreAccess(user, order.storeId);
  if (!canTransition(order.status, next)) throw badRequest(`Cannot move order from ${order.status} to ${next}.`);
  await prisma.order.update({
    where: { id: order.id },
    data: { status: next, rejectionReason: next === 'REJECTED' ? reason ?? null : order.rejectionReason },
  });
  // Issue the sequential invoice number when the order is approved.
  if (next === 'APPROVED' && !order.invoiceNumber) {
    await assignInvoiceNumber(order.id);
  }
  await audit(user, `Set order to ${next}`, order.id, { targetType: 'Order', targetId: order.id, detail: reason });
  return prisma.order.findUniqueOrThrow({ where: { id: order.id }, include: { items: true } });
}
