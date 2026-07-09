# Task 03 Proofs - Natural-language parsing (Anthropic-backed + mock fallback)

## Task Summary

This task adds the ability to turn Jack's plain-language description of his
working hours into a structured `WorkHoursRule`, using the same
real-model/offline-mock split the main planner already uses:
`lib/workHours/parse.server.ts` (the only other Anthropic-SDK import
boundary in the app besides `lib/planner/server.ts`) calls the real model
when `ANTHROPIC_API_KEY` is set, and `lib/workHours/parseMock.ts` handles
common phrasings deterministically otherwise. A new `POST
/api/work-hours/parse` route exposes this.

## What This Task Proves

- The mock parser correctly handles a simple weekday-range + time-range
  message, a half-day override for a specific day, and references the
  current hours when re-asking — and asks for clarification (proposing
  nothing) rather than guessing on an unrecognized message.
- The route delegates correctly to the real or mock path depending on
  whether an API key is configured, shape-guards its input, and never
  leaks a key fragment in an error response.
- Parsing alone never persists anything — `proposedRule` is only ever
  returned, never written to the config store from this module.

## Evidence Summary

- `lib/workHours/parseMock.test.ts`: 4/4 tests pass.
- `app/api/work-hours/parse/route.test.ts`: 4/4 tests pass.
- Full suite: 219/219 tests pass (up from 211), lint and typecheck clean.

## Artifact: Mock parser common-pattern coverage

**What it proves:** "9 to 5 Monday through Friday" parses to the correct
per-day rule; "half day Friday" correctly shortens just that day relative
to the main range; referencing a current rule changes the reply's wording;
an unrecognized message asks for clarification with no proposed rule.

**Command:**

```bash
npx vitest run lib/workHours/parseMock.test.ts
```

**Result summary:** All 4 tests pass.

```
 RUN  v4.1.10 /Users/jack/ai-week-planner

 Test Files  1 passed (1)
      Tests  4 passed (4)
```

## Artifact: Parse route — real/mock delegation, shape guard, no key leakage

**What it proves:** The route returns the (mocked) Anthropic-parsed rule
when a key is configured, falls back to the mock parser when it isn't,
rejects a malformed body with a 4xx and no key fragment in the response,
and passes the current rule through for context.

**Command:**

```bash
npx vitest run app/api/work-hours/parse/route.test.ts
```

**Result summary:** All 4 tests pass.

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

**Result summary:** 219/219 tests pass across 49 files; lint and typecheck
clean.

```
 Test Files  49 passed (49)
      Tests  219 passed (219)
```

## Reviewer Conclusion

Natural-language work-hours parsing is implemented with the same
disciplined real/mock split and Anthropic-boundary isolation as the
existing planner, fully unit-tested for both paths, and confirmed to never
persist anything on its own — setting up cleanly for the Settings UI's
confirm-before-save flow in the next task.
