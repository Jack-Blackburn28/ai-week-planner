# 01-tasks-ui-shell-mock-data.md

Tasks for **Story 1 — UI Shell with Mock Data**.
Spec: `./01-spec-ui-shell-mock-data.md`

Dependency order: **1.0 → 2.0 → (3.0, 4.0, 5.0) → 6.0**. Tasks 3.0–5.0 all depend on
the types, mock data, and pure logic delivered in 2.0.

## Relevant Files

| File | Why It Is Relevant |
| --- | --- |
| `package.json` | Dependencies and the `dev`/`build`/`start`/`lint`/`typecheck`/`test` scripts. |
| `next.config.ts` | Next.js configuration. |
| `tsconfig.json` | TypeScript config (`strict`, `moduleResolution: "bundler"`, `@/*` alias). |
| `postcss.config.mjs` | Registers the Tailwind v4 `@tailwindcss/postcss` plugin. |
| `app/globals.css` | `@import "tailwindcss";` + `@theme` source-color tokens (work/school/personal). |
| `app/layout.tsx` | Root layout (`<html>`/`<body>`, metadata, imports `globals.css`). |
| `app/page.tsx` | The single dashboard page; renders the top-level shell. |
| `.gitignore` | Ignores `node_modules`, `.next`, `.env*`, `coverage`, etc. |
| `eslint.config.mjs` | ESLint (Next.js core-web-vitals + TS) for the `lint` gate. |
| `vitest.config.ts` | Vitest config (jsdom env, React plugin, setup file). |
| `vitest.setup.ts` | RTL + `@testing-library/jest-dom` matchers. |
| `.husky/pre-commit` | Pre-commit hook running lint + typecheck + test. |
| `AGENTS.md` | Agent/maintainer entry point: overview, structure, run/test commands, conventions. |
| `CLAUDE.md` | **Symlink** → `AGENTS.md`. |
| `README.md` | Human-facing project readme: what it is, setup, scripts, links to `docs/`. |
| `docs/product-vision.md` | Steering: the confirmed capstone product vision. |
| `docs/architecture.md` | Steering: app structure, state model, story roadmap. |
| `docs/conventions.md` | Steering: coding standards, testing, commit conventions. |
| `lib/config.ts` | Single source of truth for the calendar time window + week start. |
| `lib/types.ts` | Domain types: `CalendarBlock`, `TodoItem`, `ChatMessage`, `Proposal`. |
| `lib/time.ts` | Pure grid helpers (position/height from time vs window); tested. |
| `lib/time.test.ts` | Unit tests for `time.ts`. |
| `lib/planning.ts` | Pure logic: overlap-with-immovable check, approve, discard (Make Changes). |
| `lib/planning.test.ts` | Unit tests for the core planning rules. |
| `lib/mock-data.ts` | Realistic seed data: immovable blocks, meetings, todos, chat, mock proposal. |
| `components/DashboardShell.tsx` | Top-level client component holding state + responsive layout/toggle. |
| `components/Calendar/Calendar.tsx` | Week grid: columns, hour rows, today highlight, week nav. |
| `components/Calendar/CalendarBlock.tsx` | A single block (position/size, source color, solid/dashed). |
| `components/Calendar/Calendar.test.tsx` | Tests block positioning, dashed pending style, config window. |
| `components/TodoSection/TodoSection.tsx` | A Things3-style section (header + count badge + items). |
| `components/TodoSection/TodoItem.tsx` | Circular checkbox + title + one metadata line + due emphasis. |
| `components/TodoSection/TodoSection.test.tsx` | Tests item metadata rules, count badge, overdue emphasis. |
| `components/Chat/ChatBubble.tsx` | Floating bubble button. |
| `components/Chat/ChatDrawer.tsx` | Right slide-in drawer: messages, input, propose/approve/changes. |
| `components/Chat/ChatDrawer.test.tsx` | Tests echo reply, approve→solid, make-changes→no-commit. |
| `components/Legend.tsx` | Small, unobtrusive color legend. |

### Notes

- Tests are co-located with the code (`Component.tsx` + `Component.test.tsx`); pure
  `lib/` logic is unit-tested directly.
- Test runner: `npm test` (Vitest). Type gate: `npm run typecheck`. Lint: `npm run lint`.
- Follow `docs/conventions.md` (created in 1.0): TS strict, PascalCase components,
  `@/*` imports, small focused commits.
- The Husky pre-commit hook runs lint + typecheck + test, so keep those green.

## Tasks

### [ ] 1.0 Project Scaffold & AI-Native Repository Foundation

