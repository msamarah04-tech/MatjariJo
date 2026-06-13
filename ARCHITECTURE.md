# Matjari Architecture And Structure

Last updated: 2026-06-06

This document describes the current architecture of Matjari after the production-hardening work
(money correctness, security, transactional commerce, the backend refactor, a shared contract,
Jordan localization, and self-hosted ops). It is direct about what is solid and what is still
incremental.

## Current State

Matjari is a **self-hosted, self-contained, multi-store commerce SaaS** for Jordan — one platform
owner and the shop owners they approve. No third-party integrations; their adapter seams are
designed for later.

The backend is the authoritative domain model in SQLite via Prisma, exposed through a modular
Express API. The React app hydrates from bootstrap/storefront endpoints and mutates through
domain-specific API modules. Frontend and backend share a single typed **contract**.

Domain surface: stores, products (with variants/options), orders + items, discounts, analytics
events, support tickets, product flags, shop requests, audit logs, platform settings, users +
shop-owner assignments — plus money, invoices, and storefront appearance.

## High-Level Architecture

```text
Browser
  |  React routes · Zustand (session/cart) · TanStack Query · i18n/RTL · src/api/*
  v
Vite Frontend  (http://localhost:3000)
  |  HTTP JSON · Bearer access token (+ httpOnly refresh cookie)
  v
Express API  (http://localhost:4000/api)
  |  routes/  ->  policies/  ->  services/  ->  Prisma
  v
SQLite  (WAL, foreign_keys, single pooled writer)

shared/  (contract.ts, money.ts, phone.ts)  is imported by BOTH the frontend and the backend.
```

`npm run dev:all` starts both processes (both auto-reload).

## Shared Contract Layer

[`shared/`](shared/) is the single source of truth shared by both sides, so they cannot silently
drift:

| File | Responsibility |
| --- | --- |
| `contract.ts` | Domain enums (as Zod schemas) + entity TypeScript types. Frontend `types.ts` re-exports them; backend validators import the same enums. |
| `money.ts` | Currency-aware money: integer minor units, per-currency exponent (JOD=3, USD=2), parse/format/round, exponent rescale. |
| `phone.ts` | Jordan mobile (+962, `07[789]…`) validation/normalization/formatting. |

A domain-shape change in `contract.ts` type-errors both the frontend and the backend serializers.

## Source Of Truth

The backend owns all business entities. Frontend persistence is limited to session/UI state:
access token, refresh token, current user, cart contents, and last-seen notification timestamps.
**Money is always an integer count of the currency's minor unit** (never a float); only the money
module divides, and only for display.

## Frontend Architecture

### Entry Points

| File | Responsibility |
| --- | --- |
| `src/main.tsx` | React bootstrap. |
| `src/App.tsx` | `QueryClientProvider` + `LanguageProvider` + router; `initializeBackend()` on load. |
| `src/lib/store.ts` | Zustand: session, cart, hydrated entities, mutations. |
| `src/lib/i18n.tsx` | AR/EN, RTL, locale money/number/date (Asia/Amman). |
| `src/lib/types.ts` | Re-exports the shared contract types. |

### API Modules

[`src/api/`](src/api/) is the contract boundary between UI and backend:

| Module | Responsibility |
| --- | --- |
| `client.ts` | `apiFetch`, token injection, transparent 401→refresh→retry, field-level error surfacing. |
| `auth.api.ts` | Login, current user, logout, refresh, change-password. |
| `bootstrap.api.ts` | Authenticated bootstrap payload. |
| `storefront.api.ts` | Public store/products/discounts, analytics capture, COD checkout. |
| `shopRequests.api.ts` | Public self-service shop-request submission. |
| `admin.api.ts` | Store-scoped admin: products, orders, discounts, support, analytics, appearance, invoice, data export. |
| `platform.api.ts` | Platform-only: requests, stores, moderation, support, analytics, audit, settings, owner status, password reset, **store delete**. |
| `queries.ts` | TanStack Query client + hooks (storefront wired; the migration seam). |

### State And Data Layer

`src/lib/store.ts` (Zustand) holds session + cart + hydrated entity arrays and mutation actions.
**TanStack Query** (`src/api/queries.ts`) is the established server-state layer — wired for the
public storefront read path; migrating the remaining admin/platform reads off the store (and then
slimming the store to session + UI + cart) is the remaining incremental refactor.

### Forms

