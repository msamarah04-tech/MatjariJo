import { prisma } from '../db.js';
import { withTransaction } from '../db.js';
import { notFound } from '../errors.js';
import { serializeOrder, serializeStore } from '../serializers.js';

/**
 * Internal PDPL data hygiene. Self-contained: produces a portable export of a
 * store's owner + customer records, and an erase that anonymizes customer PII
 * while keeping the financial shell of each order for accounting. No external
 * regulator integration — these are local actions the platform owner performs.
 */

export async function buildStoreDataExport(storeId: string) {
  const store = await prisma.store.findUnique({ where: { id: storeId }, include: { owner: true } });
  if (!store) throw notFound('Store not found.');
  const orders = await prisma.order.findMany({ where: { storeId }, include: { items: true }, orderBy: { createdAt: 'asc' } });

  return {
    exportedAt: new Date().toISOString(),
    store: serializeStore(store),
    owner: {
      id: store.owner.id,
      name: store.owner.name ?? undefined,
      email: store.owner.email,
      username: store.owner.username,
      role: store.owner.role,
      ownerStatus: store.owner.ownerStatus,
      createdAt: store.owner.createdAt.getTime(),
    },
    customers: orders.map((order) => ({
      orderId: order.id,
      name: order.customerName,
      email: order.customerEmail,
      phone: order.customerPhone ?? undefined,
      shippingAddress: order.shippingAddress ?? undefined,
      createdAt: order.createdAt.getTime(),
    })),
    orders: orders.map(serializeOrder),
  };
}

const REDACTED_NAME = 'Redacted customer';
const REDACTED_EMAIL = 'redacted@redacted.invalid';

/** Anonymize all customer PII for a store; keeps order totals/items for the ledger. */
export async function eraseStoreCustomerData(storeId: string) {
  const store = await prisma.store.findUnique({ where: { id: storeId } });
  if (!store) throw notFound('Store not found.');
  return withTransaction(async (tx) => {
    const affected = await tx.order.count({ where: { storeId } });
    await tx.order.updateMany({
      where: { storeId },
      data: {
        customerName: REDACTED_NAME,
        customerEmail: REDACTED_EMAIL,
        customerPhone: null,
        shippingAddress: null,
        note: null,
      },
    });
    // Session ids are pseudo-PII tying events to a visitor — clear them too.
    await tx.analyticsEvent.updateMany({ where: { storeId, sessionId: { not: null } }, data: { sessionId: null } });
    return { ordersAnonymized: affected };
  });
}
