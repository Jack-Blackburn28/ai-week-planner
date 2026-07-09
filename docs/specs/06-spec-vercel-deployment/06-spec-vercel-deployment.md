# 06-spec-vercel-deployment.md

## Introduction/Overview

Story 6 takes the AI Week Planner — fully working locally on Jack's real accounts — and
deploys it to **Vercel** on his personal account so it runs permanently on the free tier.
This replaces the earlier AWS/Terraform/Docker plan. The story delivers four things:
(1) the app **live on Vercel** with production deploys from `main` and preview deploys on
PRs, all secrets as Vercel environment variables; (2) **in-app password protection** on
every page and API route (a single shared password from an env var, since Vercel's built-in
password gate is paid); (3) a **slim GitHub Actions CI quality gate** (lint + tests) whose
green check is the visible quality signal while Vercel does the deploying; and (4) an
**end-to-end proof** that a push to `main` runs tests green and appears automatically on the
live URL, then is reverted, with the live app verified on a phone browser.

The primary goal: a permanently-running, password-protected live app where everything that
worked locally — AI planner, Google Calendar read/write, Canvas, Granola — also works
deployed, backed by a persistent hosted store so Vercel's ephemeral filesystem doesn't lose
Jack's Google login, Granola action items, or checked-off todos.

## Goals

- **Live on Vercel:** the app is reachable at a permanent `*.vercel.app` URL, deploying
  automatically from `main` (production) and on PRs (preview).
- **Everything works deployed:** AI planner, Google Calendar read + write-back, Canvas
  assignments, and Granola action items all function on the live app exactly as they do
  locally.
- **Locked down:** all pages and all API routes require a shared password; unauthenticated
  requests never reach app content or data.
- **Quality gate visible on GitHub:** a GitHub Actions workflow runs lint + the full test
  suite on every push and PR and shows a green check.
- **Proven end to end:** a small visible change pushed to `main` is shown live on the Vercel
  URL (with CI green), then reverted; the live app is confirmed usable on a phone browser.

## User Stories

- **As Jack**, I want the planner running permanently at a public URL so I can open it from
  any device without starting a local dev server.
- **As Jack**, I want a single password on the whole app so that only I can see my calendar,
  meetings, and todos even though it's on the public internet.
- **As Jack (a beginner with Vercel)**, I want a clear, step-by-step walkthrough of
  connecting my repo and setting environment variables so I can deploy confidently without
  guessing.
- **As Jack**, I want my Google login, Granola action items, and checked-off todos to
  survive on the deployed app so I don't re-authenticate constantly or pay to re-extract
  Granola meetings every time Vercel restarts the app.
- **As Jack**, I want a green check on GitHub for every push so I have a clear quality signal
  separate from the deploy.

## Demoable Units of Work

### Unit 1: In-app password protection (all pages + API routes)

**Purpose:** Lock the entire deployed app behind one shared password so it's safe on the
public internet, with a polished login experience that works on desktop and phone.

**Functional Requirements:**
- The system shall read a single shared password from a server-side environment variable
  (e.g. `APP_PASSWORD`) and never expose it to the client bundle.
- The system shall present a styled, on-brand login page with one password field and an
  unlock action for any unauthenticated request to a page.
- The system shall, on a correct password, set a **signed, HTTP-only session cookie** so the
  user stays authenticated across pages and refreshes; an incorrect password shall show an
  error and grant no access.
- The system shall enforce authentication in **Next.js middleware** covering all pages **and
  all API routes**, excluding only the login page/its verify endpoint and static assets
  (`_next`, favicon), with no redirect loop on the login route.
- The system shall return **401** (not an HTML redirect) for unauthenticated **API** requests
  so programmatic/data routes are not merely visually hidden.
- The system shall behave normally when `APP_PASSWORD` is set locally and shall be documented
  in `.env.example`.

**Proof Artifacts:**
- Screenshot: the styled login page rendered on desktop demonstrates the gate exists.
- Screenshot/recording: entering the correct password reveals the dashboard; a wrong password
  is rejected — demonstrates auth works.
