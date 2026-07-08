/**
 * GET /api/google/callback — OAuth redirect target for BOTH accounts.
 * The `state` param says which account started the flow; we exchange the code
 * for tokens, persist the refresh token (encrypted), and return to the app.
 *
 * A single registered redirect URI keeps the Google Cloud setup simple.
 */
import { NextResponse } from "next/server";
import { exchangeCode } from "@/lib/google/auth";
import { tokenStore } from "@/lib/google/tokenStore";
import { isGoogleAccount } from "@/lib/google/types";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state") ?? "";
  const error = url.searchParams.get("error");

  const home = (params: Record<string, string>) => {
    const dest = new URL("/", url.origin);
    for (const [k, v] of Object.entries(params)) dest.searchParams.set(k, v);
    return NextResponse.redirect(dest);
  };

  if (error) return home({ google_error: error });
  if (!code || !isGoogleAccount(state)) {
    return home({ google_error: "invalid_callback" });
  }

  try {
    const tokens = await exchangeCode(code);
    if (!tokens.refresh_token) {
      // No refresh token means Google didn't re-consent; ask the user to retry.
      return home({ google_error: "no_refresh_token" });
    }
    tokenStore.saveToken(state, {
      refresh_token: tokens.refresh_token,
      scope: tokens.scope ?? undefined,
      obtained_at: new Date().toISOString(),
    });
    return home({ connected: state });
  } catch {
    return home({ google_error: "exchange_failed" });
  }
}