[`src/components/ui/ResourceFormDrawer.tsx`](src/components/ui/ResourceFormDrawer.tsx) is the shared
form driver: a field schema + Zod validation, money→minor-unit coercion, enforced `required`
fields, and async submit that keeps the drawer open on error so failures are recoverable.

## Backend Architecture

The earlier monolithic `server/routes.ts` has been **split** into route modules backed by services
and a policy layer (this was the top architecture debt and is now done).

### Backend Files

| Area | Files | Responsibility |
| --- | --- | --- |
| App | `app.ts`, `index.ts`, `env.ts`, `db.ts`, `errors.ts`, `logger.ts`, `http.ts` | Express setup (helmet/CSP, CORS, cookies, pino), fail-closed env, Prisma client + SQLite tuning, error handling, async route helper. |
| Auth | `auth.ts` | Access/refresh token sign + verify, `tokenVersion` revocation, role + store-access guards, forced-password-change gate. |
| Commerce | `commerce.ts`, `productDetails.ts` | Server-authoritative order math; variant/option resolution + per-variant stock decrement. |
| Domain helpers | `analytics.ts`, `audit.ts`, `serializers.ts`, `validators.ts` | Insights, append-only audit, Prisma→payload mapping, Zod schemas (shared enums). |
| Routes | `routes/{auth,bootstrap,storefront,platform,admin}.routes.ts` (+ `index.ts`) | Thin handlers; each group applies its own middleware. |
| Services | `services/{onboarding,orders,invoices,dataPrivacy}.ts` | Slug/credential generation, order state machine, invoices, PDPL export/erase. |
| Policies | `policies/{roles,storeAccess}.policy.ts` | The single authorization decision point. |
| Security | `security/{rateLimit,lockout,cookies}.ts` | In-memory IP rate limiting, per-account lockout, refresh-cookie helpers. |

### Route Shape

Mounted under `/api`:

- `/api/health`, `/api/ready`
- `/api/auth/*` — register, login, refresh, me, logout, change-password
- `/api/bootstrap`
- `/api/public/stores/*`, `/api/shop-requests` (storefront)
- `/api/platform/*` — platform-owner only
- `/api/admin/stores/:storeId/*` — store-scoped (the single authority for the order lifecycle)

### Money And Order Totals

Order totals are computed only on the server ([`server/commerce.ts`](server/commerce.ts)) in minor
units: subtotal → discount → shipping → total. Invoices ([`server/services/invoices.ts`](server/services/invoices.ts))
get a sequential per-store number (via `Store.nextInvoiceSeq`) on approval and render printable
HTML in English (LTR) or Arabic (RTL, Arabic-Indic numerals).

## Database Architecture

Prisma owns [`prisma/schema.prisma`](prisma/schema.prisma). **Prisma Migrate is the single
migration path** (`npm run db:deploy`); the old custom SQL fallback runner has been retired.

Migrations:

- `20260605000000_init`
- `20260605001000_usernames`
- `20260606000000_hardening` — money fields, indexes, CHECK constraints, auth/security columns
- `20260606120000_self_service_credentials`
- `20260606143000_storefront_appearance`
- `20260606150000_product_catalog_fields`
- `20260606153000_product_details`
- `20260606162000_order_item_variant_snapshots`

SQLite tuning (in [`server/db.ts`](server/db.ts), kept out of business logic so a Postgres swap is
localized):

- `PRAGMA foreign_keys=ON`, `journal_mode=WAL`, `busy_timeout`, `synchronous=NORMAL`.
- `connection_limit=1` so the busy_timeout PRAGMA applies to the connection serving every query and
  writers serialize cleanly — which the conditional-UPDATE checkout guarantees rely on.
- Money in integer minor units; enum-like fields as strings (validated by shared Zod enums);
  JSON-like data (product `details`, `tags`, `themeOverrides`) as text.
- A few CHECK constraints (non-negative money/counters) as defense-in-depth; Zod is the primary guard.

`prisma/seed.ts` seeds only the platform owner + platform settings (no demo data).

## Authentication And Authorization

### Tokens

