import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtempSync, rmSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { createGranolaTokenStore } from "@/lib/granola/tokenStore";

/**
 * The status payload must expose only `{ connected }` and never echo token material.
 */
let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "granola-status-"));
  process.env.GRANOLA_TOKEN_FILE = join(dir, ".granola-tokens.json");
  process.env.TOKEN_ENC_SECRET = "test-secret-for-granola-status";
  delete process.env.GRANOLA_MOCK;
  // Seed a real (encrypted) token to prove it is NOT echoed back.
  createGranolaTokenStore().save({ refresh_token: "1//leak-me-if-you-can" });
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
  delete process.env.GRANOLA_TOKEN_FILE;
});

describe("GET /api/granola/status", () => {
  it("returns only a connected boolean, never token material", async () => {
    const { GET } = await import("./status/route");
    const body = await (await GET()).json();

    expect(body).toEqual({ connected: true });
    const serialized = JSON.stringify(body);
    expect(serialized).not.toContain("leak-me-if-you-can");
    expect(serialized).not.toContain("refresh_token");
  });
});
