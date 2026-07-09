import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { middleware } from "./middleware";
import { SESSION_COOKIE, createSessionValue } from "@/lib/auth/session";

const saved: Record<string, string | undefined> = {};
beforeEach(() => {
  saved.APP_PASSWORD = process.env.APP_PASSWORD;
  saved.SESSION_SECRET = process.env.SESSION_SECRET;
  process.env.APP_PASSWORD = "pw";
  process.env.SESSION_SECRET = "secret";
});
afterEach(() => {
  process.env.APP_PASSWORD = saved.APP_PASSWORD;
  process.env.SESSION_SECRET = saved.SESSION_SECRET;
});

function request(path: string, cookie?: string) {
  const req = new NextRequest(new URL(`http://localhost${path}`));
  if (cookie) req.cookies.set(SESSION_COOKIE, cookie);
  return req;
}

/** NextResponse.next() carries this header; a pass-through has it, a block does not. */
const isPassThrough = (res: Response) =>
  res.headers.get("x-middleware-next") === "1";

describe("password gate middleware", () => {
  it("redirects an unauthenticated PAGE request to /login with a next param", async () => {
    const res = await middleware(request("/"));
    expect(res.status).toBe(307);
    const location = res.headers.get("location")!;
    expect(location).toContain("/login");
    expect(location).toContain("next=");
  });

  it("returns 401 (not a redirect) for an unauthenticated API request", async () => {
    const res = await middleware(request("/api/plan"));
    expect(res.status).toBe(401);
    expect(res.headers.get("location")).toBeNull();
  });

  it("lets an authenticated request through", async () => {
    const cookie = await createSessionValue();
    const res = await middleware(request("/", cookie));
    expect(isPassThrough(res)).toBe(true);
  });

  it("rejects a tampered cookie like no cookie (API → 401)", async () => {
    const bad = (await createSessionValue()).slice(0, -1) + "x";
    const res = await middleware(request("/api/plan", bad));
    expect(res.status).toBe(401);
  });

  it("never gates the login page (no redirect loop)", async () => {
    const res = await middleware(request("/login"));
    expect(isPassThrough(res)).toBe(true);
  });

  it("never gates the login verify endpoint", async () => {
    const res = await middleware(request("/api/auth/login"));
    expect(isPassThrough(res)).toBe(true);
  });

  it("is disabled (open) when APP_PASSWORD is not configured", async () => {
    delete process.env.APP_PASSWORD;
    const res = await middleware(request("/api/plan"));
    expect(isPassThrough(res)).toBe(true);
  });
});
