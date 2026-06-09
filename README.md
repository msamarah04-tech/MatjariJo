<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/1beeb990-7a5e-437c-963b-166cfa20ea28

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Backend API

Plinth now includes a real Express + TypeScript API backed by SQLite through Prisma. It uses the frontend domain model directly: stores, products, orders, discounts, analytics events, support tickets, product flags, shop requests, audit logs, and platform settings.

1. Copy `.env.example` to `.env` and set `DATABASE_URL`, `JWT_SECRET`, and the initial platform-owner credentials.
2. Generate Prisma client and create the database:
   `npm run db:generate && npm run db:migrate`
3. If Prisma's migration engine is unavailable locally, apply the committed SQL migration with:
   `npm run db:apply:sql`
4. Seed only the first platform owner and default settings:
   `npm run db:seed`
5. Start the API:
   `npm run api:dev`

The API listens on `http://localhost:4000` by default. The seeded login from `.env.example` is `platform-admin` / `ChangeMe123!` or `owner@plinth.local` / `ChangeMe123!`; change it before using the backend for anything real. When a platform owner approves a shop request, the response returns one-time shop-admin credentials where the username is derived from the shop slug, for example `botanica-admin`.

### Default Development Credentials

| Area | Username | Email | Password |
| --- | --- | --- | --- |
| Platform owner | `platform-admin` | `owner@plinth.local` | `ChangeMe123!` |

Shop-owner accounts are created when the platform owner approves a shop request. The username is based on the shop slug and the password is returned once in the approval response.

| Shop example | Generated username | Password |
| --- | --- | --- |
| Botanica | `botanica-admin` | Returned once as `credentials.password` from `POST /api/platform/shop-requests/:id/approve` |
| Arabica Roasters | `arabica-roasters-admin` | Returned once as `credentials.password` from `POST /api/platform/shop-requests/:id/approve` |
| MINIMAL | `minimal-admin` | Returned once as `credentials.password` from `POST /api/platform/shop-requests/:id/approve` |
| Midnight Apothecary | `midnight-apothecary-admin` | Returned once as `credentials.password` from `POST /api/platform/shop-requests/:id/approve` |

Example approval response:

```json
{
  "credentials": {
    "username": "botanica-admin",
    "password": "botanica-secure-random-suffix"
  }
}
```

The backend does not store shop passwords in plaintext, so copy the generated password from the approval response during local development.
