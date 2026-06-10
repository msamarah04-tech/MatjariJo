# Matjari — E-Commerce SaaS Project Overview

Last updated: 2026-06-09

> Companion docs: [ARCHITECTURE.md](ARCHITECTURE.md) (deeper design), [OPERATIONS.md](OPERATIONS.md)
> (runbook), [ADMIN_FRONTEND_TEMPLATE.md](ADMIN_FRONTEND_TEMPLATE.md) (admin UI conventions).

## What Matjari Is

**Matjari is a self-hosted, self-contained, multi-store e-commerce SaaS built for the Jordanian
market.** One **platform owner** runs the whole tenant: they review incoming "request a website"
applications, approve the ones they want, and oversee every store from a single control center.
Each approved **shop owner** gets exactly one storefront they manage end to end — products,
orders, discounts, appearance, analytics, support, and tax invoices. The **public** browses those
storefronts and checks out with Cash on Delivery; no shopper account is required.

There are three actors, and the whole product is organized around them:

| Actor | What they do |
| --- | --- |
| **Public customer** | Browse a storefront, add to cart, place a COD order, submit a "request a website" application. No login. |
| **Shop owner** | Manage their **one** assigned store: catalog (incl. variants), orders, discounts, storefront appearance, analytics, support tickets, tax invoices, data export. |
| **Platform owner** | Manage **all** stores: approve/reject requests, suspend/feature/delete stores, set commission, moderate flagged products, run support, read platform-wide analytics + the audit log, edit platform settings, reset owner passwords. |

Two principles define the codebase:

1. **The backend is the single source of truth.** Every business entity lives in the database; the
   frontend hydrates from it and sends mutations through typed API modules. Money totals, tax,
   stock, and discount usage are all (re)computed **server-side** — client values are never trusted.
2. **No third-party integrations.** Everything runs inside this app and its own SQLite database —
   no payment gateway, tax-authority transmission, email/SMS, external auth, or log shipping. Each
   of those is designed as an **adapter seam** so a real provider can drop in later (see *Deferred*).

## What's Jordan-Specific

- **Currency is JOD with 3 decimal places** (1 JOD = 1000 fils). Money is always an integer count
  of minor units + a currency code; one module ([`shared/money.ts`](shared/money.ts)) owns all
  parse/format/round/tax math. USD (2 decimals) also works for stores that need it.
- **GST 16%** (1600 bps default) computed **server-side at checkout** — a configurable platform
  default with an optional per-store rate override, tax-inclusive or exclusive — plus proper
  **internal tax invoices** (sequential per-store numbering, printable in English LTR and Arabic RTL).
- **Arabic + English with full RTL**, Asia/Amman dates, Western and Arabic-Indic numerals, and
  **+962** mobile validation (`07[789]…`).
- **Cash on Delivery only** (first-class, internal), with a platform **commission** (default 800
  bps / 8%, per-store override in basis points) captured per order for settlement reporting.

## Tech Stack

- **Frontend:** React 19, TypeScript, Vite 6, React Router 7 (hash router), Zustand 5,
  **TanStack Query 5**, Tailwind CSS 4, React Hook Form + Zod, Framer Motion, Recharts, lucide-react.
- **Backend:** Express 4, TypeScript, Prisma 5, SQLite (WAL, foreign keys, single pooled writer),
  bcrypt, jsonwebtoken, helmet, cors, cookie-parser, pino / pino-http.
- **Shared:** a typed domain **contract** + money + phone + product-category modules under
  [`shared/`](shared/), imported by **both** sides so they cannot silently drift.
- **Auth:** short-lived JWT access tokens + refresh-token httpOnly cookie, bcrypt hashes,
  server-side revocation via `tokenVersion`.
- **Security:** helmet + strict CSP, CORS locked to `FRONTEND_ORIGIN`, per-account lockout,
  in-memory IP rate limiting, append-only security audit log, fail-closed production boot.
- **Localization:** self-contained i18n (AR/EN, RTL) in [`src/lib/i18n.tsx`](src/lib/i18n.tsx).
- **Validation:** Zod at the API boundary, reusing the shared enums.
- **Observability:** pino structured logging with request ids, `/api/health` + `/api/ready`.
- **Tests:** Node test runner (API), Vitest + Testing Library (web), Playwright (E2E).
- **Tooling:** TypeScript, Vite build, GitHub Actions CI.

