"use client";

/**
 * Granola status panel: shows whether Granola is connected via its personal API
 * key. There is no in-app connect button — the key (`grn_…`, from Granola →
 * Settings → Connectors → API keys) is configured via `.env.local`, so the
 * credential never touches the browser. See `docs/granola-setup.md`.
 *
 * Client component — only reads the `/api/granola/status` boolean payload.
 */
import { useEffect, useState } from "react";
import type { GranolaStatus } from "@/lib/granola/types";

export function GranolaConnect() {
  const [status, setStatus] = useState<GranolaStatus | null>(null);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const res = await fetch("/api/granola/status");
        const data = res.ok ? ((await res.json()) as GranolaStatus) : null;
        if (active && data) setStatus(data);
      } catch {
        /* leave prior status */
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const connected = status?.connected ?? false;

  return (
    <section aria-label="Granola" className="flex flex-col gap-3">
      <div>
        <h3 className="text-sm font-semibold text-ink">Granola</h3>
        <p className="text-xs text-ink-soft">
          Your meeting transcripts feed the Work list — the AI reads them and
          generates your action items. Add a Granola API key to{" "}
          <code>.env.local</code> — see docs/granola-setup.md.
        </p>
      </div>

      <div className="flex items-center justify-between gap-3 rounded-lg border border-hairline bg-panel px-3 py-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-ink">Meetings</p>
          <p className="text-xs text-ink-soft">Read-only</p>
        </div>
        <span
          data-testid="granola-status"
          className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
            connected ? "bg-personal-soft text-personal" : "bg-surface text-ink-soft"
          }`}
        >
          {connected ? "Connected via API key" : "Not connected"}
        </span>
      </div>
    </section>
  );
}
