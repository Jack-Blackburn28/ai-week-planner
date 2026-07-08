"use client";

/**
 * Google accounts panel: connect / disconnect the Work (read-only) and Personal
 * (read + write) Google calendars. Calendar mapping UI is added in Task 2.0.
 *
 * This is a client component — it never imports the Google SDK. Connecting is a
 * full navigation to `/api/google/connect/[account]`, which server-redirects to
 * Google's consent screen.
 */
import { useCallback, useEffect, useState } from "react";
import type { ConnectionStatus, GoogleAccount } from "@/lib/google/types";

const ACCOUNTS: { key: GoogleAccount; label: string; access: string }[] = [
  { key: "work", label: "Work (Liatrio)", access: "Read-only" },
  { key: "personal", label: "Personal", access: "Read + write" },
];

export function GoogleConnect() {
  const [status, setStatus] = useState<ConnectionStatus | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/google/status");
      if (res.ok) setStatus((await res.json()) as ConnectionStatus);
    } catch {
      /* leave prior status; the UI degrades to "unknown" */
    }
  }, []);

  // Load status on mount. setState happens only after the fetch resolves
  // (asynchronously), and is guarded so an unmount can't set state late.
  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const res = await fetch("/api/google/status");
        const data = res.ok ? ((await res.json()) as ConnectionStatus) : null;
        if (active && data) setStatus(data);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const disconnect = async (account: GoogleAccount) => {
    await fetch(`/api/google/disconnect/${account}`, { method: "POST" });
    void refresh();
  };

  return (
    <section aria-label="Google accounts" className="flex flex-col gap-3">
      <div>
        <h3 className="text-sm font-semibold text-ink">Google accounts</h3>
        <p className="text-xs text-ink-soft">
          Connect your calendars so the planner can read your events and write
          approved plans to your personal “AI Calendar.”
        </p>
      </div>

      <ul className="flex flex-col gap-2">
        {ACCOUNTS.map(({ key, label, access }) => {
          const connected = status?.[key] ?? false;
          return (
            <li
              key={key}
              className="flex items-center justify-between gap-3 rounded-lg border border-hairline bg-panel px-3 py-2"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-ink">{label}</p>
                <p className="text-xs text-ink-soft">{access}</p>
              </div>
              {connected ? (
                <div className="flex items-center gap-2">
                  <span
                    data-testid={`status-${key}`}
                    className="rounded-full bg-personal-soft px-2 py-0.5 text-[11px] font-medium text-personal"
                  >
                    Connected
                  </span>
                  <button
                    type="button"
                    onClick={() => disconnect(key)}
                    className="rounded-md border border-hairline px-2 py-1 text-xs text-ink-soft hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-work-ring"
                  >
                    Disconnect
                  </button>
                </div>
              ) : (
                <a
                  data-testid={`connect-${key}`}
                  href={`/api/google/connect/${key}`}
                  className="rounded-md bg-work px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-work-ring"
                >
                  Connect
                </a>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