- CLI/`curl`: an unauthenticated request to a page path redirects to login and to an API route
  (e.g. `/api/plan`) returns HTTP 401 — demonstrates both surfaces are protected.
- Test: middleware/auth unit tests pass (correct vs wrong password, cookie required, API vs
  page behavior, login route excluded) — demonstrates the core rule is enforced.

### Unit 2: Persistent hosted store (state survives Vercel's ephemeral filesystem)

**Purpose:** Replace local-file persistence with a free hosted key-value store so Google
tokens, calendar mapping, Granola results, and completions persist on Vercel — matching local
behavior and avoiding repeated paid Granola re-extraction.

**Functional Requirements:**
- The system shall provide a small storage abstraction with a **file backend** (current
  behavior, used locally) and a **hosted KV backend** (used when the store's connection env
  vars are present), selected automatically at runtime.
- The system shall route all four existing stores — Google token store, Google calendar
  config/mapping, Granola store, and todo completions — through this abstraction without
  changing their public function signatures or existing tests' intent.
- The system shall preserve current behavior locally: with no KV env vars set, all stores use
  the same JSON files as today, and the existing store tests still pass.
- The system shall keep encryption of Google refresh tokens intact regardless of backend
  (tokens are encrypted before storage, as they are today).

**Proof Artifacts:**
- Test: existing store tests (`tokenStore.test.ts`, `store.test.ts`, `completions.test.ts`,
  Google config) still pass unchanged — demonstrates no local regression.
- Test: new abstraction test proves the KV backend is selected when its env vars are present
  and the file backend otherwise — demonstrates correct backend selection.
- Screenshot (post-deploy, from Unit 3): after connecting Google on the live app and letting
  Granola extract once, a redeploy/restart shows the login and action items **still present**
  — demonstrates persistence works on Vercel.

### Unit 3: Vercel deployment with all integrations live

**Purpose:** Get the app running on Vercel from `main`, with every secret configured and every
integration working on the live URL, plus a beginner-friendly walkthrough Jack can follow.

**Functional Requirements:**
- The system shall build and run on Vercel from the `main` branch (production) with preview
  deploys created for pull requests, using Vercel's native Next.js support (no Dockerfile).
- The deployment shall be configured with all required secrets as **Vercel environment
  variables** (never committed): `ANTHROPIC_API_KEY`, `GOOGLE_CLIENT_ID`,
  `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI` (the production callback URL),
  `TOKEN_ENC_SECRET`, `GRANOLA_API_KEY`, `CANVAS_BASE_URL`, `CANVAS_ICS_URL`,
  `APP_PASSWORD`, `SESSION_SECRET`, and the hosted KV connection vars.
- The documentation shall tell Jack **exactly which env vars to add and where** (the Vercel
  Project → Settings → Environment Variables screen), and shall walk connecting the GitHub
  repo to Vercel step by step for a first-time Vercel user.
- The documentation shall walk registering the production **Google OAuth redirect URI**
  (`https://<vercel-url>/api/google/callback`) in Google Cloud Console and setting the OAuth
  consent screen to a publishing status that keeps refresh tokens long-lived (so the deployed
  calendar does not break after a few days).
- On the live URL, the system shall demonstrably: plan via the AI chat, read + write Google
  Calendar events, show Canvas assignments, and show Granola-derived work action items.

**Proof Artifacts:**
- Screenshot: the Vercel project dashboard showing a successful production deployment from
  `main` — demonstrates the app is live.
- Screenshot: the Vercel Environment Variables screen (names visible, values redacted)
  demonstrates secrets are configured out of code.
- Screenshots on the **live URL**: AI chat proposing/approving a plan; a Google event written
  by the app; Canvas assignments; Granola work items — demonstrates all four integrations work
  deployed.
- Doc: `docs/deployment.md` (or README section) contains the full beginner walkthrough —
  demonstrates the setup is reproducible.

### Unit 4: CI quality gate + end-to-end proof

**Purpose:** Add a slim GitHub Actions gate (lint + tests) and prove the whole pipeline end to
end — push → green check → automatic live deploy → revert → mobile check.

