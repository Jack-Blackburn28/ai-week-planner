# 11-tasks-configurable-work-hours.md

> Note: Jack pre-approved running SDD-1 through SDD-4 straight through for
> this and the other units in this run without pausing at confirmation
> checkpoints. Parent tasks map 1:1 to the spec's 4 Demoable Units, given
> their meaningfully different scope.

## Relevant Files

| File | Why It Is Relevant |
| --- | --- |
| `lib/workHours/types.ts` | `WorkHoursRule`/`DayHours` types (0=Mon..6=Sun day indexing, matching `CalendarBlock.day`). |
| `lib/workHours/config.ts` | `BlobStore`-backed persistence, mirrors `lib/google/config.ts`. |
| `lib/workHours/config.test.ts` | Unit tests for the config store round-trip. |
| `lib/workHours/expand.ts` | Pure function expanding a rule into immovable `CalendarBlock`s for a given week. |
| `lib/workHours/expand.test.ts` | Unit tests for expansion across different-hours-per-day and weekOffset navigation. |
| `lib/workHours/nest.ts` | Pure function assigning `parentId` to events fully contained within a work-hours block. |
| `lib/workHours/nest.test.ts` | Unit tests for nesting containment logic. |
| `app/api/google/events/route.ts` | Merges expanded work-hours blocks + nesting into the existing events response. |
| `app/api/google/events/route.test.ts` | New test covering the merge + nesting behavior at the route level. |
| `lib/planner/validate.test.ts` | Extended with a case confirming a work-hours-sourced immovable block is respected the same as a Google-sourced one. |
| `lib/workHours/schema.ts` | Zod schema for the Anthropic structured-output parse result, mirrors `lib/planner/schema.ts`. |
| `lib/workHours/parse.server.ts` | SERVER-ONLY Anthropic-backed parser, mirrors `lib/planner/server.ts`; model/token constants are inline here rather than a separate config file, since it's a single small constant set. |
| `lib/workHours/parseMock.ts` | Deterministic offline fallback, mirrors `lib/planner/mock.ts`. |
| `lib/workHours/parseMock.test.ts` | Unit tests for the mock parser's common-pattern coverage. |
| `app/api/work-hours/parse/route.ts` | `POST` route delegating to `parse.server.ts`, mirrors `app/api/plan/route.ts`. |
| `app/api/work-hours/parse/route.test.ts` | Route test mirroring `app/api/plan/route.test.ts`'s coverage style. |
| `app/api/work-hours/route.ts` | `GET` current rule / `POST` persist a confirmed rule. |
| `app/api/work-hours/route.test.ts` | Route tests for get/set. |
| `components/Settings/WorkHoursChat.tsx` | Inline Settings-drawer chat panel: opening message, parse round-trip, confirm-before-save. |
| `components/Settings/WorkHoursChat.test.tsx` | Component tests for the opening message variants, summary+confirm flow, save/discard. |
| `components/DashboardShell.tsx` | Renders `WorkHoursChat` in the Settings drawer alongside `GoogleConnect`/`CanvasConnect`/`GranolaConnect`. |
| `AGENTS.md` | Updated to note the second Anthropic-SDK boundary file (`lib/workHours/parse.server.ts`), per the spec's Repository Standards section. |

### Notes

- Test command: `npm test`, or `npx vitest run <path>` for a single file.
- `npm run lint` and `npm run typecheck` must stay green (Husky pre-commit
  gate).
- The Anthropic SDK / `ANTHROPIC_API_KEY` must only be imported in
  `lib/workHours/parse.server.ts` (never from a `"use client"` component),
  consistent with the existing `lib/planner/server.ts` boundary rule.

## Tasks

### [x] 1.0 Work-hours rule model, persistence, and weekly expansion ✅ COMPLETE

#### 1.0 Proof Artifact(s)

- Test: `lib/workHours/config.test.ts` verifies the rule round-trips
  through the `BlobStore`-backed store.
- Test: `lib/workHours/expand.test.ts` verifies correct per-day expansion
  (including a day with no entry) and correct recurrence across
  `weekOffset` navigation.

#### 1.0 Tasks

- [x] 1.1 Create `lib/workHours/types.ts` defining `DayHours { startMinutes:
  number; endMinutes: number }` and `WorkHoursRule { days: Partial<Record<0|1|2|3|4|5|6,
  DayHours>> }`, using the app's existing 0=Monday…6=Sunday day-indexing
  convention (matching `CalendarBlock.day`/`DAY_LABELS`, NOT
  `Date.getDay()`).
- [x] 1.2 Create `lib/workHours/config.ts` exporting `createWorkHoursConfig`/
  `workHoursConfig` with `get()`/`set()`, using `getBlobStore()` with its
  own file path (e.g. `.work-hours.json`) and KV key (e.g.
  `awp:work-hours`), mirroring `lib/google/config.ts`'s
  `createGoogleConfig` shape exactly (including the `{ filePath? }` options
  param for testability).
