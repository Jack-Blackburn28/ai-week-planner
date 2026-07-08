/**
 * In-memory fake Google Calendar client. Used by tests and by no-credential runs
 * so the whole app is exercisable without live Google access (mirrors the
 * no-API-key mock planner from Story 2).
 */
import type {
  CalendarSummary,
  GoogleCalendarClient,
  NewEvent,
  RawEvent,
} from "./client";
import type { GoogleAccount } from "./types";

export interface MockClient extends GoogleCalendarClient {
  /** How many times a NEW calendar was actually created (for idempotency tests). */
  createdCount(): number;
  /** Events inserted into a calendar (for write-back tests). */
  inserted(calendarId: string): NewEvent[];
}

interface Seed {
  calendars?: Partial<Record<GoogleAccount, CalendarSummary[]>>;
  events?: RawEvent[];
}

export function createMockClient(seed: Seed = {}): MockClient {
  const calendars: Record<GoogleAccount, CalendarSummary[]> = {
    work: seed.calendars?.work ?? [
      { id: "work-primary", name: "Liatrio", primary: true },
    ],
    personal: seed.calendars?.personal ?? [
      { id: "personal-primary", name: "Personal", primary: true },
    ],
  };
  const events = seed.events ?? [];
  const insertedByCal: Record<string, NewEvent[]> = {};
  let created = 0;

  return {
    async listCalendars(account) {
      return calendars[account];
    },

    async listEvents(_account, calendarId, timeMin, timeMax) {
      const min = new Date(timeMin).getTime();
      const max = new Date(timeMax).getTime();
      return events.filter((e) => {
        if (e.calendarId !== calendarId) return false;
        const startISO = e.start.dateTime ?? e.start.date;
        if (!startISO) return false;
        const t = new Date(startISO).getTime();
        return t >= min && t < max;
      });
    },

    async insertEvent(calendarId, event) {
      (insertedByCal[calendarId] ??= []).push(event);
      const n = Object.values(insertedByCal).flat().length;
      return { id: `mock-evt-${n}` };
    },

    async ensureCalendar(name) {
      const found = calendars.personal.find((c) => c.name === name);
      if (found) return found.id;
      created += 1;
      const id = `mock-cal-${name.toLowerCase().replace(/\s+/g, "-")}`;
      calendars.personal.push({ id, name });
      return id;
    },

    createdCount() {
      return created;
    },
    inserted(calendarId) {
      return insertedByCal[calendarId] ?? [];
    },
  };
}
