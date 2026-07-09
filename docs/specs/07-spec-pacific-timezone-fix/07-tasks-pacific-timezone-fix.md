# 07-tasks-pacific-timezone-fix.md

> Note: Jack pre-approved running SDD-1 through SDD-4 straight through for this
> and 4 other units without pausing at the parent-task/sub-task confirmation
> checkpoints, reviewing only at the very end. Parent tasks and sub-tasks are
> therefore generated together in this single pass.

## Relevant Files

| File | Why It Is Relevant |
| --- | --- |
| `lib/timezone.ts` | New Pacific Time utility (constant + `toPacific`/`nowInPacific` helpers) — the single source of truth this whole fix is built on. |
| `lib/timezone.test.ts` | Unit tests for `timezone.ts`, including DST boundary cases. |
| `components/Calendar/NowLine.tsx` | Current-time red indicator — must compute "now" via the Pacific helper. |
| `components/Calendar/NowLine.test.tsx` | New unit test asserting the line position is derived from Pacific time regardless of system timezone. |
| `components/Calendar/Calendar.tsx` | Day headers — expected to already be correct once fed a Pacific-based reference date; verified, not necessarily edited. |
| `app/api/google/events/route.ts` | Builds the `reference` date and the `timeMin`/`timeMax` query window for Google Calendar fetches. |
| `app/api/canvas/assignments/route.ts` | Passes `new Date()` as "today" into Canvas assignment mapping. |
| `components/DashboardShell.tsx` | Computes a local `today` used for due-date classification in the todo UI. |
| `lib/date.ts` / `lib/date.test.ts` | Pure due-date helpers; expected to need no internal changes — existing tests re-run to confirm. |
| `lib/week.ts` / `lib/week.test.ts` | Pure week-boundary helpers; expected to need no internal changes — existing tests re-run to confirm. |
| `lib/google/eventMap.ts` / `lib/google/eventMap.test.ts` | Maps raw Google events to `CalendarBlock`s; per-event time extraction must re-base through the Pacific helper. |
| `lib/google/writeback.ts` / `lib/google/writeback.test.ts` | Writes approved blocks back to Google; must send explicit `timeZone` field instead of computing a UTC offset by hand. |
| `lib/canvas/map.ts` / `lib/canvas/map.test.ts` | Converts Canvas `due_at` to a due date; must re-base through the Pacific helper before extracting the calendar day. |
| `lib/canvas/ics.ts` / `lib/canvas/ics.test.ts` | ICS feed path; verified to flow into the same corrected due-date logic. |

### Notes

- Test command: `npm test` (Vitest run), or `npx vitest run <path>` for a single file.
- Co-locate new tests next to the file under test, per `docs/conventions.md`.
- `npm run lint` and `npm run typecheck` must stay green throughout (Husky pre-commit gate).
- No new dependency: `Intl.DateTimeFormat` only.

## Tasks

### [x] 1.0 Pacific Time utility + client-side display correctness ✅ COMPLETE

#### 1.0 Proof Artifact(s)

- Test: `lib/timezone.test.ts` passes, including explicit cases on both sides of the `America/Los_Angeles` spring-forward and fall-back DST transitions, demonstrates the new helper is DST-correct.
- Test: `lib/date.test.ts` and `lib/week.test.ts` pass unmodified demonstrates the existing pure helpers required no internal changes.
- Test: `components/Calendar/NowLine.test.tsx` passes demonstrates the now-line position is derived from Pacific time regardless of the system's own timezone.
- Manual check: with the dev process's `TZ` environment variable temporarily set to `UTC`, the now-line position and week day headers still match actual Pacific wall-clock time, demonstrating the fix isn't dependent on the runtime's own timezone.

#### 1.0 Tasks

