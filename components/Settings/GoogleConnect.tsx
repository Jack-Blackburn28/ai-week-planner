"use client";

/**
 * Google accounts panel: connect / disconnect the Work (read-only) and Personal
 * (read + write) Google calendars, then map each calendar to work / personal /
 * ignored. Approved plans are written to a dedicated "AI Calendar" the app
 * creates in the personal account.
 *
 * Client component — never imports the Google SDK. Connecting is a full
 * navigation to `/api/google/connect/[account]`, which server-redirects to
 * Google's consent screen.
 */
import { useCallback, useEffect, useState } from "react";
import type { ConnectionStatus, GoogleAccount } from "@/lib/google/types";

interface CalendarSummary {
  id: string;
  name: string;
  primary?: boolean;
}
type Bucket = "work" | "personal" | "ignored";

const ACCOUNTS: { key: GoogleAccount; label: string; access: string }[] = [
  { key: "work", label: "Work (Liatrio)", access: "Read-only" },
  { key: "personal", label: "Personal", access: "Read + write" },
];

export function GoogleConnect() {
  const [status, setStatus] = useState<ConnectionStatus | null>(null);
  const [calendars, setCalendars] = useState<
    Record<GoogleAccount, CalendarSummary[]>
  >({ work: [], personal: [] });
  const [assign, setAssign] = useState<Record<string, Bucket>>({});
  const [saved, setSaved] = useState(false);

  const refreshStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/google/status");
      if (res.ok) setStatus((await res.json()) as ConnectionStatus);
    } catch {
      /* leave prior status */
    }
  }, []);

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

  const anyConnected = Boolean(status && (status.work || status.personal));

  // Load calendars + saved mapping once an account is connected. setState runs
  // only after the fetches resolve (asynchronously), guarded against unmount.
  useEffect(() => {
    if (!anyConnected) return;
    let active = true;
    void (async () => {
      try {
        const [calRes, mapRes] = await Promise.all([
          fetch("/api/google/calendars"),
          fetch("/api/google/mapping"),
        ]);
        if (!calRes.ok) return;
        const cals = (await calRes.json()) as Record<
          GoogleAccount,
          CalendarSummary[]
        >;
        const mapping = mapRes.ok
          ? ((await mapRes.json()) as {
              work: string[];
              personal: string[];
              ignored: string[];
            })
          : { work: [], personal: [], ignored: [] };
        // Default each calendar to its own account bucket unless already mapped.
        const next: Record<string, Bucket> = {};
        for (const [account, list] of Object.entries(cals) as [
          GoogleAccount,
          CalendarSummary[],
        ][]) {
          if (!Array.isArray(list)) continue;
          for (const c of list) {
            next[c.id] = mapping.ignored.includes(c.id)
              ? "ignored"
              : mapping.work.includes(c.id)
                ? "work"
                : mapping.personal.includes(c.id)
                  ? "personal"
                  : account;
          }
        }
        if (active) {
          // Be defensive: only accept array-shaped calendar lists.
          setCalendars({
            work: Array.isArray(cals.work) ? cals.work : [],
            personal: Array.isArray(cals.personal) ? cals.personal : [],
          });
          setAssign(next);
        }
      } catch {
        /* ignore */
      }
    })();
    return () => {
      active = false;
    };
  }, [anyConnected]);

  const disconnect = async (account: GoogleAccount) => {
    await fetch(`/api/google/disconnect/${account}`, { method: "POST" });
    void refreshStatus();
  };

  const saveMapping = async () => {
    const mapping = { work: [] as string[], personal: [] as string[], ignored: [] as string[] };
    for (const [id, bucket] of Object.entries(assign)) mapping[bucket].push(id);
    const res = await fetch("/api/google/mapping", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(mapping),
    });
    if (res.ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    }
  };

  return (
    <section aria-label="Google accounts" className="flex flex-col gap-4">
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

      {anyConnected && (
        <div className="flex flex-col gap-3" data-testid="calendar-mapping">
          <div>
            <h4 className="text-sm font-semibold text-ink">Calendar mapping</h4>
            <p className="text-xs text-ink-soft">
              Choose which calendars feed each view. Approved plans always go to
              the “AI Calendar.”
            </p>
          </div>
          {(ACCOUNTS.filter((a) => status?.[a.key]) as typeof ACCOUNTS).map(
            ({ key, label }) => (
              <div key={key} className="flex flex-col gap-1.5">
                <p className="text-xs font-medium uppercase tracking-wide text-ink-soft">
                  {label}
                </p>
                {(calendars[key] ?? []).length === 0 && (
                  <p className="text-xs text-ink-soft">No calendars found.</p>
                )}
                {(calendars[key] ?? []).map((c) => (
                  <label
                    key={c.id}
                    className="flex items-center justify-between gap-2 rounded-md border border-hairline bg-panel px-2.5 py-1.5"
                  >
                    <span className="truncate text-sm text-ink">{c.name}</span>
                    <select
                      aria-label={`Map ${c.name}`}
                      value={assign[c.id] ?? "ignored"}
                      onChange={(e) =>
                        setAssign((prev) => ({
                          ...prev,
                          [c.id]: e.target.value as Bucket,
                        }))
                      }
                      className="rounded border border-hairline bg-surface px-1.5 py-1 text-xs text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-work-ring"
                    >
                      <option value="work">Work</option>
                      <option value="personal">Personal</option>
                      <option value="ignored">Ignore</option>
                    </select>
                  </label>
                ))}
              </div>
            ),
          )}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={saveMapping}
              className="rounded-md bg-work px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-work-ring"
            >
              Save mapping
            </button>
            {saved && (
              <span className="text-xs font-medium text-personal">Saved ✓</span>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
