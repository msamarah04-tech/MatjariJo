import type { User } from '@prisma/client';

/**
 * Role policy — the single source of truth for role decisions. Route guards and
 * services call these instead of comparing `user.role` strings inline, so the
 * authorization rules live in one tested place.
 */
export type Role = 'PLATFORM_OWNER' | 'SHOP_OWNER';

export function hasRole(user: Pick<User, 'role'>, roles: Role[]): boolean {
  return roles.includes(user.role as Role);
}

export function isPlatformOwner(user: Pick<User, 'role'>): boolean {
  return user.role === 'PLATFORM_OWNER';
}

export function isShopOwner(user: Pick<User, 'role'>): boolean {
  return user.role === 'SHOP_OWNER';
}

export function isActiveOwner(user: Pick<User, 'ownerStatus'>): boolean {
  return user.ownerStatus === 'ACTIVE';
}

export function isBanned(user: Pick<User, 'ownerStatus'>): boolean {
  return user.ownerStatus === 'BANNED';
}
