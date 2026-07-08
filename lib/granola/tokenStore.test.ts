import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtempSync, readFileSync, rmSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { createGranolaTokenStore } from "./tokenStore";

/**
 * The refresh token must be encrypted at rest and never stored in plaintext, and
 * status must expose only a boolean. Mirrors the Google token-store guarantees.
 */
let dir: string;
let filePath: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "granola-tokens-"));
  filePath = join(dir, ".granola-tokens.json");
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe("granola tokenStore", () => {
  const store = () =>
    createGranolaTokenStore({ filePath, secret: "test-secret" });

  it("encrypts the refresh token at rest and decrypts it back", () => {
    store().save({ refresh_token: "1//super-secret-refresh" });

    const onDisk = readFileSync(filePath, "utf8");
    expect(onDisk).not.toContain("super-secret-refresh"); // ciphertext only

    expect(store().get()).toEqual({ refresh_token: "1//super-secret-refresh" });
  });

  it("reports connected as a boolean and disconnects cleanly", () => {
    expect(store().status()).toEqual({ connected: false });
    store().save({ refresh_token: "r" });
    expect(store().status()).toEqual({ connected: true });
    store().disconnect();
    expect(store().status()).toEqual({ connected: false });
    expect(store().get()).toBeNull();
  });
});
