# 07-spec-pacific-timezone-fix.md

## Introduction/Overview

All times in the AI Week Planner are currently computed using the JavaScript
`Date` object's local getters (`getHours`, `getDate`, `getDay`, etc.), which
reflect whatever timezone the browser or server process happens to run in —
not necessarily Pacific Time. On a server deployed in UTC (the app's
production environment), this shows meetings, due dates, and the current-time
indicator at the wrong hour, and can even shift events onto the wrong day.
This spec fixes every time-related display and computation to consistently
and correctly use `America/Los_Angeles`, using DST-aware handling so it stays
correct across the Daylight Saving Time switch twice a year.

## Goals

- Every displayed time (calendar grid, event blocks, current-time indicator,
  due dates, week headers) reflects Pacific Time, regardless of the browser's
  or server's own timezone.
- Every time-based computation the AI planner or Google Calendar integration
  performs (which week is "this week", which day a due date falls on, where
  to query/write Google Calendar events) is anchored to the Pacific calendar
  day, not the runtime's local day.
- The fix is DST-aware: it stays correct across the spring-forward and
  fall-back transitions without manual adjustment.
- No new date-handling dependency is introduced — the fix uses the built-in
  `Intl.DateTimeFormat` API.
- The fix is a surgical, root-cause change: the many existing pure,
  well-tested date/week helpers (`lib/date.ts`, `lib/week.ts`) keep working
  unchanged; only the points where a "now" or an externally-sourced instant
  first enters the system are corrected.

## User Stories

- **As Jack**, I want the calendar grid, event times, and current-time line to
  always show Pacific Time, so that the schedule I see matches my actual
  wall clock regardless of where the app happens to be hosted.
- **As Jack**, I want Canvas due dates to land on the correct Pacific calendar
  day, so that an assignment due "tonight at 11:59pm" doesn't silently appear
  as due tomorrow (or already-passed) because of a UTC/local mismatch.
- **As Jack**, I want the AI planner's sense of "today" and "this week" to
  match Pacific Time, so that plans and conflict checks are anchored to the
  day I'm actually experiencing.
- **As Jack**, I want this to keep working correctly after Daylight Saving
  Time changes, without needing another fix in six months.

## Demoable Units of Work

### Unit 1: Pacific Time utility + client-side display correctness

**Purpose:** Introduce the single source of truth for "what time is it, and
what day/hour does an instant fall on, in Pacific Time" — and use it to fix
everything the user directly looks at: the week grid, the current-time line,
day headers, and due-date labels/classification.

**Functional Requirements:**
- The system shall provide a `lib/timezone.ts` module exporting a Pacific
  Time constant (`"America/Los_Angeles"`) and helpers built on
  `Intl.DateTimeFormat`, including at minimum:
  - a function that returns the current instant re-based so that its local
    getters (`getFullYear`, `getMonth`, `getDate`, `getDay`, `getHours`,
    `getMinutes`) report Pacific wall-clock field values regardless of the
    runtime's own timezone, and
  - an equivalent function that re-bases an arbitrary existing `Date` (not
    just "now") the same way, for converting externally-sourced instants
    (e.g. a Google event time, a Canvas due date) into Pacific-correct field
    values.
- The system shall route every "now" call site that feeds the week/day
  computation pipeline (`lib/week.ts`, `lib/date.ts` consumers) through this
  new Pacific "now" helper instead of a raw `new Date()`, specifically:
  `app/api/google/events/route.ts`, `app/api/canvas/assignments/route.ts`,
  `components/DashboardShell.tsx`.
- The current-time red indicator (`components/Calendar/NowLine.tsx`) shall
  compute its position from the Pacific "now" helper, not a raw
  browser-local `new Date()`.
- The week day headers (`components/Calendar/Calendar.tsx`) shall display
  the correct Pacific calendar date. (Given Unit 1's root-fix approach, this
  should already be correct once the `reference` date feeding `weekDates()`
  is Pacific-based — this requirement exists to make that explicit and to be
  verified, not to imply an independent code change is expected here.)
- Due-date labels and classification (`lib/date.ts`'s `daysUntil`,
  `classifyDue`, `formatDueLabel`, consumed with a `today` argument) shall
  receive a Pacific-based "today" at every call site, not a raw local `new
  Date()`.

**Proof Artifacts:**
- `Test: lib/timezone.test.ts passes` demonstrates the new Pacific-time
  helpers correctly report wall-clock fields across a UTC-run test
  environment, including explicit cases on both sides of the March and
  November DST transition dates for `America/Los_Angeles`.
