# Architecture

## One unified Next.js app

A single Next.js (App Router) + TypeScript application serves both the UI and — in later
stories — the API routes that talk to Anthropic, Google Calendar, Canvas, and Granola.
One thing to run, one thing to deploy.

```
┌──────────────────────── Browser ────────────────────────┐
│  DashboardShell (client)                                 │
│  ┌───────────────┐  ┌──────────────────────────────────┐│
│  │ Week Calendar  │  │ Todo dashboard (Work / School)    ││
│  │ (left, dominant)│  │ (right column)                    ││
│  └───────────────┘  └──────────────────────────────────┘│
│         ChatBubble ─▶ ChatDrawer (right slide-in)         │
└──────────────────────────────────────────────────────────┘
        │ (Story 2+)                 │ (Story 3+)
        ▼                            ▼
  /api/plan (Anthropic)       /api/calendar, /api/canvas, /api/granola
```

## Layers

- **`app/`** — routing, root layout, global styles. Later: API route handlers under
  `app/api/`.
- **`components/`** — presentational + interactive React components. Interactive pieces
  are Client Components (`"use client"`); static shell can stay server-rendered.
- **`lib/`** — **framework-free** TypeScript: domain types, config, mock data, and the
  pure planning logic (overlap checks, approve/discard). No React or DOM here so it is
  trivial to unit-test and reuse on the server in Story 2.

## State (Story 1)

A top-level client component, `DashboardShell`, owns the working state — calendar blocks,
todo items, chat messages, the current proposal, and the responsive view toggle — and
passes it down. State is **in-memory** and resets on refresh; there is no persistence,
database, or backend yet. Persistence and real data arrive with the integrations.

## Key domain types (`lib/types.ts`)

- `CalendarBlock` — has a `source` (`work | school | personal`) driving color and a
  `status` (`approved | proposed`) driving solid vs dashed rendering; `immovable` marks
  work/class blocks; `parentId` nests meetings inside the work block.
- `TodoItem` — `section` (`work | school`), `title`, `metaLabel`, `dueDate`, `done`.
- `ChatMessage`, `Proposal`.

## Planning rules as pure functions (`lib/planning.ts`)

The two core rules live as pure, tested functions from Story 1 so the Story 2 AI planner
reuses them instead of reinventing them:

- `overlapsImmovable(block, blocks)` — enforces "never over an immovable block".
- `approveProposal(blocks)` / `discardProposal(blocks)` — enforce "approval before
  commit" (proposed → approved) and the Make-Changes (discard) path.

## AI planner (Story 2)

The chat is wired to a server-side planner:

- **`app/api/plan` (Route Handler)** — receives `{ messages, week }`, calls
  `runPlanner`, returns `{ reply, proposal? }`.
- **`lib/planner/server.ts`** — the ONLY module that imports the Anthropic SDK and reads
  `ANTHROPIC_API_KEY`. With a key it calls `claude-sonnet-5` (config in
  `lib/planner/config.ts`) using structured outputs; without a key it uses the
  deterministic `lib/planner/mock.ts` so the app runs keyless.
- **Untrusted AI output** — every proposed block is re-validated with
  `overlapsImmovable` (`lib/planner/validate.ts`) before being returned, so the "never
  schedule over an immovable block" rule holds regardless of the model.
- **Client** — `DashboardShell` POSTs the week + conversation, shows a thinking
  indicator, renders the reply, and maps a returned proposal to `proposed` blocks; the
  Story 1 `approveProposal`/`discardProposal` logic commits or discards them.

Prompt/serialization/validation/mock are pure functions in `lib/planner/`, unit-tested
without the network (the SDK is mocked in tests).

## Calendar time window

The visible time window is a **single config value** (`lib/config.ts`, default
6am–10pm). The calendar positions blocks by their actual times against that window and
never assumes blocks fit. This lets Story 3 handle out-of-window Google Calendar events
by auto-expanding the window without a rewrite.

## Testing

Vitest + React Testing Library. Pure `lib/` logic is unit-tested directly; components are
tested with RTL. The Husky pre-commit hook runs lint + typecheck + test.

## Deployment (Story 6, planned)

Docker image, Terraform (small/cheap, `jack-`-prefixed, us-west-2, teardown-able),
GitHub Actions with OIDC building/testing/deploying on push to `main`. Secrets via env
vars / GitHub secrets — never baked into the image.
