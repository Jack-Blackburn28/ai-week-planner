# 11-spec-configurable-work-hours.md

## Introduction/Overview

There is currently no concept of "working hours" as an immovable block —
Story 3 deliberately shipped with work hours left blank, deferring this to
a future in-app capability. This spec adds that capability: Jack can set
his working hours by chatting with the AI (in plain language, e.g. "9 to 5
Monday through Thursday, half day Friday"), from a small entry point in
Settings. The result is stored as a recurring rule and, every week, expanded
into a real immovable calendar block the AI planner and calendar UI both
respect — exactly like any other immovable commitment — with any event that
falls inside those hours (a meeting, a dentist appointment, anything)
nested visually inside it.

## Goals

- Jack can set (and later change) his working hours conversationally,
  without needing to touch a settings form with day/time pickers.
- Once set, working hours behave exactly like any other immovable block:
  the AI planner never proposes personal tasks during them, and they render
  on the calendar every week without needing to be re-entered.
- Any event — regardless of which account it came from — that falls inside
  the configured work-hours window on a given day is nested visually inside
  the work-hours block, the same way the app's original (currently dormant)
  design intended for meetings inside a work container.
- Nothing is saved without Jack's explicit confirmation of a plain-language
  summary of what was understood.
- This is a low-frequency feature (Jack expects to touch it 2-3 times a
  year) — it should be easy to find in Settings, but doesn't need to be
  prominent or built out beyond what's needed for that low-frequency use.

## User Stories

- **As Jack**, I want to tell the AI my working hours in plain language, so
  I don't have to fill out a form with day/time pickers for something I
  touch a few times a year.
- **As Jack**, I want my working hours to act as a real immovable block the
  AI respects, so it never schedules personal tasks (or lets me approve a
  plan) during hours I'm at work.
- **As Jack**, I want a meeting or appointment during my work hours to
  visually nest inside the work-hours block, so my calendar reads clearly:
  "this is what's happening during work" vs. everything else.
- **As Jack**, when I come back to change my hours later, I want the AI to
  already know what my current hours are, so I don't have to remember and
  re-state them from scratch.

## Demoable Units of Work

### Unit 1: Work-hours rule model, persistence, and weekly expansion

**Purpose:** Establish the data model for a recurring weekly work-hours
rule, persist it using the app's existing config-storage pattern, and
provide the pure logic that expands it into real immovable `CalendarBlock`
instances for any given displayed week.

**Functional Requirements:**
- The system shall define a `WorkHoursRule` type keyed by day-of-week
  (0 = Monday … 6 = Sunday, matching this app's existing day-indexing
  convention used by `CalendarBlock.day` and `DAY_LABELS`), where each day
  either has a `{ startMinutes, endMinutes }` range or is absent (no work
  that day) — supporting different hours on different days (e.g. a
  half-day Friday).
- The system shall persist the `WorkHoursRule` using the app's existing
  `BlobStore` abstraction (the same mechanism `lib/google/config.ts` uses
  for `CalendarMapping`), so it works identically in local dev (file) and
  on Vercel (hosted KV) with no new persistence mechanism.
- The system shall provide a pure function that expands a `WorkHoursRule`
  into real immovable `CalendarBlock` instances for the week `weekOffset`
  weeks from a `reference` date (mirroring `lib/google/eventMap.ts`'s
  `mapEvents` signature style), with `immovable: true` and `source: "work"`.
- The system shall leave a day with no configured hours (including every
  day, if no rule has been set yet) producing zero blocks for that day —
  the app must continue to run normally with no work-hours block at all
  until Jack sets one.

**Proof Artifacts:**
- Test: `lib/workHours/config.test.ts` verifies the rule round-trips
  through the `BlobStore`-backed store (get/set), consistent with
  `lib/google/config.test.ts`'s existing pattern for `CalendarMapping`.
- Test: `lib/workHours/expand.test.ts` verifies a rule with different hours
  on different days (including a day with no entry) expands to the correct
  immovable blocks for a given reference week, and that `weekOffset`
  navigation produces the same recurring hours on the correct dates.

### Unit 2: Immovable + nested integration with the live calendar and planner

**Purpose:** Wire the expanded work-hours blocks into the same pipeline
that already serves Google-sourced events, so they appear on the calendar,
are respected by the AI planner as immovable, and any event during those
hours nests visually inside the work-hours block.

**Functional Requirements:**
- The system shall merge the current week's expanded work-hours blocks into
  the response of `GET /api/google/events` (the single existing pipeline
  `fetchWeek` already calls), so no new client-side fetch or merge logic is
  needed — the existing `weekCache`/`allBlocks` composition in
  `DashboardShell.tsx` picks this up for free.
- The system shall provide a pure function that, given the week's work-hours
  blocks and the week's other event blocks, assigns `parentId` (pointing at
  the containing work-hours block) to any event whose full `[startMinutes,
  endMinutes]` range falls within a work-hours block on the same day —
  regardless of which Google account or calendar the event came from —
  reviving `CalendarBlock.tsx`'s existing (currently dormant in the live
  app) nested-rendering style.
