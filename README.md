# Matjari

A **self-hosted, multi-store e-commerce SaaS** built for the Jordanian market. One **platform
owner** onboards and oversees the shop owners they approve; each **shop owner** runs a single
storefront; the **public** browses and checks out with Cash on Delivery — no shopper account
required.

> 📚 **Full overview + project structure:** [PROJECT_OVERVIEW.md](PROJECT_OVERVIEW.md)  ·
> **Architecture:** [ARCHITECTURE.md](ARCHITECTURE.md)  ·  **Runbook:** [OPERATIONS.md](OPERATIONS.md)
> ·  **Admin UI conventions:** [ADMIN_FRONTEND_TEMPLATE.md](ADMIN_FRONTEND_TEMPLATE.md)

## What it is

Three actors define the product:

| Actor | What they do |
| --- | --- |
| **Public customer** | Browse a storefront, add to cart, place a COD order, request a website. No login. |
| **Shop owner** | Manage their one store: products (incl. variants), orders, discounts, appearance, analytics, support, tax invoices, data export. |
| **Platform owner** | Manage all stores: approve/reject requests, suspend/feature/delete stores, set commission, moderate flagged products, run support, read platform analytics + the audit log, edit settings. |

Two principles run through the codebase:

1. **The backend is the single source of truth.** Money totals, tax, stock, and discount usage are
   all (re)computed **server-side** at checkout — client values are never trusted.
2. **No third-party integrations.** Everything runs inside this app and its own SQLite database.
   Payment gateways, e-invoicing, and email/SMS are designed as **adapter seams** to drop in later.

### Jordan-first

- **JOD with 3 decimals** (1 JOD = 1000 fils). Money is always an integer count of minor units.
- **GST 16%** computed server-side at checkout, plus printable **internal tax invoices** (EN LTR / AR RTL).
- **Arabic + English with full RTL**, Asia/Amman dates, Arabic-Indic numerals, **+962** mobile validation.
- **Cash on Delivery**, with a per-order platform **commission** captured for settlement reporting.

## Tech stack

- **Frontend:** React 19, TypeScript, Vite, React Router (hash), Zustand, TanStack Query,
  Tailwind CSS, React Hook Form + Zod, Recharts, Framer Motion.
- **Backend:** Express, TypeScript, Prisma, SQLite (WAL), bcrypt, JWT (access + refresh), helmet, pino.
- **Shared:** a typed domain contract + money + phone + product-category taxonomy under
  [`shared/`](shared/), imported by **both** sides so they can't drift.

## Quick start

```bash
npm install
cp .env.example .env       # set JWT_SECRET + the initial platform-owner credentials
npm run db:generate        # generate the Prisma client
npm run db:deploy          # apply migrations
npm run db:seed            # seed the platform owner + settings (no demo data)
npm run dev:all            # frontend (:3000) + backend (:4000), both auto-reload
```

- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:4000/api`

### Sign in

The platform owner is seeded from `.env` (sign in with username **or** email):

| Username | Email | Password |
| --- | --- | --- |
| `platform-admin` | `owner@matjari.local` | `ChangeMe123!` |

**Change it before any real use.** Shop owners are **self-service**: they choose their own username +
password on the public "request a website" form, and once the platform owner approves the request
they sign in directly — no relay, no forced change. (See [OPERATIONS.md](OPERATIONS.md) for password
resets and the production fail-closed boot checks.)

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev:all` | Frontend + backend together. |
| `npm run dev` / `npm run api:dev` | Frontend only / backend only. |
| `npm run db:generate` | Generate the Prisma client. |
| `npm run db:deploy` / `npm run db:migrate` | Apply migrations (deploy) / create + apply in dev. |
| `npm run db:seed` | Seed the platform owner + platform settings. |
| `npm run db:backup` | Consistent SQLite snapshot via `VACUUM INTO`. |
| `npm run test` | API tests (`node --test`) then web tests (Vitest). |
| `npm run test:api` / `npm run test:web` | Backend / frontend tests individually. |
| `npm run typecheck` | `tsc --noEmit`. |
| `npm run build` / `npm run preview` | Production build / serve the build. |

End-to-end tests run via `npx playwright test` (run `npx playwright install` once first).

## Project structure

```text
shared/    typed contract + money + phone + product-category taxonomy (imported by both sides)
prisma/    schema, migrations (single migration path), seed
server/    Express API — routes/ · services/ · policies/ · security/ + commerce, auth, invoices
src/       React app — api/ · components/ · lib/ · routes/ (admin, platform, storefront)
tests/     API (node --test) · web (Vitest) · e2e (Playwright)
```

See [PROJECT_OVERVIEW.md](PROJECT_OVERVIEW.md) for the complete annotated tree, the API surface, and
the data model.

## Testing & CI

```bash
npm run typecheck
npm run test            # API + web
npx playwright test     # E2E (optional; install browsers first)
npm run build
```

CI ([`.github/workflows/ci.yml`](.github/workflows/ci.yml)) runs typecheck + API tests + web tests +
build on every push and PR.
</content>