## How It Fits Together

```text
Browser (SPA, hash routes)
  |  React routes · Zustand (session/cart) · TanStack Query · i18n/RTL · src/api/*
  v
Vite Frontend  (http://localhost:3000)
  |  HTTP JSON · Bearer access token (+ httpOnly refresh cookie)
  v
Express API  (http://localhost:4000/api)
  |  routes/  ->  policies/  ->  services/  ->  Prisma
  v
SQLite  (WAL, foreign_keys, single pooled writer)

shared/  (contract.ts, money.ts, phone.ts, productCategorySchemas.ts)  is imported by BOTH sides.
```

`npm run dev:all` starts both processes (both auto-reload). A domain-shape change in
[`shared/contract.ts`](shared/contract.ts) type-errors **both** the frontend and the backend
serializers, so they stay in lockstep.

## Project Structure

```text
.
├── shared/                          # imported by BOTH frontend and backend — the typed contract
│   ├── contract.ts                  # domain enums (as Zod schemas) + entity TS types (source of truth)
│   ├── money.ts                     # currency-aware minor-unit money (JOD=3, USD=2) + tax/bps math
│   ├── phone.ts                     # +962 Jordan mobile validation / normalization
│   └── productCategorySchemas.ts    # category attribute taxonomy (additive details layer)
│
├── prisma/
│   ├── migrations/                  # 8 migrations — Prisma Migrate is the single migration path
│   ├── schema.prisma                # database schema (data-model source of truth)
│   ├── seed.ts                      # seeds ONLY the platform owner + platform settings (no demo data)
│   └── dev.db                       # local SQLite file (+ -wal/-shm sidecars; gitignored)
│
├── scripts/
│   └── backup.ts                    # consistent SQLite snapshot via VACUUM INTO
│
├── server/                          # Express + TypeScript API (mounted at /api)
│   ├── app.ts                       # helmet/CSP, CORS, cookies, pino, router mount
│   ├── index.ts                     # process bootstrap + listen
│   ├── env.ts                       # env parsing + fail-closed production checks
│   ├── db.ts                        # Prisma client, SQLite PRAGMA tuning, withTransaction()
│   ├── errors.ts                    # ApiError helpers (badRequest / notFound / conflict / …)
│   ├── logger.ts                    # pino logger config
│   ├── http.ts                      # asyncRoute wrapper + small request helpers
│   ├── auth.ts                      # token sign/verify, tokenVersion revocation, role/store guards
│   ├── commerce.ts                  # server-authoritative order math (subtotal→discount→GST→shipping→total)
│   ├── productDetails.ts            # variant/option resolution + per-variant stock decrement
│   ├── analytics.ts                 # store + platform insight aggregations
│   ├── audit.ts                     # append-only audit log writers + settings accessor
│   ├── serializers.ts               # Prisma row → API payload mapping (typed to the contract)
│   ├── validators.ts                # Zod request schemas (reuse shared enums)
│   ├── routes/
│   │   ├── index.ts                 # composes the API surface + /health + /ready
│   │   ├── auth.routes.ts           # register / login / refresh / me / logout / change-password
│   │   ├── bootstrap.routes.ts      # one role-scoped hydration payload
│   │   ├── storefront.routes.ts     # public store/products/analytics, COD checkout, shop-requests
│   │   ├── platform.routes.ts       # platform-owner: requests, stores, moderation, support, audit, …
│   │   └── admin.routes.ts          # store-scoped: products, orders, discounts, support, invoice
│   ├── services/
│   │   ├── onboarding.ts            # unique slug / username / email + one-time password generation
│   │   ├── orders.ts                # order state machine (the single lifecycle authority)
│   │   ├── invoices.ts              # GST tax-invoice model + printable HTML (EN/AR)
│   │   └── dataPrivacy.ts           # PDPL data export + customer-PII erase
│   ├── policies/
│   │   ├── roles.policy.ts          # role predicates (isPlatformOwner, …)
│   │   └── storeAccess.policy.ts    # THE single store-isolation decision point
│   └── security/
│       ├── rateLimit.ts             # in-memory IP rate limiting (login + public writes)
│       ├── lockout.ts               # persisted per-account brute-force lockout
│       └── cookies.ts               # refresh-cookie read / set / clear
│
├── src/                             # React 19 + Vite frontend (single-page app, hash router)
│   ├── main.tsx                     # React bootstrap
│   ├── App.tsx                      # QueryClientProvider + LanguageProvider + router; hydrate on load
│   ├── index.css                    # Tailwind entry + theme tokens
│   ├── api/                         # typed client boundary between UI and backend
│   │   ├── client.ts                # apiFetch, token injection, 401→refresh→retry, field-error surfacing
│   │   ├── auth.api.ts              # login / me / logout / refresh / change-password
│   │   ├── bootstrap.api.ts         # authenticated bootstrap payload
│   │   ├── storefront.api.ts        # public store/products/discounts, analytics, COD checkout
│   │   ├── shopRequests.api.ts      # public self-service shop-request submission
│   │   ├── admin.api.ts             # store-scoped admin calls
│   │   ├── platform.api.ts          # platform-only calls
│   │   └── queries.ts               # TanStack Query client + hooks (server-state seam)
│   ├── components/
│   │   ├── layout/                  # AppTopBar, RequireRole (route guard), ChangePassword
│   │   ├── storefront/              # MiniStorefront (live preview), ProductCard, ProductDetailCard
│   │   └── ui/                      # design system: Button, Card, Modal, Drawer, ResourceTable,
│   │                                #   ResourceFormDrawer, ConfirmDialog, Skeleton, Toast,
│   │                                #   LanguageToggle, dashboard, Badge, Field, Input, Textarea, …
│   ├── lib/
│   │   ├── store.ts                 # Zustand: session + cart + hydrated entities + mutations
│   │   ├── i18n.tsx                 # AR/EN, RTL dir switching, locale money/number/date (Asia/Amman)
│   │   ├── format.ts                # locale-aware money() facade + slugify / timeAgo helpers
│   │   ├── checkout.ts              # cart → order payload, client-side total preview
│   │   ├── productOptions.ts        # option/variant matrix, price + stock resolution, gallery
│   │   ├── productCategory.ts       # frontend adapter over the shared category taxonomy (localized)
│   │   ├── images.ts                # client image resize/compress to data URLs
│   │   ├── analytics.ts             # client-side analytics range/aggregation helpers
│   │   ├── themes.ts                # storefront theme + template tokens
│   │   ├── types.ts                 # re-exports the shared contract types
│   │   ├── useFocusParam.ts         # ?focus=<id> deep-link hook (auto-open drawers / highlight rows)
│   │   └── seed.ts                  # static demo data (frontend reference only)
│   └── routes/
│       ├── Landing.tsx              # public marketing landing page
│       ├── SignIn.tsx               # sign in (username or email)
│       ├── OwnerAccess.tsx          # owner credential entry / first-login change
│       ├── admin/                   # shop-owner workspace (store-scoped; platform owner can view any)
│       │   ├── Admin.tsx            # shell: sidebar, store switcher, nested routes, command palette
│       │   ├── Overview.tsx · Products.tsx · Orders.tsx · Discounts.tsx · Analytics.tsx · Appearance.tsx
│       │   ├── ProductWizard.tsx    # multi-step product create/edit (category-aware, variants, images)
│       │   ├── NewStore.tsx         # public "request a website" form (chooses username + password)
│       │   ├── CommandPalette.tsx   # ⌘K quick nav/actions
│       │   └── shared.tsx           # admin context + per-store nav badges
│       ├── platform/                # platform-owner control center
│       │   ├── Platform.tsx         # shell: sidebar, nested routes, notifications, command palette
│       │   ├── Overview.tsx · ShopRequests.tsx · Stores.tsx · Moderation.tsx · Support.tsx
│       │   ├── Analytics.tsx · AuditLog.tsx · Settings.tsx
│       │   ├── NotificationsBell.tsx · CommandPalette.tsx
│       │   └── shared.tsx           # platform context + nav badges
│       └── storefront/
│           └── Storefront.tsx       # public storefront (lazy-loaded): catalog, cart, COD checkout
│
├── tests/
│   ├── api.test.ts · commerce.test.ts · invoices.test.ts · money.test.ts            # node --test
│   ├── policy.test.ts · productCatalog.test.ts · security.test.ts                   # node --test
│   ├── helpers.ts                   # API test harness
│   ├── web/                         # Vitest + Testing Library (i18n, product cards, cart, category)
│   └── e2e/checkout.spec.ts         # Playwright storefront/RTL smoke
│
├── .github/workflows/ci.yml         # typecheck + API tests + web tests + build gate
├── ARCHITECTURE.md                  # deeper architecture reference
├── OPERATIONS.md                    # runbook: env, health, backup/restore, credentials, PDPL
├── ADMIN_FRONTEND_TEMPLATE.md       # admin/platform UI conventions + template
├── PROJECT_OVERVIEW.md              # this file
├── README.md
├── package.json · tsconfig.json
├── vite.config.ts · vitest.config.ts · playwright.config.ts
└── .env.example
```

