import crypto from 'crypto';
import { prisma } from '../db.js';

/**
 * Shop-owner onboarding helpers. The platform-owner ↔ shop-owner relationship is
 * manual: approving a request mints a unique slug/username/email and a one-time
 * password that the platform owner relays out-of-band (no email integration).
 */

export function slugify(value: string) {
  const slug = value.toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/[\s_-]+/g, '-').replace(/^-+|-+$/g, '');
  return slug || 'store';
}

export function usernameFromShopSlug(slug: string) {
  return `${slug}-admin`.replace(/-+/g, '-').replace(/^-+|-+$/g, '');
}

export async function uniqueSlug(name: string) {
  const base = slugify(name);
  let slug = base;
  let i = 2;
  while (await prisma.store.findUnique({ where: { slug } })) {
    slug = `${base}-${i}`;
    i += 1;
  }
  return slug;
}

export async function uniqueUsername(baseUsername: string) {
  const base = slugify(baseUsername);
  let username = base;
  let i = 2;
  while (await prisma.user.findUnique({ where: { username } })) {
    username = `${base}-${i}`;
    i += 1;
  }
  return username;
}

export function adminEmailForShop(ownerEmail: string, slug: string) {
  const [local, domain] = ownerEmail.split('@');
  if (!local || !domain) return `${slug}-admin@plinth.local`;
  return `${local}+${slug}-admin@${domain}`;
}

export async function uniqueEmail(baseEmail: string): Promise<string> {
  const [local, domain] = baseEmail.split('@');
  if (!local || !domain) return uniqueEmail(`${slugify(baseEmail)}@plinth.local`);
  let email = baseEmail.toLowerCase();
  let i = 2;
  while (await prisma.user.findUnique({ where: { email } })) {
    email = `${local}-${i}@${domain}`.toLowerCase();
    i += 1;
  }
  return email;
}

/** Generates the one-time password shown once for the platform owner to relay. */
export function shopPassword(slug: string) {
  return `${slug}-${crypto.randomBytes(8).toString('base64url')}`;
}
