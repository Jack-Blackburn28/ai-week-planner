/**
 * Google-integration domain types. Framework-free and free of the `googleapis`
 * SDK so they can be imported anywhere (the SDK itself stays server-only in
 * `auth.ts` / `client.ts`).
 */

/** The two accounts the app connects. */
export type GoogleAccount = "work" | "personal";

/**
 * OAuth scopes per account (least privilege):
 * - work is READ-ONLY (Liatrio calendar, never written to).
 * - personal is full `calendar` because creating the "AI Calendar" needs it.
 */
export const GOOGLE_SCOPES: Record<GoogleAccount, string[]> = {
  work: ["https://www.googleapis.com/auth/calendar.readonly"],
  personal: ["https://www.googleapis.com/auth/calendar"],
};

/** What we persist per account. Only the refresh token is long-lived. */
export interface StoredToken {
  refresh_token: string;
  scope?: string;
  /** ISO timestamp of when it was obtained (for debugging only). */
  obtained_at?: string;
}

/** Connection status surfaced to the UI — booleans only, never token values. */
export interface ConnectionStatus {
  work: boolean;
  personal: boolean;
}

/** Is `value` one of the known accounts? Guards untrusted route params. */
export function isGoogleAccount(value: string): value is GoogleAccount {
  return value === "work" || value === "personal";
}
