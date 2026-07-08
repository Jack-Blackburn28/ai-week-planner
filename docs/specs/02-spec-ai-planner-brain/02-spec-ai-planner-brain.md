# 02-spec-ai-planner-brain.md

## Introduction/Overview

Story 2 replaces the Story 1 mock "Propose a plan" button with a real **AI planner**.
The chat is wired to the Anthropic API through a server-side route: the AI sees the
week's data (immovable work/class blocks, existing approved blocks, and the Work/School
todos with due dates) and proposes time blocks into the free space, following the core
rules. Proposals still appear as dashed/pending blocks on the calendar and are committed
only when Jack approves — reusing the tested Story 1 logic. Telling the AI about a change
produces an updated proposal, and when a request can't fit, the AI stops and asks how to
resolve it instead of overlapping an immovable block.

Because an Anthropic API key isn't available yet, the planner ships with a **mock-planner
fallback**: when no key is configured the app returns a deterministic, rule-based
proposal so the entire flow is usable and testable now. Everything still runs on
mock/manually-entered week data — no Google Calendar, Canvas, or Granola yet.

## Goals

- Wire the chat to a **server-side** planner endpoint that calls the Anthropic API
  (default model `claude-sonnet-5`) with the API key read from an environment variable
  and never exposed to the browser.
- Have the AI propose plans as **validated structured data** (calendar blocks) that the
  server checks against the "never overlap an immovable block" rule before returning.
- Preserve the approval loop: proposals render dashed on the calendar; Approve commits
  them (dashed → solid), Make changes discards them.
- Support mid-week replanning: a follow-up message produces an updated proposal.
- Enforce conflict handling: an unfittable request yields a clarifying question with
  options and **no** overlapping/proposed blocks.
- Provide a **mock-planner fallback** so the app runs and is fully demoable without a key.

## User Stories

- **As Jack**, I want to tell the planner in plain language how I want to spend my week
  and have it draft a real plan around my fixed commitments, so planning takes seconds.
- **As Jack**, I want the AI to never book over my work hours or classes, so a proposal
  is always something I can actually accept.
- **As Jack**, I want to say "actually move the gym to Friday" and get an updated draft,
  so mid-week changes are as easy as a sentence.
- **As Jack**, I want the AI to ask me how to resolve a conflict rather than guess, so I
  stay in control when something doesn't fit.
- **As Jack (no API key yet)**, I want the app to still work with a sensible mock plan,
  so I can use and refine the experience before wiring up billing.

## Demoable Units of Work

### Unit 1: Server-side planner endpoint (the brain)

**Purpose:** A Next.js Route Handler that turns "week state + conversation" into a
validated planner response, using the Anthropic API when a key is present and a
deterministic mock planner when it isn't.

**Functional Requirements:**
- The system shall expose a server-side API route (e.g. `POST /api/plan`) that accepts
  the current week state (immovable blocks, approved blocks, todos) and the chat
  conversation, and returns a planner response.
- The system shall call the Anthropic API from the server only, reading the key from
  `ANTHROPIC_API_KEY` (via environment variable); the key shall never be sent to or
  referenced by client-side code.
- The system shall default to model `claude-sonnet-5`, configured in a single place so
  it can be changed without editing call sites.
- The AI shall return a **structured** response validated against a schema: an assistant
  `reply` (text) plus an optional `proposal` (a set of suggested blocks, each with
  title, source, day, and start/end times).
- The system shall be given the core rules in its system prompt: never schedule over an
  immovable block; place blocks only in free space; propose, do not commit; on a
  conflict, ask rather than guess.
- The server shall **validate** every proposed block with the existing
  `overlapsImmovable` logic before returning; any block that would overlap an immovable
  block shall be rejected (not surfaced as a proposal).
- When `ANTHROPIC_API_KEY` is absent, the system shall use a deterministic **mock
  planner** that returns a valid, free-space proposal (no external call), so the app
  runs without a key.
- The route shall return clear, safe errors (no secrets in messages) when the API call
  fails, and the UI shall surface a friendly message.

**Proof Artifacts:**
- Test: `lib/planner/*.test.ts` passes with a **mocked** Anthropic client, demonstrating
  prompt building, structured-response parsing, and that an AI-proposed block overlapping
  an immovable block is rejected by server validation.
- Test: a test with no key set demonstrates the mock planner returns a valid free-space
  proposal.
- CLI: `curl -s -X POST localhost:3000/api/plan -d '<week+message>'` returns a JSON
  response with `reply` and (when planning) `proposal` demonstrates the endpoint works.
- CLI: `git grep` / build output demonstrating the Anthropic client is imported only in
  server code (route/`lib/planner/server`), never in a client component.

