// Multi-tenant hosts: each store can be served from its own subdomain
// (e.g. borz.matjari.jo). The platform's base domain comes from
// VITE_PUBLIC_BASE_DOMAIN; `<slug>.localhost` works in development without
// any configuration (browsers resolve *.localhost to loopback).

// Subdomains that can never be a store, even if a matching slug exists.
const RESERVED_SUBDOMAINS = new Set(['www', 'api', 'app', 'admin', 'platform', 'staging']);

const normalizeDomain = (value: string) => value.toLowerCase().replace(/^\.+|\.+$/g, '');

export const BASE_DOMAIN = normalizeDomain(import.meta.env.VITE_PUBLIC_BASE_DOMAIN || '');

// Store slugs are lowercase alphanumerics with single hyphens (see server
// services/onboarding.ts slugify) — exactly one DNS label, never nested.
const isTenantLabel = (label: string) =>
  !RESERVED_SUBDOMAINS.has(label) && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(label);

/** Extract the store slug from a hostname, or null when this is not a tenant host. */
export function tenantFromHostname(hostname: string, baseDomain: string = BASE_DOMAIN): string | null {
  const host = normalizeDomain(hostname);
  if (host.endsWith('.localhost')) {
    const label = host.slice(0, -'.localhost'.length);
    return isTenantLabel(label) ? label : null;
  }
  if (!baseDomain || host === baseDomain || !host.endsWith(`.${baseDomain}`)) return null;
  const label = host.slice(0, -(baseDomain.length + 1));
  return isTenantLabel(label) ? label : null;
}

/** The store slug this page is being served for, or null on the main app domain. */
export function getTenantSlug(): string | null {
  if (typeof window === 'undefined') return null;
  return tenantFromHostname(window.location.hostname);
}

type LocationLike = Pick<Location, 'hostname' | 'protocol' | 'port'>;

/**
 * Public URL for a storefront. Returns the subdomain URL when the current host
 * belongs to the configured base domain (or localhost in dev); otherwise falls
 * back to the path-based route, which keeps working everywhere.
 */
/**
 * URL for a page on the main app domain (e.g. '/privacy'). From a tenant
 * subdomain this points back at the apex; on the main host it stays relative.
 */
export function mainSiteUrl(hashPath: string, loc?: LocationLike): string {
  const location = loc ?? (typeof window === 'undefined' ? null : window.location);
  if (!location) return `/#${hashPath}`;
  const host = location.hostname.toLowerCase();
  const portSuffix = location.port ? `:${location.port}` : '';
  if (host.endsWith('.localhost')) return `${location.protocol}//localhost${portSuffix}/#${hashPath}`;
  if (BASE_DOMAIN && host.endsWith(`.${BASE_DOMAIN}`)) return `${location.protocol}//${BASE_DOMAIN}${portSuffix}/#${hashPath}`;
  return `/#${hashPath}`;
}

export function storefrontUrl(slug: string, loc?: LocationLike): string {
  const location = loc ?? (typeof window === 'undefined' ? null : window.location);
  if (!location) return `/#/s/${slug}`;
  const host = location.hostname.toLowerCase();
  const portSuffix = location.port ? `:${location.port}` : '';
  if (host === 'localhost' || host.endsWith('.localhost')) {
    return `${location.protocol}//${slug}.localhost${portSuffix}/`;
  }
  if (BASE_DOMAIN && (host === BASE_DOMAIN || host.endsWith(`.${BASE_DOMAIN}`))) {
    return `${location.protocol}//${slug}.${BASE_DOMAIN}${portSuffix}/`;
  }
  return `/#/s/${slug}`;
}
