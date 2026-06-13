import type { User } from '@prisma/client';
import { prisma } from '../db.js';
import { forbidden } from '../errors.js';

/**
 * Store access policy — the single decision point for "may this user act on this
 * store?". Per-store isolation is sacred: a shop owner may only touch their one
 * assigned store. Platform owners have NO implicit access to shop content; they
 * operate exclusively through /platform routes which return privacy-safe metadata only.
 *
 * Throws ApiError(403) on denial; returns true on success.
 */
export async function assertStoreAccess(user: User, storeId: string): Promise<true> {
  if (user.ownerStatus !== 'ACTIVE') throw forbidden('Owner account is not active.');

  const store = await prisma.store.findFirst({ where: { id: storeId, ownerId: user.id } });
  if (!store) throw forbidden('You do not have access to this store.');

  // A shop-admin account is hard-limited to its first (assigned) store.
  const firstOwnedStore = await prisma.store.findFirst({ where: { ownerId: user.id }, orderBy: { createdAt: 'asc' } });
  if (firstOwnedStore && firstOwnedStore.id !== storeId) {
    throw forbidden('This shop-admin account is limited to its assigned store.');
  }
  return true;
}

/**
 * Explicit shop-owner-only guard. Use on any route that reads or mutates shop
 * content (products, orders, customers, discounts). Platform owners get 403 —
 * they must use the /platform routes which expose only privacy-safe metadata.
 */
export async function assertShopOwnerOnly(user: User, storeId: string): Promise<true> {
  return assertStoreAccess(user, storeId);
}

/** Non-throwing variant for read-time checks / selectors. */
export async function canAccessStore(user: User, storeId: string): Promise<boolean> {
  try {
    await assertStoreAccess(user, storeId);
    return true;
  } catch {
    return false;
  }
}