### Unit 2: Chat wired to the planner

**Purpose:** Replace the Story 1 scripted mock with the real endpoint so a typed message
drives an AI (or mock) proposal onto the calendar and through the approval loop.

**Functional Requirements:**
- Sending a chat message shall call the planner endpoint with the current week state and
  conversation, show a **typing/thinking indicator** while waiting, then append the
  assistant's `reply`.
- When the response includes a `proposal`, its blocks shall appear on the calendar as
  **proposed** (dashed) and the drawer shall show **Approve** / **Make changes**
  (reusing the Story 1 components and `approveProposal`/`discardProposal`).
- **Approve** shall commit the proposed blocks (dashed → solid); **Make changes** shall
  discard them without committing — unchanged from Story 1's guarantees.
- The Story 1 hard-coded "Propose a plan" quick action shall be removed (or repurposed to
  send a real "plan my week" message).
- If the endpoint errors, the chat shall show a friendly failure message and leave the
  calendar unchanged (nothing committed).

**Proof Artifacts:**
- Screenshot: a typed message → thinking indicator → assistant reply + dashed proposed
  blocks on the calendar (using the mock planner) demonstrates the wired flow.
- Screenshot: after Approve, the blocks are solid; a separate shot shows Make changes
  clearing them — demonstrates the approval loop still holds.
- Test: a component/integration test (mocking `fetch`/the route) asserts a message
  triggers a request, renders the reply, shows proposed blocks, and that Approve commits
  while Make changes does not.

### Unit 3: Mid-week replanning & conflict handling

**Purpose:** Prove the two behaviors that make the planner trustworthy: it revises on
request, and it refuses to overlap immovable blocks — asking instead.

**Functional Requirements:**
- A follow-up message describing a change (e.g. "move the gym session to Friday") shall
  produce an **updated proposal** that reflects the change, given the prior conversation
  and current week state.
