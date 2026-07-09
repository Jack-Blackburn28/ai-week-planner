/**
 * Encrypted refresh-token store. Tokens are encrypted at rest with AES-256-GCM
 * using a key derived from `TOKEN_ENC_SECRET`, then persisted through a `BlobStore`
 * — a gitignored file locally, or a hosted KV store on Vercel (whose filesystem is
 * ephemeral). Encryption is identical regardless of backend.
 *
 * SERVER-ONLY: uses Node `crypto`/`fs`. Never import from a client component.
 *
 * `createTokenStore` is a factory so tests can point at a temp file with a test
 * secret; `tokenStore` is the default singleton the app/routes use (it resolves
 * its path/key and secret lazily from the environment on each call). All methods
 * are async because the KV backend is network-backed.
 */
import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  scryptSync,
} from "crypto";
import { resolve } from "path";
import { getBlobStore } from "@/lib/storage/blobStore";
import type { ConnectionStatus, GoogleAccount, StoredToken } from "./types";

const DEFAULT_FILE = ".tokens.json";
const KV_KEY = "awp:google-tokens";
/** Fixed salt: the secret is the real key material; this only diversifies scrypt. */
const SCRYPT_SALT = "ai-week-planner.tokens.v1";

/** Stored shape: account → encrypted blob ("ivB64:tagB64:cipherB64"). */
type TokenFile = Partial<Record<GoogleAccount, string>>;

export interface TokenStore {
  saveToken(account: GoogleAccount, token: StoredToken): Promise<void>;
  getToken(account: GoogleAccount): Promise<StoredToken | null>;
  status(): Promise<ConnectionStatus>;
  disconnect(account: GoogleAccount): Promise<void>;
}

export function createTokenStore(
  opts: { filePath?: string; secret?: string } = {},
): TokenStore {
  const blob = () =>
    getBlobStore({
      filePath:
        opts.filePath ??
        process.env.GOOGLE_TOKEN_FILE ??
        resolve(process.cwd(), DEFAULT_FILE),
      kvKey: KV_KEY,
      mode: 0o600,
    });

  const resolveKey = () => {
    const secret = opts.secret ?? process.env.TOKEN_ENC_SECRET ?? "";
    if (!secret) {
      throw new Error(
        "TOKEN_ENC_SECRET is not set — cannot encrypt/decrypt Google tokens.",
      );
    }
    return scryptSync(secret, SCRYPT_SALT, 32);
  };

  const encrypt = (plain: string): string => {
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", resolveKey(), iv);
    const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
    const tag = cipher.getAuthTag();
    return [
      iv.toString("base64"),
      tag.toString("base64"),
      enc.toString("base64"),
    ].join(":");
  };

  const decrypt = (blob: string): string => {
    const [ivB64, tagB64, dataB64] = blob.split(":");
    const decipher = createDecipheriv(
      "aes-256-gcm",
      resolveKey(),
      Buffer.from(ivB64, "base64"),
    );
    decipher.setAuthTag(Buffer.from(tagB64, "base64"));
    return Buffer.concat([
      decipher.update(Buffer.from(dataB64, "base64")),
      decipher.final(),
    ]).toString("utf8");
  };

  const read = async (): Promise<TokenFile> => {
    const raw = await blob().read();
    if (raw == null) return {};
    try {
      return JSON.parse(raw) as TokenFile;
    } catch {
      // Corrupt/unreadable blob → treat as no connections rather than crash.
      return {};
    }
  };

  const write = async (data: TokenFile): Promise<void> => {
    await blob().write(JSON.stringify(data, null, 2));
  };

  return {
    async saveToken(account, token) {
      const data = await read();
      data[account] = encrypt(JSON.stringify(token));
      await write(data);
    },

    async getToken(account) {
      const enc = (await read())[account];
      if (!enc) return null;
      try {
        return JSON.parse(decrypt(enc)) as StoredToken;
      } catch {
        return null;
      }
    },

    async status() {
      const data = await read();
      return { work: Boolean(data.work), personal: Boolean(data.personal) };
    },

    async disconnect(account) {
      const data = await read();
      if (!(account in data)) return;
      delete data[account];
      if (Object.keys(data).length === 0) {
        await blob().remove();
      } else {
        await write(data);
      }
    },
  };
}

/** Default store used by the app/API routes. */
export const tokenStore = createTokenStore();