- [x] 1.3 Write `lib/workHours/config.test.ts` covering get (empty default)
  and set-then-get round-trip, using a temp file path per test (same
  pattern as `lib/google/writeback.test.ts`'s `tempConfig()` helper).
- [x] 1.4 Create `lib/workHours/expand.ts` exporting `expandWorkHours(rule:
  WorkHoursRule, reference: Date, weekOffset = 0): CalendarBlock[]`, using
  `weekDates(reference, weekOffset)` to get the 7 dates and producing one
  immovable `CalendarBlock` (`source: "work"`, `immovable: true`, id like
  `work-hours-<day>`, no `parentId`) per day present in `rule.days`.
- [x] 1.5 Write `lib/workHours/expand.test.ts` covering: different hours on
  different days (including a half-day), a day absent from the rule
  producing no block, and the same rule producing the correct dates when
  `weekOffset` is ±1.
- [x] 1.6 Run `npx vitest run lib/workHours/config.test.ts
  lib/workHours/expand.test.ts` and confirm all pass.

### [x] 2.0 Immovable + nested integration with the live calendar and planner ✅ COMPLETE

#### 2.0 Proof Artifact(s)

- Test: `lib/workHours/nest.test.ts` verifies full-containment nesting,
  no-nesting for partial overlap or fully-outside events, across mixed
  sources.
- Test: `app/api/google/events/route.test.ts` (new) verifies the route's
  response includes the expanded work-hours block and correctly nested
  events when a rule is configured, and is unaffected when none is.
- Test: an added case in `lib/planner/validate.test.ts` confirms a proposed
  block overlapping a work-hours-sourced immovable block is rejected.

#### 2.0 Tasks

- [x] 2.1 Create `lib/workHours/nest.ts` exporting `nestWithinWorkHours(
  workHoursBlocks: CalendarBlock[], events: CalendarBlock[]): CalendarBlock[]`
  — for each event, find a same-day work-hours block whose
  `[startMinutes, endMinutes]` fully contains the event's range; if found,
  return the event with `parentId` set to that block's `id`, else return it
  unchanged. Must not mutate the input arrays.
- [x] 2.2 Write `lib/workHours/nest.test.ts` covering: an event fully
  inside gets `parentId` set, an event outside is unaffected, an event only
  partially overlapping is NOT nested, and this holds regardless of the
  event's `source`.
- [x] 2.3 Update `app/api/google/events/route.ts`: after `mapEvents(...)`
  produces `{ timed, allDay }`, call `workHoursConfig.get()`, expand it via
  `expandWorkHours(rule, reference, weekOffset)`, nest `timed` via
  `nestWithinWorkHours`, and return `blocks: [...workHoursBlocks,
  ...nestedTimed]` instead of the raw `timed` array (leave `allDay`
  untouched).
- [x] 2.4 Create `app/api/google/events/route.test.ts` (new file — no route
  test currently exists for this endpoint) verifying: with a configured
  rule, the response includes a work-hours block and a same-day event
  inside it carries the matching `parentId`; with no rule configured, the
  response is unchanged from today's behavior (empty/Google-only blocks,
  no work-hours block, no nesting applied).
- [x] 2.5 Add a case to `lib/planner/validate.test.ts` confirming
  `validateProposedBlocks` drops a proposed block overlapping an immovable
  block with `source: "work"` sourced from work-hours expansion (same
  mechanism as the existing Google-sourced overlap test — this should pass
  with zero changes to `lib/planner/validate.ts` itself, confirming no
  planner code changes were needed).
- [x] 2.6 Run `npx vitest run lib/workHours/nest.test.ts
  app/api/google/events/route.test.ts lib/planner/validate.test.ts` and
  confirm all pass.

### [x] 3.0 Natural-language parsing (Anthropic-backed + mock fallback) ✅ COMPLETE

#### 3.0 Proof Artifact(s)

- Test: `lib/workHours/parseMock.test.ts` verifies the mock parser handles
  documented common patterns and produces a valid `WorkHoursRule` plus a
  plain-language reply.
- Test: `app/api/work-hours/parse/route.test.ts` verifies the route
  shape-guards input and delegates correctly, mirroring
  `app/api/plan/route.test.ts`'s coverage style.

#### 3.0 Tasks

