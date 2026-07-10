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
 * Minimal subset of a Redis-style client we depend on. Real implementation wraps
 * node-redis (`redis`) over the `REDIS_URL` connection string that Vercel's Redis
 * add-on injects; tests inject an in-memory fake with the same shape.
 */
export interface KvClient {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<unknown>;
  del(key: string): Promise<unknown>;
}

/** The Redis connection string, injected by the Vercel Redis add-on. */
function redisUrl(): string | undefined {
  return process.env.REDIS_URL ?? process.env.KV_URL;
}

/** True when a hosted Redis connection string is configured (i.e. on Vercel). */
export function kvConfigured(): boolean {
  return Boolean(redisUrl());
}

/** True when running as a deployed Vercel function (any environment). */
function isVercelRuntime(): boolean {
  return Boolean(process.env.VERCEL);
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

/**
 * KV backend: the same blob stored under `kvKey` in a hosted key-value store.
 * `write` reads the key back immediately after `set` and throws if it doesn't
 * match — a network hiccup or misconfiguration must never look like a
 * successful save to the caller.
 */
export function createKvBlobStore(kvKey: string, client: KvClient): BlobStore {
  return {
    async read() {
      const value = await client.get(kvKey);
      return value == null ? null : String(value);
    },
    async write(value) {
      await client.set(kvKey, value);
      const confirmed = await client.get(kvKey);
      if (confirmed !== value) {
        throw new Error(
          `Write to KV key "${kvKey}" did not verify on read-back — refusing to report success.`,
        );
      }
    },
    async remove() {
      await client.del(kvKey);
    },
  };
}

let cachedKvClient: Promise<KvClient> | null = null;

/**
 * Lazily build and connect the node-redis client from `REDIS_URL`. The connected
 * client is cached across warm serverless invocations; on connect failure the cache
 * is cleared so the next call retries. We read/write raw JSON strings, so no
 * serialization is done by the client.
 */
function realKvClient(): Promise<KvClient> {
  if (cachedKvClient) return cachedKvClient;
  const p = (async () => {
    const { createClient } = await import("redis");
    const client = createClient({ url: redisUrl() });
    client.on("error", (err) => console.error("[redis] client error:", err));
    await client.connect();
    return {
      async get(key) {
        const v = await client.get(key);
        return v == null ? null : String(v);
      },
      async set(key, value) {
        await client.set(key, value);
      },
      async del(key) {
        await client.del(key);
      },
    } satisfies KvClient;
  })();
  cachedKvClient = p;
  // If connecting fails, don't wedge the cache on a rejected promise.
  p.catch(() => {
    if (cachedKvClient === p) cachedKvClient = null;
  });
  return p;
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
    if (isVercelRuntime()) {
      throw new Error(
        "REDIS_URL/KV_URL not configured — refusing to use non-durable local " +
          "file storage on Vercel. Add a Redis/KV store in the Vercel dashboard " +
          "and redeploy (env var changes don't apply to already-running deployments).",
      );
    }
    return createFileBlobStore(opts.filePath, { mode: opts.mode });
  }
  // Defer client construction to first use via a thin async-resolving wrapper.
  const lazyClient: KvClient = {
    async get(key) {
      return (await realKvClient()).get(key);
    },
    async set(key, value) {
      return (await realKvClient()).set(key, value);
    },
    async del(key) {
      return (await realKvClient()).del(key);
    },
  };
  return createKvBlobStore(opts.kvKey, lazyClient);
}
