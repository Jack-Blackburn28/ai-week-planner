/**
 * Encrypted, file-backed refresh-token store. No database yet (Story 3) — tokens
 * live in a gitignored file, encrypted at rest with AES-256-GCM using a key
 * derived from `TOKEN_ENC_SECRET`. This maps cleanly onto a mounted secret/volume
 * when the app is deployed (Story 6).
 *
 * SERVER-ONLY: uses Node `crypto`/`fs`. Never import from a client component.
 *
 * `createTokenStore` is a factory so tests can point at a temp file with a test
 * secret; `tokenStore` is the default singleton the app/routes use (it resolves
 * its path and secret lazily from the environment on each call).
 */
import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  scryptSync,
} from "crypto";
import { existsSync, readFileSync, rmSync, writeFileSync } from "fs";
import { resolve } from "path";
import type { ConnectionStatus, GoogleAccount, StoredToken } from "./types";

const DEFAULT_FILE = ".tokens.json";
/** Fixed salt: the secret is the real key material; this only diversifies scrypt. */
const SCRYPT_SALT = "ai-week-planner.tokens.v1";

/** On-disk shape: account → encrypted blob ("ivB64:tagB64:cipherB64"). */
type TokenFile = Partial<Record<GoogleAccount, string>>;

export interface TokenStore {
  saveToken(account: GoogleAccount, token: StoredToken): void;
  getToken(account: GoogleAccount): StoredToken | null;
  status(): ConnectionStatus;
  disconnect(account: GoogleAccount): void;
}

export function createTokenStore(
  opts: { filePath?: string; secret?: string } = {},
): TokenStore {
  const resolvePath = () =>
    opts.filePath ??
    process.env.GOOGLE_TOKEN_FILE ??
    resolve(process.cwd(), DEFAULT_FILE);

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

  const read = (): TokenFile => {
    const path = resolvePath();
    if (!existsSync(path)) return {};
    try {
      return JSON.parse(readFileSync(path, "utf8")) as TokenFile;
    } catch {
      // Corrupt/unreadable file → treat as no connections rather than crash.
      return {};
    }
  };

  const write = (data: TokenFile): void => {
    writeFileSync(resolvePath(), JSON.stringify(data, null, 2), {
      mode: 0o600,
    });
  };

  return {
    saveToken(account, token) {
      const data = read();
      data[account] = encrypt(JSON.stringify(token));
      write(data);
    },

    getToken(account) {
      const blob = read()[account];
      if (!blob) return null;
      try {
        return JSON.parse(decrypt(blob)) as StoredToken;
      } catch {
        return null;
      }
    },

    status() {
      const data = read();
      return { work: Boolean(data.work), personal: Boolean(data.personal) };
    },

    disconnect(account) {
      const data = read();
      if (!(account in data)) return;
      delete data[account];
      if (Object.keys(data).length === 0) {
        const path = resolvePath();
        if (existsSync(path)) rmSync(path);
      } else {
        write(data);
      }
    },
  };
}

/** Default store used by the app/API routes. */
export const tokenStore = createTokenStore();
