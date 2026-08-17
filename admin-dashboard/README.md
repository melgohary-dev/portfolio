# Admin Dashboard (Demo)

A slim, self-contained admin back-office built with Next.js 16 (App Router), TypeScript, and Tailwind CSS v4 — a small, clean showcase of the kind of enterprise admin console I built in production at Qumra (delivered for a Saudi client, Mostadam). **No client code, secrets, or endpoints.**

## Pages

- **Dashboard** — KPI stat cards + a combined revenue/orders chart (Recharts)
- **Users** — team table with role and status badges
- **Orders** — transactions table with payment method and status
- **Settings** — store profile form (name, currency, VAT)

## What it demonstrates

- App Router layouts with a shared sidebar and active-route highlighting
- A client-side dashboard: virtualized 120k-row orders grid, Web Worker
  aggregation, CSV export, and saved views
- Deterministic seeded data layer (`src/lib/orders.ts`) — swap for API calls in
  production
- Reusable UI primitives (badges, cards, tables) with Tailwind CSS v4

## Tech Stack

Next.js 16 · React 19 · TypeScript · Tailwind CSS v4 · Recharts · Lucide Icons

## Getting Started

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # production build (fully static)
```
