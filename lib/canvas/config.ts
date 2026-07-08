/**
 * Canvas configuration, read from environment variables only (like the Google
 * OAuth credentials — the secret never touches the browser). SERVER-ONLY.
 *
 * Source selection precedence:
 *   1. API token  — requires CANVAS_BASE_URL + CANVAS_API_TOKEN (primary path).
 *   2. ICS feed   — requires CANVAS_ICS_URL (fallback; self-contained secret URL).
 *   3. none       — not configured.
 *
 * Env is read lazily (inside the functions) so tests can set/unset vars per case,
 * matching `lib/google`'s lazy resolution.
 */
import type { CanvasMode } from "./types";

/** The raw Canvas config as present in the environment (values may be empty). */
export interface CanvasConfig {
  baseUrl: string;
  token: string;
  icsUrl: string;
}

/** Read the three Canvas env vars (trimmed; empty string when unset). */
export function getCanvasConfig(): CanvasConfig {
  return {
    baseUrl: (process.env.CANVAS_BASE_URL ?? "").trim().replace(/\/$/, ""),
    token: (process.env.CANVAS_API_TOKEN ?? "").trim(),
    icsUrl: (process.env.CANVAS_ICS_URL ?? "").trim(),
  };
}

/**
 * Which source to use. Token wins over ICS wins over none. The token path needs
 * both a base URL and a token; the ICS path needs only its URL.
 */
export function resolveMode(): CanvasMode {
  const { baseUrl, token, icsUrl } = getCanvasConfig();
  if (baseUrl && token) return "token";
  if (icsUrl) return "ics";
  return "none";
}

/** True when Canvas is reachable via either source. */
export function isCanvasConfigured(): boolean {
  return resolveMode() !== "none";
}

/**
 * Demo mode: set `CANVAS_MOCK=1` to run the whole integration against the
 * in-memory fake (seeded assignments), so the feature is usable without any
 * Canvas credentials — handy for local demos and proof screenshots. Mirrors
 * `GOOGLE_MOCK`.
 */
export function isMockMode(): boolean {
  return process.env.CANVAS_MOCK === "1";
}
