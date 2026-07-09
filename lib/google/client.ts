/**
 * Calendar API wrapper behind a small interface, so the app and tests share one
 * contract. The real implementation uses the `googleapis` SDK (SERVER-ONLY);
 * tests and no-credential runs use `client.mock.ts`.
 */
import { google } from "googleapis";
import { oauthClient } from "./auth";
import { tokenStore } from "./tokenStore";
import { createMockClient } from "./client.mock";
import { demoSeed } from "./demoSeed";
import type { GoogleAccount } from "./types";

/** A calendar in an account's calendar list. */
export interface CalendarSummary {
  id: string;
  name: string;
  primary?: boolean;
}

/** A raw event as we need it (timed events have dateTime; all-day have date). */
export interface RawEvent {
  id: string;
  summary: string;
  start: { dateTime?: string | null; date?: string | null };
  end: { dateTime?: string | null; date?: string | null };
  /** The calendar this event came from (so we can tag work vs personal). */
  calendarId: string;
  /** App-private metadata (e.g. the original block `source`) on AI-written events. */
  extendedProperties?: { private?: Record<string, string> | null } | null;
}

/** An event to write to the AI Calendar. */
export interface NewEvent {
  summary: string;
  /**
   * `dateTime` is timezone-naive local time; `timeZone` (an IANA name, e.g.
   * "America/Los_Angeles") tells Google how to resolve it to a UTC instant —
   * including DST — rather than this app computing that offset itself.
   */
  start: { dateTime: string; timeZone?: string };
  end: { dateTime: string; timeZone?: string };
  /** App-private metadata (e.g. the original block `source`) round-tripped on read. */
  extendedProperties?: { private?: Record<string, string> };
}

export interface GoogleCalendarClient {
  listCalendars(account: GoogleAccount): Promise<CalendarSummary[]>;
  listEvents(
    account: GoogleAccount,
    calendarId: string,
    timeMin: string,
    timeMax: string,
  ): Promise<RawEvent[]>;
  /** Insert an event (used for the personal "AI Calendar" only). */
  insertEvent(calendarId: string, event: NewEvent): Promise<{ id: string }>;
  /** Find a personal calendar by name, creating it if missing. Returns its id. */
  ensureCalendar(name: string): Promise<string>;
}

/** Build a `googleapis` calendar client authed as `account` via its stored token. */
async function calendarFor(account: GoogleAccount) {
  const token = await tokenStore.getToken(account);
  if (!token) throw new Error(`Google account "${account}" is not connected.`);
  const auth = oauthClient();
  auth.setCredentials({ refresh_token: token.refresh_token });
  return google.calendar({ version: "v3", auth });
}

/** The real, network-backed client. Only exercised when credentials are present. */
export const googleCalendarClient: GoogleCalendarClient = {
  async listCalendars(account) {
    const res = await (await calendarFor(account)).calendarList.list();
    return (res.data.items ?? []).map((c) => ({
      id: c.id ?? "",
      name: c.summary ?? c.id ?? "(unnamed)",
      primary: c.primary ?? false,
    }));
  },

  async listEvents(account, calendarId, timeMin, timeMax) {
    const res = await (await calendarFor(account)).events.list({
      calendarId,
      timeMin,
      timeMax,
      singleEvents: true,
      orderBy: "startTime",
      maxResults: 250,
    });
    return (res.data.items ?? []).map((e) => ({
      id: e.id ?? "",
      summary: e.summary ?? "(busy)",
      start: { dateTime: e.start?.dateTime, date: e.start?.date },
      end: { dateTime: e.end?.dateTime, date: e.end?.date },
      calendarId,
      extendedProperties: e.extendedProperties,
    }));
  },

  async insertEvent(calendarId, event) {
    // Writes always target the personal account (the AI Calendar lives there).
    const res = await (await calendarFor("personal")).events.insert({
      calendarId,
      requestBody: event,
    });
    return { id: res.data.id ?? "" };
  },

  async ensureCalendar(name) {
    const cal = await calendarFor("personal");
    const list = await cal.calendarList.list();
    const found = (list.data.items ?? []).find((c) => c.summary === name);
    if (found?.id) return found.id;
    const created = await cal.calendars.insert({ requestBody: { summary: name } });
    return created.data.id ?? "";
  },
};

/** True when Google OAuth credentials are configured in the environment. */
export function isGoogleConfigured(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

/**
 * Demo mode: set `GOOGLE_MOCK=1` to run the whole integration against the
 * in-memory fake (seeded calendars + a few events), so the feature is usable
 * without any Google credentials — handy for local demos and proof screenshots.
 */
export function isMockMode(): boolean {
  return process.env.GOOGLE_MOCK === "1";
}

/**
 * The demo fake is cached on `globalThis` so every route handler shares ONE
 * instance within the process (in dev, route modules are otherwise isolated, so
 * a plain module-level singleton wouldn't be shared and write-backs wouldn't be
 * visible on re-read). The real Google backend needs none of this.
 */
const mockHolder = globalThis as unknown as {
  __awpMockClient?: GoogleCalendarClient;
};

/** Resolve the client the routes should use (real, or the shared demo fake). */
export function resolveClient(): GoogleCalendarClient {
  if (isMockMode()) {
    mockHolder.__awpMockClient ??= createMockClient(demoSeed());
    return mockHolder.__awpMockClient;
  }
  return googleCalendarClient;
}
