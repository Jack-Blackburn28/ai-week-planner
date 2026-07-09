import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtempSync, rmSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import {
  createFileBlobStore,
  createKvBlobStore,
  getBlobStore,
  kvConfigured,
  type KvClient,
} from "./blobStore";

/** In-memory KV double matching the subset of the client we use. */
function fakeKv(): KvClient & { store: Map<string, string> } {
  const store = new Map<string, string>();
  return {
    store,
    async get(key) {
      return store.has(key) ? store.get(key)! : null;
    },
    async set(key, value) {
      store.set(key, value);
    },
    async del(key) {
      store.delete(key);
    },
  };
}

const KV_VARS = ["REDIS_URL", "KV_URL"];

describe("blobStore backend selection", () => {
  const saved: Record<string, string | undefined> = {};
  beforeEach(() => {
    KV_VARS.forEach((k) => {
      saved[k] = process.env[k];
      delete process.env[k];
    });
  });
  afterEach(() => {
    KV_VARS.forEach((k) => {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
    });
  });

  it("reports KV unconfigured when no connection string is set", () => {
    expect(kvConfigured()).toBe(false);
  });

  it("reports KV configured with REDIS_URL", () => {
    process.env.REDIS_URL = "redis://default:pw@example.redis.cloud:6379";
    expect(kvConfigured()).toBe(true);
  });

  it("reports KV configured with the KV_URL alias", () => {
    process.env.KV_URL = "rediss://default:pw@example.redis.cloud:6379";
    expect(kvConfigured()).toBe(true);
  });

  it("getBlobStore uses the file backend when KV is not configured", async () => {
    const dir = mkdtempSync(join(tmpdir(), "blob-sel-"));
    const filePath = join(dir, "blob.json");
    const store = getBlobStore({ filePath, kvKey: "unused" });
    await store.write('{"hello":"file"}');
    // The file backend persists to disk at filePath.
    const back = getBlobStore({ filePath, kvKey: "unused" });
    expect(await back.read()).toBe('{"hello":"file"}');
    rmSync(dir, { recursive: true, force: true });
  });
});

describe("file blob store round-trip", () => {
  let dir: string;
  let filePath: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "blob-file-"));
    filePath = join(dir, "blob.json");
  });
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  it("returns null before anything is written", async () => {
    expect(await createFileBlobStore(filePath).read()).toBeNull();
  });

  it("writes then reads back the exact string", async () => {
    const s = createFileBlobStore(filePath);
    await s.write('{"a":1}');
    expect(await s.read()).toBe('{"a":1}');
  });

  it("remove deletes the blob", async () => {
    const s = createFileBlobStore(filePath);
    await s.write("x");
    await s.remove();
    expect(await s.read()).toBeNull();
  });
});

describe("kv blob store round-trip", () => {
  it("writes, reads, and removes a raw JSON string under its key", async () => {
    const kv = fakeKv();
    const s = createKvBlobStore("awp:test", kv);
    expect(await s.read()).toBeNull();
    await s.write('{"a":1}');
    expect(kv.store.get("awp:test")).toBe('{"a":1}');
    expect(await s.read()).toBe('{"a":1}');
    await s.remove();
    expect(await s.read()).toBeNull();
  });
});