- The system shall ensure the AI planner (`lib/planner/validate.ts`'s
  existing `overlapsImmovable` check, unchanged) treats work-hours blocks
  as immovable, since they arrive in `WeekState.blocks` with
  `immovable: true` exactly like any Google-sourced busy block — no planner
  code changes should be needed for this to already work.
- The system shall continue to function normally (no work-hours block
  rendered, no nesting applied) when no rule has been set yet.

**Proof Artifacts:**
- Test: `lib/workHours/nest.test.ts` verifies an event fully inside a
  work-hours window gets `parentId` set to that block's id, an event
  outside the window is unaffected, and an event only partially overlapping
  is NOT nested (must be fully contained), across events tagged with
  different sources (work and personal).
- Test: an extended `app/api/google/events/route.test.ts` (new, if one
  doesn't already exist, else added to it) verifying the route's JSON
  response includes the expanded work-hours block plus correctly nested
  events when a rule is configured, and is unaffected when none is.
- Test: a new case in `lib/planner/validate.test.ts` (or reuse of the
  existing overlap test pattern) confirming a proposed block overlapping a
  work-hours-sourced immovable block is rejected the same way an
  overlapping Google-sourced block already is.

### Unit 3: Natural-language parsing (Anthropic-backed + mock fallback)

**Purpose:** Turn Jack's plain-language description of his working hours
into a structured `WorkHoursRule`, using the same real-model/offline-mock
pattern the main planner already uses.

**Functional Requirements:**
- The system shall provide a new SERVER-ONLY module
  (`lib/workHours/parse.server.ts`, mirroring `lib/planner/server.ts`'s
  role as the sole Anthropic-SDK import boundary for this feature) that
  turns a user message (plus the currently-configured rule, if any, for
  context) into a plain-language reply and a proposed `WorkHoursRule`, using
  the Anthropic API with structured output when `ANTHROPIC_API_KEY` is set.
- The system shall provide a deterministic mock fallback
  (`lib/workHours/parseMock.ts`) used when no API key is configured,
  mirroring `lib/planner/mock.ts`'s role — it does not need to handle
  arbitrary phrasing as well as the real model, only common patterns (e.g.
  "9 to 5 Monday through Friday", "half day Friday"), consistent with how
  the existing mock planner is intentionally simpler than the real one.
- The system shall expose this parsing via a new API route
  (`POST /api/work-hours/parse`) following the existing `/api/plan` route's
  shape-guard-then-delegate pattern.
- The system shall require the user's explicit confirmation of the parsed
  result before it is persisted — parsing alone must never call the
  persistence layer from Unit 1.

**Proof Artifacts:**
- Test: `lib/workHours/parseMock.test.ts` verifies the mock parser handles
  the documented common patterns and produces a valid `WorkHoursRule` plus
  a plain-language reply.
- Test: `app/api/work-hours/parse/route.test.ts` verifies the route
  delegates correctly and shape-guards its input, mirroring
  `app/api/plan/route.ts`'s existing test coverage style.

### Unit 4: Settings entry point — inline work-hours chat with confirm-before-save

**Purpose:** Give Jack a way to find and use this feature: a "Change work
hours" control in Settings that expands a small chat-like panel, scoped
only to this conversation (it never offers to plan the week or create
events), which shows a plain-language summary and requires explicit
confirmation before saving.

**Functional Requirements:**
- The system shall add a "Change work hours" control to the Settings
  drawer (alongside the existing `GoogleConnect`/`CanvasConnect`/
  `GranolaConnect` panels), which expands a small chat panel inline within
  that drawer — not a separate modal/popover, and not a visually distinct
  style from the main chat (Jack confirmed visual distinction isn't
  required; only that it's a functionally separate conversation).
- The system shall, on first opening this panel with no rule configured
  yet, greet with an open-ended question (e.g. "What would you like your
  working hours to be?").
- The system shall, on opening this panel when a rule is already
  configured, reference the current hours in its opening message (e.g.
  "Your hours are currently Mon–Thu 9am–5pm, Fri 9am–1pm. What would you
  like to change them to?") rather than asking generically.
- The system shall, after parsing a reply via Unit 3's parsing endpoint,
  show the plain-language summary and require an explicit confirm action
  (e.g. a Save/Discard button pair, consistent with the main planner
  chat's existing Approve/Make-Changes pattern) before persisting anything
  via Unit 1's config store.
- The system shall never offer to plan the week, propose calendar blocks,
  or create events from within this panel — its only capability is
  understanding and confirming working hours.

**Proof Artifacts:**
- Test: `components/Settings/WorkHoursChat.test.tsx` verifies the opening
  message differs between "no rule set" and "rule already set" (with the
  current hours referenced in the latter), that a parsed reply shows a
  summary with Save/Discard actions, and that clicking Save calls the
  persistence endpoint while clicking Discard does not.
- Manual check in the running app (screenshots optional — Jack reviews
  live): opening "Change work hours" in Settings, describing hours in
  plain language, confirming, and seeing the resulting immovable block
  appear on the calendar.

## Non-Goals (Out of Scope)

1. **Writing work hours to real Google Calendar**: this is an app-native
   concept only, per Jack's explicit direction — "the only thing that is
   important is the work hours on the dashboard."
2. **Reviving `lib/mock-data.ts`'s dead school/class-time blocks**: unrelated
   dead code from Story 1, not touched by this feature.
3. **A visually distinct chat style** for the work-hours panel: Jack
   confirmed this isn't required — only functional/conversational scoping.
4. **Historical/versioned work-hours** (e.g. "what were my hours last
   month"): the current rule always applies to whatever week is being
   viewed or planned; no history is kept.
5. **A traditional day/time-picker form UI**: the chat is the only input
   method, per Jack's explicit preference, since this is used rarely enough
   that a form isn't worth building.

## Design Considerations

- The work-hours chat panel reuses the main chat's visual language (message
  bubbles, composer) at a smaller scale, inline within the Settings drawer
  — no new visual design system needed.
- The confirm-before-save step should feel consistent with the main
  planner chat's existing Approve/Make-Changes pattern, so the interaction
  model is familiar rather than a one-off.

## Repository Standards

- The Anthropic SDK / `ANTHROPIC_API_KEY` boundary rule in `AGENTS.md`
  ("used ONLY in `lib/planner/server.ts`") is extended by this spec to a
  second, equally narrow boundary file: `lib/workHours/parse.server.ts`.
  `AGENTS.md` should be updated to reflect both boundary files once this
  ships.
- Follow the existing `BlobStore`-backed config pattern
  (`lib/google/config.ts`) for persistence — same `get()`/`set()` shape,
  same file/KV dual-backend behavior via `getBlobStore()`.
- Follow the existing server/mock split pattern (`lib/planner/server.ts` +
  `lib/planner/mock.ts`) for the parsing feature.
- Settings sub-panels are client components with local state and `fetch`
  calls to API routes (see `components/Settings/GoogleConnect.tsx`) — no
  new state-management library.
- Co-locate tests; keep framework-free logic in `lib/`.
- `npm run lint`, `npm run typecheck`, and `npm test` must stay green.

## Technical Considerations

- **Day indexing**: `WorkHoursRule` must use the same 0 = Monday … 6 =
  Sunday convention as `CalendarBlock.day` and `DAY_LABELS` — NOT
  JavaScript's native `Date.getDay()` convention (0 = Sunday), which this
  app has already special-cased away from in `lib/week.ts`.
- **Single integration point**: merging work-hours blocks into
  `app/api/google/events/route.ts`'s response (after `mapEvents` runs, before
  the JSON response is built) means no client-side changes are needed —
  `DashboardShell.tsx`'s existing `weekCache`/`allBlocks` composition and
  the planner's `toWeekState(allBlocks, allTodos)` call both pick this up
  automatically, since work-hours blocks are just more `CalendarBlock`s
  with `immovable: true`.
- **Nesting is time-containment based, not account-based**: per Jack's
  explicit direction, any event (any account) fully inside the work-hours
  window nests — this is a pure function of `[startMinutes, endMinutes]`
  containment on the same day, not a check of which calendar/account the
  event came from.
- **No new persistence mechanism**: reuse `getBlobStore()` exactly as
  `lib/google/config.ts` does, with its own file path / KV key (e.g.
  `.work-hours.json` / `awp:work-hours`).
- **Parsing failure/ambiguity handling**: if the (real or mock) parser
  can't confidently produce a rule from the message, it shall return a
  reply asking for clarification and no `proposedRule` — the chat then has
  nothing to show a confirm action for, and simply continues the
  conversation, mirroring how the main planner mock declines silently
  (via a plain reply, no proposal) rather than guessing.

## Security Considerations

- `ANTHROPIC_API_KEY` usage in the new `lib/workHours/parse.server.ts`
  module follows the same boundary discipline as the existing planner: the
  SDK/key must never be imported from a `"use client"` component, and the
  API route is the only bridge.
- No new sensitive data is introduced — working hours are not
  confidential information, but the persisted config file should still
  follow the existing `.gitignore` pattern already applied to
  `.google-config.json`.

## Success Metrics

1. **Set once, respected every week**: after confirming working hours
   once, they appear as an immovable block on every subsequent week without
   re-entry, and the AI planner never proposes a personal task during them.
2. **Correct nesting**: an event fully inside the configured hours (from
   either Google account) renders nested inside the work-hours block;
   partially-overlapping or fully-outside events do not.
3. **No regressions**: `npm test`, `npm run lint`, `npm run typecheck` stay
   green; the app continues to run normally with zero work-hours blocks
   when no rule has been set.

## Open Questions

No open questions at this time — architecture (recurring rule expanded
per-week, no Google writeback, time-containment-based nesting for any
account, inline Settings chat panel with confirm-before-save,
Anthropic-backed parsing with mock fallback) was confirmed with Jack in a
prior clarification session before this spec was written.
