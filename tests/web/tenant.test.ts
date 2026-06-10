import { afterEach, describe, expect, it, vi } from 'vitest';
import { storefrontUrl, tenantFromHostname } from '@/lib/tenant';

describe('tenantFromHostname', () => {
  it('extracts the store slug from a subdomain of the base domain', () => {
    expect(tenantFromHostname('borz.matjari.jo', 'matjari.jo')).toBe('borz');
    expect(tenantFromHostname('coffee-corner-2.matjari.jo', 'matjari.jo')).toBe('coffee-corner-2');
  });

  it('is case-insensitive', () => {
    expect(tenantFromHostname('Borz.Matjari.jo', 'matjari.jo')).toBe('borz');
  });

  it('returns null for the apex domain and unrelated hosts', () => {
    expect(tenantFromHostname('matjari.jo', 'matjari.jo')).toBeNull();
    expect(tenantFromHostname('other-site.com', 'matjari.jo')).toBeNull();
    // Suffix match must respect the label boundary.
    expect(tenantFromHostname('evilmatjari.jo', 'matjari.jo')).toBeNull();
  });

  it('returns null for reserved subdomains', () => {
    for (const reserved of ['www', 'api', 'app', 'admin', 'platform', 'staging']) {
      expect(tenantFromHostname(`${reserved}.matjari.jo`, 'matjari.jo')).toBeNull();
    }
  });

  it('rejects nested subdomains and labels that are not valid slugs', () => {
    expect(tenantFromHostname('deep.borz.matjari.jo', 'matjari.jo')).toBeNull();
    expect(tenantFromHostname('-bad-.matjari.jo', 'matjari.jo')).toBeNull();
  });

  it('supports <slug>.localhost in development without a configured base domain', () => {
    expect(tenantFromHostname('borz.localhost', '')).toBe('borz');
    expect(tenantFromHostname('localhost', '')).toBeNull();
    expect(tenantFromHostname('www.localhost', '')).toBeNull();
  });

  it('returns null for subdomains when no base domain is configured', () => {
    expect(tenantFromHostname('borz.matjari.jo', '')).toBeNull();
  });
});

describe('storefrontUrl', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('builds <slug>.localhost URLs in local development', () => {
    expect(storefrontUrl('borz', { hostname: 'localhost', protocol: 'http:', port: '5000' }))
      .toBe('http://borz.localhost:5000/');
    expect(storefrontUrl('borz', { hostname: 'other.localhost', protocol: 'http:', port: '5000' }))
      .toBe('http://borz.localhost:5000/');
  });

  it('falls back to the path-based route on unknown hosts', () => {
    expect(storefrontUrl('borz', { hostname: '192.168.1.5', protocol: 'http:', port: '5000' }))
      .toBe('/#/s/borz');
  });

  it('builds subdomain URLs when the base domain is configured', async () => {
    vi.stubEnv('VITE_PUBLIC_BASE_DOMAIN', 'matjari.jo');
    vi.resetModules();
    const tenant = await import('@/lib/tenant');
    expect(tenant.storefrontUrl('borz', { hostname: 'matjari.jo', protocol: 'https:', port: '' }))
      .toBe('https://borz.matjari.jo/');
    expect(tenant.storefrontUrl('borz', { hostname: 'other.matjari.jo', protocol: 'https:', port: '' }))
      .toBe('https://borz.matjari.jo/');
    // Visiting from an unrelated host still falls back to the path route.
    expect(tenant.storefrontUrl('borz', { hostname: 'preview.example.dev', protocol: 'https:', port: '' }))
      .toBe('/#/s/borz');
  });
});
