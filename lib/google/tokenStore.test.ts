import { afterEach, describe, expect, it } from "vitest";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { createTokenStore } from "./tokenStore";

const SECRET = "test-secret-do-not-use-in-prod";

function tempStore() {
  const dir = mkdtempSync(join(tmpdir(), "tokstore-"));
  const filePath = join(dir, ".tokens.json");
  const store = createTokenStore({ filePath, secret: SECRET });
  return { dir, filePath, store };
}

const dirs: string[] = [];
function make() {
  const t = tempStore();
  dirs.push(t.dir);
  return t;
}
afterEach(() => {
  dirs.splice(0).forEach((d) => rmSync(d, { recursive: true, force: true }));
});

describe("tokenStore", () => {
  it("round-trips a token through encrypt → decrypt", async () => {
    const { store } = make();
    await store.saveToken("personal", { refresh_token: "1//super-secret-refresh" });
    expect((await store.getToken("personal"))?.refresh_token).toBe(
      "1//super-secret-refresh",
    );
  });

  it("writes ciphertext, not the plaintext token, to disk", async () => {
    const { store, filePath } = make();
    await store.saveToken("work", { refresh_token: "1//plain-visible-token" });
    const raw = readFileSync(filePath, "utf8");
    expect(raw).not.toContain("1//plain-visible-token");
    expect(raw).not.toContain("refresh_token");
  });

  it("reports connection status per account", async () => {
    const { store } = make();
    expect(await store.status()).toEqual({ work: false, personal: false });
    await store.saveToken("work", { refresh_token: "w" });
    expect(await store.status()).toEqual({ work: true, personal: false });
  });

  it("treats a missing file as no connections", async () => {
    const { store } = make();
    expect(await store.getToken("work")).toBeNull();
    expect(await store.status()).toEqual({ work: false, personal: false });
  });

  it("handles a malformed file without throwing", async () => {
    const { store, filePath } = make();
    writeFileSync(filePath, "not json {{{");
    expect(await store.status()).toEqual({ work: false, personal: false });
    expect(await store.getToken("personal")).toBeNull();
  });

  it("disconnect clears one account only", async () => {
    const { store } = make();
    await store.saveToken("work", { refresh_token: "w" });
    await store.saveToken("personal", { refresh_token: "p" });
    await store.disconnect("work");
    expect(await store.status()).toEqual({ work: false, personal: true });
    expect((await store.getToken("personal"))?.refresh_token).toBe("p");
  });

  it("removes the file once the last account disconnects", async () => {
    const { store, filePath } = make();
    await store.saveToken("personal", { refresh_token: "p" });
    await store.disconnect("personal");
    expect(existsSync(filePath)).toBe(false);
  });
});
