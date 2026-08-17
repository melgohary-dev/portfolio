# SaaS Starter

A production-grade, full-stack SaaS monorepo starter: auth, billing, Postgres with
migrations, a documented API, an admin back-office with live analytics, and full
EN/AR localization. Part of my public portfolio — "I can ship an entire product."

> **Demo:** automated walkthrough of the whole happy path — sign up → invite a
> teammate → create an order (live SSE toast) → upgrade to Pro → analytics, then
> the same UI in Arabic/RTL. [Watch `docs/demo/saas-demo.webm`](./docs/demo/saas-demo.webm).

## Stack

| Layer      | Choice                                                            |
| ---------- | ----------------------------------------------------------------- |
| Monorepo   | pnpm + Turborepo                                                  |
| Web        | Next.js 16 App Router, React 19, Tailwind v4, Auth.js v5          |
| API        | Hono + `@hono/zod-openapi` (OpenAPI spec at `/api/openapi.json`)  |
| Database   | Postgres + Drizzle ORM (generated migrations + deterministic seed)|
| Billing    | Stripe test mode, with a built-in simulated checkout/portal       |
| I18n       | Custom `NestedKeyOf` messages (EN/AR) with RTL and cookie sync    |
| Realtime   | Server-Sent Events for new-order toasts                           |
| Tests      | Vitest unit + API integration tests against a migrated test DB    |

## Architecture

```
┌──────────────────────────┐        ┌──────────────────────────────┐
│  apps/web  (Next.js)     │        │  apps/api  (Hono)            │
│  ┌────────────────────┐  │  /api  │  ┌────────────────────────┐  │
│  │ App Router pages   │  └───────►│  │ zod-openapi routes     │  │
│  │ + proxy route      │          │  │ tenantScoped(db) · id   │  │
│  │  (API_URL)         │          │  └───────────┬────────────┘  │
│  └─────────┬──────────┘          │              │               │
│  Auth.js · I18n · SSE toast      │   pino logs + request ids    │
└────────────┼─────────────────────┘              │               │
             │                                    │               │
   packages/shared (Zod schemas)     packages/billing (Stripe/mock)
             │                                    │               │
             └────────────────────── packages/db (Drizzle schema,
                                    migrations, seed) ──► Postgres
```

The web app talks to the API through `apps/web/app/api/[...path]/route.ts`. The
proxy resolves the authenticated user from the Auth.js session, verifies org
membership, then signs an HMAC-SHA256 request token (`createRequestToken` from
`@saas/shared`) containing `{ userId, orgId, exp }`. The API's `authMiddleware`
verifies the token signature and expiry before any route handler runs — the raw
tenant is never taken from a client-supplied header. Both services share an
`API_AUTH_SECRET` environment variable that must be identical and kept private.

## Quickstart (local)

Prereq: Node 20+ with corepack, and a Postgres instance.

```bash
cp .env.example .env
cp apps/web/.env.example apps/web/.env.local
pnpm install
pnpm --filter @saas/db db:migrate
pnpm --filter @saas/db db:seed        # demo org, users, sample orders
pnpm dev                              # web on :3000, api on :4000
```

Seed accounts are printed by the seed script and all share the password
`Password123!` (e.g. `owner@acme.test`, `owner@globex.test` — the latter is
already on the Pro plan). Open http://localhost:3000, sign in, then use the app
switcher in the top-right to open the SaaS dashboard.

### Or with Docker

```bash
docker compose up --build
```

This starts Postgres + the API (migrations run automatically). Point the web's
`API_URL` at `http://localhost:4000` and run the web with `pnpm --filter @saas/web dev`.

## Testing

```bash
pnpm turbo run typecheck lint build test
```

- `packages/shared/test` — Zod schema unit tests
- `packages/billing/test` — plan/config unit tests (env-stubbed)
- `apps/api/test` — integration tests against `saas_test_db`. Create the DB once
  with `node scripts/create-test-db.mjs`; migrations are applied automatically
  before the suite runs (`test` = migrate → vitest).

The same gate runs in CI on every PR/push to `main`
([`.github/workflows/ci.yml`](.github/workflows/ci.yml)): a Postgres 16 service
provides `saas_test_db`, migrations are applied, then
`pnpm turbo run typecheck lint build test` must pass.

The API logs structured JSON (pino) with a `requestId` per request; set
`LOG_LEVEL=debug` for more, and pass an `x-trace-id` header to thread a trace id
through the logs.

## Billing modes

- `STRIPE_SECRET_KEY` empty (default) → simulated billing: mock checkout redirect
  to `/checkout/simulated`, one-click upgrade, cancel in the portal.
- `STRIPE_SECRET_KEY` + `STRIPE_PRICE_PRO_MONTHLY` set → real Stripe checkout and
  customer portal; set `STRIPE_WEBHOOK_SECRET` and point Stripe at
  `POST /api/billing/webhook`.

## Deployment

- **API**: build the image with `docker build -f apps/api/Dockerfile -t saas-api .`
  (multi-stage: deps → build → runtime; runs migrations on boot). Deploy anywhere
  (Fly.io, Railway, ECS). Set `DATABASE_URL` and optionally `STRIPE_*`/`APP_URL`.
- **Web**: deploy to Vercel (`apps/web` is the root app). Set `AUTH_SECRET`,
  `API_URL` (the deployed API), `AUTH_URL`, `DATABASE_URL` (for the seed-time
  tooling / server reads), `RESEND_*` as needed.
- **Postgres**: use a managed database (Neon, Supabase, RDS) or Fly.io Postgres;
  run `pnpm --filter @saas/db db:migrate` once against the production URL.

## Non-goals (v1)

- No payment collection in dev — Stripe test mode only.
- Multi-tenancy is `tenant_id` scoping (RLS-ready), not per-tenant databases.
- Analytics is a simple events table, not a data warehouse.
