"use client";

/**
 * Canvas status panel: shows whether Canvas is connected and via which source
 * (API token or calendar feed). There is deliberately NO secret input — the
 * token / ICS URL are configured via environment variables (`.env.local`), so
 * the credential never touches the browser. See `docs/canvas-setup.md`.
 *
 * Client component — never imports any Canvas fetching code; it only reads the
 * `/api/canvas/status` boolean payload.
 */
import { useEffect, useState } from "react";
import type { CanvasStatus } from "@/lib/canvas/types";

const MODE_LABEL: Record<CanvasStatus["mode"], string> = {
  token: "Connected via API token",
  ics: "Connected via calendar feed",
  none: "Not connected",
};

export function CanvasConnect() {
  const [status, setStatus] = useState<CanvasStatus | null>(null);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const res = await fetch("/api/canvas/status");
        const data = res.ok ? ((await res.json()) as CanvasStatus) : null;
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
    <section aria-label="Canvas" className="flex flex-col gap-3">
      <div>
        <h3 className="text-sm font-semibold text-ink">Canvas</h3>
        <p className="text-xs text-ink-soft">
          Your assignments and due dates feed the School list. Configure a Canvas
          API token (or calendar-feed URL) in <code>.env.local</code> — see
          docs/canvas-setup.md.
        </p>
      </div>

      <div className="flex items-center justify-between gap-3 rounded-lg border border-hairline bg-panel px-3 py-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-ink">Assignments</p>
          <p className="text-xs text-ink-soft">Read-only</p>
        </div>
        <span
          data-testid="canvas-status"
          className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
            connected
              ? "bg-personal-soft text-personal"
              : "bg-surface text-ink-soft"
          }`}
        >
          {MODE_LABEL[status?.mode ?? "none"]}
        </span>
      </div>
    </section>
  );
}
