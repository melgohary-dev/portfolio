# AI Chat Workspace

A production-shaped, realtime AI chat workspace built from scratch. It mirrors the
architecture, patterns, and polish of the LLM-powered chat products I've shipped
professionally — a multi-provider BYOK (bring-your-own-key) system, streaming UI,
session management, safe markdown rendering, keyboard-first UX, and a full dark/light
theme — all verified by unit, integration, and end-to-end tests behind an 80%+ coverage
gate.

> **What it demonstrates**
> - **Multi-provider BYOK** — plug in Google Gemini, OpenAI, OpenRouter, Groq, Together,
>   Mistral, or DeepSeek via an in-app settings panel; falls back to a free simulated
>   mode automatically whenever no key is present.
> - **Streaming UI** — token-by-token rendering from real API SSE streams or the
>   deterministic mock engine, with cancellation and graceful partial-content retention.
> - **Markdown rendering** — sanitized (DOMPurify) rendering of assistant messages with
>   `highlight.js` syntax-colored code blocks (light + dark palettes), ordered/unordered
>   lists, and copy buttons.
> - **Session management** — multiple conversations with rename, delete (with confirm),
>   persistence to `localStorage`, and resume across reloads.
> - **Keyboard-first UX** — `Enter` to send, `Shift+Enter` for a new line, `Esc` to stop,
>   with full a11y labeling.
> - **Modern state** — Zustand stores with selector subscriptions and persistence
>   middleware, `partialize`d to keep derived state out of storage.
> - **Quality** — 80%+ coverage gate on core logic, unit + integration + e2e all green,
>   clean typecheck and lint.

## Architecture

```
┌────────────────────────────── App ──────────────────────────────┐
│  Desktop: <aside> │ Mobile: fixed drawer + overlay (lg)         │
│  SettingsModal (overlay, ESC/click-to-close)                    │
└───────────────┬──────────────────────────────────────────────────┘
                │
   ┌────────────┴─────────────┐
   │        Sidebar           │          ┌──────────────────────────┐
   │  brand · new chat        │          │       ChatWindow          │
   │   grouped sessions       │          │  header · messages list   │
   │   rename · delete        │          │  auto-scroll · empty state│
   │   theme toggle           │          └────────────┬─────────────┘
   └────────────┬─────────────┘                       │
                │                                     │
                └───────────────┬─────────────────────┘
                                │
                        ┌───────┴────────┐
                        │    Composer    │  textarea · send/stop
                        └───────┬────────┘
                                │  sendMessage(text)
                        ┌───────┴───────────────────────────┐
                        │  useSendMessage  (orchestration)   │
                        │  ensure session → append user      │
                        │  → placeholder → provider stream   │
                        └───────┬───────────────────────────┘
                                │  createProviderStream
                    ┌───────────┴──────────────────────┐
                    │         Provider registry          │
                    │  gemini (Gemini REST SSE)          │
                    │  openai/openrouter/groq/…          │
                    │    (OpenAI-compatible SSE)         │
                    │  mock (free simulated)             │
                    └───────────┬──────────────────────┘
                                │
                    ┌───────────┴────────────────────┐
                    │   Streaming engine              │
                    │   parseSse · token/yield/done   │
                    │   AbortController               │
                    └────────────────────────────────┘
```

### Provider system

Each provider implements a `ProviderAdapter` interface — an async generator of
`StreamEvent` values fed to `runStream`. The settings modal (`⚙ AI settings` in
the chat header) lets users pick a provider and paste in an API key, which is
stored only in `localStorage` and never bundled.

| Provider       | Mode         | Endpoint style                | Key env var              |
| -------------- | ------------ | ----------------------------- | ------------------------ |
| Simulated      | Free default | Mock engine (no network)      | —                        |
| Google Gemini  | Live         | Gemini REST SSE               | `VITE_GEMINI_API_KEY`    |
| OpenAI         | Live         | OpenAI-compatible SSE         | `VITE_OPENAI_API_KEY`    |
| OpenRouter     | Live         | OpenAI-compatible SSE         | `VITE_OPENROUTER_API_KEY`|
| Groq           | Live         | OpenAI-compatible SSE         | `VITE_GROQ_API_KEY`      |
| Together AI    | Live         | OpenAI-compatible SSE         | `VITE_TOGETHER_API_KEY`  |
| Mistral        | Live         | OpenAI-compatible SSE         | `VITE_MISTRAL_API_KEY`   |
| DeepSeek       | Live         | OpenAI-compatible SSE         | `VITE_DEEPSEEK_API_KEY`  |

If a live provider is selected but no key is available, the system falls back to the
simulated stream automatically.

### Data / state flow

- `zustand` `chat` store (`ai-chat-sessions`, v1) holds `sessions[]`, `activeSessionId`,
  `isStreaming`. Persistence is `partialize`d so streaming state never reaches storage.
- `ui` store (`ai-chat:ui`, v1) holds `darkMode`, `provider`, `sidebarOpen`.
- A seeded welcome conversation is created on first visit (`ai-chat:seeded` flag).
- `createProviderStream` dispatches to the correct adapter; adapters share `parseSse`
  for SSE wire decoding, and the `runStream` helper for token/yield/done event
  processing.

