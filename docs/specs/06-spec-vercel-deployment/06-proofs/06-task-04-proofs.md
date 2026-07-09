# Task 04 Proofs — Vercel deployment: docs & config (live steps pending)

## Task Summary

Task 4 makes the app Vercel-ready and documents the deploy, then verifies it live. This proof
covers the parts completable without Jack's Vercel/Google dashboards: a clean production build, a
full beginner walkthrough, updated `.env.example`, and removal of the old AWS/Terraform plan from
the docs. The **live** steps (connect Vercel, add env vars, register the Google redirect URI,
verify integrations + persistence) are done with Jack and captured afterward.

## What This Task Proves (so far)

- The app **builds for production** with Vercel's native Next.js support — middleware and all new
  routes compile; no Dockerfile or Vercel config needed.
- `docs/deployment.md` is a complete, first-time-Vercel walkthrough (repo import, env-var screen,
  KV add-on, redirect URI + consent status, verification, troubleshooting).
- `.env.example` documents every new variable (`APP_PASSWORD`, `SESSION_SECRET`, KV vars).
- The old AWS/Terraform/Docker/OIDC plan is gone from the current docs (`AGENTS.md`,
  `docs/architecture.md`, `README.md`), replaced by the Vercel plan.

## Evidence Summary

- `npm run build` compiles successfully and lists the middleware + `/login` + `/api/auth/*` routes.
- A `grep` over current docs shows no stale AWS/Terraform deploy references (only intentional
  "not AWS / no Docker or Terraform" contrasts remain).
- `docs/deployment.md` exists with the full step-by-step guide.

## Artifact: Clean production build

**What it proves:** the app is deployable on Vercel as-is; the new middleware/auth/storage code
compiles for production.

**Why it matters:** Vercel runs `next build`; a clean local build is the strongest pre-deploy
signal.

**Command:**

```bash
npm run build
```

**Result summary:** `✓ Compiled successfully`, TypeScript passed, 19 routes generated including
`/login`, `/api/auth/login`, `/api/auth/logout`, and `ƒ Proxy (Middleware)`.

```text
✓ Compiled successfully in 6.5s
  Finished TypeScript ...
Route (app)
┌ ○ /
├ ƒ /api/auth/login
├ ƒ /api/auth/logout
│ … (all Google/Canvas/Granola/todos routes) …
└ ○ /login
ƒ Proxy (Middleware)
```

## Artifact: Deployment walkthrough

**What it proves:** the setup is reproducible by a first-time Vercel user.

**Artifact path:** `docs/deployment.md`

**Result summary:** 8 numbered steps (push → import → KV add-on → env vars → deploy+URL → Google
redirect URI & consent → redeploy+login → verify) plus "how deploys work" and troubleshooting.
Names the exact env-var screen (Project → Settings → Environment Variables) and the full variable
list.

## Artifact: Docs no longer reference the old AWS/Terraform plan

**What it proves:** the repo is internally consistent with the Vercel pivot.

**Command:**

```bash
grep -rniE "\b(aws|terraform|oidc)\b|docker" AGENTS.md README.md docs/architecture.md \
  docs/product-vision.md docs/deployment.md docs/conventions.md
```

**Result summary:** only intentional contrasts remain — `docs/deployment.md` "Why Vercel and not
AWS? … No Docker, no Terraform" and `docs/architecture.md` "no Docker or Terraform". `AGENTS.md`
roadmap item 6 and the architecture deployment section now describe Vercel + CI + KV.

## Pending (done live with Jack, captured afterward)

- **4.3 (perform):** register `https://<vercel-url>/api/google/callback` in Google Cloud Console
  and set the consent screen to production. (Documented in `docs/deployment.md`.)
- **4.6:** connect Google/Canvas/Granola on the live URL and screenshot each working.
- **4.7:** verify KV persistence across a redeploy and screenshot.

## Reviewer Conclusion

The app is production-build-clean and Vercel-ready, the deploy is fully documented for a beginner,
and the docs consistently describe Vercel (no leftover AWS/Terraform). The remaining live steps
require Jack's accounts and are captured once performed.
