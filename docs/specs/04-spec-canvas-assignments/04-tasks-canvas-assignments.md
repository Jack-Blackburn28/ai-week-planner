# 04-tasks-canvas-assignments.md

Task list for **Story 4 — Canvas Assignments** (spec:
`04-spec-canvas-assignments.md`; decisions: `04-questions-1-canvas-assignments.md`).

Parent tasks are demoable, end-to-end slices, sequenced by dependency. All Canvas
network/secret handling is **server-only** (`lib/canvas/*`, imported only by
`app/api/canvas/*`), mirroring the Google/Anthropic boundary.

## Relevant Files

| File | Why It Is Relevant |
| --- | --- |
| `lib/canvas/types.ts` | Canvas domain types: `CanvasMode` (`token`/`ics`/`none`), raw assignment/course shapes, `CanvasStatus`. |
| `lib/canvas/config.ts` | Reads `CANVAS_BASE_URL`/`CANVAS_API_TOKEN`/`CANVAS_ICS_URL`; `resolveMode()` (token→ics→none), `isMockMode()`, `isCanvasConfigured()`. Server-only. |
| `lib/canvas/config.test.ts` | Tests source-selection precedence and mock-mode detection. |
| `lib/canvas/client.ts` | `CanvasClient` interface + real API-token impl (fetch + `Link`-header pagination) + `resolveClient()`. Server-only. |
| `lib/canvas/client.mock.ts` | In-memory fake client for demo/tests (parallels `lib/google/client.mock.ts`). |
| `lib/canvas/demoSeed.ts` | Fabricated sample assignments (incl. a submitted one + an undated one) for demo mode. |
| `lib/canvas/ics.ts` | Parse an ICS feed into raw assignment shapes (via chosen ICS lib). Server-only. |
| `lib/canvas/ics.test.ts` | Tests ICS parsing against a committed sample `.ics` fixture. |
| `lib/canvas/fixtures/sample.ics` | Small sanitized ICS fixture for the parser test. |
| `lib/canvas/map.ts` | Pure: raw Canvas/ICS assignment → School `TodoItem`; scope filter; submitted/graded → `done`; undated handling. Framework-free. |
| `lib/canvas/map.test.ts` | Tests mapping, scope filter, submission→done, undated items. |
| `app/api/canvas/status/route.ts` | `GET` → `{ connected, mode }`; never returns the secret. |
| `app/api/canvas/status.test.ts` | Tests status shape + no-secret-leak (mirrors `app/api/google/status.test.ts`). |
| `app/api/canvas/assignments/route.ts` | `GET` → mapped School `TodoItem[]` from the resolved source; empty array + not-connected when unconfigured. |
| `lib/types.ts` | Relax `TodoItem.dueDate` to optional (`dueDate?: string`) for undated assignments. |
| `lib/date.ts` | `classifyDue`/`formatDueLabel` currently require a string; add a "no due date" path (or guard in the component). |
| `components/TodoSection/TodoItem.tsx` | Render "No due date" when `dueDate` is absent; keep manual toggle. |
| `components/TodoSection/TodoItem.test.tsx` (new) or `TodoSection.test.tsx` | Assert undated render + submitted-checked rendering. |
| `components/Settings/GoogleConnect.tsx` | Add a Canvas status row (rename intent: it's the Settings panel). Reads `/api/canvas/status`. |
| `components/DashboardShell.tsx` | Fetch `/api/canvas/assignments` on load + Refresh; School items from Canvas; "Connect Canvas" empty state; feed school todos to planner. |
| `lib/planner/prompt.ts` | Strengthen system prompt: School items are real deadlines; prioritize soonest-due/overdue; warn if at risk. |
| `lib/planner/prompt.test.ts` | Assert the new deadline-prioritization guidance is present; existing rules intact. |
| `.env.example` | Add `CANVAS_BASE_URL` / `CANVAS_API_TOKEN` / `CANVAS_ICS_URL` (placeholders only). |
| `.gitignore` | Ensure any Canvas local state file is ignored (if one is introduced; env-only plan needs none). |
| `docs/canvas-setup.md` | How to mint a Canvas token / find the ICS feed URL; which env vars to set. |
| `package.json` | Add the chosen ICS-parsing dependency (confirmed via context7 in T2). |

### Notes

- Co-locate tests (`Thing.ts` → `Thing.test.ts`); run with `npm test` (Vitest).
- TypeScript strict, no `any`; logic in `lib/`, components render. Use the `@/*` alias.
- Conventional commits referencing the task (e.g. `feat: … Related to T2.0 in Spec 04`),
  ending with the `Co-Authored-By: Claude Opus 4.8 (1M context)` trailer.
- Husky pre-commit (lint + typecheck + test) must stay green; never `--no-verify`.
- Demo mode (`CANVAS_MOCK=1`) mirrors `GOOGLE_MOCK` so proof screenshots need no live creds.

## Tasks

### [x] 1.0 Canvas connection foundation, config & status

Establish the server-only `lib/canvas/*` module, env-var configuration with
token-primary → ICS-fallback source selection, a status endpoint that never leaks the
secret, the ⚙︎ Settings status row, and setup docs. (Spec Unit 1.)

#### 1.0 Proof Artifact(s)

- Test: `lib/canvas/config.test.ts` passes — source selection returns `token` when a
  token is set, `ics` when only an ICS URL is set, `none` when neither.
- CLI/JSON: `curl localhost:3000/api/canvas/status` returns `{ connected, mode }` with
  **no secret** in the body.
- Screenshot: ⚙︎ Settings drawer showing the Canvas status row beside the Google status.
- Diff: `.env.example` gains the three Canvas vars (placeholders only) and
  `docs/canvas-setup.md` is added.

#### 1.0 Tasks

- [x] 1.1 Add `lib/canvas/types.ts`: `CanvasMode`, `CanvasStatus`, and raw
  course/assignment shapes used by the client.
- [x] 1.2 Add `lib/canvas/config.ts`: read the three env vars lazily,
  `resolveMode()` (token→ics→none), `isCanvasConfigured()`, `isMockMode()`. Server-only.
- [x] 1.3 Write `lib/canvas/config.test.ts` covering the precedence matrix and mock mode.
- [x] 1.4 Add `app/api/canvas/status/route.ts` returning `{ connected, mode }` +
  `app/api/canvas/status.test.ts` (no-secret-leak assertions).
- [x] 1.5 Add a Canvas status row — implemented as a dedicated
  `components/Settings/CanvasConnect.tsx` rendered in the Settings drawer (cleaner than
  overloading `GoogleConnect`); fetches `/api/canvas/status`, guarded against unmount.
- [x] 1.6 Extend `.env.example` with the three Canvas vars (placeholders) and write
  `docs/canvas-setup.md`.
- [x] 1.7 Ran lint + typecheck + Canvas tests (green); captured the status-row
  screenshot in mock mode. Commit below.

### [x] 2.0 Fetch, parse & map assignments → School todos (data layer)

Fetch from the selected source and map to School `TodoItem`s: Canvas API path (course +
`due_at` + submission state, paginated) and the ICS fallback. Apply the scope filter and
submission→done, relax `TodoItem.dueDate` to optional, and expose it via
`/api/canvas/assignments`. (Spec Unit 2, data.)

#### 2.0 Proof Artifact(s)

- Test: `lib/canvas/map.test.ts` passes — mapping incl. submitted/graded → `done = true`,
  undated item → no `dueDate`, and scope filter (excludes past-term/far-future, includes
  recent-overdue).
- Test: `lib/canvas/ics.test.ts` passes against `fixtures/sample.ics` → School items.
- Test: existing suite compiles/passes with `TodoItem.dueDate` optional (no consumer
  regressions).
- CLI/JSON: `curl localhost:3000/api/canvas/assignments` (mock mode) returns the mapped
  School items as JSON.

#### 2.0 Tasks

- [x] 2.1 Relaxed `TodoItem.dueDate` to optional in `lib/types.ts`; audited consumers —
  guarded `serializeWeek` ("no due date") and `TodoItem.tsx` ("No due date" render);
  `mock-data.ts` unaffected. Full suite stays green.
- [x] 2.2 Chose + added `ical.js@^2` (confirmed via context7 — pure-JS, better fit than
  `node-ical`); recorded the choice in `docs/canvas-setup.md`.
- [x] 2.3 Added `lib/canvas/ics.ts` (defensive parse → raw assignments), sanitized
  `lib/canvas/fixtures/sample.ics`, and `lib/canvas/ics.test.ts` (incl. course-tag
  extraction + unparseable input).
- [x] 2.4 Added `lib/canvas/map.ts` (course→metaLabel, `due_at`→local date,
  submitted/graded→`done`, undated→no `dueDate`; scope filter future OR overdue ≤14d,
  always keep undated) + `lib/canvas/map.test.ts`.
- [x] 2.5 Added `lib/canvas/client.ts` (`CanvasClient` interface + real token client with
  `Link`-header pagination + ICS client + `resolveClient()`), `client.mock.ts`, and
  `demoSeed.ts` (submitted + undated samples).
- [x] 2.6 Added `app/api/canvas/assignments/route.ts`: resolve → fetch → map → `TodoItem[]`;
  fails soft to `[]` on error / not-connected.
- [x] 2.7 Ran the full gates (122 tests green); captured the `curl …/assignments` JSON.
  Commit below.

### [x] 3.0 Render real assignments in the School section + refresh

Wire mapped assignments into `DashboardShell`: fetch on load + on the existing Refresh
button (no polling), replace mock school items, render "No due date", keep submitted
items checked-but-visible, allow manual toggle, show a "Connect Canvas" empty state.
Work section stays mock. (Spec Unit 2 UI + Unit 3 refresh.)

#### 3.0 Proof Artifact(s)

- Screenshot: School section populated (demo mode) — a submitted item checked, an undated
  item labeled "No due date".
- Screenshot: "Connect Canvas" empty state when unconfigured.
- Test: a component/shell test asserting School items come from the Canvas fetch and
  Refresh re-fetches.
- Screenshot: after Refresh, the School list reflects updated demo data.

#### 3.0 Tasks

- [x] 3.1 `TodoItem.tsx` renders "No due date" when `dueDate` is absent, skipping
  `classifyDue`/`formatDueLabel` (landed with the type change in T2.1).
- [x] 3.2 `DashboardShell` fetches `/api/canvas/assignments` on mount into a dedicated
  `schoolTodos` state (Work stays from `initialTodos`); guarded against unmount.
- [x] 3.3 Refresh button now re-fetches Canvas assignments alongside `fetchEvents`.
- [x] 3.4 Added a "Connect Canvas" empty state via a new `emptyState` prop on
  `TodoSection`, shown when `canvasConnected === false`; Work section unaffected.
- [x] 3.5 Added `components/DashboardShell.canvas.test.tsx` (3 tests): School from
  Canvas fetch, submitted→checked, undated→"No due date", Refresh re-fetches.
- [x] 3.6 Ran the gates (125 tests green); captured 3 screenshots (populated, undated,
  empty state). Commit below.

### [ ] 4.0 Planner deadline awareness

Ensure real School items flow into `WeekState.todos` (via `toWeekState`) and strengthen
the planner system prompt so the AI treats School items as real deadlines — prioritizing
soonest-due/overdue and warning when at risk — while still proposing only on request and
never committing without approval. (Spec Unit 3, planner.)

#### 4.0 Proof Artifact(s)

- Test: `lib/planner/prompt.test.ts` passes with a new assertion that the system prompt
  includes deadline-prioritization guidance.
- Test: existing planner rule tests (never overlap immovable; approval required) still
  pass — no Story 2 regression.
- Screenshot: chat where Jack asks the AI to plan study time and it proposes blocks
  ordered around real Canvas due dates.

#### 4.0 Tasks

- [ ] 4.1 Confirm the Canvas-sourced school todos flow through `toWeekState` /
  `serializeWeek` unchanged (they already do via `DashboardShell`'s `todos`); adjust
  `serializeWeek` to render undated items sensibly ("no due date").
- [ ] 4.2 Strengthen `buildSystemPrompt()` in `lib/planner/prompt.ts`: add that School
  items are real deadlines, to prioritize soonest-due/overdue, and to warn when a request
  can't fit before a deadline — without changing the never-overlap / propose-only-on-
  request / approval-required rules.
- [ ] 4.3 Update `lib/planner/prompt.test.ts`: assert the new guidance is present; confirm
  existing assertions still hold.
- [ ] 4.4 Run the full quality gates; capture the planning-chat screenshot (mock planner
  is fine). Commit `feat: planner deadline awareness for Canvas due dates (T4.0, Spec 04)`.