Establishes the buildable Next.js + TypeScript + Tailwind v4 app and the repo
conventions every later story relies on. Maps to spec Unit 1.

#### 1.0 Proof Artifact(s)

- CLI: `npm run dev` output showing the local URL (e.g. `http://localhost:3000`)
  demonstrates the app boots.
- Screenshot: browser at `http://localhost:3000` showing the scaffolded page with a
  clean (error-free) console demonstrates a clean boot.
- CLI: `npm run lint && npm run typecheck && npm test` all exit 0 demonstrates the
  quality gates work and the example test passes.
- CLI: `readlink CLAUDE.md` returning `AGENTS.md` demonstrates the symlink foundation.
- CLI: a commit attempt blocked by a deliberately failing check, then succeeding after
  the fix, demonstrates the Husky pre-commit hook is active.
- Diff: `README.md`, `AGENTS.md`, and `docs/` steering files added demonstrates the
  AI-native foundation exists.

#### 1.0 Tasks

- [ ] 1.1 Initialize a Next.js App Router + TypeScript project in the repo root
  (`app/` dir, `tsconfig.json` with `strict`, `moduleResolution: "bundler"`, and the
  `@/*` path alias; `next.config.ts`).
- [ ] 1.2 Install and configure Tailwind CSS v4: add `tailwindcss`,
  `@tailwindcss/postcss`, `postcss`; create `postcss.config.mjs` with the
  `@tailwindcss/postcss` plugin; set `app/globals.css` to `@import "tailwindcss";` and
  define `@theme` tokens for the work/school/personal source colors.
- [ ] 1.3 Add npm scripts: `dev`, `build`, `start`, `lint`, `typecheck`
  (`tsc --noEmit`), and `test` (`vitest run`).
- [ ] 1.4 Configure ESLint (`eslint.config.mjs`, Next core-web-vitals + TypeScript) and
  confirm `npm run lint` and `npm run typecheck` pass on the scaffold.
- [ ] 1.5 Set up Vitest + React Testing Library (`vitest.config.ts` with jsdom env +
  React plugin, `vitest.setup.ts` importing `@testing-library/jest-dom`) and add one
  passing example smoke test.
- [ ] 1.6 Add a Next.js-appropriate `.gitignore` (`node_modules`, `.next`, `.env*`,
  `coverage`, build output).
- [ ] 1.7 Install Husky and add a `.husky/pre-commit` hook that runs
  `npm run lint && npm run typecheck && npm test`; verify it blocks a commit when a
  check fails.
- [ ] 1.8 Write `AGENTS.md` (project overview, folder structure, how to run/dev/test,
  conventions, story roadmap) and create `CLAUDE.md` as a symlink to it
  (`ln -s AGENTS.md CLAUDE.md`).
- [ ] 1.9 Write `README.md` (what the app is, prerequisites, install/run/test commands,
  links to `docs/` and `docs/specs/`).
- [ ] 1.10 Write steering docs: `docs/product-vision.md`, `docs/architecture.md`,
  `docs/conventions.md`, reflecting the confirmed vision and this spec.
- [ ] 1.11 Render a minimal placeholder page and confirm a clean boot (no console
  errors); capture the boot proof artifacts.

### [ ] 2.0 Domain Types, Mock Data & Pure Planning Logic (`lib/`)

Defines the shared types, realistic seed data, and the pure, unit-tested rules the
surfaces reuse (overlap-with-immovable check, approve, discard). This is the reusable
core the Story 2 planner builds on. Maps to spec Technical Considerations; cross-cuts
Units 2–4.

#### 2.0 Proof Artifact(s)

- CLI: `npm test` output showing passing tests for approve→approved,
  make-changes→no-commit, and the immovable-overlap check demonstrates the core logic
  is correct.
- Test: `lib/planning.test.ts` passes demonstrates the pure functions meet spec rules.
- Diff: `lib/types.ts` + `lib/mock-data.ts` added, showing typed blocks/todos with the
  three sources and both statuses, demonstrates the data model + seed data.
- CLI: `npm run typecheck` exit 0 demonstrates the mock data conforms to the types.

#### 2.0 Tasks

- [ ] 2.1 Create `lib/config.ts`: `CALENDAR_START_HOUR` (6), `CALENDAR_END_HOUR` (22),
  and week-start (Monday) as the single source of truth used everywhere.
