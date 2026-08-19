# Portfolio

Four production-grade demo apps showcasing the full stack I delivered at Qumra
for a Saudi retail/SaaS client — offline-first POS, a 120k-row admin grid, a
complete multi-tenant SaaS backend, and a drag-and-drop course builder.

Each project is a **clean-room reimplementation** of patterns I shipped in
production. No client code, secrets, API endpoints, or branding.

---

## Projects

### [OfflinePOS](./offline-pos) — Offline-First Point of Sale

A React + Vite POS where checkout works with **zero network**. Orders write to a
local database first, queue as mutations, and sync in the background with
exponential backoff.

- `StorageProvider` abstraction (localStorage demo → SQLite/WASM production path)
- Outbox-style mutation queue with pending / synced / dead states
- Sync engine with retry, backoff, and temp-ID resolution
- Live multi-tab sync via BroadcastChannel + heartbeat registry
- Parked carts, multi-tax + percent discounts, order editing, full AR/EN RTL
- 113 unit tests + Playwright e2e offline-sync suite

> [Watch the demo](./offline-pos/docs/demo/offline-pos-demo.webm) — catalog,
> cart, discounts, charge, offline simulation, and background sync.

**Stack:** React 19 · Vite · TypeScript · Zustand · Tailwind v4 · Vitest · Playwright

---

### [Admin Dashboard](./admin-dashboard) — Admin Back-Office

A Next.js admin console built around a **virtualized 120,000-row orders grid**.
Scrolls, sorts, and filters smoothly. Aggregation runs on a background Web Worker
with measured ms. CSV export, saved views, full AR/EN RTL.

- Row virtualization (~20 DOM nodes for 120k rows) + pinned start/end columns
- Seeded deterministic dataset — same orders on every reload
- Web Worker offloads sort/filter/aggregate off the main thread
- Fixed sidebar layout, viewport-scoped grid scroll, Cmd+K search shortcut
- Dark mode with proper contrast ratios (WCAG AA on all status badges)
- KPI dashboard with charts, users page, settings page, loading/not-found states
- Playwright e2e suite (accessibility, responsive, navigation, dashboard, settings, users)

**Stack:** Next.js 16 · React 19 · TypeScript · Tailwind v4 · Recharts · TanStack Table & Virtual

---

### [SaaS Starter](./saas-starter) — Full-Stack SaaS Backend

A complete, deployable multi-tenant SaaS monorepo. Next.js web app, Hono
OpenAPI backend, Postgres + Drizzle ORM, Auth.js, Stripe billing (with simulated
checkout), SSE realtime, and full EN/AR localization.

- **Multi-tenancy** — tenant_id scoping (RLS-ready) with invite/member model
- **Billing** — Free/Pro plans; simulated mode needs no Stripe keys
- **Realtime** — SSE pushes new-order toasts to every open tab
- **Auth** — HMAC-signed request tokens between web and API
- **I18n** — EN/AR with RTL, cookie-synced locale
- **Security** — rate limiting, security headers, typed API error responses, random seed passwords
- 24/24 turbo gates green · 30+ unit/integration tests · GitHub Actions CI

> [Watch the demo](./saas-starter/docs/demo/saas-demo.webm) — sign up → invite →
> order (live SSE toast) → upgrade to Pro → analytics → Arabic/RTL.

**Stack:** Next.js 16 · Hono · Postgres · Drizzle · Auth.js · Stripe · Docker · Vitest

---

### [Course Builder](./course-builder) — Drag-and-Drop Course Builder

A visual course editor built with React 19 and dnd-kit. Build structured
curricula with modules, lessons, and content blocks (text, video, quiz, image,
assignment, divider). Drag-and-drop reordering, multi-language support with RTL,
certificate builder, preview mode, and auto-save to localStorage.

- Keyboard-accessible drag-and-drop via `@dnd-kit`
- Per-language version isolation (`versions: Record<Language, CourseVersion>`)
- RTL support via `dir` attribute on app root (Arabic layout flips correctly)
- Certificate builder with editable student name and dynamic preview
- Dark/light mode, undo/redo history (50-step), auto-save to localStorage
- 54 unit tests · strict TypeScript · Playwright e2e suite

**Stack:** React 19 · Vite · TypeScript · Zustand · @dnd-kit · Tailwind v4 · Vitest · Playwright

---

## Production context

The production work behind these demos:

- **Offline-first POS** — SQLite/WASM local DB, USB thermal printing, PWA,
  Electron desktop with cross-platform installers (Win/macOS/Linux) via CI
- **`@qumra/pos-core`** — shared data-access library (Web + Electron + React
  Native) covering ~85% of the app's data layer
- **Admin dashboard** — 25+ modules (CRM, Billing, Governance, Marketing,
  Analytics), rich-text editor, custom query builder
- **Course builder** — multi-language course and certificate template editing with
  drag-and-drop content blocks
- **Accounts + partner portal** — unified auth, dual-token GraphQL
- Full **AR/EN localization and RTL** throughout

## Running locally

Each project is self-contained. See its README for setup instructions:

```bash
# Offline POS
cd offline-pos && pnpm install && pnpm dev    # → :5173

# Admin Dashboard
cd admin-dashboard && pnpm install && pnpm dev  # → :3000

# SaaS Starter (requires Postgres on :5432)
cd saas-starter && pnpm install && pnpm dev       # → :3000 + :4000

# Course Builder
cd course-builder && pnpm install && pnpm dev     # → :5173
```
