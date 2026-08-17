# OfflinePOS

A React + Vite + TypeScript point-of-sale that keeps working with **zero
network**. Orders write to a local database first, queue as mutations, and sync
in the background with exponential backoff.

This is a clean-room demo of the architecture I shipped at Qumra for a Saudi
retail client.

## Demo

Recorded walkthrough of the full happy path — browse catalog, build a cart with
discounts and multi-tax, charge, review the order, simulate going offline, keep
selling, and watch everything sync when the connection returns.

**[Watch demo](./docs/demo/offline-pos-demo.webm)**

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│  packages/core — platform-neutral engine                     │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────────┐  │
│  │  Storage     │  │  Mutation    │  │  Sync Engine       │  │
│  │  Provider    │  │  Queue       │  │  retry · backoff   │  │
│  │  (localStorage│  │  pending →   │  │  temp-ID resolve   │  │
│  │   / SQLite)  │  │  synced/dead │  │  push + pull       │  │
│  └─────────────┘  └──────────────┘  └────────────────────┘  │
│  pricing · receipt text · printer · events · types           │
└──────────────────────────┬───────────────────────────────────┘
                           │
┌──────────────────────────┴───────────────────────────────────┐
│  src/ — browser app                                          │
│  ┌──────────┐  ┌──────────┐  ┌───────────┐  ┌────────────┐  │
│  │  Zustand  │  │  Tab     │  │  React    │  │  i18n      │  │
│  │  stores   │  │  Sync    │  │  Components│  │  AR / EN   │  │
│  │  (cart,   │  │  Broadcast│  │  (Catalog,│  │  RTL       │  │
│  │   sync,   │  │  Channel  │  │   Cart,   │  │            │  │
│  │   theme)  │  │  + heart  │  │   Orders) │  │            │  │
│  └──────────┘  └──────────┘  └───────────┘  └────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

### How the offline model works

1. **Every order writes locally first.** The UI never waits for the network.
2. **Mutations queue** with three states: `pending` (waiting to sync), `synced`
   (server confirmed), `dead` (exhausted retries — reviewable).
3. **Sync engine** picks up pending mutations, POSTs them with exponential
   backoff and jitter, and resolves temp IDs assigned locally to real server IDs.
4. **BroadcastChannel + heartbeat** keeps all open tabs in sync — sidebar shows
   "N tabs live · updated Xs ago".

### Storage abstraction

The `StorageProvider` interface lets the same engine run on different backends:
- **Demo** — `localStorage` (no setup, works everywhere)
- **Production** — SQLite/WASM (documented upgrade path in `packages/core`)

## Highlights

- Parked carts, multi-tax + percent discounts, order editing
- Receipt printing via Web Serial API
- Full AR/EN RTL with locale-driven keypad layout
- Service worker for PWA offline caching
- Electron desktop shell reusing the same core engine

## Stack

React 19 · Vite · TypeScript (strict) · Zustand · Tailwind v4 · Vitest · Playwright

## Getting started

```bash
pnpm install
pnpm dev              # http://localhost:5173
```

## Quality gates

```bash
pnpm typecheck        # strict TypeScript
pnpm lint             # ESLint
pnpm test             # 113 unit tests (Vitest)
pnpm build            # production build
```

Playwright e2e:

```bash
npx playwright install
pnpm exec playwright test   # offline-sync suite
```

## Repository layout

```
packages/core/         Platform-neutral engine
  src/db-manager.ts    CRUD + temp-ID management
  src/mutation-queue.ts Outbox with pending/synced/dead
  src/sync-engine.ts   Retry, backoff, ID resolution
  src/pricing.ts       Tax + discount calculations
  src/receipt-text.ts  Receipt formatting
  src/printer.ts       Web Serial thermal printing
  src/browser/         StorageProvider implementations

src/                   Browser app
  components/          React UI (Catalog, Cart, Orders, Sidebar, Receipt)
  store/               Zustand stores (cart, sync, network, theme, tab)
  hooks/               Checkout, printer, sync lifecycle, dialog focus
  lib/tab-sync.ts      BroadcastChannel + heartbeat registry
  i18n/                AR/EN message catalogs

e2e/                   Playwright offline-sync tests
apps/native/           React Native shell (Electron reuses core)
```
