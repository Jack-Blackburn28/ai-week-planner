/**
 * Pure grid math + time formatting for the calendar. Everything reads the
 * configured window so the calendar is window-agnostic (Story 3 can widen it).
 */
import { CALENDAR_END_HOUR, CALENDAR_START_HOUR } from "@/lib/config";

export interface GridWindow {
  startHour: number;
  endHour: number;
}

/** The default visible window, from config. */
export const defaultWindow: GridWindow = {
  startHour: CALENDAR_START_HOUR,
  endHour: CALENDAR_END_HOUR,
};

/** Pixel height of one hour row. */
export const HOUR_PX = 60;

/** Total pixel height of the grid for a given window. */
export function gridHeightPx(win: GridWindow = defaultWindow): number {
  return (win.endHour - win.startHour) * HOUR_PX;
}

/** Vertical offset (px from the top of the grid) for a minute-of-day. */
export function minutesToTopPx(
  minutes: number,
  win: GridWindow = defaultWindow,
): number {
  return ((minutes - win.startHour * 60) / 60) * HOUR_PX;
}

/** Pixel height for a start→end duration. */
export function durationToHeightPx(
  startMinutes: number,
  endMinutes: number,
): number {
  return ((endMinutes - startMinutes) / 60) * HOUR_PX;
}

/** The hour marks to label down the left gutter (inclusive of both ends). */
export function hourMarks(win: GridWindow = defaultWindow): number[] {
  const out: number[] = [];
  for (let h = win.startHour; h <= win.endHour; h++) out.push(h);
  return out;
}

/** Format a whole hour as a short label, e.g. 6 → "6 AM", 13 → "1 PM". */
export function formatHour(hour: number): string {
  const period = hour >= 12 && hour < 24 ? "PM" : "AM";
  let h = hour % 12;
  if (h === 0) h = 12;
  return `${h} ${period}`;
}

/** Format minutes-of-day as a clock time, e.g. 540 → "9:00 AM", 570 → "9:30 AM". */
export function formatClock(minutes: number): string {
  const h24 = Math.floor(minutes / 60);
  const m = minutes % 60;
  const period = h24 >= 12 && h24 < 24 ? "PM" : "AM";
  let h = h24 % 12;
  if (h === 0) h = 12;
  const mm = String(m).padStart(2, "0");
  return `${h}:${mm} ${period}`;
}

/** Format a block's time range, e.g. "9:00 AM – 10:30 AM". */
export function formatRange(startMinutes: number, endMinutes: number): string {
  return `${formatClock(startMinutes)} – ${formatClock(endMinutes)}`;
}
