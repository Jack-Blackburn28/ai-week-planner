/**
 * Granola configuration flags, read from the environment. SERVER-ONLY.
 * OAuth client credentials live in env; the refresh token is stored (encrypted)
 * by `tokenStore.ts` after the connect flow.
 */

/** True when Granola OAuth credentials are configured. */
export function isGranolaConfigured(): boolean {
  return Boolean(
    process.env.GRANOLA_CLIENT_ID && process.env.GRANOLA_CLIENT_SECRET,
  );
}

/**
 * Demo mode: `GRANOLA_MOCK=1` runs the whole integration against the in-memory
 * fake (seeded meetings + transcripts), so the feature is usable without any
 * Granola credentials. Mirrors `GOOGLE_MOCK` / `CANVAS_MOCK`.
 */
export function isMockMode(): boolean {
  return process.env.GRANOLA_MOCK === "1";
}
