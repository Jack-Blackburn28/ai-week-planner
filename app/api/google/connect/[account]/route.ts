/**
 * GET /api/google/connect/[account] — start the Google OAuth flow.
 * Redirects the browser to Google's consent screen for the given account.
 */
import { NextResponse } from "next/server";
import { getAuthUrl } from "@/lib/google/auth";
import { isGoogleAccount } from "@/lib/google/types";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ account: string }> },
) {
  const { account } = await ctx.params;
  if (!isGoogleAccount(account)) {
    return NextResponse.json({ error: "unknown account" }, { status: 400 });
  }
  return NextResponse.redirect(getAuthUrl(account));
}