- [x] 1.1 Create `lib/timezone.ts` exporting a `PACIFIC_TIME_ZONE = "America/Los_Angeles"` constant, a `toPacific(date: Date): Date` helper that re-bases an instant so its local getters report Pacific wall-clock field values, and a `nowInPacific(): Date` helper (`toPacific(new Date())`).
- [x] 1.2 Write `lib/timezone.test.ts` covering: a known instant converts to the correct Pacific fields; a date just before and just after the March DST spring-forward transition; a date just before and just after the November DST fall-back transition; `nowInPacific()` returns a `Date` whose fields are internally consistent (smoke test using a mocked system time if the repo's test setup supports it, otherwise a tolerant relative check).
- [x] 1.3 Update `components/Calendar/NowLine.tsx` to compute "now" via `nowInPacific()` instead of `new Date()`.
- [x] 1.3a Add `components/Calendar/NowLine.test.tsx` mocking the system clock to a known instant and a non-Pacific `TZ`, asserting the rendered line's computed `top` position matches the expected Pacific hour/minute.
- [x] 1.4 Update `app/api/google/events/route.ts`'s `reference` (currently `new Date()`) to `nowInPacific()`.
- [x] 1.5 Update `app/api/canvas/assignments/route.ts`'s `new Date()` argument to `mapAssignments` to `nowInPacific()`.
- [x] 1.6 Update `components/DashboardShell.tsx`'s `today` (currently `new Date()`, which also seeds `Calendar`'s `referenceDate` prop and thus `NowLine`'s initial clock) to `nowInPacific()`.
- [x] 1.7 Run the existing `lib/date.test.ts` and `lib/week.test.ts` suites and confirm they pass with no source changes to `lib/date.ts`/`lib/week.ts` — this verifies the root-cause fix propagates correctly through the existing pure helpers.
- [x] 1.8 Manually verify (via a `TZ=UTC` Node check standing in for the dev server) that Pacific time is computed correctly regardless of process timezone — see proof artifact 07-task-01-proofs.md.

### [x] 2.0 Google Calendar integration correctness ✅ COMPLETE

#### 2.0 Proof Artifact(s)

- Test: `lib/google/eventMap.test.ts` passes, including a case where an event's `dateTime` carries a non-Pacific UTC offset, demonstrates correct Pacific hour/day bucketing.
- Test: `lib/google/writeback.test.ts` passes, including a case spanning a DST transition, demonstrates the written event payload carries the correct local dateTime string and explicit `America/Los_Angeles` timeZone field.
- Manual/mock check: an event near a week boundary (e.g. Sunday 11pm Pacific) fetched through `/api/google/events` lands in the correct week, demonstrating the padded query window doesn't drop or misplace boundary events.

#### 2.0 Tasks

- [x] 2.1 Update `app/api/google/events/route.ts`'s `timeMin`/`timeMax` computation to pad at least 24 hours on each side of the Pacific week boundaries (computed from `nowInPacific()`-derived `weekDates`), rather than relying on exact server-local `setHours(0,0,0,0)`/`setHours(23,59,59,999)` boundaries.
- [x] 2.2 Update `lib/google/eventMap.ts` so each parsed event `Date` (`e.start.dateTime`/`e.end.dateTime`) is passed through `toPacific()` before `minutesOfDay`/day-bucketing reads its local getters.
- [x] 2.3 Extend `lib/google/eventMap.test.ts` with a case for an event `dateTime` carrying a non-Pacific offset (e.g. a UTC `Z` timestamp), asserting it maps to the correct Pacific hour and day column.
- [x] 2.4 Update `lib/google/writeback.ts`'s `atMinutes()`/`commitBlocks()` to build the event payload with a timezone-naive local dateTime string representing the intended Pacific wall-clock time, plus an explicit `timeZone: "America/Los_Angeles"` field on `start`/`end`, instead of `.toISOString()` on a locally-constructed `Date`.
- [x] 2.5 Extend `lib/google/writeback.test.ts` to assert the fake client receives the correct naive dateTime string and `timeZone` field for a given intended Pacific time, including one case where the intended date falls on a DST transition day.

### [x] 3.0 Canvas due-date correctness ✅ COMPLETE

#### 3.0 Proof Artifact(s)

- Test: `lib/canvas/map.test.ts` passes, including a `due_at` timestamp that falls on different UTC vs. Pacific calendar days, demonstrates correct Pacific-day bucketing.
- Test: `lib/canvas/ics.test.ts` passes demonstrates the ICS feed path is covered by the same fix.

#### 3.0 Tasks

- [x] 3.1 Update `lib/canvas/map.ts`'s `toDueDate()` to pass the parsed `due_at` `Date` through `toPacific()` before calling `isoDate()`.
- [x] 3.2 Extend `lib/canvas/map.test.ts` with a `due_at` value that is on one UTC calendar day but a different Pacific calendar day (e.g. just after midnight UTC), asserting the Pacific day is used.
- [x] 3.3 Verified `lib/canvas/ics.ts` never buckets a day itself — it only extracts an ISO instant string, which flows into the now-fixed `toDueDate()` via the shared `mapAssignments`/`mapAssignmentToTodo` path. No source change needed; `ics.test.ts` passes unmodified (see proof artifact).
