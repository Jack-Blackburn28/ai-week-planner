/**
 * Shared-password session helpers for the app's single-password gate.
 *
 * This app has one user (Jack) and one shared password (`APP_PASSWORD`). A correct
 * password mints a signed session value stored in an HTTP-only cookie; middleware
 * verifies that value on every request. Everything here is built on the Web Crypto
 * API (`crypto.subtle`) — NOT Node's `crypto` — so it runs in BOTH the Edge runtime
 * (middleware) and the Node runtime (the login route). Never import `node:crypto`
 * here or the Edge middleware bundle will fail to build.
 *
 * Security note: this is a deliberately simple gate for a single-user personal app,
 * not a multi-tenant auth system (see spec Non-Goals).
 */

/** Cookie name holding the signed session value. */
export const SESSION_COOKIE = "awp_session";
/** Signed payload marker; the version prefix allows future rotation. */
const SESSION_MARKER = "awp-authenticated-v1";
const VERSION = "v1";

function sessionSecret(): string {
  return process.env.SESSION_SECRET ?? "";
}

/** HMAC-SHA256(secret, message) as lowercase hex, via Web Crypto. */
async function hmacHex(secret: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return [...new Uint8Array(sig)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Constant-time compare of two equal-length strings (fixed-length hex digests). */
function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

/**
 * True if `submitted` matches `APP_PASSWORD`. Compares HMACs (keyed by the session
 * secret) so the check is constant-time and does not leak length. Fails closed when
 * either secret is unconfigured.
 */
export async function checkPassword(submitted: string): Promise<boolean> {
  const actual = process.env.APP_PASSWORD ?? "";
  const secret = sessionSecret();
  if (!actual || !secret) return false;
  const a = await hmacHex(secret, submitted);
  const b = await hmacHex(secret, actual);
  return constantTimeEqual(a, b);
}

/** Mint the signed session value to store in the cookie after a correct password. */
export async function createSessionValue(): Promise<string> {
  return `${VERSION}.${await hmacHex(sessionSecret(), SESSION_MARKER)}`;
}

/** Verify a cookie value was minted by this server with the current secret. */
export async function verifySessionValue(
  value: string | undefined | null,
): Promise<boolean> {
  const secret = sessionSecret();
  if (!value || !secret) return false;
  const [version, sig] = value.split(".");
  if (version !== VERSION || !sig) return false;
  const expected = await hmacHex(secret, SESSION_MARKER);
  return constantTimeEqual(sig, expected);
}
