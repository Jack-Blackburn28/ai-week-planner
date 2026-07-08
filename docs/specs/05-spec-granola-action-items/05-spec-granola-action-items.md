# 05-spec-granola-action-items.md

## Introduction/Overview

Story 5 replaces the **mock Work todo list** with **AI-generated action items from
Jack's Granola meetings**. Rather than importing Granola's own action items (which Jack
finds weak), the app pulls each recent meeting's **transcript** and uses its **own AI**
(the Anthropic API) to decide the action items, adding them to the **Work** list after
each meeting. Items are **generated once per meeting** and, once cleared, are
**remembered so they never regenerate**. A new combined **`Active | Completed`** view
lets Jack review everything he's checked off across **both Work (Granola) and School
(Canvas)**. Finally, the right-hand dashboard is fixed so the Work and School lists each
scroll independently and neither pushes the other off-screen.

This mirrors the boundaries established by Stories 3–4 (server-only `lib/`, secrets in
env, demo mode, fetch-on-open + Refresh) and reuses the Anthropic boundary from Story 2.

## Goals

- Connect to Granola once via **OAuth** (encrypted refresh token, silent auto-refresh —
  zero maintenance), with a `GRANOLA_MOCK=1` demo mode.
- Pull recent meeting **transcripts** and use the **Anthropic API** to extract action
  items (mock extractor when no key), mapping them to **Work** `TodoItem`s.
- **Persist** generated items and cleared state so each meeting is processed once and
  **cleared items never regenerate**.
- Add a combined, persisted **Completed** archive (Work + School), toggled from the
  dashboard, most-recent-first, labeled by source.
- Make the Work and School lists **bounded-height and independently scrollable**.
- Keep all Granola network/secret/AI handling **server-only**; add test coverage for
  extraction mapping, the never-regenerate rule, and the clear→archive flow.

## User Stories

- **As Jack**, I want the app's AI to read my meeting transcripts and give me a clean
  list of action items so that I don't rely on Granola's weaker ones.
- **As Jack**, I want to connect Granola once and never touch it again so that setup
  isn't a recurring chore.
- **As Jack**, I want a cleared action item to stay gone so that finished work never
  reappears when the app refreshes.
- **As Jack**, I want one place to look back at everything I've checked off — work and
  school — so that I can see what I've accomplished.
- **As Jack**, I want my Work and School lists to scroll independently so that a long
  work list never hides my school assignments.
- **As Jack**, I want the AI planner to be able to schedule time for these action items
  like any other task.

## Demoable Units of Work

### Unit 1: Granola connection (OAuth, connect-once + auto-refresh) + status

**Purpose:** Establish the server-only Granola integration, its OAuth connect/refresh,
encrypted token storage, and a Settings status indicator.

**Functional Requirements:**

- The system shall provide an OAuth connect flow for Granola and store the returned
  **refresh token AES-encrypted at rest** in a gitignored file.
- The system shall **auto-refresh** the short-lived access token using the stored
  refresh token, with no user action required after the first connect.
- The system shall expose a status endpoint reporting whether Granola is connected,
  without ever returning token material.
- The ⚙︎ Settings drawer shall show Granola connection status (connected / not
  connected) alongside Google and Canvas.
- All Granola SDK/network/secret access shall live under a server-only `lib/granola/*`
  module imported only by `app/api/granola/*` routes.
- A `GRANOLA_MOCK=1` demo mode shall run the whole flow without credentials.

**Proof Artifacts:**

- Test: `lib/granola/tokenStore.test.ts` passes — refresh token is encrypted on disk and
  decrypts back; status reports booleans only.
- Test: `auth`/`config` tests pass — auth URL built with offline access; mock mode
  detected.
- CLI/JSON: `GET /api/granola/status` returns `{ connected }` with no secret.
- Screenshot: ⚙︎ Settings drawer showing the Granola status row.

### Unit 2: Transcripts → AI-extracted action items

**Purpose:** Fetch recent meetings + transcripts and turn each transcript into action
items with the app's own AI.

**Functional Requirements:**

- The system shall fetch recent meetings (last 30 days) and their transcripts via a
  server-only `GranolaClient` interface (real client + in-memory mock).
- The system shall use the **Anthropic API** to extract a list of concise action items
  from a transcript, returning validated structured output; with no API key it shall use
  a **mock extractor** so the flow still works.
- The system shall map each extracted action item to a **Work** `TodoItem` (title =
  action, `metaLabel` = source meeting, no due date).
