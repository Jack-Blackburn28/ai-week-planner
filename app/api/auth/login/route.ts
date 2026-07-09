/**
 * POST /api/auth/login — verify the shared password and, on success, set the signed
 * HTTP-only session cookie the middleware checks. Wrong password → 401 (no cookie).
 * This route is excluded from the middleware gate so the login page can reach it.
 */
import { NextResponse } from "next/server";
import {
  SESSION_COOKIE,
  checkPassword,
  createSessionValue,
} from "@/lib/auth/session";

export async function POST(req: Request) {
  let body: { password?: string };
  try {
    body = (await req.json()) as { password?: string };
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  if (!(await checkPassword(body.password ?? ""))) {
    return NextResponse.json({ error: "invalid password" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, await createSessionValue(), {
    httpOnly: true,
    // Only require HTTPS in production; local dev is http://localhost.
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
  return res;
}
