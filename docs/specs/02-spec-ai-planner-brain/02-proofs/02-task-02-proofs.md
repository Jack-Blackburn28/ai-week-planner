# Task 02 Proofs — Planner API Route (`POST /api/plan`)

## Task Summary

This task proves the server-side planner endpoint works end to end: it turns week-state +
conversation into a validated response, calls the Anthropic API only on the server (mock
otherwise), re-validates every proposed block against the immovable set, and returns safe
errors. The Anthropic SDK is imported only in server code.

## What This Task Proves

- `POST /api/plan` returns `{ reply, proposal? }` JSON.
- With a key (mocked SDK), the parsed structured output becomes the proposal.
- An AI-proposed block overlapping an immovable block is dropped server-side.
- With no key, the mock planner path is used (no SDK call).
- A malformed body returns a safe 4xx error with no secrets.
- The Anthropic SDK is imported only in `lib/planner/server.ts` — never in a client
  component.

## Evidence Summary

- `route.test.ts` passes (4 cases) with a mocked Anthropic client; suite = 68 tests.
- Live curl (no key) returns a reply + proposal; a malformed body returns 400.
- Grep shows the SDK import confined to server code.

## Artifact: Route tests pass (mocked SDK)

**What it proves:** The endpoint parses structured output, enforces the untrusted-output
rule, uses the mock without a key, and rejects bad input safely.

**Why it matters:** This is the server contract the UI depends on, verified without any
live API call.

**Command:**

```bash
npm test
```

**Result summary:** `app/api/plan/route.test.ts` passes — key-set proposal returned;
bad (work-hours) block validated out (`proposal` undefined); no-key mock path returns a
proposal and never calls the SDK; malformed body → 400 with no `sk-` in the payload.
Suite total: 68 passing.

```
 Test Files  14 passed (14)
      Tests  68 passed (68)
```

## Artifact: Live endpoint (mock path, no key)

**What it proves:** The route serves a real HTTP response using the mock planner.

**Command:**

```bash
curl -s -X POST http://localhost:3000/api/plan -H 'content-type: application/json' \
  -d '{"messages":[{"id":"1","role":"user","text":"plan my week"}],"week":{"blocks":[],"todos":[]}}'
```

**Result summary:** HTTP 200 with a `reply` and a 3-block `proposal` (Gym / Study /
Reading) from the offline mock planner.

```json
{"reply":"Here's a draft plan in your free evenings and weekend … (Offline mock planner — add an API key for real AI planning.)",
 "proposal":{"summary":"Gym, a study block, and reading placed in open slots around your week.",
 "blocks":[{"title":"Gym","source":"personal","day":4,"startMinutes":1200,"endMinutes":1260}, …]}}
```

## Artifact: Malformed body → safe 400

**Command:**

```bash
curl -s -o /dev/null -w "status: %{http_code}\n" -X POST http://localhost:3000/api/plan \
  -H 'content-type: application/json' -d '{"messages":[]}'
```

**Result summary:** `status: 400` — the missing-`week` body is rejected with a safe error
message (no key, no stack trace).

## Artifact: Server-only SDK boundary

**What it proves:** The API key / SDK never reach the client bundle.

**Command:**

```bash
grep -rn "@anthropic-ai/sdk" lib app components
```

**Result summary:** The SDK is imported only in `lib/planner/server.ts` (and mocked in
`route.test.ts`); no `"use client"` file imports it.

```
lib/planner/server.ts:10:import Anthropic from "@anthropic-ai/sdk";
lib/planner/server.ts:11:import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
(no client component imports the SDK)
```

## Reviewer Conclusion

The planner endpoint is correct and safe: structured proposals are validated as
untrusted, the mock keeps it keyless-runnable, errors are safe, and the key boundary is
server-only.
