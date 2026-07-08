# Task 01 Proofs — Google OAuth foundation + encrypted token store

## Task Summary

This task gives the app its own server-side Google OAuth for two accounts (Work = read-only,
Personal = read + write), persists the resulting refresh tokens **encrypted at rest** in a
gitignored file, exposes connection status / disconnect, and ships a reproducible Google
Cloud setup guide. It is the foundation the rest of Story 3 builds on.

## What This Task Proves

- The app can start an OAuth authorization-code flow per account with the correct scopes and
  the parameters required to obtain a refresh token.
- Refresh tokens are encrypted (AES-256-GCM) before touching disk and can be round-tripped.
- The connection-status endpoint leaks no token material — only booleans.
- Secrets and the token file are gitignored; a setup guide documents the whole flow.

## Evidence Summary

- 14 targeted tests pass across auth, token store, the status route, and the connect UI.
- `git check-ignore` confirms `.tokens.json`, `.google-config.json`, and `.env.local` are
  ignored.
- The token-store test asserts the on-disk file contains ciphertext, not the plaintext token.
- `npm run build` compiles with all four `/api/google/*` routes registered.

## Artifact: Secrets & token file are gitignored

**What it proves:** No refresh token, client secret, or local config can be committed.

**Why it matters:** Story 3's security requirement is that credentials never enter git.

**Command:**

```bash
git check-ignore .tokens.json .google-config.json .env.local
```

**Result summary:** All three paths are reported as ignored.

```
.tokens.json
.google-config.json
.env.local
```

## Artifact: Token store encrypts at rest + round-trips (unit tests)

**What it proves:** Tokens are AES-256-GCM encrypted; the plaintext token never appears on
disk; status/disconnect behave; malformed/missing files are tolerated.

**Why it matters:** This is the core "encrypted at rest, no DB" storage decision.

**Command:**

```bash
npx vitest run lib/google/tokenStore.test.ts lib/google/auth.test.ts \
  app/api/google/status.test.ts components/Settings/GoogleConnect.test.tsx
```

**Result summary:** 14 tests pass. Notable cases: "writes ciphertext, not the plaintext
token, to disk"; "handles a malformed file without throwing"; auth URL includes
`access_type=offline` + `prompt=consent` with the correct per-account scope; the status
route returns only `{work, personal}` booleans and never echoes the seeded token.

```
 Test Files  4 passed (4)
      Tests  14 passed (14)
```

## Artifact: OAuth boundary — status payload has no secrets

**What it proves:** `GET /api/google/status` exposes connection booleans only.

**Why it matters:** The server-only boundary (tokens never reach the browser) is a core rule.

**Artifact path:** `app/api/google/status.test.ts`

**Result summary:** The test seeds a real encrypted refresh token, calls the route, and
asserts the response equals `{ work: false, personal: true }` and contains neither
`refresh_token` nor the seeded token value.

## Artifact: Production build registers the new routes

**What it proves:** All OAuth routes build and are wired into Next's App Router.

**Why it matters:** Route handlers are validated at build time; this confirms they are valid.

**Command:**

```bash
npm run build
```

**Result summary:** "Compiled successfully"; routes listed:

```
├ ƒ /api/google/callback
├ ƒ /api/google/connect/[account]
├ ƒ /api/google/disconnect/[account]
├ ƒ /api/google/status
```

## Artifact: Setup guide

**What it proves:** The Google Cloud setup (OAuth client, redirect URI, scopes, **In
production** consent screen to avoid the 7-day token expiry) is documented and reproducible.

**Artifact path:** `docs/google-calendar-setup.md`

**Result summary:** Step-by-step guide from creating the project through connecting both
accounts, including the token-encryption-secret generation command and security notes.

## Reviewer Conclusion

The OAuth foundation is in place and safe: tokens are encrypted at rest and gitignored, the
status endpoint leaks nothing, scopes are least-privilege per account, and the flow is
documented. Live connection requires Jack's Google Cloud credentials (per the setup guide);
everything here is verified without them.
