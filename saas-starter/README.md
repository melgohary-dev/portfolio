# SaaS Starter

A production-grade, full-stack SaaS monorepo: auth, billing, Postgres with
migrations, a documented OpenAPI backend, an admin back-office with live
analytics, and full EN/AR localization.

This is a clean-room demo of the SaaS platform I built at Qumra — auth, billing,
multi-tenancy, and realtime in one deployable package.

## Demo

Automated walkthrough of the full happy path — sign up, invite a teammate, create
an order (live SSE toast), upgrade to Pro, view analytics, then switch to
Arabic/RTL.

**[Watch demo](./docs/demo/saas-demo.webm)**

## Stack

| Layer | Choice |
|-------|--------|
| **Monorepo** | pnpm + Turborepo |
| **Web** | Next.js 16 App Router, React 19, Tailwind v4, Auth.js v5 |
| **API** | Hono + `@hono/zod-openapi` (spec at `/api/openapi.json`) |
| **Database** | Postgres + Drizzle ORM (generated migrations + deterministic seed) |
| **Billing** | Stripe test mode, with built-in simulated checkout/portal |
| **I18n** | Custom `NestedKeyOf` messages (EN/AR) with RTL and cookie sync |
| **Realtime** | Server-Sent Events for new-order toasts |
| **Tests** | Vitest unit + API integration tests against a migrated test DB |

## Architecture

```
┌────────────────────────────────┐         ┌─────────────────────────────┐
│  apps/web  (Next.js)           │   /api  │  apps/api  (Hono)           │
│  ┌──────────────────────┐      └────────►│  ┌───────────────────────┐  │
│  │ App Router pages     │                │  │ zod-openapi routes    │  │
│  │ + proxy route        │                │  │ tenantScoped(db)      │  │
│  │  (API_URL)           │                │  └───────────┬───────────┘  │
│  └──────────┬───────────┘                │              │              │
│  Auth.js · I18n · SSE toast              │  pino + requestId          │
└─────────────┼────────────────────────────┘              │              │
              │                                           │              │
    packages/shared (Zod schemas)          packages/billing (Stripe)     │
              │                                           │              │
              └──────────────────── packages/db (Drizzle, seed) ──► Postgres
```

### Auth model

The web app proxies API calls through `apps/web/app/api/[...path]/route.ts`.
The proxy resolves the authenticated user from Auth.js, verifies org membership,
then signs an HMAC-SHA256 request token (`@saas/shared`) containing
`{ userId, orgId, exp }`. The API's `authMiddleware` verifies the token before
any route handler runs — the raw tenant is never taken from a client-supplied
header. Both services share an `API_AUTH_SECRET` env var.

### Multi-tenancy

Every order, stat, and billing action is scoped to an `org_id`. The schema uses
Drizzle's `tenantScoped()` helper for automatic query filtering. RLS-ready for
production Postgres.

## Quickstart

Prereq: Node 20+ with corepack, and a Postgres instance.

```bash
cp .env.example .env
cp apps/web/.env.example apps/web/.env.local
pnpm install
pnpm --filter @saas/db db:migrate
pnpm --filter @saas/db db:seed        # demo org, users, sample orders
pnpm dev                              # web → :3000, api → :4000
```

Seed accounts (all password `Password123!`):

| Email | Org | Plan |
|-------|-----|------|
| `owner@acme.test` | Acme | Free |
| `admin@acme.test` | Acme | Free |
| `owner@globex.test` | Globex | Pro |

Open http://localhost:3000, sign in, then use the app switcher to open the
SaaS dashboard.

### Docker

```bash
docker compose up --build
```

Starts Postgres + the API (migrations run automatically). Point the web's
`API_URL` at `http://localhost:4000` and run the web with
`pnpm --filter @saas/web dev`.

## Testing

```bash
pnpm turbo run typecheck lint build test
```

| Package | What's tested |
|---------|--------------|
| `packages/shared/test` | Zod schema unit tests, request token HMAC verification |
| `packages/billing/test` | Plan configs, price mapping (env-stubbed) |
| `apps/api/test` | Full integration tests against `saas_test_db` |

The same gate runs in CI on every PR/push to `main`
([`.github/workflows/ci.yml`](.github/workflows/ci.yml)): Postgres 16 service,
migrations, then `typecheck lint build test`.

The API logs structured JSON (pino) with a `requestId` per request. Set
`LOG_LEVEL=debug` for verbose output. Pass `x-trace-id` to thread a trace ID
through the logs.

## Billing modes

| Mode | Setup | Behavior |
|------|-------|----------|
| **Simulated** (default) | `STRIPE_SECRET_KEY` empty | Mock checkout at `/checkout/simulated`, one-click upgrade, cancel in portal |
| **Real Stripe** | `STRIPE_SECRET_KEY` + `STRIPE_PRICE_PRO_MONTHLY` | Real checkout + customer portal. Set `STRIPE_WEBHOOK_SECRET` and point Stripe at `POST /api/billing/webhook` |

## Deployment

- **API**: `docker build -f apps/api/Dockerfile -t saas-api .` (multi-stage, runs migrations on boot). Deploy to Fly.io, Railway, ECS. Set `DATABASE_URL` and optionally `STRIPE_*` / `APP_URL`.
- **Web**: Deploy to Vercel. Set `AUTH_SECRET`, `API_URL` (deployed API), `AUTH_URL`, `DATABASE_URL`, `RESEND_*` as needed.
- **Postgres**: Managed DB (Neon, Supabase, RDS). Run `pnpm --filter @saas/db db:migrate` once against production.

## Non-goals (v1)

- No payment collection in dev — Stripe test mode only.
- Multi-tenancy is `tenant_id` scoping (RLS-ready), not per-tenant databases.
- Analytics is a simple events table, not a data warehouse.
