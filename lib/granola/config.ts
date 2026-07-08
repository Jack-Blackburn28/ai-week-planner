/**
 * Granola configuration, read from environment variables only. SERVER-ONLY.
 *
 * Granola's personal API uses a **Bearer API key** (`grn_…`), not OAuth — you
 * generate it in Granola → Settings → Connectors → API keys. So this mirrors the
 * Canvas token model: the key lives in `.env.local`, read server-side only, and
 * the ⚙︎ Settings row just reports connected / not-connected.
 */
export interface GranolaConfig {
  apiKey: string;
  baseUrl: string;
}

/** Read the Granola API key + base URL (base is overridable for future changes). */
export function getGranolaConfig(): GranolaConfig {
  return {
    apiKey: (process.env.GRANOLA_API_KEY ?? "").trim(),
    baseUrl: (process.env.GRANOLA_API_BASE ?? "https://public-api.granola.ai/v1")
      .trim()
      .replace(/\/$/, ""),
  };
}

/** True when a Granola API key is configured. */
export function isGranolaConfigured(): boolean {
  return Boolean(getGranolaConfig().apiKey);
}

/**
 * Demo mode: `GRANOLA_MOCK=1` runs the whole integration against the in-memory
 * fake (seeded meetings + transcripts), so the feature is usable without a key.
 * Mirrors `GOOGLE_MOCK` / `CANVAS_MOCK`.
 */
export function isMockMode(): boolean {
  return process.env.GRANOLA_MOCK === "1";
}
