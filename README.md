# AI Week Planner

A personal, single-user, AI-powered week-planning dashboard — my Liatrio Forge
capstone. It shows my week as a calendar, keeps my Work and School todos in view, and
lets me plan the week by chatting with an AI that proposes time blocks I approve.

> **Status:** Stories 1–5 complete (UI shell, AI planner, Google Calendar, Canvas,
> Granola). Story 6 (deploy to Vercel) in progress — see `docs/deployment.md`.

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

## Deployment

Deployed on **Vercel** (free tier) with production from `main` and preview deploys on PRs.
The whole app is protected by a single shared password (`APP_PASSWORD`) enforced on every
page and API route. A slim **GitHub Actions** workflow runs lint + typecheck + tests on every
push/PR as the quality gate; Vercel handles deploying. On Vercel, persistent state (Google
login, Granola items, completions) lives in a hosted key-value store instead of local files.

See **[`docs/deployment.md`](./docs/deployment.md)** for the full step-by-step setup
(connecting the repo, environment variables, the KV add-on, and the Google redirect URI).

## For contributors / agents

Start with **[`AGENTS.md`](./AGENTS.md)** (aliased as `CLAUDE.md`). It's the source of
truth for how this project is built and maintained.

## Tech stack

Next.js (App Router) · TypeScript · Tailwind CSS v4 · Vitest + React Testing Library.
