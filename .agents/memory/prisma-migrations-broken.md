---
name: Prisma migrations are SQLite-flavored, DB is Postgres
description: Why `prisma migrate` fails here and `db push` is the only schema-sync path
---

The `prisma/migrations/` history is written in **SQLite syntax** (e.g. `DATETIME`,
`PRIMARY KEY` inline) but the datasource is **PostgreSQL** (`migration_lock.toml`
says postgresql, `DATABASE_URL` points at a Postgres `heliumdb`). The very first
migration `20260605000000_init` fails on Postgres with `type "datetime" does not exist`.

**Consequence:** `prisma migrate dev` / `migrate reset` / `migrate deploy` all break.
The database has only ever been built with `prisma db push`. There is real drift
between the migration files and the live schema — the migration files are dead artifacts.

**How to apply schema changes:** edit `prisma/schema.prisma`, then run
`npx prisma db push` (add `--accept-data-loss` when dropping columns). Re-seed the
platform owner + settings with `npx prisma db seed` if the DB was emptied
(seed upserts from `INITIAL_PLATFORM_*` env vars, so the login is safe to recreate).

**Do NOT run `prisma migrate reset`** expecting it to work — it drops the schema then
fails replaying the SQLite migrations, leaving the DB empty.

**Why:** the project was scaffolded for SQLite and switched to Postgres without
regenerating migrations. Fixing properly would mean rewriting all 12 migration files
for Postgres — out of scope unless explicitly requested.
