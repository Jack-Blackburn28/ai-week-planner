# 06-tasks-vercel-deployment.md

Implementation plan for **Story 6 — Vercel deployment** (spec:
`06-spec-vercel-deployment.md`). Locked decisions: **typecheck in CI**, dedicated
**`SESSION_SECRET`**, **hosted KV store** (exact free-tier add-on chosen at the Vercel
dashboard — planned as Upstash Redis REST, which is what Vercel's Marketplace KV provisions).

Implementation order is dependency-driven: the two code changes (persistence + password) land
first so the deployed app already behaves correctly, then CI, then the Vercel deploy, then the
end-to-end proof that exercises the whole pipeline.

## Relevant Files

| File | Why It Is Relevant |
| --- | --- |
| `lib/storage/blobStore.ts` | **New.** Async key→JSON storage abstraction with a file backend (local) and a KV backend (Vercel/Upstash), auto-selected by env vars. |
| `lib/storage/blobStore.test.ts` | **New.** Backend-selection + KV round-trip tests. |
| `lib/google/tokenStore.ts` | Refactor to delegate to `blobStore` and become async; keep AES-256-GCM encryption. |
| `lib/google/tokenStore.test.ts` | Update existing tests to `await` async methods. |
| `lib/google/config.ts` | Refactor `get`/`set`/`busySources` + `ensureAiCalendar` to async via `blobStore`. |
| `lib/google/ensureAiCalendar.test.ts`, `lib/google/mapping.test.ts` | Update to `await` async config. |
| `lib/google/client.ts` | Caller of `tokenStore.getToken` — add `await`. |
| `lib/granola/store.ts` | Refactor `read`/`write` to async via `blobStore`; `syncActions` already awaits. |
| `lib/granola/store.test.ts` | Update to `await` async store. |
| `lib/todos/completions.ts` | Refactor `list`/`ids`/`add` to async via `blobStore`. |
| `lib/todos/completions.test.ts` | Update to `await` async store. |
| `app/api/google/{events,calendars,callback,disconnect,status}/route.ts` | Callers of `tokenStore`/`googleConfig` — add `await`. |
| `app/api/google/status.test.ts` | Update to `await`. |
| `app/api/granola/actions/route.ts` | Caller of `granolaStore`/`completionsStore` — add `await`. |
| `app/api/todos/{complete,completed}/route.ts` | Callers of `completionsStore` — add `await`. |
| `lib/auth/session.ts` | **New.** Framework-free HMAC sign/verify of the session cookie (`SESSION_SECRET`) + constant-time `APP_PASSWORD` compare. |
| `lib/auth/session.test.ts` | **New.** Unit tests for sign/verify + password check. |
| `app/api/auth/login/route.ts` | **New.** POST: verify password → set signed HTTP-only cookie; 401 on failure. |
| `app/api/auth/logout/route.ts` | **New (optional).** Clear the session cookie. |
| `app/login/page.tsx` | **New.** Styled, mobile-friendly password page (Tailwind tokens). |
| `middleware.ts` | **New.** Root middleware enforcing auth on all pages + API (page→redirect, API→401), excluding `_next`, static, `/login`, `/api/auth/login`. |
| `middleware.test.ts` (or auth route tests) | **New.** Page-redirect vs API-401, valid cookie passes, login excluded. |
| `.github/workflows/ci.yml` | **New.** Slim CI: lint + typecheck + test on push/PR (no deploy). |
| `.env.example` | Add `APP_PASSWORD`, `SESSION_SECRET`, KV connection vars with comments. |
| `docs/deployment.md` | **New.** Beginner Vercel walkthrough (repo import, env-var screen, KV add-on, Google redirect URI + consent status). |
| `README.md` | Add a "Deployment: Vercel" section; update status. |
| `AGENTS.md` | Story roadmap item 6 rewritten from AWS/Terraform → Vercel + CI gate. |
| `docs/architecture.md` | Remove AWS/Terraform/Docker/OIDC deployment plan; describe Vercel + KV persistence. |
| `next.config.ts` | Confirm no changes needed for Vercel (native Next.js support). |
| `package.json` | Add KV client dependency (`@upstash/redis`). |

### Notes

- Co-locate tests next to code (`Thing.ts` → `Thing.test.ts`); run with `npm test` (Vitest).
- Every access-control and persistence rule must have a test (repo hard requirement).
- Follow TS strict, `@/*` alias, Tailwind `@theme` tokens, server-only boundary for secrets.
- The gate (`npm run lint && npm run typecheck && npm test`) must stay green; don't bypass the
  pre-commit hook. Conventional commits referencing the task (e.g. `… Related to T1.0 in Spec 06`),
  with the `Co-Authored-By: Claude Opus 4.8 (1M context)` trailer.

## Tasks

### [x] 1.0 Persistent storage abstraction (KV + file backends)

Replace direct local-file persistence with a small storage layer that uses the current JSON
**file backend** locally and a **hosted KV backend** on Vercel (auto-selected by presence of
the KV connection env vars). All four existing stores route through it. Because a hosted KV is
network-backed, the store interfaces become **async**; callers are updated to `await`. Local
behavior and existing tests' intent are preserved.

_Traces:_ Spec Unit 2; FRs on backend abstraction, routing all four stores, local-parity,
token encryption. Unblocks "everything persists" on Vercel (Unit 3).

#### 1.0 Proof Artifact(s)

- Test: `npm test` passes including existing `tokenStore.test.ts`, `store.test.ts` (Granola),
  `completions.test.ts`, and Google `config`/`mapping` tests — demonstrates no local regression.
- Test: new `lib/storage/blobStore.test.ts` passes, asserting the **KV backend is selected when
  its env vars are present** and the **file backend otherwise** — demonstrates backend selection.
- Test: a store round-trip through the KV backend (mocked/in-memory KV) reads back what it wrote,
  and Google tokens remain encrypted before storage — demonstrates parity + encryption.
- CLI: `npm run typecheck` clean after the async refactor — demonstrates the refactor is complete
  and type-safe.

#### 1.0 Tasks

- [x] 1.1 Add the KV client dependency (`@upstash/redis`) and create `lib/storage/blobStore.ts`:
  an async `BlobStore` interface (`read`/`write`/`remove` over JSON strings) with a **file
  backend** (wraps the existing `fs` read/write, honoring per-store file-path overrides so tests
  keep working) and a **KV backend** (Upstash/Vercel-KV REST via env vars). Export `getBlobStore()`
  that returns the KV backend when its connection env vars are present, else the file backend.
- [x] 1.2 Write `lib/storage/blobStore.test.ts`: backend selection (KV env present → KV; absent →
  file) and a round-trip against an in-memory/mocked KV client.
- [x] 1.3 Refactor `lib/google/tokenStore.ts` to persist via the blob store and make
  `saveToken`/`getToken`/`status`/`disconnect` **async**; keep AES-256-GCM encryption (encrypt
  before `write`, decrypt after `read`). Preserve `createTokenStore({ filePath })` (file backend)
  for tests.
- [x] 1.4 Refactor the other three stores to delegate to the blob store and go async:
  `lib/google/config.ts` (`get`/`set`/`busySources` + `ensureAiCalendar`), `lib/granola/store.ts`
  (`read`/`write`; `syncActions` awaits), `lib/todos/completions.ts` (`list`/`ids`/`add`).
- [x] 1.5 Update all callers to `await`: `lib/google/client.ts` (`calendarFor` now async),
  `app/api/google/{events,calendars,callback,disconnect,status,mapping}/route.ts`,
  `app/api/granola/actions/route.ts`, `app/api/todos/{complete,completed}/route.ts`.
- [x] 1.6 Update the existing store tests to `await` the async methods; add KV-backend round-trip
  coverage. `npm run lint && npm run typecheck && npm test` all pass (156 tests). Commit
  (`… Related to T1.0 in Spec 06`).

### [x] 2.0 In-app password protection (all pages + API routes)

Add a shared-password gate: a styled `/login` page, a verify API route that checks
`APP_PASSWORD` server-side and sets a **signed, HTTP-only session cookie** (signed with
`SESSION_SECRET`), and root `middleware.ts` enforcing auth on every route — pages redirect to
`/login`, **API routes return 401** — excluding only the login page/verify endpoint and static
assets, with no redirect loop.

_Traces:_ Spec Unit 1; FRs on env-var password, styled login, signed cookie, middleware over
pages + API, 401 for API, `.env.example` documentation.

#### 2.0 Proof Artifact(s)

- Screenshot: the styled `/login` page (desktop + phone-width) — demonstrates the gate exists
  and is on-brand/mobile-friendly.
- Screenshot/recording: correct password reveals the dashboard; wrong password shows an error
  and grants nothing — demonstrates auth works.
- CLI: `curl -I` of a page path without the cookie shows a redirect to `/login`, and `curl` of
  `/api/plan` without the cookie returns **HTTP 401** — demonstrates both surfaces are protected.
- Test: `middleware`/auth-helper tests pass (correct vs wrong password, cookie required, API 401
  vs page redirect, login route excluded, no loop) — demonstrates the access-control rule.

#### 2.0 Tasks

- [x] 2.1 Create `lib/auth/session.ts` (framework-free): HMAC sign/verify a session value using
  `SESSION_SECRET` (`createSessionValue()`, `verifySessionValue(value)`), and a constant-time
  compare of a submitted password against `APP_PASSWORD`.
- [x] 2.2 Write `lib/auth/session.test.ts`: correct password → a value that verifies; tampered or
  empty value → fails; wrong password rejected.
- [x] 2.3 Create `app/api/auth/login/route.ts` (POST): on correct password set a signed
  HTTP-only, `Secure`, `SameSite=Lax` session cookie and return success; on wrong password return
  **401**. Add `app/api/auth/logout/route.ts` to clear the cookie (optional).
- [x] 2.4 Create the styled `app/login/page.tsx` (small `"use client"` form): centered single
  password field, unlock button, visible error state, large touch target, using existing Tailwind
  `@theme` tokens; posts to the login route and redirects to `next` (or `/`) on success.
- [x] 2.5 Create root `middleware.ts` with a matcher covering all routes **except** `_next`,
  static assets/favicon, `/login`, and `/api/auth/login`. Verify the session cookie:
  unauthenticated **page** request → 307 redirect to `/login?next=<path>`; unauthenticated **API**
  request → `401` JSON. Ensure the login route is excluded so there is no redirect loop.
- [x] 2.6 Write auth/middleware tests: page redirect vs API 401, valid cookie passes through,
  login route excluded. (Test the middleware logic and/or the login route directly.)
- [x] 2.7 Add `APP_PASSWORD` and `SESSION_SECRET` to `.env.example` (with comments + a
  generate-a-secret hint). Verify locally: with the vars set, `curl` `/api/plan` without the
  cookie returns 401 and a page redirects. Confirm the full gate passes; commit
  (`… Related to T2.0 in Spec 06`).

### [ ] 3.0 GitHub Actions CI quality gate

Add one slim workflow (`.github/workflows/ci.yml`) that, on every push and pull request, runs
`npm ci` then `npm run lint`, `npm run typecheck`, and `npm test` on `ubuntu-latest` with Node
matching local (20), reporting a pass/fail status check. It does **not** deploy.

_Traces:_ Spec Unit 4 (CI portion); FRs on lint+typecheck+test on push/PR, status check,
no-deploy-in-CI.

#### 3.0 Proof Artifact(s)

- Screenshot: a GitHub Actions run **green** on a push and on a PR, showing lint + typecheck +
  test steps — demonstrates the quality gate runs and passes.
- Diff: `.github/workflows/ci.yml` contents — demonstrates the gate is defined and slim
  (no deploy steps).
- CLI: `npm run lint && npm run typecheck && npm test` pass locally — demonstrates parity with
  the pre-commit gate.

#### 3.0 Tasks

- [ ] 3.1 Create `.github/workflows/ci.yml`: triggers `push` and `pull_request`; job on
  `ubuntu-latest`; steps = `actions/checkout`, `actions/setup-node` (Node 20 + npm cache),
  `npm ci`, `npm run lint`, `npm run typecheck`, `npm test`. No deploy steps.
- [ ] 3.2 Push a branch and open a PR (or push to a branch) to confirm the workflow runs and is
  **green**; capture the green-run screenshot. Confirm the same commands pass locally. Commit
  (`… Related to T3.0 in Spec 06`).

### [ ] 4.0 Vercel deployment with all integrations live + docs

Deploy from `main` (production) with PR previews via Vercel's native Next.js support (no
Dockerfile). Provision the free KV add-on; configure all secrets as Vercel env vars; register
the production Google OAuth redirect URI and set the consent screen so refresh tokens stay
long-lived. Write a beginner walkthrough and remove the old AWS/Terraform plan from the docs.
Verify all four integrations work on the live URL and persist across a restart.

