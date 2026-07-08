/**
 * GET /api/granola/connect — start the Granola OAuth flow by redirecting to the
 * consent screen. The callback stores the resulting refresh token.
 */
import { NextResponse } from "next/server";
import { getAuthUrl } from "@/lib/granola/auth";

export async function GET() {
  return NextResponse.redirect(getAuthUrl("granola"));
}
