# 01-spec-ui-shell-mock-data.md

## Introduction/Overview

Story 1 builds the **visual shell** of the AI Week-Planning Dashboard: a single-page
web app with three surfaces — a week **calendar** on the left, a **Work + School todo
dashboard** on the right, and a floating **chat bubble** that opens a slide-in chat
drawer. Everything is populated with realistic **mock data** so the layout can be seen,
felt, and refined. There is **no AI and no external integrations** in this story; the
chat simply echoes a placeholder reply, and a single canned "mock proposal" demonstrates
how proposed calendar blocks will look and how Approve / Make Changes will behave.

The goal is a polished, clean, Things3-inspired interface that works well on a desktop
browser and is usable on a phone browser, built on an AI-native repository foundation
(steering docs, `AGENTS.md`/`CLAUDE.md`, pre-commit hooks, tests) that later stories can
extend safely.

## Goals

- Stand up a Next.js + TypeScript + Tailwind app that boots cleanly and is structured
  for the five later stories to build on.
- Render the full three-surface layout (calendar left, todo dashboard right, floating
  chat bubble) with realistic mock data on desktop.
- Make the app usable on a phone via a top **Calendar | Todos** toggle and a
  full-screen chat drawer.
- Demonstrate the proposal → review → approve interaction end-to-end using mock data
  (dashed pending blocks on the calendar, Approve / Make Changes buttons in the chat).
- Establish AI-native repo conventions (steering docs, `AGENTS.md` + `CLAUDE.md`
  symlink, Husky pre-commit hook, Vitest + React Testing Library) so quality gates run
  from day one.

## User Stories

- **As Jack (the sole user)**, I want to see my whole week laid out with my fixed work
  and class blocks already in place, so that I can immediately understand what time is
  actually free.
- **As Jack**, I want my action items split into a Work list and a School list, each
  showing a due date, so that I know what I owe and by when at a glance.
- **As Jack**, I want to open a chat from a small bubble and see a proposed plan appear
  on the calendar, so that reviewing and approving a plan feels natural and low-effort.
- **As Jack**, I want the dashboard to be usable on my phone, so that I can check my
  week when I'm away from my laptop.
- **As a future maintainer (human or AI agent)**, I want clear steering docs and
  automated quality gates, so that I can extend the app in later stories without
  breaking its conventions.

## Demoable Units of Work

### Unit 1: Project Scaffold & AI-Native Repository Foundation

**Purpose:** Create the buildable Next.js app and the repository conventions every later
story depends on. Serves Jack and any future maintainer/agent.

**Functional Requirements:**
- The system shall be a Next.js (App Router) + TypeScript project using Tailwind CSS
  for styling, initialized in the repository root at `/Users/jack/ai-week-planner`.
- The system shall start locally with a single documented command (`npm run dev`) and
  serve the app with no console errors on load.
- The system shall provide these npm scripts: `dev`, `build`, `start`, `lint`,
  `typecheck`, and `test`.
- The repository shall include an `AGENTS.md` at the root describing the project,
  structure, conventions, and how to run/test it, with a `CLAUDE.md` **symlink**
  pointing to `AGENTS.md`.
- The repository shall include steering docs under `docs/` (at minimum: product vision,
  architecture overview, and coding conventions) that reflect the confirmed capstone
  vision.
- The repository shall include a Husky **pre-commit** hook that runs lint, typecheck,
  and tests, blocking a commit if any fail.
- The repository shall include a testing setup (Vitest + React Testing Library) with at
  least one passing example component test.
- The repository shall include a `.gitignore` appropriate for Next.js (ignoring
  `node_modules`, `.next`, env files, etc.).

**Proof Artifacts:**
- CLI: `npm run dev` output showing the local URL demonstrates the app boots.
- Screenshot: browser at the local URL with an empty/scaffolded page and a clean
  console demonstrates a clean boot.
- CLI: `npm run lint && npm run typecheck && npm test` all passing demonstrates the
  quality gates work.
- CLI: `ls -la` (or `git show`) showing `CLAUDE.md -> AGENTS.md` symlink and `docs/`
  contents demonstrates the AI-native foundation exists.
- CLI: a test commit blocked by a deliberately failing check (then unblocked)
  demonstrates the pre-commit hook is active.