- [ ] 2.2 Create `lib/types.ts`: `CalendarBlock` (`id`, `title`, `source:
  'work'|'school'|'personal'`, `status: 'approved'|'proposed'`, `day`, `startMinutes`,
  `endMinutes`, `immovable?: boolean`, `parentId?: string` for nested meetings),
  `TodoItem` (`id`, `section: 'work'|'school'`, `title`, `metaLabel`, `dueDate`,
  `done`), `ChatMessage` (`id`, `role: 'user'|'assistant'`, `text`), and `Proposal`
  (a set of proposed blocks).
- [ ] 2.3 Create `lib/planning.ts` with pure functions:
  `overlapsImmovable(block, blocks)` (true if it would overlap any immovable block on
  the same day), `approveProposal(blocks)` (returns blocks with `proposed` → `approved`),
  and `discardProposal(blocks)` (returns blocks with `proposed` removed). No React/DOM.
- [ ] 2.4 Create `lib/mock-data.ts`: immovable work-hours blocks (Mon–Fri 9–5), 2–3
  meetings nested in the work block (`parentId`), a couple of evening class blocks,
  some approved personal/homework blocks in free space, Work + School todo items each
  with a due date (include at least one overdue and one due-soon), an initial chat
  message or two, and a canned mock `Proposal` whose blocks sit in free space and pass
  `overlapsImmovable === false`.
- [ ] 2.5 Create `lib/planning.test.ts`: assert `overlapsImmovable` catches an
  overlap and allows a free-space block; `approveProposal` converts only proposed
  blocks and preserves the rest; `discardProposal` removes proposed blocks without
  approving any; and the mock `Proposal` does not overlap immovable blocks.
- [ ] 2.6 Run `npm run typecheck` and `npm test`; confirm green.

### [ ] 3.0 Week Calendar Surface (left)

Renders the dominant Mon–Sun, 6a–10p calendar (config-driven), today highlighted,
prev/next navigation, immovable blocks, nested meetings, and approved/proposed blocks
colored by source. Maps to spec Unit 2.

#### 3.0 Proof Artifact(s)

- Screenshot: desktop calendar — current week, today highlighted, immovable work/class
  blocks, a meeting nested in the work block, and solid + dashed blocks in
  blue/purple/green — demonstrates the calendar renders per spec.
- Screenshot: calendar after clicking "next week" (header dates change) demonstrates
  week navigation.
- Test: `components/Calendar/Calendar.test.tsx` passes, asserting blocks position at
  expected times and a proposed block carries the dashed/pending style.
- Test: `lib/time.test.ts` (and a Calendar test) asserting a non-default config window
  positions blocks correctly demonstrates the window-agnostic constraint.

#### 3.0 Tasks

- [ ] 3.1 Create `lib/time.ts` pure helpers that convert a block's start/end minutes to
  a top offset and height given the config window; add `lib/time.test.ts` (including a
  non-default window case).
- [ ] 3.2 Build `components/Calendar/Calendar.tsx`: 7 day columns (Mon–Sun of the week
  containing today), hour rows from `lib/config.ts`, day headers with dates, and
  today's column visually highlighted.
- [ ] 3.3 Add prev/next week navigation controls that shift the displayed week and
  update the header dates.
- [ ] 3.4 Build `components/Calendar/CalendarBlock.tsx`: render title + time range,
  position/size via `lib/time.ts`, color by `source`, solid fill for `approved` and
  dashed + faded for `proposed`.
- [ ] 3.5 Render meetings nested visually inside their parent work block (using
  `parentId`), contained within the work-hours block.
- [ ] 3.6 Wire the calendar to the mock blocks from `lib/mock-data.ts` via
  `DashboardShell` state.
- [ ] 3.7 Write `components/Calendar/Calendar.test.tsx` covering block positions, the
  dashed pending style, and config-window rendering.

### [ ] 4.0 Work + School Todo Dashboard (right)

Two Things3-style sections with count badges, one-line metadata, always-visible due
dates, overdue/soon emphasis, and a visual-only check toggle. Maps to spec Unit 3.

#### 4.0 Proof Artifact(s)

- Screenshot: desktop dashboard — Work + School sections with count badges, one-line
  metadata, due dates, and a highlighted due-soon/overdue item — demonstrates the
  Things3-style dashboard.
- Screenshot: an item toggled to checked (visual change) demonstrates the checkbox.
- Test: `components/TodoSection/TodoSection.test.tsx` passes, asserting a Work item
  shows source meeting + date, a School item shows course + due date, the count badge
  reflects open items, and an overdue item receives the emphasis style.

#### 4.0 Tasks

- [ ] 4.1 Build `components/TodoSection/TodoSection.tsx`: section header with title +
  count badge (open items), Things3-style spacing/rounding.
