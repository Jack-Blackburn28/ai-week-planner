/**
 * App-wide password gate. Runs on every request (except static assets and the
 * public auth paths) and requires a valid signed session cookie:
 *   - a PAGE request without it → 307 redirect to /login?next=<path>
 *   - an API request without it → 401 JSON (so data routes are truly protected,
 *     not just visually hidden)
 *
 * Runs in the Edge runtime, so it only uses Web Crypto (via lib/auth/session) —
 * never Node's `crypto`. The login page and its verify/clear endpoints are public
 * so there is no redirect loop.
 */
import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionValue } from "@/lib/auth/session";

/** Paths reachable without a session (else the login flow could never start). */
const PUBLIC_PATHS = ["/login", "/api/auth/login", "/api/auth/logout"];

function isPublic(pathname: string): boolean {
  return PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}

export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  // Gate is active only when a password is configured. With APP_PASSWORD unset
  // (e.g. plain local dev) the app is open — this avoids locking yourself out
  // with no way in. Production ALWAYS sets APP_PASSWORD, so it is protected there.
  if (!process.env.APP_PASSWORD) return NextResponse.next();

  if (isPublic(pathname)) return NextResponse.next();

  const cookie = req.cookies.get(SESSION_COOKIE)?.value;
  if (await verifySessionValue(cookie)) return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.search = "";
  url.searchParams.set("next", `${pathname}${search}`);
  return NextResponse.redirect(url);
}

export const config = {
  // Run on everything except Next internals and common static files. Public auth
  // paths are still matched here but short-circuited in code (see isPublic).
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|ico|webp|txt|xml|woff2?)).*)",
  ],
};