**Functional Requirements:**
- The system shall include a GitHub Actions workflow that, on every push and pull request,
  installs dependencies, runs `npm run lint`, `npm run typecheck`, and `npm test` (full Vitest
  suite), and reports a pass/fail status check on the commit/PR. (Typecheck included to match
  the existing pre-commit gate — confirmed during review.)
- The workflow shall **not** perform deployment — Vercel owns deploying; GitHub Actions owns the
  quality signal.
- The proof procedure shall: make a small **visible** change, push to `main`, show CI green and
  the change appearing automatically on the live Vercel URL, then **revert** the change with a
  follow-up commit so the app returns to normal.
- The live app shall be verified as usable on a **phone browser** (layout and core flows).

**Proof Artifacts:**
- Screenshot: the GitHub Actions run green on a push/PR (lint + tests) — demonstrates the gate.
- Screenshot: the visible change live on the `*.vercel.app` URL — demonstrates auto-deploy from
  `main`.
- Git log: the follow-up revert commit — demonstrates the app was restored to normal.
- Screenshot: the live app on a phone-width viewport (real device or mobile emulation) —
  demonstrates mobile usability.

## Non-Goals (Out of Scope)

1. **AWS / Terraform / Docker / OIDC.** The original Story 6 cloud plan is replaced by Vercel;
   no infrastructure-as-code or containers are produced.
2. **Multi-user accounts, roles, or real user management.** A single shared password is the
   entire auth model; no per-user login, signup, or password reset.
3. **Hardened/enterprise auth** (rate limiting, brute-force lockout, MFA, secret rotation
   automation). The shared-password gate is intentionally simple for a single-user app.
4. **Custom domain / DNS.** The app uses the default `*.vercel.app` URL; a custom domain can be
   added later and is not part of this story.
5. **New product features.** No new planner, calendar, Canvas, or Granola functionality — this
   story is packaging, deployment, persistence-backend, and access control only.
6. **Migrating existing local data into the hosted store.** Jack re-connects Google and lets
   Granola populate on the live app; no bulk import of local `.json` state.

## Design Considerations

- The **login page** must match the app's existing visual language (Tailwind v4 tokens in
  `app/globals.css`, existing component styling) and be fully usable on a phone: single
  centered password field, clear unlock button, visible error state, large touch target.
- The gate should feel instant and unobtrusive once authenticated (cookie persists; no repeated
  prompts within a session).
- No change to the existing three-surface layout (calendar / todo dashboard / chat) beyond the
  login gate wrapping it.

## Repository Standards

- **Next.js App Router + TypeScript (strict).** Middleware lives at project root
  (`middleware.ts`) per Next.js convention. Framework-free logic stays in `lib/` (the storage
  abstraction and auth/cookie helpers belong there so they're unit-testable).
- **AI planner boundary preserved:** secrets and server-only code stay server-side; nothing
  secret is imported into a `"use client"` component. The password is server-side only (no
  `NEXT_PUBLIC_` prefix).
- **Testing:** Vitest + React Testing Library, co-located `*.test.ts(x)`; core access-control
  and persistence logic must have tests (consistent with the project's rule that core-rule
  logic is tested).
- **Secrets:** only via `.env*` (gitignored) and Vercel env vars; update `.env.example` with
  the new vars; never commit real values.
- **Commits:** conventional, task-referenced, with the
  `Co-Authored-By: Claude Opus 4.8 (1M context)` trailer; baseline planning commit at story
  start; push to `origin main` at story end.
- **Pre-commit hook** (lint + typecheck + test) stays green.

## Technical Considerations

- **Persistence backend:** use Vercel's free managed KV / Upstash Redis add-on (small,
  `get`/`set` by key — a natural fit for four small JSON blobs). The four stores
  (`lib/google/tokenStore.ts`, `lib/google/config.ts`, `lib/granola/store.ts`,
  `lib/todos/completions.ts`) already centralize read/write and support a path override env
  var; they will be refactored behind a shared storage interface that picks the KV backend when
  its connection env vars are present and the file backend otherwise. Signatures stay stable so
  existing tests and callers are unaffected.
