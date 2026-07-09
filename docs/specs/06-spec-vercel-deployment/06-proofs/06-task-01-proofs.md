# Task 01 Proofs — Persistent storage abstraction (KV + file backends)

> **Update (provider resolved):** the hosted backend was initially built against the Upstash REST
> client (`@upstash/redis`, `KV_REST_API_*` vars). When provisioning on Vercel, the free add-on
> chosen was **Redis (Redis Cloud)**, which exposes a single **`REDIS_URL`** connection string. The
> KV backend was therefore switched to **node-redis (`redis`) over `REDIS_URL`** (see commit
> "use REDIS_URL + node-redis"). The abstraction, file backend, encryption, and async caller
> refactor below are unchanged; only the KV client implementation and env var (`REDIS_URL`)
> differ from the original text.

## Task Summary

This task proves the app no longer depends on the local filesystem for durable state. All four
stores (Google tokens, calendar mapping, Granola items, todo completions) now persist through a
shared `BlobStore` that uses a **gitignored file locally** and a **hosted KV store on Vercel**,
selected automatically by environment. Because the KV backend is network-backed, the store
interfaces became **async** and every caller was updated to `await`.

## What This Task Proves

- A single `BlobStore` abstraction backs all four stores; it picks the **KV backend when its
  connection env vars are present** and the **file backend otherwise**.
- Local behavior is unchanged: the existing store tests still pass (now `async`/`await`), and
  Google refresh tokens are still AES-256-GCM encrypted before storage.
- The KV backend round-trips a raw JSON string under a namespaced key (verified with an in-memory
  KV double), so it will behave the same on Vercel.
- The async refactor is complete and type-safe across all callers (`tsc --noEmit` clean).

## Evidence Summary

- `npm run typecheck` and `npm run lint` are clean after making four stores + ~9 callers async.
- `npm test` passes with **156 tests** (148 prior + 8 new blob-store tests), i.e. no regression.
- New `blobStore.test.ts` asserts backend selection for both Vercel (`KV_REST_API_*`) and native
  Upstash (`UPSTASH_REDIS_REST_*`) var names, plus file and KV round-trips.

## Artifact: Quality gates (typecheck + lint + tests)

**What it proves:** the async storage refactor compiles, lints, and passes the whole suite.

**Why it matters:** turning four stores async touches ~9 caller files; a missed `await` would be
a type error or a failing test. A clean run across all three gates is the core regression proof.

**Command:**

```bash
npm run typecheck && npm run lint && npm test
```

**Result summary:** typecheck and lint produced no output (success); Vitest reported
`Test Files 37 passed (37)` / `Tests 156 passed (156)`.

```text
> tsc --noEmit
   (no output — success)

> eslint .
   (no output — success)

> vitest run
 Test Files  37 passed (37)
      Tests  156 passed (156)
```

## Artifact: New storage abstraction

**What it proves:** the file/KV split and env-based selection exist and are unit-tested.

**Why it matters:** this is the mechanism that lets the app run identically on a laptop and on
Vercel's ephemeral filesystem.

**Artifact paths:** `lib/storage/blobStore.ts`, `lib/storage/blobStore.test.ts`

**Result summary:** `kvConfigured()` returns true for both `KV_REST_API_*` and
`UPSTASH_REDIS_REST_*` var pairs; `getBlobStore()` returns the file backend when neither is set.
The KV client is built lazily with `automaticDeserialization: false` so stored JSON strings round
-trip verbatim.

New KV-backend test excerpt:

```text
kv blob store round-trip
  ✓ writes, reads, and removes a raw JSON string under its key

blobStore backend selection
  ✓ reports KV unconfigured when no connection vars are set
  ✓ reports KV configured with Vercel KV_REST_API_* vars
  ✓ reports KV configured with native UPSTASH_REDIS_REST_* vars
  ✓ getBlobStore uses the file backend when KV is not configured
```

## Artifact: Token encryption preserved through the refactor

**What it proves:** Google refresh tokens are still encrypted at rest regardless of backend.

**Why it matters:** the backend changed, but the security property must not.

**Artifact path:** `lib/google/tokenStore.test.ts` → "writes ciphertext, not the plaintext token"

**Result summary:** the test reads the persisted blob and asserts it contains neither the
plaintext refresh token nor the string `refresh_token` — still passing after the async refactor.

## Reviewer Conclusion

State persistence is now backend-agnostic and safe for Vercel: a shared `BlobStore` selects file
vs KV by environment, all four stores route through it, encryption is preserved, and the full
suite (156 tests) passes with clean typecheck and lint.
