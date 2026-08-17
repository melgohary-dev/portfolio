# Admin Dashboard

A Next.js admin back-office built around a **virtualized 120,000-row orders
grid**. Scrolls, sorts, and filters smoothly. Aggregation runs on a background
Web Worker with measured ms. CSV export, saved views, full AR/EN RTL.

This is a clean-room demo of the kind of enterprise admin console I built at
Qumra for a Saudi client.

## Pages

| Page | What it does |
|------|-------------|
| **Dashboard** | KPI stat cards + combined revenue/orders chart (Recharts) |
| **Users** | Team table with role and status badges |
| **Orders** | 120k-row virtualized grid with sort, search, date range, saved views |
| **Settings** | Store profile form (name, currency, VAT) |

## What it demonstrates

### Virtualized data grid

The orders page renders **120,000 rows** in a scrollable table. Only ~20 DOM
nodes are mounted at any time via TanStack Virtual. Columns for order ID and
customer are pinned to the left/right so they stay visible while scrolling.

```
User scrolls 120k rows
        │
        ▼
┌──────────────────────────────────────┐
│  TanStack Virtual renders ~20 rows   │
│  pinned columns stay visible         │
│  sort/filter/aggregate runs off-main │
│  thread via Web Worker               │
└──────────────────────────────────────┘
```

### Web Worker aggregation

Sort, filter, and KPI aggregation happen on a **background Web Worker** so the
main thread stays responsive. The worker reports aggregation time in ms. CSV
export also runs on the worker to avoid blocking the UI.

### Deterministic dataset

120k orders are seeded deterministically — same data on every page load. The
generation runs once on mount and the result is memoized. Swap `src/lib/orders.ts`
for API calls in production.

### Theme + localization

- Dark/light mode toggle with system preference detection
- Full AR/EN RTL support — layout flips, all text localized
- Saved views persist sort, filter, and column preferences

## Stack

Next.js 16 · React 19 · TypeScript · Tailwind CSS v4 · Recharts · TanStack Table & Virtual · Playwright

## Getting started

```bash
npm install
npm run dev          # http://localhost:3000
```

## Quality gates

```bash
npm run typecheck    # strict TypeScript
npm run lint         # ESLint
npm run build        # production build
```

Playwright e2e:

```bash
npx playwright install
npx playwright test  # 5 tests: load, KPIs, sort, search, mobile
```

## Repository layout

```
src/
  app/                 Next.js App Router pages (dashboard, orders, users, settings)
  components/          UI primitives
    orders-data-grid.tsx   Virtualized 120k-row grid + Web Worker integration
    sidebar.tsx            Collapsible sidebar with active-route highlighting
    revenue-overview.tsx   KPI cards + charts
    status-badge.tsx       Status pill component
    theme-toggle.tsx       Dark/light mode
    language-toggle.tsx    EN/AR toggle
  lib/
    orders.ts          Deterministic 120k order generator
    orders-worker.ts   Web Worker: sort, filter, aggregate, CSV export
    orders-stats.ts    KPI computation from worker results
    i18n.ts            EN/AR message catalogs
    utils.ts           cn() helper, formatters
```
