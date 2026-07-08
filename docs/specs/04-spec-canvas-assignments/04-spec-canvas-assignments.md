# 04-spec-canvas-assignments.md

## Introduction/Overview

Story 4 replaces the **mock School todo list** with **real assignments pulled from
Canvas**. Today the School section (`components/TodoSection`) is fed by hardcoded items
in `lib/mock-data.ts`. This story adds a server-only Canvas integration that fetches
Jack's assignments and their due dates, shows them in the School section (with submission
state reflected in the checkboxes), and feeds those real due dates to the AI planner so
it treats them as genuine deadlines.

The primary data source is the **Canvas API token**; if a token isn't available, the app
falls back to the **Canvas calendar feed (ICS)** URL. This mirrors the boundary and
patterns already established by the Google Calendar integration in Story 3
(server-only `lib/`, secrets in env, fetch-on-open + Refresh, status shown in the ⚙︎
Settings drawer).

## Goals

- Fetch real Canvas assignments (title, course, due date, submission state) via the
  **Canvas API token**, with an **ICS calendar-feed fallback** when no token is set.
- Render those assignments in the **School** todo section, always showing a due date (or
  an explicit "No due date"), with submitted/graded items auto-checked but still visible.
- Feed the real assignment due dates to the **AI planner** so it prioritizes
  soonest-due/overdue work and warns when something is at risk — proposing study blocks
  only when Jack asks.
- Keep all Canvas SDK/network/secret handling **server-only** and configured through
  environment variables, consistent with the Google integration.
- Add test coverage for the assignment→todo mapping, the scope/filter rules, and the
  submission→done mapping.

## User Stories

- **As Jack (a working student)**, I want my Canvas assignments to appear automatically
  in the School list so that I don't have to re-type my homework by hand.
- **As Jack**, I want each assignment to show its due date so that I can see at a glance
  what's urgent.
- **As Jack**, I want assignments I've already submitted to show as done (but still
  visible) so that I can tell what I've finished this week without losing track.
- **As Jack**, I want the AI planner to know my real deadlines so that when I ask it to
  plan study time, it prioritizes what's due soonest and warns me if something's at risk.
- **As Jack**, I want to connect Canvas the same simple way I connected Google (drop a
  secret in `.env.local`, see status in Settings) so that setup feels familiar and my
  token never touches the browser.

## Demoable Units of Work

### Unit 1: Canvas connection + status (API token primary, ICS fallback)

**Purpose:** Establish the server-only Canvas client, its configuration via env vars, and
a Settings status indicator — the foundation everything else builds on.

**Functional Requirements:**

- The system shall read Canvas configuration from environment variables only:
  `CANVAS_BASE_URL`, `CANVAS_API_TOKEN` (primary), and `CANVAS_ICS_URL` (fallback).
- The system shall select the **API-token** source when a token is configured, and the
  **ICS-feed** source when no token is set but an ICS URL is configured.
- The system shall expose a status endpoint reporting whether Canvas is connected and via
  which mode (`token`, `ics`, or `not connected`), without ever returning the secret.
- The ⚙︎ Settings drawer shall display Canvas connection status (connected + mode, or not
  connected) alongside the existing Google status — **no secret input field**.
- All Canvas network/SDK access shall live under a server-only `lib/canvas/*` module,
  imported only by `app/api/canvas/*` routes — never from a `"use client"` component
  (mirrors the Google/Anthropic boundary).

**Proof Artifacts:**

- Test: `lib/canvas/config.test.ts` passes, demonstrating source selection (token when
  present → `token`; ICS when only ICS present → `ics`; neither → `not connected`).
- CLI/JSON: `GET /api/canvas/status` returns `{ connected, mode }` with no secret,
  demonstrating status works without leaking credentials.
- Screenshot: ⚙︎ Settings drawer showing the Canvas status row, demonstrating the UI
  surface exists.

### Unit 2: Fetch + map assignments into the School section

**Purpose:** Turn raw Canvas data into `TodoItem`s and render them in the School list,
replacing the mock school items.

**Functional Requirements:**

- The system shall fetch assignments from the selected source and map each to a School
  `TodoItem` (title, course as `metaLabel`, due date, done state).
