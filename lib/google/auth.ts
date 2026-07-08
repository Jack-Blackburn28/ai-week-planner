/**
 * Google OAuth 2.0 helpers (authorization-code flow). SERVER-ONLY — this is the
 * only place, alongside `client.ts`, that touches the `googleapis` SDK.
 *
 * A single registered redirect URI (`GOOGLE_REDIRECT_URI`) handles both accounts;
 * the `state` parameter carries which account ("work" | "personal") started the
 * flow so the callback knows where to store the resulting refresh token.
 */
import { google } from "googleapis";
import { GOOGLE_SCOPES, type GoogleAccount } from "./types";

/** Build an OAuth2 client from environment configuration. */
export function oauthClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI,
  );
}

/**
 * The Google consent URL for an account. `access_type=offline` + `prompt=consent`
 * guarantee we receive a refresh token (even on re-consent).
 */
export function getAuthUrl(account: GoogleAccount): string {
  return oauthClient().generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: GOOGLE_SCOPES[account],
    state: account,
    include_granted_scopes: false,
  });
}

/** Exchange an authorization code for tokens (includes a refresh_token). */
export async function exchangeCode(code: string) {
  const { tokens } = await oauthClient().getToken(code);
  return tokens;
}
