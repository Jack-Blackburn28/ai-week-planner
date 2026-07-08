# Task 01 Proofs — Planner Core & Config (`lib/planner`)

## Task Summary

This task proves the framework-free planner core exists and behaves safely: the model
config, the typed request/response contract + zod schema, the pure system-prompt/week
serializers, the deterministic mock-planner fallback, and — most importantly — the
server-side validator that treats AI output as untrusted and drops any proposed block
overlapping an immovable block.

## What This Task Proves

- The default model lives in one config constant (`claude-sonnet-5`).
- The system prompt encodes the core rules (never over immovable; propose-not-commit;
  conflict → ask), and the week serializer surfaces immovable/approved blocks + todos.
- `validateProposedBlocks` drops immovable-overlapping AI blocks (untrusted output).
- The mock planner returns a valid proposal normally, and asks (no proposal) on conflict.
- Everything type-checks and `.env.example` documents the key.

## Evidence Summary

- `npm run lint`, `npm run typecheck`, and `npm test` all pass (13 files, 64 tests) with
  9 new `lib/planner` tests.
- No live API calls — this task is pure logic + a deterministic mock.

## Artifact: Planner core tests pass

**What it proves:** Prompt building, week serialization, untrusted-output validation, and
the mock fallback all behave as specified.

**Why it matters:** These are the safety guarantees the AI route (Task 2.0) relies on;
proving them without the network keeps the core trustworthy and testable.

**Command:**

```bash
npm test
```

**Result summary:** `lib/planner/prompt.test.ts`, `validate.test.ts`, and `mock.test.ts`
pass — the validator drops a 10:00-Monday block that overlaps work hours and keeps a
6:00-PM block; the mock returns a proposal for "plan my week", asks with no proposal for
"put gym during work", and anchors gym to Friday on a replanning message. Suite total:
64 passing.

```
 Test Files  13 passed (13)
      Tests  64 passed (64)
```

## Artifact: Config, types, and env template added

**What it proves:** The default model is centralized and the key is documented without
being committed.

**Artifact paths:** `lib/planner/config.ts` (`PLANNER_MODEL = "claude-sonnet-5"`),
`lib/planner/types.ts`, `lib/planner/schema.ts`, `lib/planner/mock.ts`, `.env.example`.

**Result summary:** `.env.example` contains only `ANTHROPIC_API_KEY=` (no real value);
`.env*` remains git-ignored. `npm run typecheck` exits 0, so the schema + types compile.

```
ANTHROPIC_API_KEY=
```

## Reviewer Conclusion

The planner's tested, framework-free core is in place: the rules live in a prompt, AI
output is validated as untrusted, and a deterministic mock lets the whole feature run and
be tested before any key exists.