- `Test: existing lib/date.test.ts and lib/week.test.ts continue to pass
  unmodified` demonstrates the pure helpers required no internal changes.
- `Screenshot or manual check: the current-time red line position and week
  day headers match actual Pacific wall-clock time` demonstrates the
  client-visible fix, checked with the system clock/timezone temporarily set
  to a non-Pacific zone (e.g. UTC) to prove the fix isn't just "correct by
  accident" on a Pacific-zoned dev machine.

### Unit 2: Google Calendar integration correctness

**Purpose:** Ensure the Google Calendar read (query window) and write
(commit) paths are anchored to the correct Pacific calendar day/time, so
events fetched for "this week" are the right week, and events written back
by the AI planner land at the intended Pacific wall-clock time on Google's
side.

**Functional Requirements:**
- The system shall compute the Google Calendar events query window
  (`timeMin`/`timeMax` in `app/api/google/events/route.ts`) from the
  Pacific-based week boundaries (Unit 1's Pacific "now"), padded with a
  safety buffer generous enough (at least 24 hours on each side) that exact
  instant-level precision doesn't matter — correctness of which day an event
  lands on is enforced downstream by the existing Pacific-based day-bucketing
  in `mapEvents`, not by exact query-window trimming.
- The system shall write approved blocks back to Google Calendar
  (`lib/google/writeback.ts`) using an explicit `timeZone:
  "America/Los_Angeles"` field on each event's `start`/`end` object, with a
  timezone-naive local dateTime string representing the intended Pacific
  wall-clock time — so Google Calendar itself resolves the correct UTC
  instant, including correct DST handling, rather than this app computing
  a UTC offset by hand.
- The system shall verify `lib/google/eventMap.ts`'s per-event time
  extraction (`minutesOfDay`) produces the correct Pacific hour/minute for a
  fetched event, since `mapEvents` receives a Pacific-based `reference` from
  Unit 1 but individual event `Date` objects (parsed from Google's
  `dateTime` strings) must also be re-based through the Unit 1 helper before
  their local getters are read.

**Proof Artifacts:**
- `Test: lib/google/eventMap.test.ts passes` demonstrates events with known
  UTC-offset `dateTime` values map to the correct Pacific hour/minute and day
  column.
- `Test: lib/google/writeback.test.ts passes` demonstrates a written event's
  payload carries the correct local dateTime string and explicit
  `America/Los_Angeles` timeZone field for a given intended Pacific
  wall-clock time.
- `Manual/mock check: a real Google event near a week boundary (e.g. Sunday
  11pm Pacific) is fetched into the correct week` demonstrates the padded
  query window doesn't drop or misplace boundary events.

### Unit 3: Canvas due-date correctness

**Purpose:** Ensure Canvas assignment due dates (which arrive as UTC ISO
timestamps) are converted to the correct Pacific calendar day before being
shown or classified as overdue/soon/normal.

**Functional Requirements:**
- The system shall convert a Canvas `due_at` UTC instant through the Unit 1
  Pacific re-basing helper before extracting its calendar day
  (`lib/canvas/map.ts`'s `toDueDate`), so a due date near midnight UTC lands
  on the correct Pacific day rather than the UTC day.
- The system shall verify the Canvas ICS feed path (`lib/canvas/ics.ts`,
  which produces its own ISO string via `ICAL.js`) feeds into the same
  corrected `toDueDate` path and is not separately timezone-naive.

**Proof Artifacts:**
- `Test: lib/canvas/map.test.ts passes` demonstrates a `due_at` timestamp
  that falls on different UTC vs. Pacific calendar days is bucketed to the
  Pacific day.
- `Test: lib/canvas/ics.test.ts (or equivalent) passes` demonstrates the ICS
  path is covered by the same fix.

## Non-Goals (Out of Scope)

1. **Reviving `lib/mock-data.ts`'s dead school/work mock blocks**: unrelated
   to the timezone fix; that mock data isn't wired into the live UI at all.
2. **The configurable work-hours feature**: tracked as its own separate spec
   (Unit 5 in the current work plan); this spec only ensures whatever "now"
   the work-hours feature later relies on is Pacific-correct.
3. **Adding "now" comparison logic to `lib/planner/validate.ts`**: the
   planner's validation currently only checks proposed-vs-existing overlap
   and has no notion of "now" at all — there is nothing timezone-related to
   fix there. This is called out explicitly so it isn't mistaken for a
   missed item during review.
4. **Record-keeping/audit timestamps that are never displayed as a
   wall-clock day to the user** (e.g. `completedAt`, `obtained_at`,
   `created_at` fields stored as plain UTC-instant ISO strings): these
   remain UTC instants at rest; only computations that interpret an instant
   as a Pacific calendar day/hour are in scope.
5. **Demo-seed/mock-data helper timestamps** (`lib/google/demoSeed.ts`,
   `lib/canvas/demoSeed.ts`, `lib/granola/*`): these generate synthetic
   development-only data and are not user-facing correctness issues.
6. **Adding a timezone picker or supporting any timezone other than Pacific**:
   this is a single-user, personal app hardcoded to Jack's timezone by
   design — no timezone configuration UI is in scope.

## Design Considerations

No specific design/UI requirements identified — this is a correctness fix
with no visual changes beyond times now displaying correctly.

## Repository Standards

- Framework-free logic belongs in `lib/`, co-located with a `*.test.ts` file,
  consistent with `lib/date.ts`, `lib/week.ts`, `lib/canvas/map.ts`, and
  `lib/google/eventMap.ts`'s existing pattern of pure, fully-unit-tested
  helpers with no SDK/fetch dependencies.
- Keep changes small and focused per the repo's commit conventions; this
  spec's three Demoable Units are a reasonable basis for separate commits
  within the same implementation pass.
- The pre-commit hook (`lint`, `typecheck`, `test`) must stay green
  throughout.

## Technical Considerations

- **No new dependency.** `Intl.DateTimeFormat` with `timeZone:
  "America/Los_Angeles"` is a stable, DST-aware ECMA-402 built-in available
  in both the Node server runtime and all browsers this app targets — no
  external research flagged any version-specific concern with this approach.
- **Two distinct correctness needs, two distinct techniques** — conflating
  them is the most likely implementation mistake, so this is called out
  explicitly:
  1. **Field extraction** ("what Pacific day/hour is this instant"): achieved
     by re-basing a `Date` so its local getters report Pacific wall-clock
     values, then letting it flow unchanged through the existing pure
     `lib/date.ts`/`lib/week.ts` helpers (which only ever call local
     getters). This is sufficient for the calendar grid, now-line, day
     headers, due-date classification, and week boundaries.
  2. **Instant construction for external systems** (Google Calendar query
     bounds and writeback): field-extraction re-basing is *not* sufficient
     here, because sending a "faked-local" `Date`'s `.toISOString()` to
     Google would not represent the correct real-world UTC instant unless
     the server happens to already run in Pacific Time. For the query
     window, sidestep the problem by padding generously and relying on the
     existing Pacific-based day-bucketing downstream. For writeback, use
     Google's own `timeZone` field support so Google resolves the correct
     UTC instant (and DST) on its side, rather than this app computing a
     UTC offset by hand.
- **Root-cause, not per-call-site patching.** Because `lib/date.ts` and
  `lib/week.ts` are pure functions operating only on whatever `Date` values
  they're given, correcting the small number of places where a "now" or an
  external instant first enters the system (Unit 1) should make most
  downstream consumers correct automatically, without needing to touch
  their internals or every consumer individually. Implementation should
  verify this assumption holds (via the Unit 1 proof artifacts) rather than
  reflexively rewriting every pure helper.
- A fresh repository-wide audit for `new Date(`, `.getHours(`, `.getMinutes(`,
  `.getMonth(`, `.getDate(`, `.getDay(`, `.getFullYear(`, and `toISOString(`
  was performed as part of scoping this spec; the call sites listed in each
  Demoable Unit above reflect that audit. Implementation should re-grep at
  task-breakdown time in case line numbers have shifted.

## Security Considerations

No specific security considerations identified — no credentials, tokens, or
sensitive data are touched by this fix.

## Success Metrics

1. **Zero timezone-related display discrepancies**: manually verified by
   temporarily running the dev server with the system/container timezone
   set to UTC (or any non-Pacific zone) and confirming calendar, due-date,
   and now-line times still show correctly in Pacific.
2. **DST correctness**: unit tests explicitly cover dates on both sides of
   the `America/Los_Angeles` spring-forward and fall-back transitions.
3. **No regressions**: full existing test suite (`npm test`), `npm run
   lint`, and `npm run typecheck` stay green.

## Open Questions

No open questions at this time — scope and approach were confirmed with
Jack in a prior clarification session before this spec was written.
