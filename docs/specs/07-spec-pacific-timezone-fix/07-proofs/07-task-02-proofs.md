# Task 02 Proofs - Google Calendar integration correctness

## Task Summary

This task fixes the two places the Google Calendar integration cared about
real-world instants, not just field extraction: the `/api/google/events`
query window (`timeMin`/`timeMax`) and the write-back path
(`lib/google/writeback.ts`). It also fixes `lib/google/eventMap.ts`'s
per-event time extraction so a fetched event's hour/day bucketing is correct
regardless of the server's own timezone.

## What This Task Proves

- An event's raw Google `dateTime` (which carries its own UTC offset) is
  correctly re-based to Pacific fields before day/hour bucketing.
- The query window sent to Google is padded generously enough that a
  boundary event (e.g. Sunday 11 PM Pacific) is never dropped, even on a
  UTC-run server — concretely demonstrated below, not just asserted.
- Write-back sends a timezone-naive local dateTime plus an explicit
  `America/Los_Angeles` `timeZone` field, so Google (not this app) resolves
  the correct UTC instant and handles DST — including for a block scheduled
  on an actual DST-transition calendar day.

## Evidence Summary

- `lib/google/eventMap.test.ts`: 8/8 tests pass, including a new case for an
  event `dateTime` with an explicit non-Pacific offset, verified under a
  forced `TZ=UTC` process.
- `lib/google/writeback.test.ts`: 4/4 tests pass, including the new
  Pacific-`timeZone`-field case and a DST-transition-day case.
- A standalone reproduction (below) shows the exact query-window bug on a
  UTC-run server and confirms the padded window fixes it.
- Full suite: 183/183 tests pass (up from 180 — 3 new tests added this
  task), lint and typecheck clean.

## Artifact: Event hour/day bucketing is correct regardless of server timezone

**What it proves:** `mapEvents` buckets a raw Google event (dateTime
`"2026-07-08T17:00:00-07:00"`, i.e. 5–6 PM Pacific) to the correct Wednesday
column and correct minutes-of-day, even with the process forced to `TZ=UTC`.

**Why it matters:** This is the actual event-time-on-the-calendar-grid bug
Jack reported — a work meeting or personal event was showing at the wrong
hour.

**Command:**

```bash
npx vitest run lib/google/eventMap.test.ts
```

**Result summary:** All 8 tests pass, including the new Pacific-correctness
case.

```
 RUN  v4.1.10 /Users/jack/ai-week-planner

 Test Files  1 passed (1)
      Tests  8 passed (8)
```

## Artifact: Query-window padding fixes a real boundary-event drop on a UTC-run server

**What it proves:** On a server whose own timezone is UTC (the real
production case), the *old* exact-boundary query window silently drops a
real event that falls late Sunday night Pacific Time. The *new* padded
window catches it.

**Why it matters:** This is a direct, before/after reproduction of a subtle
data-loss bug this fix closes — not a hypothetical.

**Command:**

```bash
TZ=UTC node -e '
function toPacific(date) {
  const f = new Intl.DateTimeFormat("en-US", { timeZone: "America/Los_Angeles", year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",second:"2-digit",hourCycle:"h23" });
  const parts = f.formatToParts(date);
  const get = (t) => Number(parts.find(p=>p.type===t).value);
  return new Date(get("year"), get("month")-1, get("day"), get("hour")%24, get("minute"), get("second"));
}
function addDays(base, n) { const d = new Date(base); d.setDate(d.getDate()+n); return d; }

const reference = toPacific(new Date("2026-07-08T18:00:00Z")); // Wed 11am Pacific
const dow = reference.getDay();
const backToMonday = dow === 0 ? -6 : 1 - dow;
const monday = addDays(reference, backToMonday);
const dates = Array.from({length:7}, (_,i)=>addDays(monday,i));

const oldMin = new Date(dates[0]); oldMin.setHours(0,0,0,0);
const oldMax = new Date(dates[6]); oldMax.setHours(23,59,59,999);
const newMin = addDays(dates[0], -1); newMin.setHours(0,0,0,0);
const newMax = addDays(dates[6], 1); newMax.setHours(23,59,59,999);

const boundaryEventUtc = new Date("2026-07-13T06:00:00Z"); // Sun 11PM Pacific
console.log("Boundary event real UTC instant:", boundaryEventUtc.toISOString());
console.log("Caught by OLD (unpadded) window?", boundaryEventUtc >= oldMin && boundaryEventUtc <= oldMax);
console.log("Caught by NEW (padded) window?", boundaryEventUtc >= newMin && boundaryEventUtc <= newMax);
'
```

**Result summary:** The unpadded window misses the boundary event entirely
(`false`); the padded window (this task's fix) catches it (`true`).

```
Boundary event real UTC instant: 2026-07-13T06:00:00.000Z
Caught by OLD (unpadded) window? false
Caught by NEW (padded) window? true
```

## Artifact: Write-back sends Google-resolvable Pacific time, DST included

**What it proves:** `commitBlocks` sends a naive local dateTime string plus
an explicit `America/Los_Angeles` `timeZone` field — including for a block
scheduled on 2026-03-08, the actual spring-forward DST transition day —
rather than this app computing a UTC offset by hand.

**Why it matters:** Approved AI-planned blocks are written back to a real
Google Calendar; a wrong instant here means Jack's actual calendar shows the
wrong time for something the AI scheduled.

**Command:**

```bash
npx vitest run lib/google/writeback.test.ts
```

**Result summary:** All 4 tests pass, including the new Pacific-`timeZone`
case and the DST-transition-day case.

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

**Result summary:** 183/183 tests pass across 41 files; lint and typecheck
clean.

```
 Test Files  41 passed (41)
      Tests  183 passed (183)
```

## Reviewer Conclusion

Both Google Calendar integration paths (read and write) are now Pacific-
correct independent of the server's own timezone. The query-window
reproduction shows a genuine data-loss bug fixed, not just a passing test,
and the write-back path now delegates DST resolution to Google itself via
an explicit `timeZone` field rather than re-implementing offset math.
