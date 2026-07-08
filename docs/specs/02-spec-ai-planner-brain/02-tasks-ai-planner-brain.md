# 02-tasks-ai-planner-brain.md

Tasks for **Story 2 — The AI Planner Brain**.
Spec: `./02-spec-ai-planner-brain.md`

Dependency order: **1.0 → 2.0 → 3.0 → 4.0**. 2.0 depends on the `lib/planner` core from
1.0; 3.0 wires the UI to the 2.0 route; 4.0 layers replanning/conflict behavior on top.

## Relevant Files

| File | Why It Is Relevant |
| --- | --- |
| `package.json` | Add `@anthropic-ai/sdk` and `zod` dependencies. |
| `.env.example` | Documents `ANTHROPIC_API_KEY=` (real key lives in git-ignored `.env.local`). |
| `lib/planner/config.ts` | Single source of the default model (`claude-sonnet-5`) + planner tunables. |
| `lib/planner/types.ts` | `WeekState`, `PlannerRequest`, `PlannerResponse`, `ProposedBlock`. |
| `lib/planner/schema.ts` | Zod schema for the AI's structured output (reply + optional proposal). |
| `lib/planner/prompt.ts` | Pure `buildSystemPrompt()` + `serializeWeek()` (core rules + week context). |
| `lib/planner/prompt.test.ts` | Tests the system prompt encodes the rules and the week serialization. |
| `lib/planner/validate.ts` | Maps AI blocks → `proposed` `CalendarBlock`s and drops immovable-overlapping ones (reuses `lib/planning.ts`). |
| `lib/planner/validate.test.ts` | Tests bad/overlapping AI blocks are rejected (AI treated as untrusted). |
| `lib/planner/mock.ts` | Deterministic mock planner (valid free-space proposal; conflict → no proposal). |
| `lib/planner/mock.test.ts` | Tests the mock returns a valid proposal and a clarifying no-proposal on conflict. |
| `lib/planner/server.ts` | `runPlanner()` — Anthropic (key set) vs mock (no key), then validate. **Server-only import of the SDK.** |
| `app/api/plan/route.ts` | `POST /api/plan` Route Handler: parse body → `runPlanner` → JSON; safe errors. |
| `app/api/plan/route.test.ts` | Route tests with a **mocked** `@anthropic-ai/sdk` (parse, bad-block rejection, mock path, malformed body). |
| `components/DashboardShell.tsx` | Calls `/api/plan`, thinking state, renders reply + proposal, reuses approve/discard. |
| `components/DashboardShell.test.tsx` | Extended: `fetch`-mocked flow (request, reply, proposed, approve/discard, error). |
| `components/Chat/ChatDrawer.tsx` | Add a thinking indicator + disable send while awaiting. |
| `docs/architecture.md` / `AGENTS.md` | Document the new `app/api/plan` route + `lib/planner` module. |

### Notes

- Tests co-located (`*.test.ts(x)`); pure `lib/planner` logic is unit-tested directly.
- **No live API calls in tests** — `@anthropic-ai/sdk` is mocked (`vi.mock`); the no-key
  path exercises the mock planner.
- Reuse `lib/planning.ts` (`overlapsImmovable`, `approveProposal`, `discardProposal`),
  `lib/types.ts`, and the Story 1 chat components — do not duplicate them.
- Gates: `npm run lint` / `npm run typecheck` / `npm test`, enforced by the Husky
  pre-commit hook. Core-rule tests are mandatory.

## Tasks

### [x] 1.0 Planner core & config (`lib/planner`, framework-free + mock fallback)

Build the framework-free planner core the route and tests depend on. Maps to spec Unit 1
(core/mock/validation).

#### 1.0 Proof Artifact(s)

- CLI: `npm test` output showing `lib/planner` tests pass — prompt/serialization built,
  mock planner returns a valid free-space proposal, and `validateProposal` drops an
  immovable-overlapping block — demonstrates the core logic + fallback.
- Test: `lib/planner/validate.test.ts` passes, asserting a deliberately bad proposal
  (block over work hours) is rejected, demonstrates AI output is treated as untrusted.
- Diff: `lib/planner/config.ts` (default `claude-sonnet-5`), `lib/planner/types.ts`,
  `lib/planner/mock.ts`, and `.env.example` (`ANTHROPIC_API_KEY=`) added.
