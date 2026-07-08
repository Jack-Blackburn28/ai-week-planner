/**
 * Granola OAuth 2.0 helpers (authorization-code flow with refresh). SERVER-ONLY.
 *
 * Granola's personal API issues a short-lived (~1h) access token plus a rotating
 * refresh token. We store only the refresh token (encrypted, see `tokenStore.ts`)
 * and mint a fresh access token on demand — so the user connects once and never
 * touches it again. Endpoint URLs are env-overridable (the personal-API paths are
 * still stabilizing); sensible defaults are provided.
 */
const AUTH_URL =
  process.env.GRANOLA_AUTH_URL ?? "https://api.granola.ai/oauth/authorize";
const TOKEN_URL =
  process.env.GRANOLA_TOKEN_URL ?? "https://api.granola.ai/oauth/token";

/** Least-privilege read scope for personal notes/transcripts. */
const SCOPES = ["notes.read"];

export interface GranolaTokens {
  access_token: string;
  /** Present on initial exchange; may be rotated on refresh. */
  refresh_token?: string;
  expires_in?: number;
}

/** Build the Granola consent URL. `state` is echoed back to the callback (CSRF/route). */
export function getAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.GRANOLA_CLIENT_ID ?? "",
    redirect_uri: process.env.GRANOLA_REDIRECT_URI ?? "",
    response_type: "code",
    scope: SCOPES.join(" "),
    access_type: "offline",
    state,
  });
  return `${AUTH_URL}?${params.toString()}`;
}

async function tokenRequest(body: Record<string, string>): Promise<GranolaTokens> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GRANOLA_CLIENT_ID ?? "",
      client_secret: process.env.GRANOLA_CLIENT_SECRET ?? "",
      ...body,
    }).toString(),
  });
  if (!res.ok) throw new Error(`Granola token request failed: ${res.status}`);
  return (await res.json()) as GranolaTokens;
}

/** Exchange an authorization code for tokens (includes a refresh_token). */
export function exchangeCode(code: string): Promise<GranolaTokens> {
  return tokenRequest({
    grant_type: "authorization_code",
    code,
    redirect_uri: process.env.GRANOLA_REDIRECT_URI ?? "",
  });
}

/** Mint a fresh access token from the stored refresh token (may rotate it). */
export function refreshAccessToken(refreshToken: string): Promise<GranolaTokens> {
  return tokenRequest({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });
}