### Unit 2: Week Calendar Surface (left)

**Purpose:** The dominant visual surface — Jack's week with immovable blocks, nested
meetings, and any planned/proposed blocks.

**Functional Requirements:**
- The system shall render a 7-day week (Monday–Sunday) with a vertical time grid from
  6:00 AM to 10:00 PM in hour rows.
- The system shall default to the current real week (the Mon–Sun week containing
  today) and visually highlight today's column.
- The user shall be able to move to the previous and next week using navigation
  controls (which re-render the grid; mock data need not differ per week).
- The system shall render mock **immovable** blocks: a recurring work-hours block
  (weekdays) and class-time blocks, positioned at their correct times.
- The system shall render mock work **meetings nested inside** the work-hours block
  (visually contained within it), not as separate top-level blocks.
- The system shall render mock **planned** (approved) personal/homework blocks in the
  free space.
- The system shall color blocks **by source**: Work = blue (work hours + meetings),
  School = purple (class + homework), Personal = green (gym/golf/errands).
- The system shall render **approved** blocks as solid fills and **proposed/pending**
  blocks as dashed-outline, faded blocks in the same source color.
- Each block shall display at least a title and its time range, sized/positioned to its
  duration on the grid.

**Proof Artifacts:**
- Screenshot: desktop calendar showing the current week with today highlighted,
  immovable work/class blocks, a nested meeting, and solid + dashed blocks in the three
  source colors demonstrates the calendar renders per spec.
- Screenshot: calendar after clicking "next week" demonstrates week navigation works.
- Test: a component/unit test asserting blocks render at expected times and that a
  proposed block carries the pending (dashed) style demonstrates block rendering logic.

### Unit 3: Work + School Todo Dashboard (right)

**Purpose:** The right-hand dashboard with two Things3-style todo sections that later
stories will fill from Granola (Work) and Canvas (School).

**Functional Requirements:**
- The system shall render two stacked sections titled **Work** and **School**, each in
  a calm, Things3-inspired style (airy spacing, circular checkboxes, rounded rows).
- Each section header shall display a **count badge** of its open items.
- Each todo item shall display a circular checkbox, a title, and exactly **one
  metadata line**.
- **School** items shall show `course · due date` in the metadata line; **Work** items
  shall show `source meeting · date` in the metadata line. Every item shall always
  show a due date / timeline.
- The system shall visually highlight items that are **due soon or overdue** (e.g.
  color/label emphasis on the date).
- The user shall be able to check/uncheck an item (visual toggle only; state resets on
  refresh, no persistence).
- The system shall be seeded with realistic mock Work and School items (a believable
  handful in each section).

**Proof Artifacts:**
- Screenshot: desktop dashboard showing both sections with count badges, one-line
  metadata, due dates, and a highlighted due-soon/overdue item demonstrates the
  Things3-style dashboard.
- Screenshot: an item checked off (visual state change) demonstrates the checkbox
  interaction.
- Test: a component test asserting a Work item shows its source meeting + date and a
  School item shows its course + due date, and that an overdue item receives the
  emphasis style, demonstrates the item rendering rules.

### Unit 4: Chat Bubble, Drawer & Mock Proposal Flow

**Purpose:** The only interaction surface. In Story 1 it proves the *shape* of the
proposal/approval loop with mock data, before the real AI arrives in Story 2.

**Functional Requirements:**
- The system shall render a floating **chat bubble** in a corner of the screen.
- Clicking the bubble shall open a **slide-in drawer from the right**, sized to cover
  the todo-dashboard column while leaving the calendar visible; clicking a close
  control (or the bubble again) shall dismiss it.
- The drawer shall render a scrollable message list and a text input; sending a message
  shall append the user's message and then a **canned placeholder** assistant reply
  (no AI call).
