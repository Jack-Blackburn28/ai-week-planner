/**
 * Small, pure date helpers for todo due dates. Kept framework-free and tested.
 * All functions treat dates at day granularity (local time), which is what a
 * planner cares about ("is this due today / soon / overdue").
 */

/** Format a Date as an ISO calendar date (YYYY-MM-DD), local time. */
export function isoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Return a new Date `n` days after `base` (n may be negative). */
export function addDays(base: Date, n: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + n);
  return d;
}

/** Whole-day difference between an ISO due date and `today` (due - today). */
export function daysUntil(dueISO: string, today: Date): number {
  const due = new Date(`${dueISO}T00:00:00`);
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const MS_PER_DAY = 24 * 60 * 60 * 1000;
  return Math.round((due.getTime() - start.getTime()) / MS_PER_DAY);
}

/** How a due date should be emphasized in the UI. */
export type DueStatus = "overdue" | "soon" | "normal";

/**
 * Classify a due date relative to `today`:
 *   overdue  -> due before today
 *   soon     -> due today or within the next 2 days
 *   normal   -> further out
 */
export function classifyDue(dueISO: string, today: Date): DueStatus {
  const diff = daysUntil(dueISO, today);
  if (diff < 0) return "overdue";
  if (diff <= 2) return "soon";
  return "normal";
}

/** Short, friendly label for a due date, e.g. "Today", "Tomorrow", "Mon Jul 14". */
export function formatDueLabel(dueISO: string, today: Date): string {
  const diff = daysUntil(dueISO, today);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff === -1) return "Yesterday";
  const due = new Date(`${dueISO}T00:00:00`);
  const label = due.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  return diff < 0 ? `${label} (overdue)` : label;
}
