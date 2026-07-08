/**
 * GET /api/granola/callback — OAuth redirect target. Exchanges the code for tokens
 * and stores the (encrypted) refresh token, then returns to the app. On any error
 * it still redirects home rather than throwing.
 */
import { NextRequest, NextResponse } from "next/server";
import { exchangeCode } from "@/lib/granola/auth";
import { granolaTokenStore } from "@/lib/granola/tokenStore";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const home = new URL("/", req.nextUrl.origin);
  if (!code) return NextResponse.redirect(home);
  try {
    const tokens = await exchangeCode(code);
    if (tokens.refresh_token) {
      granolaTokenStore.save({ refresh_token: tokens.refresh_token });
    }
  } catch (err) {
    console.error("[granola] callback failed:", err);
  }
  return NextResponse.redirect(home);
}
