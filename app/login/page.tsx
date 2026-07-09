"use client";

/**
 * The password gate's UI. Posts the shared password to /api/auth/login; on success
 * the server sets the session cookie and we navigate to the originally-requested
 * page (`?next=`), guarded against open redirects. On failure we show an inline
 * error and clear the field. Styled with the app's tokens and usable on a phone.
 */
import { useState, type FormEvent } from "react";

function safeNext(): string {
  if (typeof window === "undefined") return "/";
  const next = new URLSearchParams(window.location.search).get("next");
  // Only allow same-origin absolute paths (block protocol-relative //evil.com).
  if (next && next.startsWith("/") && !next.startsWith("//")) return next;
  return "/";
}

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(false);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        window.location.href = safeNext();
        return;
      }
    } catch {
      // fall through to error state
    }
    setError(true);
    setLoading(false);
    setPassword("");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-surface px-4">
      <div className="w-full max-w-sm rounded-2xl bg-panel p-8 shadow-sm ring-1 ring-hairline">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-work-soft text-work">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <rect x="3" y="11" width="18" height="11" rx="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
          <h1 className="text-lg font-semibold text-ink">AI Week Planner</h1>
          <p className="mt-1 text-sm text-ink-soft">
            Enter the password to continue.
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-3">
          <label htmlFor="password" className="sr-only">
            Password
          </label>
          <input
            id="password"
            type="password"
            autoFocus
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-invalid={error}
            placeholder="Password"
            className="w-full rounded-xl border border-hairline bg-white px-4 py-3 text-base text-ink outline-none focus:border-work focus:ring-2 focus:ring-work-ring"
          />
          {error && (
            <p role="alert" className="text-sm text-danger">
              Incorrect password. Please try again.
            </p>
          )}
          <button
            type="submit"
            disabled={loading || password.length === 0}
            className="w-full rounded-xl bg-work px-4 py-3 text-base font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Unlocking…" : "Unlock"}
          </button>
        </form>
        {/* DEPLOY-CHECK: temporary visible marker for the Story 6 end-to-end proof.
            Removed by the follow-up revert commit. */}
        <p className="mt-4 text-center text-xs text-ink-soft">
          deploy check · story-6-e2e ✓
        </p>
      </div>
    </main>
  );
}
