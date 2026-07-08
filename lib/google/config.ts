/**
 * Calendar mapping + resolved "AI Calendar" id, persisted to a gitignored file
 * (no DB yet). SERVER-ONLY (uses `fs`).
 *
 * The mapping records which calendars in each account count as work vs personal
 * (or are ignored). The "AI Calendar" is the app's own write-back target and is
 * deliberately EXCLUDED from the busy sources — the AI must not treat its own
 * placements as busy time.
 */
import { existsSync, readFileSync, writeFileSync } from "fs";
import { resolve } from "path";
import type { GoogleCalendarClient } from "./client";

const DEFAULT_FILE = ".google-config.json";
export const AI_CALENDAR_NAME = "AI Calendar";

export interface CalendarMapping {
  /** Calendar ids (in the work account) that feed the work view. */
  work: string[];
  /** Calendar ids (in the personal account) that feed the personal view. */
  personal: string[];
  /** Calendar ids the user chose to ignore. */
  ignored: string[];
  /** Resolved id of the personal "AI Calendar" (write-back target). */
  aiCalendarId?: string;
}

const EMPTY: CalendarMapping = { work: [], personal: [], ignored: [] };

export interface GoogleConfigStore {
  get(): CalendarMapping;
  set(mapping: CalendarMapping): void;
  /**
   * Busy-source calendars per account. The personal list EXCLUDES the AI
   * Calendar so the planner never counts its own events as busy time.
   */
  busySources(): { work: string[]; personal: string[] };
}

export function createGoogleConfig(
  opts: { filePath?: string } = {},
): GoogleConfigStore {
  const resolvePath = () =>
    opts.filePath ??
    process.env.GOOGLE_CONFIG_FILE ??
    resolve(process.cwd(), DEFAULT_FILE);

  const get = (): CalendarMapping => {
    const path = resolvePath();
    if (!existsSync(path)) return { ...EMPTY };
    try {
      return { ...EMPTY, ...(JSON.parse(readFileSync(path, "utf8")) as CalendarMapping) };
    } catch {
      return { ...EMPTY };
    }
  };

  const set = (mapping: CalendarMapping): void => {
    writeFileSync(resolvePath(), JSON.stringify(mapping, null, 2));
  };

  return {
    get,
    set,
    busySources() {
      const m = get();
      return {
        work: m.work,
        personal: m.personal.filter((id) => id !== m.aiCalendarId),
      };
    },
  };
}

/** Default config store used by the app/routes. */
export const googleConfig = createGoogleConfig();

/**
 * Ensure the personal "AI Calendar" exists and its id is recorded. Idempotent:
 * once the id is stored, later calls return it without hitting the client again.
 */
export async function ensureAiCalendar(
  client: GoogleCalendarClient,
  config: GoogleConfigStore = googleConfig,
): Promise<string> {
  const current = config.get();
  if (current.aiCalendarId) return current.aiCalendarId;
  const id = await client.ensureCalendar(AI_CALENDAR_NAME);
  config.set({ ...current, aiCalendarId: id });
  return id;
}