- Extraction shall be resilient: a failure for one meeting shall not crash the request.

**Proof Artifacts:**

- Test: `lib/granola/extract.test.ts` (mock extractor) passes — a sample transcript
  yields Work `TodoItem`s with the meeting as `metaLabel` and no due date.
- Test: client/mapping tests pass against a demo seed (meetings + transcripts).
- CLI/JSON: `GET /api/granola/actions` (demo mode) returns Work items derived from
  transcripts.

### Unit 3: Persistence — generate-once, never-regenerate, cleared-permanent

**Purpose:** Make action-item generation stable and clearing permanent.

**Functional Requirements:**

- The system shall persist, in a gitignored store, which meetings have been processed
  and the currently-open generated action items, so a refresh does **not** re-run the AI
  on an already-processed meeting.
- The system shall persist **cleared** items such that a cleared action item is **never
  regenerated** on any subsequent refresh.
- The Work list shall render the persisted open items (replacing the mock Work data).
- Clearing (checking) a Work item shall remove it from the active list and record it as
  completed (persisted).

**Proof Artifacts:**

- Test: store test proves an already-processed meeting is skipped on re-fetch (AI not
  re-invoked) and a cleared item does not reappear.
- Test: component/integration test shows the Work list rendering persisted Granola
  items and clearing removing one.
- Screenshot: Work list populated with AI-generated action items (demo mode).

### Unit 4: Combined Active | Completed archive (Work + School)

**Purpose:** One persisted place to review everything cleared, across both sections.

**Functional Requirements:**

- The system shall provide an `Active | Completed` toggle on the dashboard.
- Clearing any item (Work or School) shall move it into a **persisted Completed store**
  and remove it from the active list.
- The Completed view shall list cleared items from **both Work and School**,
  **most-recent-first**, each **labeled by source**, with a cleared date, and shall
  **persist across reloads**.

**Proof Artifacts:**

- Test: completions store + endpoint test — clearing appends with a timestamp; active
  lists exclude completed ids; completed list is sorted most-recent-first.
- Screenshot: the Completed view showing cleared Work and School items labeled by source.
- Screenshot: Active view after clearing an item (it left the active list).

### Unit 5: Independent-scroll layout + planner integration

**Purpose:** Fix the dashboard layout and confirm action items are plannable.

**Functional Requirements:**

- The Work and School sections shall each have a **bounded height** and scroll
  **independently**, so a long Work list never pushes School off-screen (both remain
  visible on desktop).
- Granola-generated Work items shall flow into the planner (`WeekState.todos`) so the AI
  can propose time blocks for them; existing planner rules (never overlap immovable,
  propose-on-request, approval) shall be unchanged.

**Proof Artifacts:**

- Test: existing planner rule tests still pass (no regression); a test/asserts Work
  items reach the planner week state.
- Screenshot: dashboard with a long Work list — School still visible, each section
  scrolling within its own bounded area.

## Non-Goals (Out of Scope)

1. **Writing to Granola**: read-only (transcripts/meetings in; nothing written back).
2. **Editing Granola's own action items**: the app ignores them and generates its own.
3. **Re-designing Story 4 Canvas semantics**: Canvas-submitted items still auto-check in
   place; only user-initiated clearing moves an item to the Completed archive.