## Frontend Overview

- **Routing** ([`src/App.tsx`](src/App.tsx)) uses a **hash router** wrapped in `QueryClientProvider`
  (TanStack Query) and `LanguageProvider` (i18n/RTL). Top-level routes: `/` (Landing), `/sign-in`,
  `/owner-access`, `/request-website`, `/platform/*` (platform owner), `/admin/*` (shop owner +
  platform owner), and `/s/:slug/*` (public storefront, lazy-loaded). `initializeBackend()` hydrates
  an authenticated session on load. [`RequireRole`](src/components/layout/RequireRole.tsx) guards the
  authenticated areas.
- **Admin shell** ([`src/routes/admin/Admin.tsx`](src/routes/admin/Admin.tsx)) resolves the active
  store, offers a store switcher (platform owners can open any store; shop owners are pinned to their
  one store), and nests **Overview / Products / Orders / Discounts / Analytics / Appearance** plus a
  ⌘K command palette and the category-aware **ProductWizard**.
- **Platform shell** ([`src/routes/platform/Platform.tsx`](src/routes/platform/Platform.tsx)) nests
  **Overview / Shop Requests / Stores / Moderation / Support / Analytics / Audit Log / Settings**,
  with a notifications bell and command palette. Heavy chart views (Analytics) are lazy-loaded.
