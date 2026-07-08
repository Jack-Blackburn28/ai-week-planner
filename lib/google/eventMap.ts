/**
 * Transform raw Google events into the app's calendar model. Framework-free and
 * pure (no SDK, no `fetch`) so it is easy to unit-test.
 *
 * - Timed events → `CalendarBlock`s placed by their real date/time within the
 *   displayed week, tagged work/personal and (for busy sources) `immovable`.
 * - All-day events → a separate list rendered in the thin top strip; NEVER busy.
 * - Events whose `source` was recorded by the app (AI-written) keep that source.
 */
import type { BlockSource, CalendarBlock } from "@/lib/types";
import { isSameDay, weekDates } from "@/lib/week";
import type { RawEvent } from "./client";

/** How a calendar's events should be tagged. */
export interface CalendarMeta {
  source: BlockSource;
  /** Busy (real) events are immovable; AI-Calendar events are not. */
  immovable: boolean;
}

export interface AllDayEvent {
  id: string;
  title: string;
  /** Column index 0..6 (Mon..Sun). */
  day: number;
  source: BlockSource;
}

export interface MappedEvents {
  timed: CalendarBlock[];
  allDay: AllDayEvent[];
}

const DAY_END = 24 * 60;

function minutesOfDay(d: Date): number {
  return d.getHours() * 60 + d.getMinutes();
}

/**
 * Map raw events for the week `weekOffset` weeks from `reference`.
 * `metaByCalendar` says how to tag each calendar's events; unknown calendars
 * default to a busy personal source.
 */
export function mapEvents(
  events: RawEvent[],
  metaByCalendar: Record<string, CalendarMeta>,
  reference: Date,
  weekOffset = 0,
): MappedEvents {
  const dates = weekDates(reference, weekOffset);
  const dayIndex = (d: Date) => dates.findIndex((x) => isSameDay(x, d));

  const timed: CalendarBlock[] = [];
  const allDay: AllDayEvent[] = [];

  for (const e of events) {
    const meta = metaByCalendar[e.calendarId] ?? {
      source: "personal",
      immovable: true,
    };
    const source =
      (e.extendedProperties?.private?.source as BlockSource | undefined) ??
      meta.source;

    // All-day events carry `date` (no `dateTime`).
    if (e.start.date && !e.start.dateTime) {
      const day = dayIndex(new Date(`${e.start.date}T00:00:00`));
      if (day >= 0) allDay.push({ id: e.id, title: e.summary, day, source });
      continue;
    }

    if (!e.start.dateTime || !e.end.dateTime) continue;
    const start = new Date(e.start.dateTime);
    const end = new Date(e.end.dateTime);
    const day = dayIndex(start);
    if (day < 0) continue;

    const startMinutes = minutesOfDay(start);
    // Clamp multi-day / malformed spans to end-of-day so they stay on one column.
    const endMinutes =
      isSameDay(start, end) && minutesOfDay(end) > startMinutes
        ? minutesOfDay(end)
        : DAY_END;

    timed.push({
      id: `g-${e.id}`,
      title: e.summary,
      source,
      status: "approved",
      day,
      startMinutes,
      endMinutes,
      immovable: meta.immovable,
      googleEventId: e.id,
      calendarId: e.calendarId,
    });
  }

  return { timed, allDay };
}
