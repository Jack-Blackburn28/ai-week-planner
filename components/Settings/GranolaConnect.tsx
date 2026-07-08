"use client";

/**
 * Granola status panel: connect once (OAuth) or disconnect. After connecting, the
 * app auto-refreshes the access token forever — Jack never touches it again. The
 * app's AI reads meeting transcripts and generates the Work action items.
 *
 * Client component — never imports any Granola SDK/network code. Connecting is a
 * full navigation to `/api/granola/connect`, which server-redirects to Granola.
 */
import { useCallback, useEffect, useState } from "react";
import type { GranolaStatus } from "@/lib/granola/types";

export function GranolaConnect() {
  const [status, setStatus] = useState<GranolaStatus | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/granola/status");
      if (res.ok) setStatus((await res.json()) as GranolaStatus);
    } catch {
      /* leave prior status */
    }
  }, []);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const res = await fetch("/api/granola/status");
        const data = res.ok ? ((await res.json()) as GranolaStatus) : null;
        if (active && data) setStatus(data);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const connected = status?.connected ?? false;

  const disconnect = async () => {
    await fetch("/api/granola/disconnect", { method: "POST" });
    void refresh();
  };

  return (
    <section aria-label="Granola" className="flex flex-col gap-3">
      <div>
        <h3 className="text-sm font-semibold text-ink">Granola</h3>
        <p className="text-xs text-ink-soft">
          Connect once — the app reads your meeting transcripts and its AI generates
          your Work action items. Auto-refreshes, so you never reconnect.
        </p>
      </div>

      <div className="flex items-center justify-between gap-3 rounded-lg border border-hairline bg-panel px-3 py-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-ink">Meetings</p>
          <p className="text-xs text-ink-soft">Read-only</p>
        </div>
        {connected ? (
          <div className="flex items-center gap-2">
            <span
              data-testid="granola-status"
              className="rounded-full bg-personal-soft px-2 py-0.5 text-[11px] font-medium text-personal"
            >
              Connected
            </span>
            <button
              type="button"
              onClick={disconnect}
              className="rounded-md border border-hairline px-2 py-1 text-xs text-ink-soft hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-work-ring"
            >
              Disconnect
            </button>
          </div>
        ) : (
          <a
            data-testid="granola-connect"
            href="/api/granola/connect"
            className="rounded-md bg-work px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-work-ring"
          >
            Connect
          </a>
        )}
      </div>
    </section>
  );
}
