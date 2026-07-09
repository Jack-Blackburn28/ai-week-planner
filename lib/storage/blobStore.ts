/**
 * Persistence abstraction so the app runs identically on a laptop and on Vercel.
 *
 * Each store (Google tokens, calendar mapping, Granola items, todo completions)
 * keeps a single JSON *blob*. Locally that blob is a gitignored file; on Vercel —
 * whose filesystem is read-only except an ephemeral `/tmp` — it lives in a hosted
 * key-value store instead. A `BlobStore` hides that difference behind three async
 * methods; the calling store still owns (de)serialization of its own shape.
 *
 * Backend selection is by environment: if the KV connection vars are present we use
 * the KV backend, otherwise the file backend. Tests pass an explicit `filePath` and
 * run without KV vars, so they exercise the file backend exactly as before.
 *
 * SERVER-ONLY: uses Node `fs` and a network KV client. Never import from a client
 * component.
 */
import { existsSync, readFileSync, rmSync, writeFileSync } from "fs";

/** One JSON blob, read/written/removed as a whole. `read` returns null when absent. */
export interface BlobStore {
  read(): Promise<string | null>;
  write(value: string): Promise<void>;
  remove(): Promise<void>;
}

/**
 * Minimal subset of a Redis-style client we depend on. Real implementation is
 * `@upstash/redis`; tests inject an in-memory fake with the same shape.
 */
export interface KvClient {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<unknown>;
  del(key: string): Promise<unknown>;
}

/**
 * True when hosted-KV connection vars are configured. Supports both Vercel's
 * Marketplace KV names (`KV_REST_API_*`) and native Upstash names
 * (`UPSTASH_REDIS_REST_*`) so it works however the add-on is provisioned.
 */
export function kvConfigured(): boolean {
  const url = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
  const token =
    process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;
  return Boolean(url && token);
}

/** File backend: the current behavior — a single JSON file at `filePath`. */
export function createFileBlobStore(
  filePath: string,
  opts: { mode?: number } = {},
): BlobStore {
  return {
    async read() {
      if (!existsSync(filePath)) return null;
      try {
        return readFileSync(filePath, "utf8");
      } catch {
        return null;
      }
    },
    async write(value) {
      writeFileSync(filePath, value, opts.mode ? { mode: opts.mode } : {});
    },
    async remove() {
      if (existsSync(filePath)) rmSync(filePath);
    },
  };
}

/** KV backend: the same blob stored under `kvKey` in a hosted key-value store. */
export function createKvBlobStore(kvKey: string, client: KvClient): BlobStore {
  return {
    async read() {
      const value = await client.get(kvKey);
      return value == null ? null : String(value);
    },
    async write(value) {
      await client.set(kvKey, value);
    },
    async remove() {
      await client.del(kvKey);
    },
  };
}

let cachedKvClient: KvClient | null = null;

/** Lazily build the real Upstash Redis client from whichever env vars are set. */
async function realKvClient(): Promise<KvClient> {
  if (cachedKvClient) return cachedKvClient;
  const url = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
  const token =
    process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;
  const { Redis } = await import("@upstash/redis");
  // automaticDeserialization off: we store/read raw JSON strings ourselves, so the
  // client must not try to JSON.parse values on read.
  cachedKvClient = new Redis({
    url,
    token,
    automaticDeserialization: false,
  }) as unknown as KvClient;
  return cachedKvClient;
}

/**
 * Return the right backend for the current environment. `filePath` is used by the
 * file backend; `kvKey` names the blob in the KV backend. When KV is configured the
 * KV backend is returned (its client is built lazily on first use so nothing
 * connects until a real read/write happens).
 */
export function getBlobStore(opts: {
  filePath: string;
  kvKey: string;
  mode?: number;
}): BlobStore {
  if (!kvConfigured()) {
    return createFileBlobStore(opts.filePath, { mode: opts.mode });
  }
  // Defer client construction to first use via a thin async-resolving wrapper.
  return {
    async read() {
      return (await realKvClient()).get(opts.kvKey).then((v) =>
        v == null ? null : String(v),
      );
    },
    async write(value) {
      await (await realKvClient()).set(opts.kvKey, value);
    },
    async remove() {
      await (await realKvClient()).del(opts.kvKey);
    },
  };
}
