# Plinth — Operations Runbook

Self-hosted, self-contained (platform owner + the shop owners they onboard). SQLite +
Prisma backend, React/Vite SPA frontend. No third-party integrations.

## Environment & boot safety

Configure via `.env` (see `.env.example`). In **production** (`NODE_ENV=production`) the
API **refuses to boot** if any of these are unsafe (fail-closed):

- `JWT_SECRET` missing, the dev default, < 32 chars, or low-entropy
- `INITIAL_PLATFORM_PASSWORD` still the seeded default (`ChangeMe123!`)
- `COOKIE_SECRET` missing (signs the refresh cookie)
- `FRONTEND_ORIGIN` pointing at `localhost`

## Run

```bash
npm ci
npx prisma generate
npm run db:deploy          # apply migrations (single migration path — Prisma migrate)
npm run db:seed            # creates the platform owner from INITIAL_PLATFORM_* (no demo data)
npm run dev:all            # frontend (:3000) + API (:4000)
# production: build the SPA (npm run build) and run the API with NODE_ENV=production
```

## Health checks

- `GET /api/health` — liveness (process up). Returns `{ ok, status: "live" }`.
- `GET /api/ready` — readiness (DB reachable). Returns 200 `ready`, or **503** `not-ready`
  when the database can't be reached. Point your load balancer/orchestrator at `/api/ready`.

Every request gets an `X-Request-Id` (echoed in responses and in the structured pino logs)
for tracing. Logs are pretty in dev, JSON in production; auth headers/cookies are redacted.

## Database: SQLite tuning

The API enables `foreign_keys`, `journal_mode=WAL`, and `busy_timeout` on boot, and pins
SQLite to a single pooled connection (`connection_limit=1`) so writers serialize cleanly —
this is what the conditional-UPDATE checkout (no oversell / no discount over-spend) relies on.

## Backups

`VACUUM INTO` writes a transactionally consistent single-file snapshot **without stopping the
server**, safe under WAL (no need to copy `-wal`/`-shm` by hand).

```bash
npm run db:backup                       # -> ./backups/plinth-<timestamp>.db
BACKUP_DIR=/mnt/backups npm run db:backup
```

Schedule it (e.g. cron) and copy `BACKUP_DIR` off-box. For continuous protection, a
Litestream-style streaming copy of the DB file is a drop-in alternative.

### Restore

1. Stop the API.
2. Replace the live DB file with the chosen backup, and remove stale WAL sidecars:
   ```bash
   cp backups/plinth-<timestamp>.db prisma/dev.db
   rm -f prisma/dev.db-wal prisma/dev.db-shm
   ```
3. Start the API and confirm `GET /api/ready` returns 200.

## Credentials (self-service + platform approval)

- The requester **chooses their own admin username + password** on the request form. The
  password is hashed immediately (bcrypt) and never stored in readable form.
- When the platform owner **approves** the request, the account is created with those
  credentials, so the owner signs in directly — no relay, no forced change.
- **Password reset** is a platform-owner action that issues a new one-time password, forces a
  change on next login, and revokes the owner's existing sessions. This is the recovery path
  when an owner is locked out. Every credential action is written to the append-only security
  audit log.
- (Legacy: requests created before this change have no stored credentials; approving them
  falls back to a generated one-time password the platform owner relays.)

## Data hygiene (internal PDPL)

- Export a store's owner + customer records: `GET /api/platform/stores/:id/data-export`
  (or the shop owner's own `GET /api/admin/stores/:id/data-export`).
- Erase customer PII (keeps order ledger): `POST /api/platform/stores/:id/erase-customer-data`.
  Both are security-audited.

## Tests & CI

```bash
npm run typecheck    # tsc --noEmit
npm run test:api     # API + concurrency + security + money/invoice tests (node --test)
npm run test:web     # frontend (Vitest + Testing Library)
npm run test:e2e     # Playwright (run `npx playwright install` once first)
npm run build
```

CI (`.github/workflows/ci.yml`) runs typecheck + API tests + web tests + build on every push
and PR, gating merges. E2E is a separate, browser-heavy job.

## Deferred integrations (clean adapter seams exist; not built)

PostgreSQL migration · card payment gateways (`PaymentProvider`) · JoFotara e-invoicing
(`InvoiceClearance`) · email/SMS · external error tracking · SSE order push · SEO/SSR.
COD + internal tax invoices + manual credential relay are the current implementations.