- The system shall apply the scope rule: include assignments from active/current-term
  courses that have a due date and are due in the future **or** overdue within the recent
  window (~14 days); **also include assignments with no due date** (shown as "No due
  date"); exclude past-term and far-future items.
- The system shall set `done = true` for assignments Canvas reports as **submitted or
  graded**; such items remain visible in the list.
- The School `TodoItem`s shall support an **absent due date** (undated Canvas items and
  the invariant relaxation this requires), rendering a clear "No due date" label instead
  of a date.
- The user shall be able to manually toggle any School item's checkbox (especially undated
  items and ICS-fallback items that have no submission state).
- When Canvas is not connected, the School section shall show a clear
  "Connect Canvas" empty state (parallel to Story 3's Google empty state); the Work
  section stays mock (unchanged until Story 5).
- The ICS fallback shall map each calendar event with a due date to a School `TodoItem`
  (title + due date; `done` defaults to false since ICS carries no submission state).

**Proof Artifacts:**

- Test: `lib/canvas/map.test.ts` (or equivalent) passes, demonstrating assignment→
  `TodoItem` mapping including submitted→`done`, undated items, and the scope filter.
- Test: ICS parsing test passes, demonstrating the fallback produces School items from a
  sample `.ics` fixture.
- Screenshot: School section populated with real assignments (a submitted one checked, an
  undated one shown as "No due date"), demonstrating end-to-end rendering. *(Captured via
  a mock/demo mode so no live credentials are needed — mirrors Story 3's `GOOGLE_MOCK`.)*

### Unit 3: Refresh + planner deadline awareness

**Purpose:** Keep the list current the same way the calendar is, and make the AI treat
Canvas due dates as real deadlines.

**Functional Requirements:**

- The system shall fetch Canvas assignments on app load and re-fetch them when the
  existing Refresh button is pressed; there shall be **no background polling**.
- The refreshed School items shall flow into the planner's `WeekState.todos` (via the
  existing `toWeekState` path) so the AI plans against real due dates.
- The planner system prompt shall be strengthened so the AI treats School items as **real
  deadlines** — prioritizing soonest-due and overdue work and warning when something is at
  risk — while still proposing study/homework blocks **only when asked** and never
  committing without approval (Story 2 rules unchanged).

**Proof Artifacts:**

- Test: planner prompt test passes, demonstrating the prompt includes the deadline-
  prioritization guidance.
- Screenshot: chat where Jack asks the AI to plan study time and it proposes blocks
  ordered by/around the real Canvas due dates, demonstrating deadline awareness.
- Screenshot: Refresh re-pulls the School list, demonstrating the on-open + Refresh flow.

## Non-Goals (Out of Scope)

1. **Writing to Canvas**: read-only. The app never creates, submits, or edits Canvas
   assignments.
2. **Work todos / Granola**: the Work section stays mock — that's Story 5.
3. **In-browser secret entry**: no Settings form to paste tokens; config is env-var only
   this story.
4. **OAuth for Canvas**: uses a static personal access token / ICS URL, not an OAuth
   flow.
5. **Auto-proposing study blocks on load**: the AI proposes only on request in chat.
6. **Grades/feedback display**: submission *state* (submitted/graded) is used only to set
   the done checkbox; grade values, comments, and rubrics are out of scope.
7. **Multi-user / multiple Canvas accounts**: single user, single Canvas instance.
8. **Deployment/secret mounting**: Story 6 handles the deployed secret; here it's local
   `.env.local`.

## Design Considerations

- Reuse the existing `components/TodoSection` and `TodoItem` rendering. The only visible
  change in the School section is real data + a "No due date" label for undated items.
- Follow Story 3's UX patterns for consistency: status shown in the ⚙︎ Settings drawer, a
  "Connect Canvas" empty state when unconfigured, and the same Refresh control.
- Submitted items render checked but remain in place (do not disappear).
- Mobile layout unchanged — the School section already lives in the responsive todo
  column.

## Repository Standards

- **Server-only integration boundary**: `lib/canvas/*` is server-only, imported only by
  `app/api/canvas/*` routes — exactly like `lib/google/*` and `lib/planner/server.ts`.
- **Framework-free logic in `lib/`**: mapping, scope-filtering, and ICS parsing live as
  pure, unit-tested functions (Vitest + RTL), co-located `*.test.ts`.
- **TypeScript strict**, `@/*` import alias, PascalCase component files.
- **Env & secrets**: extend `.env.example` with the new Canvas vars; never commit real
  values; `.env*` already gitignored.
- **Commits**: conventional messages ending with the
  `Co-Authored-By: Claude Opus 4.8 (1M context)` trailer; baseline planning commit at
  story start; push to `origin main` only at story end. Husky pre-commit
  (lint + typecheck + test) must stay green.
- **Docs**: add a `docs/canvas-setup.md` (how to mint a Canvas token / find the ICS feed
  URL, and which env vars to set), paralleling `docs/google-calendar-setup.md`.

## Technical Considerations

- **Canvas API (primary):** authenticate with the personal access token as a Bearer
  token against `CANVAS_BASE_URL`. Candidate endpoints:
  `GET /api/v1/users/self/courses?enrollment_state=active` (active courses) and
  `GET /api/v1/courses/:id/assignments` (per course; includes `due_at` and, with
  `include[]=submission`, the submission `workflow_state`), or the planner/todo endpoints
  as appropriate. Handle **pagination** (Canvas uses `Link` headers) and rate limits.
  Exact endpoint choice is an implementation detail to confirm in SDD-2, but the mapping
  contract (title, course, `due_at`, submitted/graded) is fixed here.
- **ICS fallback:** fetch `CANVAS_ICS_URL`, parse `VEVENT`s into title + due date. Prefer
  a small, well-maintained ICS-parsing dependency over hand-rolling; confirm the choice in
  SDD-2 (use `context7` for current docs). ICS carries no submission state, so `done`
  defaults to false and relies on manual toggling.
- **`TodoItem.dueDate` invariant change:** currently `dueDate: string` is required
  ("Every item always has a due date"). Undated Canvas assignments require making this
  **optional** (`dueDate?: string`) or introducing a sentinel. Prefer optional + a
  "No due date" render. Audit existing usages (`serializeWeek`, `TodoItem.tsx`, mock data,
  tests) for the ripple.
- **Data flow:** Canvas School items replace the school half of the `todos` state in
  `DashboardShell`; Work items stay from `initialTodos`. School items must still flow into
  `toWeekState(allBlocks, todos)` so the planner sees them.
- **Demo/mock mode:** provide a Canvas mock (parallel to `GOOGLE_MOCK` / `client.mock.ts`)
  so the app runs and proof screenshots are captured without live credentials.
- **Timezone/date handling:** normalize Canvas `due_at` (ISO 8601, often UTC) to a local
  `YYYY-MM-DD` for `TodoItem.dueDate`, consistent with `lib/date.ts`.
- **Graceful degradation:** if a Canvas fetch fails (bad token, network), the app must not
  crash — show the not-connected/empty state and log server-side, mirroring how Story 3's
  `GoogleConnect` was hardened (`e792afa`).

## Security Considerations

- **Canvas API token is a sensitive credential** — it grants full access to Jack's Canvas
  account. It lives only in `.env.local` (gitignored) and is read server-side only; never
  sent to the browser, never logged, never returned by any endpoint (including `status`).
- **ICS URL is also a secret** (anyone with the URL can read the calendar) — same handling
  as the token: env var only, never surfaced to the client.
- `.env.example` documents the variable names with placeholder values only.
- Proof artifacts must not contain a real token or ICS URL; use mock/demo mode for
  screenshots.
- Read-only scope: the integration never writes to Canvas.

## Success Metrics

1. **Real assignments visible**: with a valid `CANVAS_API_TOKEN` set, the School section
   shows Jack's real current-term assignments with correct due dates (Jack's live
   verification — non-blocking, like Story 3's Google connect).
2. **Fallback works**: with only `CANVAS_ICS_URL` set (no token), the School section
   populates from the calendar feed.
3. **Submission state reflected**: submitted/graded assignments render checked and remain
   visible.
4. **Planner uses deadlines**: asking the AI to plan study time yields proposals that
   respect/prioritize the real due dates, with no overlap of immovable blocks and approval
   still required.
5. **Tests green**: new mapping/scope/submission/ICS tests pass; full suite + build +
   lint + typecheck stay green (pre-commit passes).
6. **No secret leakage**: no endpoint or committed file exposes the token or ICS URL.

## Open Questions

1. **Exact Canvas endpoint set** (per-course assignments vs. the planner/todo endpoint)
   and the **ICS-parsing dependency** choice — to be pinned down in SDD-2 with `context7`
   docs; the mapping contract in this spec is fixed regardless.
2. **"Current term" detection** — whether to rely on `enrollment_state=active` alone or
   also filter by an explicit term; resolve during SDD-2 based on what Canvas returns for
   Jack's account.