- The system shall provide a way to trigger a single **mock proposal** (e.g. a "propose
  a plan" affordance or a specific typed message), which shall cause one or more
  **dashed/pending** blocks to appear on the calendar and show **Approve** and **Make
  Changes** buttons in the drawer.
- Clicking **Approve** shall convert the pending (dashed) blocks to approved (solid)
  blocks on the calendar and post a short confirmation message in the drawer.
- Clicking **Make Changes** shall clear/replace the pending proposal (returning to the
  chat so Jack can "ask" for something else); it shall not commit the blocks.
- No proposed block shall ever be placed overlapping an immovable block in the mock
  proposal (previewing the Story 2 core rule).

**Proof Artifacts:**
- Screenshot: drawer open beside the visible calendar, sized to the todo column,
  demonstrates the chat surface layout.
- Screenshot: after triggering the mock proposal — dashed pending blocks on the
  calendar + Approve / Make Changes buttons in the drawer — demonstrates the proposal
  presentation.
- Screenshot: after clicking Approve — the same blocks now solid — demonstrates the
  approval conversion.
- Test: a unit test asserting Approve converts pending blocks to approved and Make
  Changes does not commit them demonstrates the approval logic.

## Non-Goals (Out of Scope)

1. **No AI / Anthropic API**: the chat only echoes a canned reply and drives one
   scripted mock proposal. Real planning arrives in Story 2.
2. **No external integrations**: no Google Calendar, Canvas, or Granola reads/writes.
   All data is hard-coded mock data (Stories 3–5).
3. **No persistence / backend / database**: state is in-memory and resets on page
   refresh. No localStorage.
4. **No authentication / password protection**: added at deploy time in Story 6.
5. **No deployment**: no Docker, Terraform, or CI/CD in this story (Story 6).
6. **No real planning engine**: the "never overlap immovable blocks" rule is honored
   only by the hand-crafted mock proposal, not by a general algorithm (Story 2).
7. **No drag-and-drop or in-calendar editing**: blocks are not draggable; all changes
   are conceptually driven through chat (mock in this story).
8. **No multi-week real data**: navigating weeks re-renders the grid but does not load
   different data sets.

## Design Considerations

- **Overall aesthetic:** clean, modern, calm. Things3-inspired for the todo dashboard
  (generous whitespace, circular checkboxes, rounded rows, restrained typography).
- **Desktop layout:** calendar occupies the dominant left region; the Work + School
  todo stack occupies the right column; the chat bubble floats in a corner and opens a
  right-edge drawer sized to exactly cover the todo column (calendar stays visible so
  proposals can be watched live).
- **Mobile layout:** a top segmented **Calendar | Todos** toggle switches the main view
  in place; the 7-day calendar scrolls horizontally so days stay readable; the chat
  drawer becomes full-screen. The bubble floats over both views.
- **Color system (by source):** Work = blue, School = purple, Personal = green.
  Approved = solid fill; proposed = dashed outline + reduced opacity in the same color.
  A subtle legend is acceptable but optional.
- **Today & time:** today's column is highlighted; a current-time indicator line is a
  nice-to-have, not required for Story 1.
- **Accessibility basics:** sufficient color contrast, focusable/keyboard-activatable
  buttons and checkboxes, and color never used as the *only* signal (pending blocks
  also differ by dashed border; due-soon items also carry a label, not just color).

## Repository Standards

Because this is a greenfield repo, this story **establishes** the standards later
stories follow:

- **Language/stack:** TypeScript throughout; Next.js App Router; Tailwind CSS v4;
  React function components with hooks.
- **Structure:** `app/` (routes/layout), `components/` (UI components such as
  `Calendar`, `TodoSection`, `ChatBubble`, `ChatDrawer`), `lib/` (types, mock data,
  and pure helper logic like the approve/pending conversion), `docs/` (steering +
  specs). Use the `@/*` path alias.
- **Naming:** PascalCase component files; camelCase functions/variables; kebab-case
  for non-component filenames where natural.
- **Testing:** Vitest + React Testing Library; test files co-located as `*.test.ts(x)`
  or under a `__tests__/` folder; pure logic in `lib/` is unit-tested directly.
- **Quality gates:** `lint`, `typecheck`, and `test` must pass; enforced by the Husky
  pre-commit hook.
- **Docs-as-source-of-truth:** `AGENTS.md` (with `CLAUDE.md` symlink) is the entry
  point for any agent picking up the repo.
- **Commits:** small, focused commits with clear messages.

## Technical Considerations

- **Next.js App Router (current standard):** root `app/layout.tsx` (with `<html>` and
  `<body>`) plus `app/page.tsx` as the single dashboard page. `tsconfig.json` with
  `moduleResolution: "bundler"`, `strict: true`, and the `@/*` path alias, as generated
  by `create-next-app`.
- **Tailwind CSS v4 (changed from v3 — grounded via current Tailwind docs):** install
  `tailwindcss`, `@tailwindcss/postcss`, and `postcss`; configure via a
  `postcss.config.mjs` registering the `@tailwindcss/postcss` plugin; import Tailwind in
  `globals.css` using `@import "tailwindcss";` (CSS-first — a `tailwind.config.js` is
  **not** required by default). Custom source colors can be defined as CSS variables /
  `@theme` tokens.
- **Client vs server components:** the dashboard is interactive (chat, checkboxes,
  proposal state), so the interactive pieces are Client Components (`"use client"`);
  static layout/shell can remain Server Components. Keep state in React (e.g. a top-level
  client component or lightweight context) — no server state in Story 1.
- **State shape:** define TypeScript types in `lib/` for calendar blocks (with a
  `status: "approved" | "proposed"` and a `source: "work" | "school" | "personal"`),
  todo items (with `section`, `title`, `metadata`, `dueDate`), and chat messages. Mock
  data seeds these types.
- **Pure, testable logic:** the approve/pending conversion and the "does this block
  overlap an immovable block" check should live as pure functions in `lib/` so they can
  be unit-tested now and reused by the real planner in Story 2.
- **Responsiveness:** use Tailwind responsive utilities; the Calendar|Todos toggle is a
  client-side view switch shown only below a breakpoint.
- **Configurable / expandable time window (forward-looking constraint):** the calendar's
  start hour and end hour must be a single configuration value (default 6:00 AM–10:00 PM),
  **not** hard-coded throughout the component. The calendar shall position each block by
  its actual start/end time against the current window and must not assume blocks fit
  inside the default window. In Story 1 all mock data sits inside 6a–10p, but building
  the component window-agnostic means Story 3 (Google Calendar sync) can handle
  out-of-window events cleanly by **auto-expanding the visible window to fit the week's
  earliest start and latest end** (with 6a–10p as the default minimum). This is a design
  constraint on the Story 1 calendar; the auto-expand behavior itself is implemented in
  Story 3.
- **Node/tooling:** target a current LTS Node version; pin dependency versions via
  `package-lock.json`.

## Security Considerations

- No secrets, API keys, or credentials are introduced in Story 1 (no external services).
- `.gitignore` must exclude `.env*` files preemptively so no secret can be committed
  once integrations arrive.
- Proof artifacts (screenshots) contain only mock data, so they are safe to include in
  the story recap; still, avoid committing large binaries into the repo unnecessarily.
- No user input is sent anywhere off-device in this story (chat is local echo).

## Success Metrics

1. **Clean boot:** `npm run dev` serves the app with zero console errors, and `npm run
   lint && npm run typecheck && npm test` all pass.
2. **Layout fidelity:** on desktop, all three surfaces render with mock data matching
   the confirmed layout and color rules; on a phone-width viewport, the Calendar|Todos
   toggle and full-screen chat drawer work.
3. **Interaction fidelity:** triggering the mock proposal shows dashed blocks +
   Approve/Make Changes; Approve makes them solid; Make Changes does not commit — all
   demonstrable via screenshots.
4. **Foundation quality:** `AGENTS.md` + `CLAUDE.md` symlink, `docs/` steering, and a
   working pre-commit hook exist; at least the approve/pending and overlap-check logic
   has passing unit tests.

## Open Questions

_All resolved by Jack at the spec review checkpoint:_

1. **Mock proposal trigger:** RESOLVED — use a small **"Propose a plan" button /
   quick-action in the drawer** for Story 1 (no NLP yet); removed/replaced in Story 2.
2. **Legend visibility:** RESOLVED — include a **small, unobtrusive color legend**.
3. **Current-time indicator line:** RESOLVED — **defer** to a later polish pass.
4. **Out-of-window events (raised at review):** RESOLVED as a design constraint — the
   calendar time window is a single config value and the component is built
   window-agnostic (see Technical Considerations). Auto-expanding the window to fit
   stray early/late events is implemented in Story 3, not Story 1.
