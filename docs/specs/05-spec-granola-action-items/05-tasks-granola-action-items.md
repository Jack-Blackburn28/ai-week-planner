# 05-tasks-granola-action-items.md

Task list for **Story 5 — Granola Action Items** (spec:
`05-spec-granola-action-items.md`; decisions: `05-questions-1-granola-action-items.md`).

All Granola network/secret/AI handling is **server-only** (`lib/granola/*` imported only
by `app/api/granola/*`); the Anthropic SDK stays server-side (reuses the
`lib/planner/server.ts` boundary).

## Relevant Files

| File | Why It Is Relevant |
| --- | --- |
| `lib/granola/types.ts` | Domain types: `GranolaStatus`, `GranolaMeeting`, `GranolaTranscript`, `ActionItem`, store shapes. |
| `lib/granola/auth.ts` | OAuth2 helpers (auth URL w/ offline access, code exchange, access-token refresh). Server-only. |
| `lib/granola/tokenStore.ts` | AES-256-GCM encrypted refresh-token store (mirrors `lib/google/tokenStore.ts`), gitignored file. |
| `lib/granola/tokenStore.test.ts` | Encrypt-at-rest + status-no-leak tests. |
| `lib/granola/config.ts` | `isGranolaConfigured()` / `isMockMode()` (`GRANOLA_MOCK`). Server-only. |
| `lib/granola/client.ts` | `GranolaClient` interface (list recent meetings, get transcript) + real impl + `resolveClient()`. |
| `lib/granola/client.mock.ts` | In-memory fake client for demo/tests. |
| `lib/granola/demoSeed.ts` | Fabricated meetings + transcripts for demo mode. |
| `lib/granola/extract.ts` | Server-only: transcript → action items via Anthropic (`claude-sonnet-5`) + zod schema; mock fallback. |
| `lib/granola/extract.mock.ts` | Deterministic mock extractor (no API key). |
| `lib/granola/extract.test.ts` | Mock extraction → Work `TodoItem`s (meeting as metaLabel, no due date). |
| `lib/granola/store.ts` | Persistent store: `processedMeetingIds` + open items; skip-processed + never-regenerate logic. Server-only. |
| `lib/granola/store.test.ts` | Proves processed meetings are skipped and cleared items never regenerate. |
| `lib/todos/completions.ts` | Source-agnostic completions store (`{id,source,title,metaLabel,completedAt}[]`), gitignored. |
| `lib/todos/completions.test.ts` | Append-on-clear + sorted-desc + active-exclusion logic. |
| `app/api/granola/connect/route.ts` | Redirects to Granola consent (offline access). |
| `app/api/granola/callback/route.ts` | Exchanges code → stores encrypted refresh token. |
| `app/api/granola/status/route.ts` | `GET` → `{ connected }`; never returns token. |
| `app/api/granola/disconnect/route.ts` | Clears the stored token. |
| `app/api/granola/actions/route.ts` | `GET` → open Work `TodoItem`s (fetch new meetings → extract → persist), minus completed. |
| `app/api/todos/complete/route.ts` | `POST {id,source,title,metaLabel}` → append to completions; remove from Granola open items. |
| `app/api/todos/completed/route.ts` | `GET` → completed items (both sources), most-recent-first. |
| `components/Settings/GranolaConnect.tsx` | Granola connect/disconnect + status row in the Settings drawer. |
| `components/DashboardShell.tsx` | Work list from Granola; `Active | Completed` toggle; clear→complete; bounded independent scroll; empty state. |
| `components/TodoSection/TodoSection.tsx` | Reused; may gain a completed-item render variant (no toggle interactivity in completed). |
| `components/CompletedView.tsx` (new) | Combined Completed list (Work+School, source-labeled, most-recent-first). |
| `docs/granola-setup.md` | OAuth app setup + env vars (parallels google/canvas setup docs). |
| `.env.example` | Add `GRANOLA_CLIENT_ID` / `GRANOLA_CLIENT_SECRET` / `GRANOLA_REDIRECT_URI` (reuse `TOKEN_ENC_SECRET`). |
| `.gitignore` | Add `.granola-tokens.json`, `.granola-store.json`, `.completions.json`. |