_Traces:_ Spec Unit 3; FRs on prod-from-main + PR previews, env-var secrets + exact dashboard
location, repo→Vercel walkthrough, Google redirect URI + consent status, all-integrations-live.
Satisfies the spec's docs-update requirement.

#### 4.0 Proof Artifact(s)

- Screenshot: Vercel dashboard showing a successful **production deployment from `main`** —
  demonstrates the app is live.
- Screenshot: Vercel **Environment Variables** screen (names visible, values redacted) —
  demonstrates secrets are configured out of code.
- Screenshots on the **live `*.vercel.app` URL**: AI chat proposing/approving a plan; a Google
  event written by the app; Canvas assignments; Granola work items — demonstrates all four
  integrations work deployed.
- Screenshot: after connecting Google + one Granola extraction, a **redeploy/restart still shows
  them present** — demonstrates KV persistence on Vercel (ties Task 1.0 to production).
- Doc: `docs/deployment.md` walkthrough + `grep` showing no remaining AWS/Terraform deploy
  references in `AGENTS.md`/`docs/architecture.md` — demonstrates reproducible setup + consistent
  docs.

#### 4.0 Tasks

- [ ] 4.1 Confirm a clean production build (`npm run build`) and that no Vercel-specific config is
  needed (add a minimal `vercel.json` only if a real need appears). Verify `next.config.ts` needs
  no changes for Vercel.
