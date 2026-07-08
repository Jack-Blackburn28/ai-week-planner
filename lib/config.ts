/**
 * Single source of truth for the calendar's visible time window and week shape.
 *
 * IMPORTANT: nothing in the app should hard-code "6am"/"10pm". Read these values
 * instead, so Story 3 can auto-expand the window to fit out-of-range Google
 * Calendar events without a rewrite.
 */

/** First hour shown on the calendar grid (24h). Default 6 = 6:00 AM. */
export const CALENDAR_START_HOUR = 6;

/** Last hour shown on the calendar grid (24h). Default 22 = 10:00 PM. */
export const CALENDAR_END_HOUR = 22;

/** Number of day columns (Mon–Sun). */
export const DAYS_IN_WEEK = 7;

/**
 * Day-of-week the week starts on, using JS `Date.getDay()` numbering
 * (0 = Sunday, 1 = Monday). We start weeks on Monday.
 */
export const WEEK_STARTS_ON = 1;

/** Ordered column labels, matching day index 0..6 (Monday first). */
export const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

/** Total minutes in the visible window (used for grid sizing). */
export const WINDOW_MINUTES = (CALENDAR_END_HOUR - CALENDAR_START_HOUR) * 60;
