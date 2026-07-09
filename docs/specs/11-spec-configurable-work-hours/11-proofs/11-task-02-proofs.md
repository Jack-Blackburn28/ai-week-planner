# Task 02 Proofs - Immovable + nested integration with the live calendar and planner

## Task Summary

This task wires the work-hours rule into the same pipeline that already
serves Google-sourced events (`GET /api/google/events`), so the expanded
work-hours block appears on the calendar automatically, any event fully
inside it nests visually via `parentId`, and the AI planner already
respects it as immovable — with zero changes required to the planner
itself.

## What This Task Proves

- `nestWithinWorkHours` correctly nests events based purely on time
  containment, regardless of source (work or personal account), and
  correctly excludes partial overlaps and different-day events.
- `GET /api/google/events` merges the expanded work-hours block into its
  response and applies nesting, while remaining fully backward-compatible
  when no rule is configured.
- `lib/planner/validate.ts`'s existing `overlapsImmovable` check already
  rejects a proposed block overlapping a work-hours-sourced immovable
  block — confirmed by test, with no source changes to that module.

## Evidence Summary

- `lib/workHours/nest.test.ts`: 6/6 tests pass.
- `app/api/google/events/route.test.ts` (new): 2/2 tests pass.
- `lib/planner/validate.test.ts`: extended with one new case, all pass.
- Full suite: 211/211 tests pass (up from 202), lint and typecheck clean.
- Confirmed Jack's real local `.google-config.json` was untouched by the
  new route test (which uses its own temp-file env var overrides).

## Artifact: Nesting containment logic

**What it proves:** An event fully inside a work-hours window nests
(`parentId` set) regardless of whether it's a work or personal event; an
event outside, on a different day, or only partially overlapping does not.

**Command:**

```bash
npx vitest run lib/workHours/nest.test.ts
```

**Result summary:** All 6 tests pass, including the explicit
partial-overlap exclusion case and the cross-account (personal-source
"dentist appointment"-style event) nesting case.

```
 RUN  v4.1.10 /Users/jack/ai-week-planner

 Test Files  1 passed (1)
      Tests  6 passed (6)
```

## Artifact: Route-level merge + nesting, and no-rule backward compatibility

**What it proves:** `GET /api/google/events` returns the expanded
work-hours block plus correctly nested events when a rule is configured,
using a fully deterministic Pacific-time-correct fixture (not relying on
the real Google demo seed's relative-to-now dates), and is unaffected when
no rule is configured.

**Why it matters:** This is the actual integration point Jack will exercise
— the calendar view.

**Command:**

```bash
npx vitest run app/api/google/events/route.test.ts
```

**Result summary:** Both tests pass: "Work Hours" block absent with no
rule; present with the correct day, and a same-day 10:00-10:30 AM Standup
correctly nested under it while a 7:00-8:00 PM Dinner (outside the 9-5
window) is not nested.

```
 RUN  v4.1.10 /Users/jack/ai-week-planner

 Test Files  1 passed (1)
      Tests  2 passed (2)
```

## Artifact: Planner already treats work-hours blocks as immovable

**What it proves:** `validateProposedBlocks` (unchanged) rejects a
proposed block overlapping a real `expandWorkHours()`-produced block, the
same way it already rejects overlaps with Google-sourced immovable blocks.

**Why it matters:** Confirms the spec's core claim — no planner code
changes were needed for this to work, since work-hours blocks are just
more `CalendarBlock`s with `immovable: true`.

**Command:**

```bash
npx vitest run lib/planner/validate.test.ts
```

**Result summary:** All tests pass, including the new work-hours-specific
case, with zero changes to `lib/planner/validate.ts`'s source.

```
 RUN  v4.1.10 /Users/jack/ai-week-planner

 Test Files  1 passed (1)
      Tests  6 passed (6)
```

## Artifact: Full quality gate + config-file isolation check

**Command:**

```bash
npm test && npm run lint && npx tsc --noEmit
git status --short .google-config.json  # confirms no diff
```

**Result summary:** 211/211 tests pass across 47 files; lint and typecheck
clean; Jack's real local Google config file was untouched by the new
route test (which overrides `GOOGLE_CONFIG_FILE`/`WORK_HOURS_CONFIG_FILE`
to temp paths and cleans up after itself).

```
 Test Files  47 passed (47)
      Tests  211 passed (211)
```

## Reviewer Conclusion

Work-hours blocks now flow through the exact same pipeline as Google
events end-to-end: they appear on the calendar, nest correctly with any
account's events, and are already respected by the planner as immovable —
all with a single, narrow change to `app/api/google/events/route.ts` and
zero changes to the planner itself.
