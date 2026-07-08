import { afterEach, describe, expect, it } from "vitest";

/**
 * Guards the server-only boundary: the status payload must expose only
 * `{ connected, mode }` and NEVER echo the Canvas token or ICS URL.
 */
const CANVAS_VARS = [
  "CANVAS_BASE_URL",
  "CANVAS_API_TOKEN",
  "CANVAS_ICS_URL",
  "CANVAS_MOCK",
] as const;

afterEach(() => {
  for (const v of CANVAS_VARS) delete process.env[v];
});

describe("GET /api/canvas/status", () => {
  it("reports token mode without leaking the secret", async () => {
    process.env.CANVAS_BASE_URL = "https://school.instructure.com";
    process.env.CANVAS_API_TOKEN = "1//leak-me-if-you-can";
    const { GET } = await import("./status/route");
    const body = await (await GET()).json();

    expect(body).toEqual({ connected: true, mode: "token" });
    const serialized = JSON.stringify(body);
    expect(serialized).not.toContain("leak-me-if-you-can");
    expect(serialized).not.toContain("instructure.com");
  });

  it("reports ICS mode without leaking the feed URL", async () => {
    process.env.CANVAS_ICS_URL =
      "https://school.instructure.com/feeds/calendars/secret-user-token.ics";
    const { GET } = await import("./status/route");
    const body = await (await GET()).json();

    expect(body).toEqual({ connected: true, mode: "ics" });
    expect(JSON.stringify(body)).not.toContain("secret-user-token");
  });

  it("reports not connected when unconfigured", async () => {
    const { GET } = await import("./status/route");
    const body = await (await GET()).json();
    expect(body).toEqual({ connected: false, mode: "none" });
  });
});