- **API layer** ([`src/api/`](src/api/)) is split by domain (`client`, `auth`, `bootstrap`,
  `storefront`, `shopRequests`, `admin`, `platform`) plus `queries.ts` (TanStack Query hooks). The
  client transparently refreshes on 401 and surfaces field-level validation errors.
- **State** ([`src/lib/store.ts`](src/lib/store.ts)) — Zustand holds session + cart + hydrated
  entities; persistence is limited to tokens, current user, carts, and notification timestamps.
  TanStack Query is the server-read seam (storefront wired; admin/platform migration is incremental).
- **i18n** ([`src/lib/i18n.tsx`](src/lib/i18n.tsx)) provides AR/EN, RTL `dir` switching, and
  locale-aware money/number/date (Asia/Amman). `money()` is locale-aware app-wide.
- **Forms** — [`ResourceFormDrawer`](src/components/ui/ResourceFormDrawer.tsx) and
  [`ResourceTable`](src/components/ui/ResourceTable.tsx) are the shared CRUD primitives (field schema
  + Zod, money→minor-unit coercion, recoverable async submit).

## Backend Overview

The API is mounted at `/api` and assembled from focused route modules
([`server/routes/`](server/routes/)) backed by service modules ([`server/services/`](server/services/))
and a policy layer ([`server/policies/`](server/policies/)). Highlights:

- **Auth** — short-lived access JWT (Bearer) + long-lived refresh JWT (httpOnly, SameSite=Strict
  cookie). `tokenVersion` is embedded in tokens and checked per request, so logout, password change,
  reset, and bans revoke tokens immediately. Per-account lockout + IP rate limiting on login and
  public writes.
- **Commerce** — checkout runs in one transaction: reload products, **recompute totals server-side**
  (subtotal → discount → GST → shipping → total, in minor units), **atomic conditional stock
  decrement** (simple and per-variant), **atomic discount usage enforcement**, and an **idempotency
  key** so retries don't double-create orders. The order **state machine** has a single authority —
  the store-scoped endpoint.
- **Invoices** — sequential per-store tax-invoice numbers assigned on approval; printable HTML in
  EN/AR via [`server/services/invoices.ts`](server/services/invoices.ts).
- **Data hygiene (PDPL)** — per-store data export and customer-PII erase, both security-audited.
- **Authorization** — every store-scoped route flows through
  [`storeAccess.policy.ts`](server/policies/storeAccess.policy.ts), one tested decision point, so no
  endpoint can forget the guard.
