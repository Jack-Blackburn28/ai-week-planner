# AI Week Planner

A personal, single-user, AI-powered week-planning dashboard — my Liatrio Forge
capstone. It shows my week as a calendar, keeps my Work and School todos in view, and
lets me plan the week by chatting with an AI that proposes time blocks I approve.

> **Status:** Story 1 (UI shell with mock data). No AI or external integrations yet —
> the chat echoes a placeholder and a scripted mock proposal demonstrates the flow.

## Features (target)

- **Week calendar** with immovable work/class blocks and AI-planned blocks, colored by
  source (Work = blue, School = purple, Personal = green).
- **Two Things3-style todo sections** — Work and School — each item always showing a
  due date.
- **Chat-driven planning** — the only way to interact. The AI proposes a plan (dashed
  blocks on the calendar); you **Approve** or **Make Changes**.

## Getting started

Prerequisites: **Node.js 20+** and **npm**.

```bash
npm install      # install dependencies
npm run dev      # start the dev server at http://localhost:3000
```

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the local dev server. |
| `npm run build` / `npm start` | Production build / serve. |
| `npm run lint` | Lint with ESLint. |
| `npm run typecheck` | Type-check with the TypeScript compiler. |
| `npm test` | Run the test suite (Vitest). |

A Husky **pre-commit hook** runs lint + typecheck + tests before every commit.

## Project layout

- `app/` — Next.js App Router (layout, page, global styles).
- `components/` — UI components.
- `lib/` — framework-free logic (types, config, mock data, planning rules).
- `docs/` — steering docs (`product-vision`, `architecture`, `conventions`).
- `docs/specs/` — Spec-Driven Development artifacts per story.

## For contributors / agents

Start with **[`AGENTS.md`](./AGENTS.md)** (aliased as `CLAUDE.md`). It's the source of
truth for how this project is built and maintained.

## Tech stack

Next.js (App Router) · TypeScript · Tailwind CSS v4 · Vitest + React Testing Library.
