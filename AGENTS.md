# AGENTS.md

> Entry point for any agent or engineer working in this repo. `CLAUDE.md` is a
> symlink to this file. **Read this first.**

## What this project is

**AI Week Planner** — a personal, single-user, AI-powered week-planning dashboard
(Liatrio Forge capstone). Three surfaces:

1. **Week calendar** (left) — the dominant view. Immovable blocks (work hours, class
   times) plus AI-planned blocks (homework, gym, golf, personal). Work meetings nest
   inside the work block.
2. **Todo dashboard** (right) — two Things3-style sections: **Work** (from Granola,
   later) and **School** (from Canvas, later). Every item always shows a due date.
3. **Chat** — a floating bubble opens a right slide-in drawer. Chat is the **only** way
   to interact with the planner. The AI proposes plans → they appear as dashed blocks on
   the calendar → the user hits **Approve** or **Make Changes**.

**Core rules** (enforced with tests as they come online):
- Never schedule anything over an immovable block.
- Nothing is committed until the user approves it in chat.
- On conflict, the AI stops and asks how to resolve — it never guesses or overlaps.

## Tech stack

- **Next.js (App Router) + TypeScript** — one unified full-stack app.
- **Tailwind CSS v4** — CSS-first config (`@import "tailwindcss"` + `@theme` tokens in
  `app/globals.css`); there is **no `tailwind.config.js`**.
- **Vitest + React Testing Library** — unit/component tests.
- **Husky** — pre-commit hook running the quality gates.

## Project structure

```
app/                 Next.js App Router (layout.tsx, page.tsx, globals.css)
app/api/plan/        POST /api/plan — server-side AI planner route (Story 2)
components/           React UI components (Calendar/, TodoSection/, Chat/, ...)
lib/                  Framework-free logic: types, config, mock data, planning rules
lib/planner/          The AI planner: config, prompt, schema, validation, mock, server
docs/                Steering docs (this project's "why" and "how")
docs/specs/          Spec-Driven Development artifacts (specs, tasks, audits, proofs)
```

Import with the `@/*` alias (e.g. `import { Brand } from "@/components/Brand"`).

**AI planner boundary:** the Anthropic SDK and `ANTHROPIC_API_KEY` are used ONLY in
`lib/planner/server.ts` (imported by the `app/api/plan` route) and
`lib/workHours/parse.server.ts` (imported by the `app/api/work-hours/parse` route) —
never from a `"use client"` component. Without a key, `runPlanner` falls back to
`lib/planner/mock.ts` and `parseWorkHours` falls back to `lib/workHours/parseMock.ts`,
so the app still runs. The server always re-validates AI proposals against immovable
blocks (`lib/planner/validate.ts`) — AI output is untrusted.

## Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the dev server (http://localhost:3000). |
| `npm run build` | Production build. |
| `npm start` | Serve the production build. |
| `npm run lint` | ESLint (Next core-web-vitals + TypeScript rules). |
| `npm run typecheck` | `tsc --noEmit` type check. |
| `npm test` | Run the Vitest suite once. |
| `npm run test:watch` | Vitest in watch mode. |

The **pre-commit hook** runs `lint`, `typecheck`, and `test`. Keep them green.

## Conventions

See `docs/conventions.md`. In short: TypeScript strict, PascalCase component files,
co-located `*.test.tsx`, small focused commits, framework-free logic in `lib/` so it is
easy to test and reuse.

## Story roadmap (built via SDD, one at a time)

1. **UI shell with mock data** ← current
2. AI planner brain (Anthropic API, propose/approve, conflict rule, replan)
3. Google Calendar (read Liatrio work cal + personal; write approved blocks)
4. Canvas assignments (API token; calendar-feed fallback)
5. Granola action items → Work todos
6. Deploy (Vercel — prod from `main`, PR previews; in-app password gate; slim
   GitHub Actions CI running lint + typecheck + test; hosted KV for persistence)

Each story: `SDD-1` spec → `SDD-2` tasks + audit → `SDD-3` implement → `SDD-4` validate,
then a hard stop for review. Artifacts live in `docs/specs/`.
