import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { mkdtempSync, rmSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { createTokenStore } from "@/lib/google/tokenStore";

/**
 * Guards the server-only boundary: the status payload must expose connection
 * booleans and NOTHING that could leak a refresh token or client secret.
 */
let dir: string;

beforeAll(() => {
  dir = mkdtempSync(join(tmpdir(), "status-route-"));
  process.env.GOOGLE_TOKEN_FILE = join(dir, ".tokens.json");
  process.env.TOKEN_ENC_SECRET = "test-secret-for-status-route";
  // Seed a real (encrypted) token so we can prove it is NOT echoed back.
  createTokenStore().saveToken("personal", {
    refresh_token: "1//leak-me-if-you-can",
  });
});

afterAll(() => {
  rmSync(dir, { recursive: true, force: true });
  delete process.env.GOOGLE_TOKEN_FILE;
});

describe("GET /api/google/status", () => {
  it("returns only connection booleans, never token material", async () => {
    const { GET } = await import("./status/route");
    const res = await GET();
    const body = await res.json();

    expect(body).toEqual({ work: false, personal: true });
    const serialized = JSON.stringify(body);
    expect(serialized).not.toContain("leak-me-if-you-can");
    expect(serialized).not.toContain("refresh_token");
  });
});
