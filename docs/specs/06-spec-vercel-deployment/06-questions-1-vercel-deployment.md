# 06 Questions Round 1 — Vercel Deployment

These were asked interactively (one question at a time, per Jack's preference). Answers recorded verbatim below and used to write the spec.

## 1. State persistence on Vercel

Vercel's filesystem is read-only except `/tmp`, which is wiped constantly. The app currently keeps state in local JSON files in `process.cwd()`: `.tokens.json` (Google encrypted refresh tokens), `.google-config.json` (calendar mapping), `.granola-store.json` (processed meetings + generated action items), `.completions.json` (checked-off todos). Two integrations are already stateless and need no persistence: the AI planner (Anthropic key) and Canvas (reads the ICS feed live).

- (A) **Add a free hosted store** — route all four stores through a free Vercel storage add-on so Google login, Granola items, and completions persist exactly like local. No surprise Granola re-extraction cost.
- (B) Env-vars only, accept resets — seed Google via env vars; accept Granola re-extraction cost + completions resetting on restart.
- (C) Hybrid — Google via env vars + hosted store only for Granola + completions.

**Recommended:** (A) — best matches "everything that worked locally works on the deployed app" and avoids the Granola cost Jack flagged.

**ANSWER: (A) Add a free hosted store.**

## 2. Password protection UX

Single shared password via env var, protecting all pages AND API routes.

- (A) **Styled login page** — on-brand password page → signed session cookie → middleware enforces on every route.
- (B) Browser popup (HTTP Basic Auth) — least code, unstyled OS dialog, clunky on mobile, no clean logout.

**Recommended:** (A) — polished, mobile-friendly, better for a capstone demo.

**ANSWER: (A) Styled login page.**

## 3. App URL / domain

Determines the Google OAuth redirect URI and env-var URLs.

- (A) **Default `*.vercel.app` URL** — free, permanent, zero DNS setup.
- (B) Custom domain — nicer, but requires owning a domain + DNS records.

**Recommended:** (A) — free and permanent; a custom domain can be added later.

**ANSWER: (A) Default `*.vercel.app` URL.**

---

## Decisions the agent will make (not blocking; recorded for transparency)

- **Store technology:** Vercel's free KV / Upstash Redis add-on (natural fit for four small JSON blobs; `get`/`set` by key). Stores keep the file backend locally and switch to KV when its env vars are present.
- **CI gate contents:** lint + full Vitest suite on every push and PR (as Jack specified). Typecheck is also included to keep parity with the existing pre-commit gate (Jack may veto).
- **End-to-end proof change:** a small, visible, safe change (e.g. a tiny build/version tag in the footer) pushed to `main`, confirmed live on the Vercel URL, then removed by a follow-up commit.
- **GitHub repo:** `Jack-Blackburn28/ai-week-planner` (confirmed remote) for both CI and the Vercel connection.

## Flagged for the spec (Technical Considerations / Open Questions)

- **Google refresh-token longevity:** if Jack's Google OAuth consent screen is in "Testing" publishing status, refresh tokens expire after 7 days and the deployed calendar would break weekly. The spec will instruct setting the consent screen to "In production" so tokens are long-lived.
- The production Google redirect URI (`https://<vercel-url>/api/google/callback`) can only be finalized after the first deploy assigns the URL; the walkthrough sequences this.
