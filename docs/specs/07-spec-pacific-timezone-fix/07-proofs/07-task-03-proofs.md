# Task 03 Proofs - Canvas due-date correctness

## Task Summary

This task fixes `lib/canvas/map.ts`'s `toDueDate()` so a Canvas assignment's
`due_at` (a UTC ISO instant) is converted to the correct Pacific calendar day
before being shown or classified as overdue/soon/normal, rather than the raw
UTC day. It also verifies the ICS feed path (`lib/canvas/ics.ts`) flows into
this same corrected function rather than needing its own separate fix.

## What This Task Proves

- A `due_at` instant that falls on different UTC vs. Pacific calendar days is
  now bucketed to the Pacific day — concretely, an assignment due
  `2026-07-10T02:00:00Z` (2 AM UTC) is 7:00 PM Pacific on **2026-07-09**, a
  full calendar day earlier, and now correctly shows as due `2026-07-09`.
- This holds regardless of the server's own process timezone.
- `lib/canvas/ics.ts` needed no code change: it only extracts an ISO instant
  string from the ICS feed and never buckets it into a calendar day itself —
  that day-bucketing happens exclusively in the now-fixed `toDueDate()`, so
  both the token-API path and the ICS-feed path share the same fix.

## Evidence Summary

- `lib/canvas/map.test.ts`: 8/8 tests pass, including the new UTC-vs-Pacific
  boundary case, verified under a forced `TZ=UTC` process.
- `lib/canvas/ics.test.ts`: 3/3 tests pass unmodified — confirms the ICS
  parsing path needed no change, since it only produces the ISO string that
  `toDueDate()` now correctly Pacific-izes.
- Full suite: 184/184 tests pass (up from 183), lint and typecheck clean.

## Artifact: A due date spanning a UTC/Pacific day boundary is bucketed to the correct Pacific day

**What it proves:** `mapAssignmentToTodo` reports `dueDate: "2026-07-09"` for
an assignment due `2026-07-10T02:00:00.000Z` — the correct Pacific calendar
day — instead of `"2026-07-10"` (the UTC day), even with the process forced
to `TZ=UTC`.

**Why it matters:** This is exactly the class of bug Jack reported — "an
assignment due tonight at 11:59pm silently appear[ing] as due tomorrow"
because of a UTC/local mismatch.

**Command:**

```bash
npx vitest run lib/canvas/map.test.ts
```

**Result summary:** All 8 tests pass, including the new boundary case.

```
 RUN  v4.1.10 /Users/jack/ai-week-planner

 Test Files  1 passed (1)
      Tests  8 passed (8)
```

## Artifact: ICS feed path shares the fix without needing its own change

**What it proves:** `lib/canvas/ics.ts`'s existing tests pass unmodified,
confirming it only extracts a raw ISO instant (via `ICAL.js`'s
`toJSDate().toISOString()`) and defers all day-bucketing to `toDueDate()` —
the same function the token-API path uses, now fixed once for both.

**Command:**

```bash
npx vitest run lib/canvas/ics.test.ts
```

**Result summary:** All 3 tests pass with no source changes to `ics.ts`.

```
 RUN  v4.1.10 /Users/jack/ai-week-planner

 Test Files  1 passed (1)
      Tests  3 passed (3)
```

## Artifact: Full quality gate

**Command:**

```bash
npm test && npm run lint && npx tsc --noEmit
```

**Result summary:** 184/184 tests pass across 41 files; lint and typecheck
clean.

```
 Test Files  41 passed (41)
      Tests  184 passed (184)
```

## Reviewer Conclusion

Canvas due dates now land on the correct Pacific calendar day regardless of
server timezone, closing out the last of the three Demoable Units in this
spec. Combined with Units 1 and 2, every place time is displayed or computed
in this app — the calendar grid, the current-time line, Google Calendar read
and write, and Canvas due dates — is now Pacific-correct and DST-safe.