- **Access token**: short-lived JWT, sent as a Bearer header.
- **Refresh token**: long-lived JWT in an **httpOnly, SameSite=Strict** cookie (not readable by JS).
- Both carry `tv` (the user's `tokenVersion`). Bumping `tokenVersion` on logout / password change /
  reset / ban **revokes every previously issued token immediately**.
- The frontend transparently calls `/auth/refresh` on a 401 and retries.

### Hardening

- **Fail-closed** boot in production on weak/default secrets or unchanged seed password.
- **Per-account lockout** (persisted) + **in-memory IP rate limiting** on login and public writes.
- **helmet** + strict CSP, **CORS** locked to `FRONTEND_ORIGIN`.
- **Append-only security audit** — security-flagged events are exempt from `auditCap` pruning.

### Roles & Store Isolation

| Role | Access |
| --- | --- |
| `PLATFORM_OWNER` | Full platform + all stores (oversight). |
| `SHOP_OWNER` | Only the one store assigned to them. |

All store-scoped access flows through [`policies/storeAccess.policy.ts`](server/policies/storeAccess.policy.ts)
— one tested decision point, so no endpoint can forget the guard. A shop owner cannot reach another
store; the frontend also hides unrelated stores.

### Credentials

Self-service: the requester chooses username + password (bcrypt-hashed at request time); approval
creates the account with those credentials and the owner signs in directly. A platform-owner reset
issues a one-time password, forces a change on next login, and revokes existing sessions.

## Major Flows

```text
Self-service onboarding
  visitor requests website (username + password) -> platform owner approves
  -> store + shop-owner account created -> owner signs in directly

COD checkout (one transaction)
  reload products -> recompute totals (minor units)
  -> atomic conditional stock decrement (simple + per-variant)
  -> atomic discount usage claim -> create order (idempotency key)

Order lifecycle (single authority: store-scoped endpoint)
  PENDING -> APPROVED|REJECTED ;  APPROVED -> FULFILLED
  approval assigns the sequential invoice number

App startup
  Zustand restores tokens -> GET /api/bootstrap -> hydrate role-scoped entities
  (public storefront loads without auth)
```

## Observability And Ops

- **pino** structured logging with per-request ids (compact in dev, JSON in prod; secrets redacted).
- `/api/health` (liveness) and `/api/ready` (DB-checked; 503 when the DB is unreachable).
- **Backup**: `npm run db:backup` writes a consistent snapshot via `VACUUM INTO` (safe under WAL).
- **CI**: [`.github/workflows/ci.yml`](.github/workflows/ci.yml) gates merges on typecheck + API
  tests + web tests + build.
- **Runbook**: [OPERATIONS.md](OPERATIONS.md).

## Testing

| Suite | Runner | Coverage |
| --- | --- | --- |
| `tests/api.test.ts` | `node --test` | Isolation, health/ready, **store deletion** (authz), checkout totals. |
| `tests/security.test.ts` | `node --test` | Token revocation on logout/password-change, lockout, self-service login + reset-forces-change, fail-closed boot. |
| `tests/commerce.test.ts` | `node --test` | **Concurrent checkout: no oversell, no over-limit discount**, idempotency, server-side totals. |
| `tests/invoices.test.ts` | `node --test` | Sequential invoice numbering, printable HTML (EN/AR), pending-order guard. |
| `tests/policy.test.ts` | `node --test` | Role + store-access policy decisions. |
| `tests/money.test.ts` | `node --test` | Currency exponents, parse/format, rescale, +962 phone. |
| `tests/web/*.test.tsx` | Vitest + Testing Library | i18n toggle/RTL, money formatting, storefront cart. |
| `tests/e2e/checkout.spec.ts` | Playwright | Storefront/RTL smoke (scaffold; needs `npx playwright install`). |

## Known Architecture Debt

- **Server-state migration to TanStack Query is partial.** The seam exists and the storefront uses
  it; admin/platform reads still hydrate the Zustand store. Finishing this lets the store shrink to
  session + UI + cart only.
- **i18n string coverage is partial.** Infrastructure, RTL, locale formatting, and the storefront
  are wired; not every admin/platform string is translated yet.
- **Single large Vite chunk.** The build warns about bundle size; code-splitting is a future task.
- **`src/lib/store.ts` is still broad** (shrinks as TanStack adoption completes).

## Deferred Integrations (adapter seams designed, not built)

PostgreSQL migration (Prisma + clean data access keeps the swap local) · card payment gateways
behind a `PaymentProvider` (COD is the only implementation) · JoFotara e-invoicing behind an
`InvoiceClearance` adapter (internal invoices only) · email/SMS (manual/self-service instead) ·
external error tracking, real-time order push (SSE), and SEO/SSR storefront.

## Foundation Summary

The frontend and backend now speak one typed domain language; money is exact and currency-aware;
checkout is transactional and server-authoritative; authorization is centralized; the backend is
split into routes/services/policies; and the system is observable, tested, and operable on its own.
The remaining work is incremental (finish the query-layer migration, broaden i18n, split the
bundle) rather than structural.
