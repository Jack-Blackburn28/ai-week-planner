/**
 * Configurable working hours: a recurring weekly rule Jack sets once (via
 * chat) and the app expands into a real immovable block every week.
 *
 * Day indexing matches the rest of the app (0 = Monday … 6 = Sunday, per
 * `CalendarBlock.day`/`DAY_LABELS`) — NOT `Date.getDay()`'s 0 = Sunday.
 */

/** A day's working hours, in minutes since midnight (Pacific local time). */
export interface DayHours {
  startMinutes: number;
  endMinutes: number;
}

/** 0 = Monday … 6 = Sunday. */
export type WeekDay = 0 | 1 | 2 | 3 | 4 | 5 | 6;

/** A day absent from `days` means no configured work hours that day. */
export interface WorkHoursRule {
  days: Partial<Record<WeekDay, DayHours>>;
}
