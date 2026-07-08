# Task 02 Proofs — Transcripts → AI-extracted action items

## Task Summary

Builds the extraction pipeline: a `GranolaClient` interface (list recent meetings +
get transcript) with a real API client and an in-memory mock, an AI extractor
(`lib/granola/extract.ts`) that turns a transcript into action items via the Anthropic
API with a deterministic mock fallback, and pure mapping to Work `TodoItem`s. The
`/api/granola/actions` route runs the pipeline end-to-end.

## What This Task Proves

- A transcript is turned into concise action items (real model when a key is set;
  deterministic mock otherwise).
- Each action item maps to a **Work** `TodoItem`: stable id `granola-<meetingId>-<n>`,
  `metaLabel` = source meeting, **no due date**.
- The pipeline runs end-to-end against demo meetings without any credentials.

## Evidence Summary

- `lib/granola/extract.test.ts` (mock extractor + mapping) and `client.test.ts` pass;
  7 Granola tests green; lint + typecheck clean.
- `curl /api/granola/actions` (demo mode) returns 5 Work items extracted from 2 demo
  meeting transcripts.

## Artifact: Extraction + mapping unit tests

**Command:** `npx vitest run lib/granola`

**Result summary:** 3 files / 7 tests pass — the mock extractor pulls bullet/action
lines and strips prefixes; `buildActionRecords` yields stable ids; `recordToTodo`
produces a Work item with no due date; the mock client serves seeded meetings/transcripts.

```
 Test Files  3 passed (3)
      Tests  7 passed (7)
```

## Artifact: Actions endpoint (transcripts → Work todos)

**What it proves:** The full resolve → list meetings → get transcript → extract → map
pipeline works against a running server.

**Why it matters:** This is the end-to-end proof that Granola meetings become Work
action items.

**Command:** `curl -s http://localhost:3000/api/granola/actions` (GRANOLA_MOCK=1, no AI key)

**Result summary:** 5 Work items across 2 meetings (Platform Sync, Design Review), each
with `section:"work"`, `metaLabel` = meeting title, stable id, and **no `dueDate`**.

```json
[
  { "id": "granola-mtg-platform-sync-0", "section": "work",
    "title": "Send the Q3 roadmap draft to the team", "metaLabel": "Platform Sync", "done": false },
  { "id": "granola-mtg-platform-sync-1", "section": "work",
    "title": "Review PR #482 before Thursday", "metaLabel": "Platform Sync", "done": false },
  { "id": "granola-mtg-platform-sync-2", "section": "work",
    "title": "Follow up with the Acme vendor on API rate limits", "metaLabel": "Platform Sync", "done": false },
  { "id": "granola-mtg-design-review-0", "section": "work",
    "title": "Write up feedback on the calendar layout mockup", "metaLabel": "Design Review", "done": false },
  { "id": "granola-mtg-design-review-1", "section": "work",
    "title": "Schedule an accessibility review of the dashboard", "metaLabel": "Design Review", "done": false }
]
```

## Reviewer Conclusion

The app reads meeting transcripts and generates its own action items (Anthropic with a
mock fallback), mapping them to Work todos. Ready for persistence + Work-list wiring in
Task 03.