- CLI: `npm run typecheck` exit 0 demonstrates the response schema + types compile.

#### 1.0 Tasks

- [x] 1.1 Install `@anthropic-ai/sdk` and `zod`; add `.env.example` with an empty
  `ANTHROPIC_API_KEY=` placeholder (confirm `.env*` is git-ignored).
- [x] 1.2 Create `lib/planner/config.ts`: export `PLANNER_MODEL = "claude-sonnet-5"`
  (with a comment noting it's swappable to `claude-opus-4-8`) and any planner constants.
- [x] 1.3 Create `lib/planner/types.ts`: `WeekState` (immovable blocks, approved blocks,
  todos), `PlannerRequest` (`messages: ChatMessage[]`, `week: WeekState`),
  `ProposedBlock` (title, source, day, startMinutes, endMinutes), and `PlannerResponse`
  (`{ reply: string; proposal?: { summary: string; blocks: ProposedBlock[] } }`).
- [x] 1.4 Create `lib/planner/schema.ts`: a zod schema mirroring the AI structured output
  (`reply` + optional `proposal`), for `messages.parse` / `output_config.format`.
- [x] 1.5 Create `lib/planner/prompt.ts`: pure `buildSystemPrompt()` (encodes the core
  rules: never over immovable, free space only, propose-not-commit, conflict→ask) and
  `serializeWeek(week)` (compact text of immovable + approved blocks and todos+due dates);
  add `lib/planner/prompt.test.ts`.
- [x] 1.6 Create `lib/planner/validate.ts`: `toProposedBlocks(proposal)` → `CalendarBlock[]`
  with `status: "proposed"` and generated ids, and `validateProposal(blocks, weekBlocks)`
  that drops any block failing `overlapsImmovable`; add `lib/planner/validate.test.ts`
  (block over work hours is dropped).
- [x] 1.7 Create `lib/planner/mock.ts`: deterministic `mockPlanner(request)` returning a
  friendly `reply` + a small free-space `proposal`; when the latest message signals an
  unfittable request, return a clarifying `reply` with **no** proposal. Add
  `lib/planner/mock.test.ts` (valid proposal; conflict phrase → no proposal).
- [x] 1.8 Run `npm run typecheck` and `npm test`; confirm green.

### [x] 2.0 Planner API route (`POST /api/plan`, server-only Anthropic + mock)

Add the Route Handler that turns week-state + conversation into a validated response.
Maps to spec Unit 1 (endpoint).

#### 2.0 Proof Artifact(s)

- Test: `app/api/plan/route.test.ts` passes with a **mocked** Anthropic client —
  structured response parsed into a proposal, a bad AI block rejected by server
  validation, and (no key) the mock path returns a valid proposal.
- CLI: `curl -s -X POST localhost:3000/api/plan -H 'content-type: application/json' -d
  '{"messages":[...],"week":{...}}'` returns JSON with `reply` (and `proposal` when
  planning) demonstrates the endpoint works (mock path, no key).
- CLI: `git grep -n "@anthropic-ai/sdk" app components lib` showing the SDK is imported
  only under `lib/planner/server.ts`/`app/api`, never in a `"use client"` file,
  demonstrates the server-only key boundary.
- CLI: `curl` of a malformed request returns a safe JSON error (no key/stack) with a 4xx
  status demonstrates error handling.

#### 2.0 Tasks

- [x] 2.1 Create `lib/planner/server.ts`: `runPlanner(request)` — if
  `process.env.ANTHROPIC_API_KEY` is set, call Anthropic (`new Anthropic()`,
  `messages.parse` with the zod schema, model from `config`, adaptive thinking) to get
  `{ reply, proposal }`; otherwise call `mockPlanner`. Then map + `validateProposal`
  against the week's immovable blocks and return a `PlannerResponse`. Import the Anthropic
  SDK **only** here.
- [x] 2.2 Create `app/api/plan/route.ts`: `POST` handler that parses/validates the JSON
  body, calls `runPlanner`, and returns `NextResponse.json(response)`; on a bad body
  return a 4xx safe error, on planner failure a 5xx safe error — never leak the key or a
  stack trace.
- [x] 2.3 Create `app/api/plan/route.test.ts` with `vi.mock("@anthropic-ai/sdk")`:
  (a) key set + mocked parse → route returns the proposal; (b) mocked AI returns a block
  over work hours → validated out of the response; (c) no key → mock-path proposal;
  (d) malformed body → 4xx safe error.
- [x] 2.4 Verify the server-only boundary: confirm no `"use client"` component imports the
  Anthropic SDK (grep) and capture it as a proof artifact.
- [x] 2.5 Run `npm run typecheck`, `npm run lint`, `npm test`; confirm green.

### [ ] 3.0 Chat wired to the planner (UI)

Replace the Story 1 scripted mock with real calls to `/api/plan`. Maps to spec Unit 2.

#### 3.0 Proof Artifact(s)

- Screenshot: typed message → thinking indicator → assistant reply + dashed proposed
  blocks on the calendar (mock planner) demonstrates the wired flow.
- Screenshot: after Approve the blocks are solid; a separate shot shows Make changes
  clearing them — demonstrates the approval loop is intact.
- Test: `components/DashboardShell.test.tsx` (mocking `fetch`) asserts a message triggers
  a request, renders the reply, shows proposed blocks, Approve commits, Make changes
  discards.
- Screenshot: a simulated endpoint error shows a friendly failure message and an
  unchanged calendar.

#### 3.0 Tasks

- [ ] 3.1 Add a `toWeekState(blocks, todos)` helper (in `lib/planner`) that serializes
  the current `DashboardShell` state into a `WeekState` for the request.
- [ ] 3.2 Update `DashboardShell`: replace the scripted `handleSend`/`handlePropose` with
  an async call to `POST /api/plan` (sending `messages` + `week`); add a `thinking`
  state; on success append the assistant `reply` and, if a `proposal` is returned, add its
  blocks to calendar state as `proposed`.
- [ ] 3.3 Remove the hard-coded "Propose a plan" quick action (or repurpose it to send a
  "Plan my week" message); keep Approve / Make changes wired to
  `approveProposal`/`discardProposal`.
- [ ] 3.4 Update `components/Chat/ChatDrawer.tsx`: accept an `isThinking` prop, render a
  typing/thinking indicator bubble, and disable the send control while awaiting.
- [ ] 3.5 Add error handling: on a failed request, append a friendly assistant error
  message and leave calendar blocks unchanged (nothing committed).
- [ ] 3.6 Extend `components/DashboardShell.test.tsx` (mock `global.fetch`): assert the
  request is sent with `week` + `messages`, the reply renders, proposed blocks appear,
  Approve commits, Make changes discards, and the error path shows a message without
  changing blocks.
- [ ] 3.7 Run `npm run lint`, `npm run typecheck`, `npm test`; confirm green.

### [ ] 4.0 Mid-week replanning & conflict handling

Prove the two trust behaviors and lock in the never-overlap guarantee. Maps to spec
Unit 3.

#### 4.0 Proof Artifact(s)

- Screenshot: a replanning message ("move gym to Friday") and the resulting updated
  dashed proposal demonstrates mid-week replanning (mock planner acceptable).
- Test: an unfittable-request test asserts the response has a clarifying `reply` and an
  empty/absent `proposal` — demonstrates conflict handling (ask, don't overlap).
- Test: a test feeding a deliberately bad mocked AI response asserts the returned
  proposal contains no block overlapping any immovable block — demonstrates the core rule
  holds regardless of the model.
- CLI: `npm run lint && npm run typecheck && npm test` and `npm run build` all succeed
  demonstrates the story is clean and buildable.

#### 4.0 Tasks

- [ ] 4.1 Make `mockPlanner` support a deterministic replanning response (a follow-up
  mentioning a day/keyword produces an updated proposal reflecting the change), so the
  replanning screenshot/test is meaningful.
- [ ] 4.2 Ensure the conflict path renders correctly in the UI: a clarifying reply appears
  with **no** dashed blocks added until a fitting proposal is produced.
- [ ] 4.3 Add a conflict test: an unfittable request → `PlannerResponse` with a clarifying
  `reply` and empty/absent `proposal`.
- [ ] 4.4 Add a never-overlap test: given a deliberately bad mocked AI structured output
  (blocks overlapping several immovable blocks), assert `runPlanner`/the route returns a
  proposal with zero immovable-overlapping blocks.
- [ ] 4.5 Capture the replanning + conflict screenshots (mock planner).
- [ ] 4.6 Update `docs/architecture.md` and `AGENTS.md` to document `app/api/plan` and the
  `lib/planner` module; run all gates + `npm run build`; confirm green.
