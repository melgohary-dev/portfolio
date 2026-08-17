# Qumra Portfolio

Clean, public portfolio projects built to demonstrate the work I delivered at Qumra for a Saudi client (Mostadam).

> ⚠️ **Confidentiality:** the production code lives in private client repos. Everything in this folder is a **clean-room demo** — no client code, secrets, API endpoints, or branding.

## Projects

### 1. [`offline-pos`](./offline-pos) — Offline-First Point of Sale

The flagship. A React 19 + Vite + TypeScript POS where checkout works with **zero network** — orders write to a local database first, queue as mutations, and sync in the background with exponential backoff. Includes the full architecture it's famous for:

- `StorageProvider` interface (localStorage demo → SQLite/WASM in production)
- Outbox-style **mutation queue** with pending/synced/dead states
- **Sync engine** with retry, backoff, and temp-ID resolution
- **Live multi-tab sync** — `BroadcastChannel` + heartbeat registry, so a sale,
  a parked cart, or a sync event in one tab updates every open tab instantly
  (sidebar shows "N tabs live · updated Xs ago")
- Parked carts, multi-tax + percent discounts, order editing, full AR/EN RTL
- 100+ unit tests covering the queue, sync engine, checkout, and cross-tab sync

**Stack:** React 19 · Vite 8 · TypeScript · Zustand · Tailwind v4 · Vitest

### 2. [`admin-dashboard`](./admin-dashboard) — Admin Back-Office

A Next.js 16 admin console that doubles as a **high-performance data-grid showcase**: a virtualized **120,000-row** orders table that scrolls, sorts and filters smoothly, aggregates on a background **Web Worker** (with measured ms), exports CSV from that worker, and persists saved views — all localized (AR/RTL) and theme-aware.

- Row virtualization (only ~20 DOM rows mounted) + pinned start/end columns
- Seeded deterministic dataset (same 120k orders on every reload)
- KPI dashboard with charts, users page, settings page

**Stack:** Next.js 16 · React 19 · TypeScript · Tailwind v4 · Recharts · TanStack Table & Virtual

### 3. [`saas-starter`](./saas-starter) — Full-Stack SaaS Starter

A complete, deployable multi-tenant SaaS backend + dashboard that ties the POS and
grid skills into one product. Turborepo monorepo: Next.js web app, Hono OpenAPI
backend, Postgres + Drizzle, Auth.js, Stripe billing (with a built-in simulated
checkout/portal), and full EN/AR localization.

- **Multi-tenancy** — `tenant_id` scoping (RLS-ready) with an invite/member model;
  every order, stat, and billing action is isolated per organization
- **Billing** — Free/Pro plans; mock mode needs no Stripe keys (simulated checkout
  + customer portal), real Stripe test mode optional
- **Realtime** — Server-Sent Events push new-order toasts to every open tab
- **I18n** — EN/AR with RTL, cookie-synced locale, custom `NestedKeyOf` messages
- **Observability** — pino structured JSON logs with per-request `requestId`
- **Quality gates** — 24/24 turbo tasks green (`typecheck lint build test`),
  30 unit/integration tests, 17 i18n checks, 6-step E2E happy path, GitHub
  Actions CI (Postgres service + full gate on every PR), verified
  `docker compose up` (Postgres healthcheck-gated, migrations on boot)

**Stack:** Next.js 16 · Hono (OpenAPI) · Postgres · Drizzle ORM · Auth.js · Stripe · pino · Vitest · Docker

## Production context (not included here)

The production work behind these demos at Qumra:

- **Offline-first POS system** used for real retail checkout — SQLite/WASM local database, USB thermal printing, PWA, Electron desktop wrapper with cross-platform installers (Windows/macOS/Linux) via GitHub Actions
- **`@qumra/pos-core`** shared data-access library consumed by Web, Electron, and React Native, covering ~85% of the app's data layer
- **Next.js admin dashboard** with 25+ modules (CRM, Billing, Governance, Marketing, Analytics), rich-text editor, and custom query builder
- **Accounts + partner portal** with unified authentication and dual-token GraphQL
- Full **AR/EN localization and RTL** for a Saudi client