4. **Live Granola network verification**: exercised via the client interface + demo
   mode, not a live Granola account (Jack's connect step — a Success Metric).
5. **Un-clearing / restoring from Completed**: the archive is read-only review this
   story (no restore button).
6. **Background polling / cron generation**: generation happens on open + Refresh only.
7. **Deployment/secret mounting**: Story 6.

## Design Considerations

- Reuse `components/TodoSection` + `TodoItem`. Add an `Active | Completed` toggle at the
  top of the right column; Completed is a single combined, source-labeled list.
- Granola status row in the ⚙︎ Settings drawer, parallel to Google/Canvas; a
  "Connect Granola" empty state for the Work section when not connected.
- Bounded scroll: the right column lays out Work and School so each has its own
  `min-h-0` + `overflow-auto` region (e.g. flex children that share the column height),
  keeping both headers visible.
- Action items have no due date → render "No due date" (already supported).

## Repository Standards

- **Server-only boundary**: `lib/granola/*` imported only by `app/api/granola/*`; the
  Anthropic SDK stays server-side (reuse the `lib/planner/server.ts` pattern for
  extraction). Mirrors Google/Canvas/planner.
- **Framework-free logic in `lib/`**: extraction mapping, store logic, and the
  never-regenerate rule are pure, unit-tested functions (Vitest + RTL), co-located tests.
- **TypeScript strict**, `@/*` alias, PascalCase components.
- **Secrets**: OAuth client creds + token encryption key in env (`.env.example`);
  gitignore the encrypted token store and the persistence store files.
- **Commits**: conventional, task-referenced, Co-Authored-By trailer; baseline planning
  commit; push at story end. Husky pre-commit (lint+typecheck+test) stays green.
- **Docs**: add `docs/granola-setup.md` (OAuth app + env vars) paralleling the Google
  and Canvas setup docs.

## Technical Considerations

- **OAuth + token store**: reuse the shape of `lib/google/auth.ts` +
  `lib/google/tokenStore.ts` (AES-256-GCM, key from an env secret). Env:
  `GRANOLA_CLIENT_ID`, `GRANOLA_CLIENT_SECRET`, `GRANOLA_REDIRECT_URI`, and reuse
  `TOKEN_ENC_SECRET` for encryption. Access token refreshed on demand via the refresh
  token. Exact Granola endpoints confirmed in SDD-2 (the personal API is OAuth-based;
  reverse-engineered docs referenced); the client contract (list meetings, get
  transcript) is fixed here.
- **AI extraction**: `lib/granola/extract.ts` (server-only) calls Anthropic
  (`claude-sonnet-5`) with a transcript and a strict schema (zod) for an array of action
  items; `extract.mock.ts` returns deterministic sample items when no key. Reuses the
  Story 2 planner server/mock split and its zod usage.
- **Persistence**: gitignored JSON stores. A Granola store
  (`processedMeetingIds` + open `items`) and a **completions store**
  (`{id, source, title, metaLabel, completedAt}[]`) shared by Work and School. Stable
  item ids (e.g. `granola-<meetingId>-<n>` / existing `canvas-<id>`) make
  never-regenerate and archive membership deterministic. Server-only (`fs`), mirrors
  `lib/google/config.ts`/`tokenStore.ts`.
- **Data flow**: Work list = persisted open Granola items minus completed ids; School =
  Canvas assignments minus completed ids (plus Story 4 submitted-checked behavior).
  Clearing posts to a complete endpoint that updates the stores. Both sections feed the
  planner via the existing `allTodos` → `toWeekState`.
- **Timestamps**: `completedAt` stamped server-side at clear time (`new Date()` — app
  runtime, allowed).
- **Graceful degradation**: any Granola/AI failure returns an empty/prior list and the
  not-connected UI; never crash (mirrors the Story 3/4 hardening).

## Security Considerations

- **Granola OAuth refresh token is sensitive** — AES-256-GCM encrypted at rest in a
  gitignored file, read server-side only, never returned by any endpoint (including
  status), never logged.
- **OAuth client secret + `TOKEN_ENC_SECRET`** live only in env; `.env.example` carries
  placeholders.
- **Transcripts are private meeting content** — fetched server-side, sent only to the
  Anthropic API for extraction; not logged; not committed. Persistence stores hold only
  derived action-item titles + source meeting names, and are gitignored.
- Proof artifacts use demo/fabricated data only — no real transcripts, tokens, or
  meeting content.
- Read-only against Granola.

## Success Metrics

1. **AI action items appear**: with Granola connected and an Anthropic key, recent
   meetings produce AI-generated action items in the Work list (Jack's live
   verification — non-blocking).
2. **Never regenerates**: a cleared item does not reappear after Refresh; an
   already-processed meeting is not re-extracted (proven by test).
3. **Combined archive works**: cleared Work and School items appear in the persisted
   Completed view, most-recent-first, labeled by source.
4. **Layout holds**: with many Work items, School stays visible; each list scrolls in its
   own bounded area.
5. **Planner integration**: the AI can propose blocks for action items; core rules
   unchanged; full suite + build + lint + typecheck green.
6. **No secret/transcript leakage**: no endpoint or committed file exposes tokens or
   transcript content.

## Open Questions

1. **Exact Granola API endpoints + OAuth details** (auth/token URLs, meetings/transcript
   paths) — pinned in SDD-2 against the personal-API / reverse-engineered docs; the
   `GranolaClient` contract here is stable regardless, and demo mode fully exercises the
   pipeline.
2. **Whether Canvas manual-clears should also enter the Completed archive** — yes (the
   completions store is source-agnostic); Canvas auto-submitted items remain per Story 4
   unless the user clears them.
