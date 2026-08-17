# OfflinePOS — Offline-First Point of Sale

A React 19 + Vite + TypeScript point-of-sale that keeps working with **zero
network**. Orders write to a local database first, queue as mutations, and sync
in the background with exponential backoff — the same architecture I shipped at
Qumra for a Saudi retail client (clean-room demo, no client code).

> **Demo:** a recorded walkthrough of the whole happy path — browse catalog,
> build a cart with discounts and multi-tax, charge, review the order in the
> orders panel, simulate going offline, keep selling, and watch everything sync
> when the connection returns. [Watch `docs/demo/offline-pos-demo.webm`](./docs/demo/offline-pos-demo.webm).

## Highlights

- **Offline-first core** (`packages/core`): platform-neutral database, outbox
  mutation queue (`pending`/`synced`/`dead`), and a sync engine with retry,
  exponential backoff, and temp-ID resolution
- **Storage abstraction** — a `StorageProvider` seam so the same engine runs on
  `localStorage` (demo) or the SQLite/WASM provider (documented production
  upgrade path)
- **Live multi-tab sync** — `BroadcastChannel` + heartbeat registry, so a sale,
  a parked cart, or a sync event in one tab updates every open tab instantly
- **Parked carts, multi-tax + percent discounts, order editing**, receipt
  printing, and full AR/EN RTL with a locale-driven keypad
- **Typed & tested** — strict TypeScript, 100+ unit tests (Vitest) covering the
  queue, sync engine, checkout, and cross-tab sync, plus a Playwright e2e
  offline-sync suite

## Stack

React 19 · Vite 8 · TypeScript (strict) · Zustand · Tailwind v4 · Vitest · Playwright

## Getting started

```bash
pnpm install
pnpm dev          # http://localhost:5173
```

Run the checks:

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build        # production build
```

## Repository layout

```
packages/core/   platform-neutral engine: db, mutation-queue, sync-engine,
                 pricing, receipt text, printer, storage providers
src/             browser app: store (Zustand), components, i18n, tab sync,
                 service worker wiring
e2e/             Playwright offline-sync suite
apps/native/     Electron shell reusing the same core engine
```
