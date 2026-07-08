import { afterEach, describe, expect, it } from "vitest";

/**
 * The status payload must expose only `{ connected }` and never echo the API key.
 */
const VARS = ["GRANOLA_API_KEY", "GRANOLA_MOCK"] as const;
afterEach(() => {
  for (const v of VARS) delete process.env[v];
});

describe("GET /api/granola/status", () => {
  it("reports connected when an API key is set, without leaking it", async () => {
    process.env.GRANOLA_API_KEY = "grn_leak-me-if-you-can";
    const { GET } = await import("./status/route");
    const body = await (await GET()).json();

    expect(body).toEqual({ connected: true });
    expect(JSON.stringify(body)).not.toContain("leak-me-if-you-can");
  });

  it("reports not connected when no key is set", async () => {
    const { GET } = await import("./status/route");
    expect(await (await GET()).json()).toEqual({ connected: false });
  });

  it("reports connected in demo mode", async () => {
    process.env.GRANOLA_MOCK = "1";
    const { GET } = await import("./status/route");
    expect(await (await GET()).json()).toEqual({ connected: true });
  });
});
