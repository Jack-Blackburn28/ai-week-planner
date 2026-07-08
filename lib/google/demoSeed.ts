/**
 * Seed data for GOOGLE_MOCK demo mode: realistic work meetings + personal events
 * anchored to the CURRENT week, plus one all-day event. Lets the integration be
 * demoed and screenshotted without any live Google credentials.
 *
 * SERVER-ONLY (uses `new Date()` at request time). Only imported by `resolveClient`
 * when `GOOGLE_MOCK=1`.
 */
import { weekDates } from "@/lib/week";
import { isoDate } from "@/lib/date";
import type { CalendarSummary, RawEvent } from "./client";
import type { GoogleAccount } from "./types";

const WORK_CAL = "work-primary";
const PERSONAL_CAL = "personal-primary";

export const DEMO_CALENDARS: Record<GoogleAccount, CalendarSummary[]> = {
  work: [{ id: WORK_CAL, name: "Liatrio", primary: true }],
  personal: [{ id: PERSONAL_CAL, name: "Personal", primary: true }],
};

/** Build an RFC3339 timestamp for `date` at local h:m. */
function at(date: Date, h: number, m: number): string {
  const d = new Date(date);
  d.setHours(h, m, 0, 0);
  return d.toISOString();
}

function timed(
  id: string,
  summary: string,
  date: Date,
  startH: number,
  startM: number,
  endH: number,
  endM: number,
  calendarId: string,
): RawEvent {
  return {
    id,
    summary,
    start: { dateTime: at(date, startH, startM) },
    end: { dateTime: at(date, endH, endM) },
    calendarId,
  };
}

export function demoSeed() {
  // weekOffset 0..±1 so navigating a week still shows a couple of events.
  const events: RawEvent[] = [];
  for (const offset of [-1, 0, 1]) {
    const [mon, tue, wed, thu, fri, sat] = weekDates(new Date(), offset);
    const p = `o${offset}`;
    events.push(
      timed(`${p}-standup`, "Team standup", mon, 10, 0, 10, 30, WORK_CAL),
      timed(`${p}-design`, "Design review", tue, 13, 0, 14, 0, WORK_CAL),
      timed(`${p}-1on1`, "1:1 with manager", wed, 9, 30, 10, 0, WORK_CAL),
      timed(`${p}-client`, "Client call", thu, 15, 0, 16, 0, WORK_CAL),
      timed(`${p}-retro`, "Sprint retro", fri, 11, 0, 12, 0, WORK_CAL),
      timed(`${p}-dinner`, "Dinner with friends", tue, 19, 0, 20, 30, PERSONAL_CAL),
      timed(`${p}-golf`, "Tee time", sat, 9, 0, 11, 0, PERSONAL_CAL),
      {
        id: `${p}-bday`,
        summary: "Mom's birthday",
        start: { date: isoDate(wed) },
        end: { date: isoDate(wed) },
        calendarId: PERSONAL_CAL,
      },
    );
  }
  return { calendars: DEMO_CALENDARS, events };
}
