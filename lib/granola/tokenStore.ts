/**
 * Encrypted, file-backed Granola refresh-token store. Single-slot (one account),
 * AES-256-GCM at rest with a key derived from `TOKEN_ENC_SECRET`, in a gitignored
 * file. SERVER-ONLY (Node `crypto`/`fs`). Mirrors `lib/google/tokenStore.ts`.
 *
 * `createGranolaTokenStore` is a factory so tests can point at a temp file with a
 * test secret; `granolaTokenStore` is the default singleton the routes use.
 */
import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  scryptSync,
} from "crypto";
import { existsSync, readFileSync, rmSync, writeFileSync } from "fs";
import { resolve } from "path";
import type { GranolaStatus, StoredGranolaToken } from "./types";

const DEFAULT_FILE = ".granola-tokens.json";
const SCRYPT_SALT = "ai-week-planner.granola.v1";

/** On-disk shape: a single encrypted blob ("ivB64:tagB64:cipherB64"). */
interface TokenFile {
  granola?: string;
}

export interface GranolaTokenStore {
  save(token: StoredGranolaToken): void;
  get(): StoredGranolaToken | null;
  status(): GranolaStatus;
  disconnect(): void;
}

export function createGranolaTokenStore(
  opts: { filePath?: string; secret?: string } = {},
): GranolaTokenStore {
  const resolvePath = () =>
    opts.filePath ??
    process.env.GRANOLA_TOKEN_FILE ??
    resolve(process.cwd(), DEFAULT_FILE);

  const resolveKey = () => {
    const secret = opts.secret ?? process.env.TOKEN_ENC_SECRET ?? "";
    if (!secret) {
      throw new Error(
        "TOKEN_ENC_SECRET is not set — cannot encrypt/decrypt the Granola token.",
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
      return {};
    }
  };

  return {
    save(token) {
      writeFileSync(
        resolvePath(),
        JSON.stringify({ granola: encrypt(JSON.stringify(token)) }, null, 2),
        { mode: 0o600 },
      );
    },

    get() {
      const blob = read().granola;
      if (!blob) return null;
      try {
        return JSON.parse(decrypt(blob)) as StoredGranolaToken;
      } catch {
        return null;
      }
    },

    status() {
      return { connected: Boolean(read().granola) };
    },

    disconnect() {
      const path = resolvePath();
      if (existsSync(path)) rmSync(path);
    },
  };
}

/** Default store used by the app/API routes. */
export const granolaTokenStore = createGranolaTokenStore();
