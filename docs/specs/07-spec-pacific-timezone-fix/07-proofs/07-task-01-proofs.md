# Task 01 Proofs - Pacific Time utility + client-side display correctness

## Task Summary

This task introduces `lib/timezone.ts`, the single source of truth for
"what time is it, and what day/hour does an instant fall on, in Pacific
Time" — and routes every client-visible "now" (the current-time line, the
week's day headers/due-date classification via the shared `today` reference,
the Google Calendar fetch window's reference date, and the Canvas due-date
mapping's reference date) through it instead of the JS runtime's own local
timezone.

## What This Task Proves

- `toPacific`/`nowInPacific` correctly report Pacific wall-clock fields
  (year/month/day/hour/minute), independent of the process's own timezone.
- The helper is correct across both sides of the 2026 DST transitions
  (spring-forward March 8, fall-back November 1).
- The existing pure, well-tested `lib/date.ts` and `lib/week.ts` helpers
  needed zero internal changes — the root-cause fix (correcting "now" at its
  few points of creation) is sufficient.
- The current-time red line (`NowLine`) recomputes its position from Pacific
  time on its periodic tick, not the browser/server's own clock.
- A server forced into UTC (matching the real Vercel deployment) now
  computes the correct Pacific wall-clock time instead of the wrong UTC hour.

## Evidence Summary

- `lib/timezone.test.ts`: 8/8 tests pass, including explicit DST-boundary
  cases.
- `components/Calendar/NowLine.test.tsx`: 1/1 test passes, proving the line's
  position updates to the correct Pacific time even when the process's `TZ`
  is forced to UTC.
- `lib/date.test.ts` / `lib/week.test.ts`: pass unmodified (no source changes
  to these files were needed).
- Full suite: `npm test` — 180/180 tests pass, `npm run lint` and `npx tsc
  --noEmit` are both clean.
- Manual check: with `TZ=UTC`, raw `new Date()` reports 21:26 (the bug) while
  the new Pacific helper correctly reports 14:26 (the fix).

## Artifact: Pacific Time utility unit tests, including DST transitions

**What it proves:** `toPacific`/`nowInPacific` extract the correct Pacific
wall-clock fields for arbitrary instants, including the exact instants
surrounding the 2026 spring-forward and fall-back DST transitions.

**Why it matters:** This is the foundation every other fix in this spec
builds on — if this is wrong, everything downstream is wrong too, and DST
correctness was an explicit goal (it fixes itself twice a year without
another patch).

**Command:**

```bash
npx vitest run lib/timezone.test.ts
```

**Result summary:** All 8 tests passed — a known summer instant, a known
winter instant, and both DST transition boundaries (before/after the jump in
both directions) all resolve to the correct Pacific hour/minute.

```
 RUN  v4.1.10 /Users/jack/ai-week-planner

 Test Files  1 passed (1)
      Tests  8 passed (8)
```

## Artifact: NowLine positions correctly under a forced non-Pacific process timezone

**What it proves:** The current-time red line recomputes its position using
Pacific time on its periodic (60s) tick, not the process's own clock —
directly exercising the exact bug scenario (a UTC-run server/process).

**Why it matters:** The now-line is the most visible, always-on symptom of
the timezone bug; this proves it specifically, not just the underlying
utility in isolation.

**Command:**

```bash
npx vitest run components/Calendar/NowLine.test.tsx
```

**Result summary:** With `process.env.TZ` forced to `"UTC"` and the system
clock mocked to `2026-07-08T16:00:00Z` (9:00 AM Pacific in July), the line's
computed pixel offset after a tick matches the expected Pacific-time
position, not the UTC-interpreted one.

```
 RUN  v4.1.10 /Users/jack/ai-week-planner

 Test Files  1 passed (1)
      Tests  1 passed (1)
```

## Artifact: Existing pure date/week helpers pass unmodified

**What it proves:** `lib/date.ts` and `lib/week.ts` required zero internal
changes — the fix is a root-cause correction at the few points "now" enters
the system, not a rewrite of every consumer.

**Why it matters:** Confirms the spec's stated implementation strategy
(minimal blast radius) actually held up under implementation, rather than
silently expanding into a larger refactor.

**Command:**

```bash
npx vitest run lib/date.test.ts lib/week.test.ts
```

**Result summary:** Both suites pass with their original, unmodified test
files and source files.

```
 Test Files  2 passed (2)
      Tests  14 passed (14)
```

## Artifact: Manual proof of the real-world bug and its fix

**What it proves:** On a server whose own timezone is UTC (matching this
app's actual Vercel production environment), raw `new Date()` local-getter
usage reports the wrong wall-clock hour, while the new Pacific helper
reports the correct one.

**Why it matters:** This is the most direct evidence that the fix addresses
the exact production scenario Jack reported ("all times are showing
incorrect hours").

**Command:**

```bash
TZ=UTC node -e '
const PACIFIC_TIME_ZONE = "America/Los_Angeles";
const f = new Intl.DateTimeFormat("en-US", { timeZone: PACIFIC_TIME_ZONE, year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",second:"2-digit",hourCycle:"h23" });
console.log("process.env.TZ =", process.env.TZ);
console.log("Raw new Date() (the bug):", new Date().toString());
console.log("Pacific wall-clock via the new helper approach (the fix):", f.format(new Date()));
'
```

**Result summary:** Under a forced UTC process timezone, the raw `Date`
reported `21:26` while the Pacific-aware computation correctly reported
`14:26` — a 7-hour discrepancy matching exactly the kind of error Jack
reported in production.

```
process.env.TZ = UTC
Raw new Date() (the bug): Thu Jul 09 2026 21:26:56 GMT+0000 (Coordinated Universal Time)
Pacific wall-clock via the new helper approach (the fix): 07/09/2026, 14:26:56
```

## Artifact: Full quality gate

**What it proves:** No regressions were introduced anywhere else in the
codebase.

**Command:**

```bash
npm test && npm run lint && npx tsc --noEmit
```

**Result summary:** 180/180 tests pass across 41 test files; lint and
typecheck are both clean.

```
 Test Files  41 passed (41)
      Tests  180 passed (180)
```

## Reviewer Conclusion

The Pacific Time utility is correct — including across both DST transitions
— and is now wired into every client-visible "now" this task covers (the
now-line, the shared day/due-date reference, and the Google/Canvas fetch
reference dates). The fix required no changes to the existing pure
`lib/date.ts`/`lib/week.ts` helpers, confirming the root-cause approach the
spec called for. The manual TZ=UTC check directly reproduces and resolves
the reported production bug.