- [ ] 4.2 Build `components/TodoSection/TodoItem.tsx`: circular checkbox, title, one
  metadata line (School: `course · due`; Work: `meeting · date`), always showing the
  date; add a helper to classify a due date as overdue / due-soon / normal and apply
  emphasis styling.
- [ ] 4.3 Implement the check/uncheck toggle as local component state (visual only;
  resets on refresh).
- [ ] 4.4 Compose the stacked Work + School sections from `lib/mock-data.ts` in
  `DashboardShell`.
- [ ] 4.5 Write `components/TodoSection/TodoSection.test.tsx` covering the metadata
  rules, count badge, and overdue emphasis.

### [ ] 5.0 Chat Bubble, Drawer & Mock Proposal Flow

Floating bubble → right slide-in drawer (covers the todo column, calendar visible),
placeholder echo, "Propose a plan" → dashed blocks + Approve / Make Changes wired to
the 2.0 logic. Maps to spec Unit 4.

#### 5.0 Proof Artifact(s)

- Screenshot: drawer open beside the visible calendar, sized to the todo column.
- Screenshot: sending a message shows the user message + canned placeholder reply.
- Screenshot: after "Propose a plan" — dashed pending blocks on the calendar +
  Approve / Make Changes in the drawer.
- Screenshot: after Approve — blocks now solid; plus a shot of Make Changes clearing the
  proposal without committing.
- Test: `components/Chat/ChatDrawer.test.tsx` passes, asserting Approve converts
  pending→approved and Make Changes does not commit (using `lib/planning.ts`).

#### 5.0 Tasks

- [ ] 5.1 Build `components/Chat/ChatBubble.tsx`: a floating corner button that toggles
  the drawer.
- [ ] 5.2 Build `components/Chat/ChatDrawer.tsx`: right slide-in panel sized to the
  todo-column width (calendar stays visible), with an open/close animation and a close
  control.
- [ ] 5.3 Add the message list + text input; sending appends the user message and a
  canned placeholder assistant reply (no AI call).
- [ ] 5.4 Add a "Propose a plan" button that loads the mock `Proposal` blocks onto the
  calendar as `proposed` (dashed) and reveals Approve / Make Changes.
- [ ] 5.5 Wire Approve → `approveProposal` (proposed→approved) + a confirmation message;
  Make Changes → `discardProposal` (no commit) + return focus to the chat input.
- [ ] 5.6 Guard that proposed blocks never overlap immovable blocks (assert via
  `overlapsImmovable` on the mock proposal).
- [ ] 5.7 Write `components/Chat/ChatDrawer.test.tsx` covering the echo reply, the
  approve→approved conversion, and the make-changes→no-commit path.

### [ ] 6.0 Responsive/Mobile Layout, Legend & Polish

Phone experience (Calendar | Todos toggle, horizontal-scroll week, full-screen drawer),
the color legend, accessibility basics, and a final clean/buildable pass. Maps to spec
Design Considerations + Success Metrics.

#### 6.0 Proof Artifact(s)

- Screenshot: phone-width viewport showing the top Calendar | Todos toggle, Calendar
  active.
- Screenshot: phone-width viewport, Todos active, chat drawer opened full-screen.
- Screenshot: the week calendar scrolled horizontally on a phone width (days readable).
- Screenshot: desktop showing the small color legend.
- CLI: `npm run lint && npm run typecheck && npm test` all exit 0 and `npm run build`
  succeeds demonstrates the story is clean and buildable.
- Test: an accessibility test asserting the checkbox and buttons are
  keyboard-activatable with accessible names.

#### 6.0 Tasks

- [ ] 6.1 In `DashboardShell`, add the responsive breakpoint: below it, hide the
  side-by-side layout and show a top segmented **Calendar | Todos** toggle that switches
  the active main view.
- [ ] 6.2 Make the week calendar horizontally scrollable on narrow widths so day columns
  stay readable.
- [ ] 6.3 Make the chat drawer render full-screen on mobile widths.
- [ ] 6.4 Build `components/Legend.tsx` (small, unobtrusive: Work/School/Personal colors
  + "dashed = proposed") and place it near the calendar.
- [ ] 6.5 Accessibility pass: ensure buttons/checkboxes are focusable and
  keyboard-activatable with accessible names, sufficient contrast, and non-color signals
  (dashed border for proposed, text label for due-soon/overdue).
- [ ] 6.6 Final pass: verify clean boot (no console errors), `npm run build` succeeds,
  and all gates are green.
- [ ] 6.7 Add an accessibility test (checkbox + buttons keyboard-activatable with
  accessible names).