### Notes

- Co-locate tests; run with `npm test`. TS strict, `@/*` alias, logic in `lib/`.
- Conventional commits referencing the task, Co-Authored-By trailer; pre-commit stays green.
- Demo mode: `GRANOLA_MOCK=1` (+ `CANVAS_MOCK=1 GOOGLE_MOCK=1`) for proof screenshots; no
  Anthropic key → mock extractor.

## Tasks

### [ ] 1.0 Granola connection (OAuth connect-once + auto-refresh) + status

Server-only Granola OAuth + encrypted refresh-token store + auto-refresh, a status
endpoint that never leaks the token, a Settings status row, and setup docs. (Unit 1.)

#### 1.0 Proof Artifact(s)

- Test: `lib/granola/tokenStore.test.ts` — refresh token encrypted on disk, decrypts
  back; `status()` returns a boolean only.
- Test: `auth`/`config` tests — auth URL requests offline access; mock mode detected.
- CLI/JSON: `GET /api/granola/status` → `{ connected }`, no secret.
- Screenshot: ⚙︎ Settings drawer Granola status row.

#### 1.0 Tasks

- [ ] 1.1 `lib/granola/types.ts` (status, meeting, transcript, action-item, store shapes).
- [ ] 1.2 `lib/granola/auth.ts` (OAuth2: auth URL offline, exchange, refresh) +
  `lib/granola/config.ts` (`isGranolaConfigured`, `isMockMode`).
- [ ] 1.3 `lib/granola/tokenStore.ts` (AES-256-GCM, gitignored `.granola-tokens.json`,
  reuse `TOKEN_ENC_SECRET`) + `tokenStore.test.ts`.
- [ ] 1.4 Routes: `connect`, `callback`, `status`, `disconnect`; `status.test.ts`
  (no-leak). Mock mode → status connected.
- [ ] 1.5 `components/Settings/GranolaConnect.tsx` + render in the Settings drawer.
- [ ] 1.6 `.env.example` + `.gitignore` entries + `docs/granola-setup.md`.
- [ ] 1.7 Gates; screenshot; commit `feat: Granola OAuth foundation + status (T1.0, Spec 05)`.

### [ ] 2.0 Transcripts → AI-extracted action items

Fetch recent meetings + transcripts behind a `GranolaClient` interface, and extract
action items from each transcript with the Anthropic API (mock fallback). (Unit 2.)

#### 2.0 Proof Artifact(s)

- Test: `lib/granola/extract.test.ts` (mock) — transcript → Work `TodoItem`s
  (`metaLabel` = meeting, no due date).
- Test: client/demo-seed test — meetings + transcripts flow through the interface.
- CLI/JSON: `GET /api/granola/actions` (demo mode) → Work items from transcripts.

#### 2.0 Tasks

- [ ] 2.1 `lib/granola/client.ts` (`GranolaClient` interface: `listRecentMeetings(days)`,
  `getTranscript(id)`; real impl using `auth` refresh + fetch; `resolveClient()`),
  `client.mock.ts`, `demoSeed.ts` (fabricated meetings + transcripts).
- [ ] 2.2 `lib/granola/extract.ts` (server-only Anthropic call, zod action-item schema,
  `claude-sonnet-5`) + `extract.mock.ts` (deterministic) + `extract.test.ts`.
- [ ] 2.3 Mapping: extracted action item → Work `TodoItem` (stable id
  `granola-<meetingId>-<n>`, title, `metaLabel` = meeting title, no due date).
- [ ] 2.4 Gates; capture `curl …/actions` JSON; (route completed with persistence in
  T3, but a minimal actions route returning mapped items proves extraction here).

