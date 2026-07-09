# Task 01 Proofs - Work-hours rule model, persistence, and weekly expansion

## Task Summary

This task establishes the data model for a recurring weekly work-hours
rule (`WorkHoursRule`), persists it via the app's existing `BlobStore`
abstraction (the same mechanism used for Google calendar mapping), and
provides the pure function that expands the rule into real immovable
`CalendarBlock`s for any displayed week.

## What This Task Proves

- `WorkHoursRule` uses the app's existing day-indexing convention
  (0=Monday…6=Sunday), consistent with `CalendarBlock.day`.
- The rule round-trips correctly through file-backed persistence, working
  identically to the existing Google config pattern.
- Expansion produces correct immovable blocks per configured day, correctly
  omits days with no configured hours, supports different hours on
  different days (e.g. a half-day), and recurs correctly as the displayed
  week changes.

## Evidence Summary

- `lib/workHours/config.test.ts`: 3/3 tests pass.
- `lib/workHours/expand.test.ts`: 4/4 tests pass.
- Full suite: 202/202 tests pass (up from 195), lint and typecheck clean.

## Artifact: Config persistence round-trip

**What it proves:** A `WorkHoursRule` saved via `workHoursConfig.set()` is
correctly returned by a later `get()` call, including from a fresh store
instance pointed at the same file (mirroring how the real app's persistence
survives across requests).

**Command:**

```bash
npx vitest run lib/workHours/config.test.ts
```

**Result summary:** All 3 tests pass — empty default, single-instance
round-trip, and cross-instance persistence.

```
 RUN  v4.1.10 /Users/jack/ai-week-planner

 Test Files  1 passed (1)
      Tests  3 passed (3)
```

## Artifact: Weekly expansion correctness

**What it proves:** A rule with different hours on different days
(including a half-day and days with no entry) expands to the correct set
of immovable blocks for a given week, and the same rule recurs correctly
when the displayed week changes (`weekOffset` navigation).

**Command:**

```bash
npx vitest run lib/workHours/expand.test.ts
```

**Result summary:** All 4 tests pass, including the recurrence check
across `weekOffset` 0 vs. 1 (same hours, different dates/ids) and the
zero-blocks case for an unset rule.

```
 RUN  v4.1.10 /Users/jack/ai-week-planner

 Test Files  1 passed (1)
      Tests  4 passed (4)
```

## Artifact: Full quality gate

**Command:**

```bash
npm test && npm run lint && npx tsc --noEmit
```

**Result summary:** 202/202 tests pass across 45 files; lint and typecheck
clean.

```
 Test Files  45 passed (45)
      Tests  202 passed (202)
```

## Reviewer Conclusion

The work-hours data model, persistence, and weekly-expansion logic are
correct and fully unit-tested in isolation, ready to be wired into the
live calendar/planner pipeline in the next task.
