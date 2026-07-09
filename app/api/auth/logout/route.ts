/**
 * POST /api/auth/logout — clear the session cookie so the next request is gated
 * again. Excluded from the middleware gate is unnecessary (logging out while
 * authenticated is fine), but clearing works regardless of auth state.
 */
import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth/session";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return res;
}
