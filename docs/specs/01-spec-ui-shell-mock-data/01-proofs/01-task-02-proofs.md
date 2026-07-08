# Task 02 Proofs — Domain Types, Mock Data & Pure Planning Logic

## Task Summary

This task proves the app has a typed domain model, realistic in-memory seed data, and
the two core planning rules implemented as pure, tested functions that the UI and the
Story 2 planner both reuse: **never schedule over an immovable block** and **approval is
required before anything is committed**.

## What This Task Proves

- `overlapsImmovable` / `proposalFits` enforce "never over an immovable block".
- `approveProposal` commits a plan (proposed → approved) without mutating input.
- `discardProposal` (Make Changes) removes proposals and commits nothing.
- The scripted mock proposal sits entirely in free space (no immovable collisions).
- Due-date classification (`classifyDue`) correctly labels overdue / soon / normal.
- Mock data type-checks against the domain types.

## Evidence Summary

- `npm test` → 3 files, 19 tests passing, including the overlap, approve, discard, and
  proposal-fit rules against the real seeded week.
- `npm run typecheck` exits 0, so `lib/mock-data.ts` conforms to `lib/types.ts`.

## Artifact: Core planning + date tests pass

**What it proves:** The core rules behave exactly as specified, verified against both
synthetic blocks and the real seed data.

**Why it matters:** These functions are the app's safety guarantees; Story 2's AI will
call them rather than re-implement scheduling rules.

**Command:**

```bash
npm test
```

**Result summary:** All 19 tests pass — `blocksOverlap`, `overlapsImmovable`
(inside/free/ignores-movable), `proposalFits` (accepts the mock proposal, rejects a
work-hours collision), `approveProposal` (converts + immutable), `discardProposal`
(removes + never approves), and `classifyDue` (overdue/soon/normal).

```
 RUN  v4.1.10

 ✓ components/Brand.test.tsx (1 test)
 ✓ lib/date.test.ts (5 tests)
 ✓ lib/planning.test.ts (13 tests)

 Test Files  3 passed (3)
      Tests  19 passed (19)
```

## Artifact: Mock data conforms to the domain types

**What it proves:** The seed data (immovable work/class blocks, nested meetings,
approved flexible blocks, Work/School todos, chat, and the mock proposal) is valid
against `lib/types.ts`.

**Why it matters:** A typed data model catches shape mistakes before they reach the UI.

**Command:**

```bash
npm run typecheck
```

**Result summary:** `tsc --noEmit` produced no errors.

```
> tsc --noEmit
(no output — no errors)
```

## Artifact: Files added

**What it proves:** The reusable `lib/` core exists.

**Artifact paths:** `lib/config.ts`, `lib/types.ts`, `lib/planning.ts`, `lib/date.ts`,
`lib/mock-data.ts`, plus tests `lib/planning.test.ts`, `lib/date.test.ts`.

**Result summary:** Config (single-source calendar window), domain types, pure planning
rules, date helpers, and seeded mock data — the framework-free foundation for the
surfaces built in Tasks 3.0–5.0.

## Reviewer Conclusion

The planning rules that the whole product depends on are implemented as small, pure,
fully-tested functions, and the app now has a realistic typed dataset to render. The
"never overlap immovable" and "approval before commit" guarantees are locked in with
tests from Story 1.