- **Ops** — pino request logging with request ids, `/api/health` (liveness) and `/api/ready`
  (DB-checked, 503 when the DB is unreachable).

## API Surface

All under `/api`. Auth groups apply their own middleware (platform/admin require an authenticated,
password-rotated user; admin additionally enforces per-store access).

| Group | Endpoints |
| --- | --- |
| **Health** | `GET /health` · `GET /ready` |
| **Auth** | `POST /auth/register-owner` (gated) · `POST /auth/login` · `POST /auth/refresh` · `GET /auth/me` · `POST /auth/logout` · `POST /auth/change-password` |
| **Bootstrap** | `GET /bootstrap` (one role-scoped hydration payload) |
| **Storefront (public)** | `GET /public/stores/:slug` · `GET /public/stores/:slug/products` · `POST /public/stores/:slug/analytics` · `POST /public/stores/:slug/orders` (COD, idempotent) · `POST /shop-requests` |
| **Admin (store-scoped)** | `GET /admin/stores` · `GET\|PATCH /admin/stores/:id` · `GET …/data-export` · products `GET\|POST\|GET:pid\|PATCH:pid\|DELETE:pid` · `POST …/products/:pid/flags` · orders `GET\|GET:oid\|GET:oid/invoice\|POST:oid/{approve,reject,fulfill}` · discounts `GET\|POST\|GET:did\|PATCH:did\|DELETE:did` · `GET …/analytics` · support `GET\|POST\|GET:tid\|POST:tid/reply` |
| **Platform (owner-only)** | `GET /platform/overview` · shop-requests `GET\|POST:id/approve\|POST:id/reject` · stores `GET\|GET:id\|PATCH:id\|POST:id/{suspend,reactivate,feature,unfeature}\|PATCH:id/{commission,owner-status}\|POST:id/reset-owner-password\|DELETE:id\|GET:id/data-export\|POST:id/erase-customer-data` · `GET /platform/orders` (read-only) · moderation `GET /flags\|POST:id/{dismiss,action,unpublish-product}` · support `GET\|GET:id\|POST:id/reply\|PATCH:id/{status,assign-to-me}` · `GET /platform/analytics` · `GET /platform/audit` (paged/filtered) · `GET\|PATCH /platform/settings` |

> Note: order lifecycle transitions (approve / reject / fulfill) have **one** authority — the
> store-scoped admin endpoints. The platform owner acts through those via oversight store access; the
> platform's own `/orders` route is read-only.

## Data Model

Prisma owns [`prisma/schema.prisma`](prisma/schema.prisma). Core entities:

- **User** — role (`PLATFORM_OWNER` / `SHOP_OWNER`), `ownerStatus` (ACTIVE/RESTRICTED/BANNED),
  `tokenVersion`, `mustChangePassword`, lockout fields (`failedLoginCount`, `lockedUntil`).
- **Store** — slug, currency, shipping config, commission override, **tax/invoice fields**
  (`taxRateBpsOverride`, `pricesIncludeTax`, `taxRegistrationNumber`, `contactPhone`, `address`,
  `nextInvoiceSeq`), governance (`status`, `reviewStatus`, `isFeatured`, `suspensionReason`,
  `internalNote`), and **appearance** (`themeId`, `storefrontTemplate`, `themeOverrides`).
- **Product** — price/compareAt/stock/images plus `category`, `collection`, `tags` (JSON), and a
  rich `details` JSON blob (selling type, options, **variants**, gallery, detail rows, and the
  category taxonomy `categoryKey` + `attributes`).
- **Order / OrderItem** — currency snapshot, subtotal/discount/**tax**/shipping/total + the
  tax rate & inclusive flag actually used, captured **commission**, payment method (COD),
  idempotency key, invoice number; items carry variant snapshots (title/sku/image).
- **Discount** — code, type (PERCENT / FIXED / FREE_SHIPPING), value, min subtotal, usage limit +
  count, expiry. Unique per `(storeId, code)`.
- **AnalyticsEvent** — view / add_to_cart / checkout_start / order, optional product/order/session.
- **SupportTicket / TicketMessage** — owner ↔ platform threads with status/priority/assignee.
- **ProductFlag** — moderation flags with severity + status.
- **ShopRequest** — the public application, including **self-service credentials** (chosen username +
  bcrypt password hash, cleared on approval).
