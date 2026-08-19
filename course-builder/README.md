# Course Builder

A drag-and-drop course builder — build structured curricula with a visual editor.
Modules, lessons, and content blocks (text, video, quiz, image, assignment) can
be dragged, reordered, and nested. Full undo/redo, keyboard-accessible DnD,
dark/light mode, preview mode, and auto-save to localStorage.

This is a clean-room demo of the drag-and-drop content builders I built at
**Lumofy** for the Learning Experience Platform (LXP), enabling non-technical
admins to create courses and certificate templates without developer support.

## Architecture

```
┌──────────┬──────────────────────────┬───────────────────┐
│ PALETTE  │        CANVAS            │   PROPERTIES      │
│          │                          │                   │
│ ┌──────┐ │  Module 1: Intro         │  Title: ________  │
│ │ Text │ │   ├─ Lesson: Welcome     │  Duration: ___   │
│ └──────┘ │   ├─ Lesson: Overview    │  Content: ____    │
│ ┌──────┐ │   └─ Quiz: Pre-test      │                   │
│ │Video │ │                          │                   │
│ └──────┘ │  Module 2: Basics        │                   │
│ ┌──────┐ │   ├─ Lesson: ...         │                   │
│ │Quiz  │ │   └─ Lesson: ...         │                   │
│ └──────┘ │                          │                   │
│ ┌──────┐ │  + Add Module            │                   │
│ │Image │ │                          │                   │
│ └──────┘ │                          │                   │
└──────────┴──────────────────────────┴───────────────────┘
```

### How it works

1. **Drag blocks** from the palette onto the canvas to create modules, lessons,
   and content blocks
2. **Reorder** by dragging modules, lessons, or blocks to new positions
3. **Select** any block to edit its properties in the right panel
4. **Preview** the course exactly as a student would see it
5. **Undo/redo** with Ctrl+Z / Ctrl+Shift+Z
6. **Auto-save** — everything persists to localStorage automatically

## Stack

React 19 · TypeScript (strict) · Vite · Tailwind CSS v4 · dnd-kit · Zustand · Vitest · Playwright

## Getting started

```bash
pnpm install
pnpm dev              # http://localhost:5173
```

## Quality gates

```bash
pnpm typecheck        # strict TypeScript
pnpm lint             # ESLint 9
pnpm test             # 51 unit tests (Vitest)
pnpm build            # production build
```

Playwright e2e:

```bash
npx playwright install
pnpm test:e2e         # 10 E2E tests
```

## Repository layout

```
src/
  types.ts             All TypeScript interfaces (BlockType, ContentBlock, Lesson, etc.)
  store/
    course.ts          Main Zustand store (modules, lessons, blocks, selection)
    history.ts         Undo/redo store (50-step snapshot stack)
    ui.ts              UI state (preview, dark mode, panel visibility)
  components/
    Toolbar/           Top bar (title, undo/redo, preview, theme toggle)
    Palette/           Draggable content block types
    Canvas/            Modules, lessons, blocks, DnD overlay
    Properties/        Right panel editors (per-block type)
    Preview/           Student-facing full course preview
  lib/
    cn.ts              clsx + tailwind-merge
    defaults.ts        Default block factory
    persist.ts         localStorage helpers
    constants.ts       Labels, icons, defaults
  hooks/
    useAutoSave.ts     Auto-save indicator, selection hook, keyboard shortcuts
e2e/                   Playwright tests (10 scenarios)
```