### [ ] 3.0 Persistence — generate-once, never-regenerate, cleared-permanent

Persist processed meetings + open items so refreshes don't re-run the AI, and cleared
items never come back. Wire the Work list to persisted items. (Unit 3.)

#### 3.0 Proof Artifact(s)

- Test: `lib/granola/store.test.ts` — already-processed meeting skipped on re-fetch (AI
  not re-invoked); cleared item id never regenerated.
- Test: integration/component — Work list renders persisted Granola items; clearing
  removes one.
- Screenshot: Work list populated with AI-generated action items (demo mode).

#### 3.0 Tasks

- [ ] 3.1 `lib/granola/store.ts` (gitignored `.granola-store.json`: `processedMeetingIds`
  + open `items`; `syncActions(client, extractor, completedIds)` = fetch new meetings →
  extract → append open items → mark processed → skip processed & completed) +
  `store.test.ts`.
- [ ] 3.2 `app/api/granola/actions/route.ts` finalize: run `syncActions`, return open
  Work `TodoItem`s minus completed ids; fail soft to prior/empty.
- [ ] 3.3 `DashboardShell`: Work list from `/api/granola/actions` (replaces mock Work);
  "Connect Granola" empty state when not connected; Work items feed `allTodos`.
- [ ] 3.4 Gates; screenshot; commit
  `feat: Granola action-item persistence + Work list (T3.0, Spec 05)`.

### [ ] 4.0 Combined Active | Completed archive (Work + School)

Clearing any item moves it to a persisted, source-agnostic Completed store; add the
`Active | Completed` dashboard toggle showing both sources most-recent-first. (Unit 4.)

#### 4.0 Proof Artifact(s)

- Test: `lib/todos/completions.test.ts` — clear appends with timestamp; active excludes
  completed ids; completed sorted most-recent-first.
- Screenshot: Completed view with cleared Work + School items, source-labeled.
- Screenshot: Active view after clearing (item gone from active).

#### 4.0 Tasks

- [ ] 4.1 `lib/todos/completions.ts` (gitignored `.completions.json`: append, list-desc,
  `activeFilter`) + `completions.test.ts`.
- [ ] 4.2 Routes: `app/api/todos/complete` (POST → append; remove from Granola open
  items) + `app/api/todos/completed` (GET → sorted list).
- [ ] 4.3 `components/CompletedView.tsx` + `Active | Completed` toggle in `DashboardShell`;
  clearing a Work/School item posts to `/api/todos/complete` and drops it from active.
- [ ] 4.4 Active lists (Work + School) exclude completed ids on load.
- [ ] 4.5 Gates; 2 screenshots; commit
  `feat: combined Active|Completed archive across Work+School (T4.0, Spec 05)`.

### [ ] 5.0 Independent-scroll layout + planner integration

Bounded, independently-scrolling Work & School sections; confirm action items reach the
planner without regressing its rules. (Unit 5.)

#### 5.0 Proof Artifact(s)

- Test: planner rule tests still pass; a test asserts Work (Granola) items reach the
  planner week state via `allTodos`.
- Screenshot: dashboard with a long Work list — School still visible; each section
  scrolls in its own bounded area.

#### 5.0 Tasks

- [ ] 5.1 Right-column layout: Work and School each `min-h-0` + `overflow-auto` within a
  shared-height flex column, headers pinned; verify a long Work list doesn't push School
  off-screen (desktop) and mobile still works.
- [ ] 5.2 Confirm/adjust `allTodos` (Work Granola + School Canvas) → `toWeekState`;
  add/extend a test asserting Granola Work items appear in the planner week state.
- [ ] 5.3 Run full planner rule tests (no regression).
- [ ] 5.4 Gates; screenshot; commit
  `feat: bounded independent-scroll todo lists + planner integration (T5.0, Spec 05)`.
