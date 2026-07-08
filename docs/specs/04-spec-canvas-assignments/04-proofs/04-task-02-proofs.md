# Task 02 Proofs — Canvas assignment fetch, parse & mapping (data layer)

## Task Summary

This task builds the data layer that turns raw Canvas data into School `TodoItem`s:
a client that fetches from the API-token source (with `Link`-header pagination) or
the ICS calendar-feed fallback, an ICS parser (`ical.js`), a pure mapping +
scope-filter module, and the `/api/canvas/assignments` route. It also relaxes
`TodoItem.dueDate` to optional so undated assignments are representable.

## What This Task Proves

- Raw assignments map to School todos: course → `metaLabel`, `due_at` → local
  `YYYY-MM-DD`, **submitted/graded → `done`**, **undated → no `dueDate`**.
- The scope filter keeps future + recently-overdue and drops far-overdue, and always
  keeps undated items.
- The ICS fallback parses a real `.ics` feed into assignments (title + due date).
- `TodoItem.dueDate` optional does not regress existing consumers (full suite green).
- `/api/canvas/assignments` returns the mapped list end-to-end (demo mode).

## Evidence Summary

- `npm test`: 27 files, **122 tests pass** (was 113 → +9 for `map`/`ics`); lint +
  typecheck clean.
- `curl /api/canvas/assignments` (demo mode) returns 6 mapped School items — the
  submitted one is `done: true`, the undated one has no `dueDate`.
- ICS-library choice (`ical.js`) confirmed via context7 before adding the dependency.

## Artifact: Data-layer unit tests

**What it proves:** Mapping, submission→done, undated handling, the scope filter, and
ICS parsing are all covered by automated tests.

**Why it matters:** These are the core FRs of Unit 2; they must be correct before the
UI renders them.

**Command:**

```bash
npx vitest run lib/canvas
```

**Result summary:** `config` (6), `status` route (3), `map` (6), `ics` (3) — all pass.
Full `npm test` shows 122 passing, confirming the `dueDate`-optional change didn't
break Story 1/2 consumers.

```
 Test Files  27 passed (27)
      Tests  122 passed (122)
```

## Artifact: Assignments endpoint (mapped School todos)

**What it proves:** The full fetch → scope-filter → map pipeline works against a
running server and produces exactly the School-todo shape the UI needs.

**Why it matters:** This is the end-to-end proof of Unit 2's data path, including the
two subtle behaviors (submitted→checked, undated→no due date).

**Command:**

```bash
curl -s http://localhost:3000/api/canvas/assignments   # CANVAS_MOCK=1
```

**Result summary:** Six School items returned. `canvas-hist-reading` is
`"done": true` (submitted), and `canvas-cs-participation` has **no** `dueDate` key
(undated). Due dates are correct relative to today (2026-07-08).

```json
[
  { "id": "canvas-hist-essay", "section": "school", "title": "Essay: Cold War causes",
    "metaLabel": "HIST 202", "dueDate": "2026-07-06", "done": false },
  { "id": "canvas-hist-reading", "section": "school", "title": "Reading: chapters 4–5",
    "metaLabel": "HIST 202", "dueDate": "2026-07-03", "done": true },
  { "id": "canvas-math-pset5", "section": "school", "title": "Problem set 5",
    "metaLabel": "MATH 301", "dueDate": "2026-07-09", "done": false },
  { "id": "canvas-math-pset6", "section": "school", "title": "Problem set 6",
    "metaLabel": "MATH 301", "dueDate": "2026-07-14", "done": false },
  { "id": "canvas-cs-project", "section": "school", "title": "Final project proposal",
    "metaLabel": "CS 350", "dueDate": "2026-07-11", "done": false },
  { "id": "canvas-cs-participation", "section": "school",
    "title": "Discussion participation (ongoing)", "metaLabel": "CS 350", "done": false }
]
```

## Artifact: ICS-library decision (context7)

**What it proves:** The parsing dependency was chosen from current guidance, not
guesswork.

**Why it matters:** Jack asked to confirm the ICS library via context7 before adding it.

**Result summary:** context7 surfaced `ical.js` (Mozilla, High reputation, pure-JS,
103 snippets). Chosen over `node-ical` because it has no heavy Node-only deps
(`moment-timezone`, `rrule`), fitting a Next.js server route. Confirmed the parse API
(`ICAL.parse` → `new ICAL.Component` → `getAllSubcomponents('vevent')` →
`ICAL.Event.startDate.toJSDate()`) and verified it against `fixtures/sample.ics`.

## Reviewer Conclusion

The data layer is complete and correct: assignments from either source map to School
todos with the right due-date, submission, and undated behavior, the scope filter
works, and the `dueDate`-optional change is regression-safe (122 tests green). Ready
to render in the School section in Task 03.