- When a request cannot be satisfied without overlapping an immovable block (or otherwise
  doesn't fit the free space), the planner shall return a `reply` that **asks how to
  resolve it, offering concrete options**, and shall return **no proposed blocks**.
- Under no circumstances shall a returned proposal contain a block that overlaps an
  immovable block (enforced by server validation from Unit 1, covered by tests).

**Proof Artifacts:**
- Screenshot: a replanning message and the resulting updated dashed proposal on the
  calendar demonstrates mid-week replanning (mock planner is acceptable).
- Test: a test feeding an unfittable request asserts the response has a clarifying
  `reply` and an empty/absent `proposal` (no overlap) — demonstrates conflict handling.
- Test: a property/unit test asserting the server never returns a proposal that overlaps
  any immovable block, across a range of AI outputs (including a deliberately bad mocked
  AI response) — demonstrates the core rule holds regardless of the model.

## Non-Goals (Out of Scope)

1. **No external data integrations**: still mock/manually-entered week data — Google
   Calendar (Story 3), Canvas (Story 4), Granola (Story 5) are out of scope.
2. **No persistence**: state remains in-memory and resets on refresh; approved blocks are
   not written to any real calendar yet.
3. **No streaming UI**: the assistant reply appears after a thinking indicator (simple,
   non-streaming). Token-by-token streaming is a later polish.
4. **No AI-driven todo editing**: the planner proposes calendar blocks and converses; it
   does not create, complete, or edit todos (those arrive with their integrations).
5. **No authentication / deploy / password protection**: Story 6.
6. **No multi-user or usage/billing dashboards**: single user; cost is managed by model
   choice only.
7. **No tool-use/agentic loop or web access**: a single structured-output request per
   turn; no server tools.

## Design Considerations

- **Response feel:** while the planner is working, show a compact thinking indicator in
  the chat drawer (e.g. animated dots). On success, append the assistant reply; if a
  proposal is included, the dashed blocks animate onto the calendar and the Approve /
  Make changes bar appears (all existing Story 1 UI).
- **Conflict UX:** a clarifying reply reads like the confirmed vision — it names the
  conflict and offers concrete options (shorten / move / bump), and no dashed blocks
  appear until Jack replies and a fitting proposal is produced.
- **Error UX:** a friendly, non-technical failure message ("I couldn't reach the planner
  just now — try again"); never expose stack traces or the key.
- **No visual regressions:** the calendar, todos, chat drawer, responsive layout, and
  legend from Story 1 are unchanged except that the proposal now comes from the planner.

## Repository Standards

- Follow `docs/conventions.md`: TypeScript strict; framework-free logic in `lib/`;
  PascalCase components; `@/*` imports; co-located `*.test.ts(x)`; small focused commits.
- **Reuse, don't reinvent:** the planning rules (`overlapsImmovable`, `proposalFits`,
  `approveProposal`, `discardProposal`) and types (`CalendarBlock`, `Proposal`,
  `ChatMessage`) from `lib/` are reused as-is; the server validates against them.
- Tests use Vitest + React Testing Library; the Anthropic client is **mocked** in tests
  (no live API calls in the test suite).
- Quality gates (`lint`, `typecheck`, `test`) must pass; enforced by the Husky
  pre-commit hook. The core-rule tests are a hard requirement.
- Update `AGENTS.md`/steering docs if the architecture (new `app/api/` route, `lib/
  planner/`) changes how the repo is laid out.

## Technical Considerations

- **Anthropic SDK (grounded via current docs):** use `@anthropic-ai/sdk` (TypeScript)
  server-side. Default model `claude-sonnet-5` (swap-able to `claude-opus-4-8`), held in
  one config constant. Use **structured outputs** (`output_config.format` with a JSON
  schema, e.g. via `client.messages.parse()` with a zod schema) so the proposal comes
  back as validated JSON rather than free-text to parse. Adaptive thinking
  (`thinking: {type:"adaptive"}`) suits the planning reasoning; keep the system prompt
  stable (the week state goes in the user turn) so prompt caching can help later.
- **Server-only boundary:** the Anthropic client is imported only in the Route Handler /
  `lib/planner/server` module. `.env.local` holds the key (git-ignored); `.env.example`
  documents `ANTHROPIC_API_KEY=`. Next.js keeps server route code out of the client
  bundle; do not read the key in any `"use client"` file.
- **Response contract:** define a typed planner response — `{ reply: string; proposal?:
  { summary: string; blocks: ProposedBlock[] } }`. The server maps `blocks` to
  `CalendarBlock`s with `status: "proposed"`, then filters out any that fail
  `overlapsImmovable` against the current immovable set (defense-in-depth around the AI).
- **Mock planner:** a deterministic `lib/planner` function that, given the week state,
  returns a small valid free-space proposal (reusing the free-slot reasoning / a canned
  plan) plus a friendly reply. Selected automatically when `ANTHROPIC_API_KEY` is unset;
  keeps the app and tests independent of the network.
- **Conversation context:** send the running `ChatMessage[]` plus a compact serialization
  of the week (immovable blocks, approved blocks, todos with due dates) each request.
  The API is stateless; history is short, so send it in full.
- **Prompt as a tested unit:** build the system prompt and the week serialization in pure
  functions in `lib/planner` so they can be unit-tested without the network.

## Security Considerations

- **API key:** `ANTHROPIC_API_KEY` via environment only; `.env*` already git-ignored;
  add `.env.example` with an empty placeholder. Never hardcode, log, or return the key;
  never import the Anthropic client into client components.
- **Proof artifacts:** screenshots/logs must contain only mock data and must not include
  a real key — use `sk-...`/`[REDACTED]` placeholders in any example command.
- **Server validation as a guardrail:** treat the AI output as untrusted — validate
  proposed blocks against the immovable set server-side so a bad/model-injected proposal
  can never overlap a protected block.
- **Error messages:** user-facing errors must be generic; log detail server-side only.

## Success Metrics

1. **Wired end-to-end (mock):** a typed message returns a `reply` and, when planning, a
   dashed proposal on the calendar; Approve commits, Make changes discards — all with the
   mock planner and no key.
2. **Core rule holds:** tests prove the server never returns a proposal overlapping an
   immovable block, even given a deliberately bad AI response.
3. **Replanning works:** a follow-up change message yields an updated proposal in tests
   and on screen.
4. **Conflict handling:** an unfittable request yields a clarifying reply with options and
   no proposed blocks (tested).
5. **Security:** no key in the client bundle or any committed file; `.env.example`
   present; gates green.
6. **Real-AI ready:** with a key set locally, the same flow calls `claude-sonnet-5` and
   returns a real proposal (verified by Jack once a key is added).

## Open Questions

_Resolved with Jack at the clarification step:_

1. **API key availability:** RESOLVED — none yet; ship a **mock-planner fallback** so the
   app runs and is testable now; real-AI verification deferred until Jack adds a key.
2. **Model default:** RESOLVED — `claude-sonnet-5` (cheaper, near-Opus), in one config
   constant; swappable to `claude-opus-4-8`.
3. **Response feel:** RESOLVED — simple non-streaming (thinking indicator → full reply +
   proposal). Streaming deferred.
4. **Structured-output mechanism:** RESOLVED (my call, flag if wrong) — structured
   outputs via a JSON schema (`messages.parse`), not raw tool-use. Non-blocking.