## Stack

| Concern    | Choice                                               |
| ---------- | ---------------------------------------------------- |
| Runtime    | TypeScript (~6) on Node                              |
| UI         | React 19 + Vite 8 + Tailwind CSS v4                  |
| State      | Zustand 5 (persist middleware)                       |
| Icons      | lucide-react                                         |
| IDs        | nanoid                                               |
| Sanitize   | DOMPurify                                            |
| Syntax     | highlight.js (highlightCode helper + adaptive theme) |
| Utilities  | clsx + tailwind-merge                                |
| Unit tests | Vitest 4 + React Testing Library + jest-dom + jsdom  |
| E2E        | Playwright                                           |
| Lint       | ESLint 9 flat config + Prettier                      |
| Package    | pnpm                                                |

## Getting started

```bash
# from the ai-chat/ directory
pnpm install
pnpm dev          # start Vite dev server
```

A welcome conversation is seeded automatically on first visit — click a suggestion
chip to see streaming, code blocks, lists, and markdown immediately.

### Connecting a live provider

1. Copy `.env.example` to `.env.local` and fill in one or more API keys, **or**
2. Click the `⚙ AI settings` gear in the chat header, select a provider, and
   paste your key (stored only in your browser's `localStorage`).

No signup, no payment, no secrets in the repo — the simulated default is always
available and fully functional offline.

## Quality gate

```bash
pnpm typecheck    # tsc -b --noEmit
pnpm lint         # eslint .
pnpm test         # vitest run (unit + integration)
pnpm test --coverage   # enforces ≥80% on src/lib, src/store, src/hooks
pnpm test:e2e     # playwright test (15 scenarios)
pnpm build        # tsc -b && vite build
```

- **Unit/integration**: streaming engine, markdown renderer, persistence, both stores,
  provider adapters (parseSse, OpenAI, Gemini, mock), provider registry, and the
  `useSendMessage` orchestration hook, and syntax highlighting — **92 tests**.
- **Coverage gate**: `statements` / `lines` / `functions` ≥ 80% on `src/lib`, `src/store`,
  `src/hooks` (via Vitest `coverage.thresholds`).
- **E2E**: **15 scenarios** across chat flows, session management, theme, streaming/stop,
  the mobile drawer, settings modal, provider switching, and simulation fallback.

## Repository layout

```
ai-chat/
├─ e2e/
│  └─ chat.spec.ts               # 15 Playwright scenarios
├─ public/
│  └─ favicon.svg
├─ src/
│  ├─ __tests__/                  # unit + integration tests (92)
│  │  ├─ chat-store.test.ts
│  │  ├─ providers.test.ts        # parseSse, adapters, registry, key mgmt
│  │  ├─ stream.test.ts, markdown.test.ts, ...
│  ├─ components/
│  │  ├─ chat/                    # ChatWindow, Message, Markdown, EmptyState, ChatHeader
│  │  ├─ composer/                # Composer
│  │  ├─ settings/                # SettingsModal (provider selector + BYOK input)
│  │  └─ sidebar/                 # Sidebar, SessionItem, ConfirmDialog
│  ├─ hooks/
│  │  └─ useSendMessage.ts        # send/stream orchestration via createProviderStream
│  ├─ lib/
│  │  ├─ providers/               # Provider adapters, registry, key persistence
│  │  │  ├─ types.ts, index.ts, openai.ts, gemini.ts, mock.ts
│  │  ├─ stream.ts                # SSE engine (seeded, cancellable)
│  │  ├─ markdown.ts              # sanitized markdown renderer
│  │  ├─ persist.ts, seed.ts, cn.ts, id.ts
│  ├─ store/
│  │  ├─ chat.ts                  # sessions/messages store (persisted)
│  │  └─ ui.ts                    # theme/provider/sidebar store (persisted)
│  ├─ test/setup.ts
│  ├─ App.tsx, main.tsx, index.css, types.ts
├─ .env.example                   # env var template for API keys
├─ playwright.config.ts
├─ vite.config.ts
└─ package.json
```

## CV-relevant highlights

- **Multi-provider architecture** — pluggable adapter pattern with a unified
  `ProviderAdapter` interface (async generator of `StreamEvent`); shared SSE parser
  across all OpenAI-compatible providers, native Gemini REST integration.
- **BYOK key management** — env-var-first resolution with in-app paste-and-store
  fallback, zero hardcoded secrets, `localStorage` isolation.
- **Streaming UI/UX** — token-by-token rendering, auto-scroll with "jump to latest",
  graceful stop with partial-content retention.
- **Production frontend patterns** — persisted Zustand stores, sanitized HTML rendering,
  keyboard-first accessible forms, FOUC-safe theming, mobile drawer navigation.
- **Engineering rigor** — 80%+ coverage gate, unit + integration + e2e suite all green,
  clean typecheck and lint.

---

Built with React 19 · TypeScript · Vite 8 · Tailwind CSS v4 · Zustand 5 · Vitest · Playwright.
