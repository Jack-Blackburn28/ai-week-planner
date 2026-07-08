/**
 * Week computation: which 7 dates make up the displayed week (Mon–Sun),
 * relative to a reference date and an optional week offset. Pure + tested.
 */
import { addDays } from "@/lib/date";

/** The Monday (00:00) of the week containing `d`. */
export function startOfWeekMonday(d: Date): Date {
  const dow = d.getDay(); // 0 = Sun … 6 = Sat
  const backToMonday = dow === 0 ? -6 : 1 - dow;
  const monday = addDays(d, backToMonday);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

/**
 * The 7 dates (Mon→Sun) of the week `weekOffset` weeks away from the week
 * containing `reference`. `weekOffset` 0 = this week, 1 = next, -1 = last.
 */
export function weekDates(reference: Date, weekOffset = 0): Date[] {
  const monday = addDays(startOfWeekMonday(reference), weekOffset * 7);
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
}

/**
 * Which column (0 = Mon … 6 = Sun) a real date falls on within the week
 * `weekOffset` weeks from `reference`, or -1 if it's outside that week.
 */
export function dayIndexForDate(
  date: Date,
  reference: Date,
  weekOffset = 0,
): number {
  return weekDates(reference, weekOffset).findIndex((d) => isSameDay(d, date));
}

/** True if two dates fall on the same calendar day. */
export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/** A short range label for a week, e.g. "Jul 6 – 12". */
export function formatWeekRange(dates: Date[]): string {
  const first = dates[0];
  const last = dates[dates.length - 1];
  const firstLabel = first.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
  const sameMonth = first.getMonth() === last.getMonth();
  const lastLabel = last.toLocaleDateString("en-US", {
    month: sameMonth ? undefined : "short",
    day: "numeric",
  });
  return `${firstLabel} – ${lastLabel}`;
}