- [ ] 4.2 Write `docs/deployment.md` — a first-time-Vercel walkthrough: sign in with GitHub →
  import `Jack-Blackburn28/ai-week-planner` (framework auto-detected) → where the **Environment
  Variables** screen is (Project → Settings → Environment Variables) and the exact list to add
  (`ANTHROPIC_API_KEY`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`,
  `TOKEN_ENC_SECRET`, `GRANOLA_API_KEY`, `CANVAS_BASE_URL`, `CANVAS_ICS_URL`, `APP_PASSWORD`,
  `SESSION_SECRET`, KV vars) → provisioning the free KV add-on (Storage tab) and the env vars it
  injects → production=`main`, previews=PRs.
- [ ] 4.3 Document + perform the Google OAuth production setup: register
  `https://<vercel-url>/api/google/callback` as an authorized redirect URI in Google Cloud
  Console, set `GOOGLE_REDIRECT_URI` to it, and set the OAuth consent screen publishing status so
  refresh tokens stay long-lived. (Sequence: first deploy → get URL → register → set env →
  redeploy.)
- [ ] 4.4 Update `.env.example` deployment notes so every new var is documented.
- [ ] 4.5 Remove the AWS/Terraform/Docker/OIDC plan: rewrite `AGENTS.md` roadmap item 6 to Vercel
  + CI gate; update `docs/architecture.md` (Vercel + KV persistence, no Terraform); fix any
  Story-1 spec/proof lines that name AWS as the deploy target; add a "Deployment: Vercel" section
  to `README.md`. `grep -rniE 'aws|terraform|oidc|us-west-2|liatrio-forge'` over docs to confirm
  no stale deploy references remain (historical mentions in past proofs may stay if clearly dated).
- [ ] 4.6 Deploy and verify on the live URL: connect Google (Work + Personal), confirm calendar
  read + a written event, Canvas assignments render, Granola work items appear, AI chat
  proposes/approves. Capture screenshots (secrets redacted).
- [ ] 4.7 Verify KV persistence: after connecting Google + one Granola extraction, trigger a
  redeploy/restart and confirm the login + items persist. Capture screenshot. Commit any code/doc
  changes (`… Related to T4.0 in Spec 06`).

### [ ] 5.0 End-to-end proof + revert + mobile verification

Prove the whole pipeline: make a small **visible** change, push to `main`, show CI green and the
change appearing automatically on the live URL, then **revert** it with a follow-up commit so the
app returns to normal. Verify the live app is usable on a **phone browser**.

_Traces:_ Spec Unit 4 (proof portion); FRs on visible-change→auto-deploy, revert-to-normal,
mobile usability.

#### 5.0 Proof Artifact(s)

- Screenshot: the small visible change **live on the `*.vercel.app` URL** with the corresponding
  GitHub Actions run **green** — demonstrates push→CI→auto-deploy end to end.
- Git log: the follow-up **revert commit** (and the live URL back to normal) — demonstrates the
  app was restored.
- Screenshot: the live app on a **phone-width viewport** (real device or mobile emulation) with
  core flows usable — demonstrates mobile usability.

#### 5.0 Tasks

- [ ] 5.1 Make a small, safe, **visible** change (e.g. a tiny build/version tag in the footer);
  commit to `main` and push.
- [ ] 5.2 Confirm the GitHub Actions run is **green** and the change appears automatically on the
  live `*.vercel.app` URL. Capture the live screenshot + the green-CI screenshot.
- [ ] 5.3 **Revert** the visible change with a follow-up commit; confirm the live app returns to
  normal (screenshot/log).
- [ ] 5.4 Open the live URL on a **phone browser** (or mobile emulation); verify login, calendar,
  todos, and chat work at phone width. Capture a phone-width screenshot.