- [x] 3.1 Create `lib/workHours/schema.ts` with a Zod schema for the
  Anthropic structured-output result: `{ reply: string, proposedRule:
  WorkHoursRuleSchema | null }` (nullable proposal, mirroring
  `lib/planner/schema.ts`'s `plannerAiOutputSchema` pattern).
- [x] 3.2 Create `lib/workHours/parseMock.ts` exporting a deterministic
  `parseWorkHoursMock(message: string, currentRule: WorkHoursRule | null):
  { reply: string; proposedRule?: WorkHoursRule }` handling common patterns
  (e.g. "H to H [weekday range]", "half day <weekday>"); when the message
  doesn't match a recognized pattern, return a reply asking for
  clarification and no `proposedRule` (never guess).
- [x] 3.3 Write `lib/workHours/parseMock.test.ts` covering at least: a
  simple "9 to 5 Monday through Friday" case, a half-day-Friday variant,
  and an unrecognized message producing a clarifying reply with no
  `proposedRule`.
- [x] 3.4 Create `lib/workHours/parse.server.ts` (SERVER-ONLY) exporting
  `parseWorkHours(message: string, currentRule: WorkHoursRule | null):
  Promise<{ reply: string; proposedRule?: WorkHoursRule }>`, using the
  Anthropic SDK with `zodOutputFormat` (mirroring `lib/planner/server.ts`'s
  `callAnthropic`) when `ANTHROPIC_API_KEY` is set, else delegating to
  `parseWorkHoursMock`. This file is the only place in this feature that
  imports the Anthropic SDK.
- [x] 3.5 Create `app/api/work-hours/parse/route.ts` — a `POST` route with
  a shape guard (body must include `message: string` and an optional
  `currentRule`), delegating to `parseWorkHours`, returning `{ reply,
  proposedRule? }` or a 400/502 on bad input/failure, mirroring
  `app/api/plan/route.ts`'s structure.
- [x] 3.6 Write `app/api/work-hours/parse/route.test.ts` covering a valid
  request delegating correctly (mock the parse module) and an invalid body
  returning 400, mirroring `app/api/plan/route.test.ts`.
- [x] 3.7 Run `npx vitest run lib/workHours/parseMock.test.ts
  app/api/work-hours/parse/route.test.ts` and confirm all pass.

### [ ] 4.0 Settings entry point — inline work-hours chat with confirm-before-save

#### 4.0 Proof Artifact(s)

- Test: `components/Settings/WorkHoursChat.test.tsx` verifies the opening
  message variants (no rule vs. existing rule referenced), the
  summary+Save/Discard flow after a parsed reply, and that only Save
  triggers persistence.
- Manual check in the running app (screenshots optional — Jack reviews
  live): the full flow from Settings → describe hours → confirm → see the
  block on the calendar.

#### 4.0 Tasks

- [ ] 4.1 Create `app/api/work-hours/route.ts` with `GET` (returns the
  current `WorkHoursRule` or `null`/default) and `POST` (persists a
  confirmed rule via `workHoursConfig.set`), following the existing
  `app/api/google/mapping`-style get/set route pattern.
- [ ] 4.2 Write `app/api/work-hours/route.test.ts` covering GET returning
  the persisted rule and POST persisting a new one.
- [ ] 4.3 Create `components/Settings/WorkHoursChat.tsx` (client component):
  a "Change work hours" toggle button; when expanded, fetches the current
  rule on open and shows an opening assistant message that either asks
  generically (no rule) or references the current hours in plain language
  (rule exists); a small message list + composer (reusing the main chat's
  bubble styling at a smaller scale, per the spec's Design Considerations);
  on send, POSTs to `/api/work-hours/parse`; when a `proposedRule` comes
  back, shows the reply plus Save/Discard buttons; Save POSTs the
  `proposedRule` to `/api/work-hours` then confirms in the chat; Discard
  clears the pending proposal and continues the conversation. This panel
  must never call `/api/plan` or offer to plan the week.
- [ ] 4.4 Write `components/Settings/WorkHoursChat.test.tsx` covering: the
  two opening-message variants (mock the GET), a full parse→summary→Save
  flow asserting `/api/work-hours` POST is called with the proposed rule,
  and a Discard flow asserting it is NOT called.
- [ ] 4.5 Wire `WorkHoursChat` into `components/DashboardShell.tsx`'s
  Settings drawer, alongside the existing `GoogleConnect`/`CanvasConnect`/
  `GranolaConnect` panels.
- [ ] 4.6 Update `AGENTS.md`'s AI planner boundary note to mention the
  second Anthropic-SDK boundary file (`lib/workHours/parse.server.ts`),
  per the spec's Repository Standards section.
- [ ] 4.7 Run `npx vitest run components/Settings/WorkHoursChat.test.tsx
  app/api/work-hours/route.test.ts` and confirm all pass.
- [ ] 4.8 Manually verify in the dev server: open Settings, click "Change
  work hours", describe hours in plain language, confirm the summary,
  save, and see the resulting immovable block on the calendar for the
  current week.