- **Password gate mechanics:** Next.js `middleware.ts` with a matcher covering all routes except
  `_next`, static assets, the login page, and the verify endpoint. A correct password (checked
  server-side against `APP_PASSWORD`) sets a signed HTTP-only cookie (HMAC of a value using
  `TOKEN_ENC_SECRET` or a dedicated secret). Middleware validates the cookie; pages redirect to
  `/login`, API routes return **401**. Avoid the classic redirect loop by excluding the login
  route from enforcement. The cookie is signed with a dedicated **`SESSION_SECRET`** env var.
- **Google refresh-token longevity (important):** if the Google OAuth consent screen is in
  "Testing" publishing status, refresh tokens expire after ~7 days and the deployed calendar
  breaks weekly. The walkthrough must set the consent screen to a status that yields long-lived
  refresh tokens, and register the production redirect URI.
- **Redirect URI sequencing:** the production `GOOGLE_REDIRECT_URI` depends on the assigned
  `*.vercel.app` URL, so the walkthrough deploys first to obtain the URL, then registers it in
  Google Cloud Console and sets the env var, then redeploys.
- **No Dockerfile / no `next start` server management** — Vercel builds and serves the Next.js
  app natively; `next.config.ts` needs no output/standalone changes for Vercel.
- **CI runner:** GitHub Actions on `ubuntu-latest`, Node version matching local, `npm ci`, then
  lint + test (+ typecheck). Keep it a single slim workflow.

## Security Considerations

- **Shared password** is server-side only (`APP_PASSWORD`, no `NEXT_PUBLIC_`); never logged,
  never sent to the client. The session cookie is signed and HTTP-only.
- **All secrets** (`ANTHROPIC_API_KEY`, `GOOGLE_*`, `TOKEN_ENC_SECRET`, `GRANOLA_API_KEY`,
  `CANVAS_*`, `APP_PASSWORD`, KV connection vars) live only in Vercel env vars and local
  `.env.local`; `.env.example` lists names with empty values only.
- **API routes must be protected**, not just pages — otherwise data (calendar, meetings, todos)
  leaks to unauthenticated callers. This is an explicit acceptance criterion (401 for unauth
  API calls).
- **Google refresh tokens** remain encrypted at rest in whichever backend stores them.
- **Proof artifacts** must redact secret values (env-var screenshots show names only) and must
  not include real tokens or the password. This gate is intentionally simple and suitable only
  for a single-user personal app, not sensitive multi-tenant data (noted as a non-goal).

## Success Metrics

1. **Live & permanent:** the `*.vercel.app` URL loads the app and auto-deploys from `main`
   (verified by a deployment shown in the Vercel dashboard).
2. **Access control:** 100% of pages and API routes require the password — an unauthenticated
   page redirects to login and an unauthenticated API call returns 401 (verified by test +
   `curl`).
3. **Full functionality deployed:** all four integrations demonstrably work on the live URL
   (screenshots), and state (Google login, Granola items, completions) persists across a
   restart/redeploy.
4. **Quality gate:** GitHub Actions shows a green lint + test check on push/PR.
5. **End-to-end proof:** a visible change reaches the live URL automatically with CI green, is
   then reverted, and the app is confirmed usable on a phone browser.
6. **Tests still green:** the full Vitest suite (currently 148) passes, plus new tests for the
   password gate and storage abstraction.

## Open Questions

1. **KV provider specifics:** ✅ resolved at the dashboard — the free **Redis (Redis Cloud)**
   add-on (Free 30 MB) was provisioned; it exposes a `REDIS_URL` connection string, so the KV
   backend uses **node-redis (`redis`) over `REDIS_URL`** (not the Upstash REST client the spec
   originally guessed).

### Resolved during review (2026-07-08)

- **Typecheck in CI:** ✅ included — CI runs `npm run lint` + `npm run typecheck` + `npm test`
  (parity with the pre-commit gate).
- **Cookie signing secret:** ✅ dedicated **`SESSION_SECRET`** env var (not reusing
  `TOKEN_ENC_SECRET`).