- **AuditLog** — append-only; security-flagged entries are exempt from `auditCap` pruning.
- **PlatformSettings** — commission default (800 bps), default currency, categories, GST defaults
  (1600 bps), maintenance mode, support email, audit cap, auto-flag threshold.

Money is stored as **integers in the currency's minor unit** (never a float). Enum-like fields are
strings validated by the shared Zod enums; JSON-like data (`details`, `tags`, `themeOverrides`) is
stored as text. Migrations live in [`prisma/migrations/`](prisma/migrations/) and **Prisma Migrate is
the single migration path**.

## Product Catalog & Category Taxonomy

Products support two selling types that checkout depends on: **SIMPLE** (one price/stock) and
**VARIABLE** (options → variants, each with its own price/stock/SKU/image). On top of that,
[`shared/productCategorySchemas.ts`](shared/productCategorySchemas.ts) adds a **category attribute
taxonomy**: each category (apparel, beauty, food, electronics, …) "unlocks" its own relevant,
filterable fields (size/fit, scent/volume, ingredients/allergens, power/compatibility, etc.).

This is an **additive layer** — the chosen category lives in `details.categoryKey` and its validated
values in `details.attributes`. It never rewrites the commerce-critical options/variants shape. The
same framework-agnostic schema drives all three sides: the [ProductWizard](src/routes/admin/ProductWizard.tsx)
renders fields dynamically, the backend validates them (`normalizeProductDetails` at the admin write
path), and the storefront renders the ones marked visible — so the form, the API, and the storefront
cannot drift.

## Roles & Access

| Role | Access |
| --- | --- |
| **Public customer** | Storefront browsing, cart, COD checkout, public analytics events, shop-request submission. No account. |
| **Shop owner** | One assigned store only: products (incl. variants), orders, discounts, appearance, analytics, support, tax invoices, data export. |
| **Platform owner** | All stores: requests/approvals, store controls, moderation, support, analytics, audit log, settings, commission, owner status, password reset, store deletion. |

Per-store isolation is enforced server-side through the single policy layer; the frontend also limits
a shop owner's workspace to their assigned store.

## Key Workflows

- **Self-service onboarding** — a visitor requests a website (choosing their own username +
  password) → platform owner approves → store + owner account are created with those exact
  credentials → owner signs in **directly** (no relay, no forced change).
- **COD checkout** — customer checks out → backend recomputes totals + GST, atomically decrements
  stock and claims discount usage, creates the order (idempotent). Client prices are never trusted.
- **Order lifecycle** — `PENDING → APPROVED | REJECTED`, then `APPROVED → FULFILLED`; approving
  assigns the sequential per-store tax-invoice number.
- **Tax invoice** — `GET /api/admin/stores/:id/orders/:orderId/invoice` (printable HTML;
  `?lang=ar` for Arabic RTL, `?format=json` for the model).
- **Moderation** — flagged products can be dismissed, actioned, or unpublished by the platform owner.
- **Password reset / store deletion / data export-erase** — platform-owner actions, all
  security-audited; resets force a first-login change and revoke existing sessions.

## Accounts & Credentials

### Platform owner

Seeded from `.env`; signs in with username **or** email.

| Role | Username | Email | Password |
| --- | --- | --- | --- |
| Platform owner | `platform-admin` | `owner@matjari.local` | `ChangeMe123!` |

### Shop owners (self-service)

Shop owners **choose their own username + password** on the public "request a website" form. The
password is bcrypt-hashed immediately and never stored in readable form. On **approval**, the account
is created with those credentials and the owner signs in directly. If an owner is locked out, the
platform owner can **reset** the password from `Platform → Stores → select store → Reset password`: a
reset issues a one-time password, forces a change on next login, and revokes existing sessions. Every
credential action is written to the append-only security audit log. (Legacy requests created before
self-service fall back to a generated one-time password the platform owner relays.)

## Quick Start

```bash
npm install
cp .env.example .env
npm run db:generate     # generate the Prisma client
npm run db:deploy       # apply Prisma migrations (single migration path)
npm run db:seed         # seed the platform owner + platform settings (no demo data)
npm run dev:all         # frontend (:3000) + backend (:4000), both auto-reload
```

Default local URLs:

- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:4000/api`

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Vite frontend only (port 3000). |
| `npm run api:dev` | Express backend only (`tsx watch`, auto-reload). |
| `npm run dev:all` | Backend + frontend together (concurrently). |
| `npm run db:generate` | Generate the Prisma client. |
| `npm run db:migrate` | Create/apply a migration in development (`prisma migrate dev`). |
| `npm run db:deploy` | Apply pending migrations (`prisma migrate deploy`) — the deployment path. |
| `npm run db:seed` | Seed the platform owner + platform settings. |
| `npm run db:backup` | Consistent SQLite snapshot via `VACUUM INTO` (see [OPERATIONS.md](OPERATIONS.md)). |
| `npm run test` | API tests then web tests (`test:api && test:web -- --run`). |
| `npm run test:api` | Backend API + commerce + security + money/invoice + policy + catalog tests (`node --test`). |
| `npm run test:web` | Frontend tests (Vitest + Testing Library). |
| `npm run lint` / `npm run typecheck` | `tsc --noEmit`. |
| `npm run build` | Vite production build. |
| `npm run preview` | Serve the production build. |
| `npm run clean` | Remove `dist` / stale build output. |
| `npx playwright test` | Playwright E2E (run `npx playwright install` once first). |

## Environment

Backend variables (see [`.env.example`](.env.example)):

```env
NODE_ENV="development"          # production enables fail-closed boot checks
DATABASE_URL="file:./dev.db"
JWT_SECRET="replace-with-at-least-32-random-characters-please"
JWT_EXPIRES_IN="30m"           # short-lived access token
JWT_REFRESH_EXPIRES_IN="30d"   # refresh token (httpOnly cookie)
COOKIE_SECRET="replace-with-a-random-cookie-secret"   # required in production
PORT=4000
FRONTEND_ORIGIN="http://localhost:3000"
ALLOW_OWNER_REGISTRATION="false"
INITIAL_PLATFORM_EMAIL="owner@matjari.local"
INITIAL_PLATFORM_USERNAME="platform-admin"
INITIAL_PLATFORM_PASSWORD="ChangeMe123!"
INITIAL_PLATFORM_NAME="Platform Owner"
```

**Fail-closed in production:** with `NODE_ENV=production` the API refuses to boot if `JWT_SECRET` is
missing/default/weak, `COOKIE_SECRET` is missing, the seeded platform password is unchanged, or
`FRONTEND_ORIGIN` points at localhost. SQLite lives at `prisma/dev.db` by default.

## Testing & CI

| Suite | Runner | Coverage |
| --- | --- | --- |
| `tests/api.test.ts` | `node --test` | Store isolation, health/ready, store deletion (authz), checkout totals/GST. |
| `tests/commerce.test.ts` | `node --test` | Concurrent checkout (no oversell, no over-limit discount), idempotency, server GST. |
| `tests/invoices.test.ts` | `node --test` | Sequential numbering, GST line, printable EN/AR, pending-order guard. |
| `tests/security.test.ts` | `node --test` | Token revocation, lockout, self-service login + reset-forces-change, fail-closed boot. |
| `tests/policy.test.ts` | `node --test` | Role + store-access policy decisions. |
| `tests/money.test.ts` | `node --test` | Currency exponents, parse/format, bps/tax math, rescale, +962 phone. |
| `tests/productCatalog.test.ts` | `node --test` | Category taxonomy validation/normalization + variant details. |
| `tests/web/*` | Vitest + Testing Library | i18n toggle/RTL, money formatting, product cards, storefront cart, category UI. |
| `tests/e2e/checkout.spec.ts` | Playwright | Storefront/RTL checkout smoke (`npx playwright install` first). |

CI ([`.github/workflows/ci.yml`](.github/workflows/ci.yml)) runs typecheck + API tests + web tests +
build on every push and PR, gating merges. The build emits a non-blocking large-chunk warning
(future code-split).

## Deferred (seams designed, not built)

PostgreSQL migration · card payment gateways (`PaymentProvider`) · JoFotara e-invoicing
(`InvoiceClearance`) · email/SMS · external error tracking (e.g. Sentry) · real-time order push
(SSE) · SEO/SSR storefront.

## Remaining / Next Improvements

- Finish migrating admin/platform server reads from the Zustand store onto TanStack Query, then slim
  the store to session + UI + cart only.
- Expand i18n string coverage across all admin/platform screens (infrastructure + storefront done).
- Code-split the Vite bundle to clear the chunk-size warning.
- Run E2E in CI (browsers) and broaden Playwright coverage.
</content>
</invoke>
