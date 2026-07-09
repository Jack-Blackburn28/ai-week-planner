/**
 * Calendar mapping + resolved "AI Calendar" id, persisted to a gitignored file
 * (no DB yet). SERVER-ONLY (uses `fs`).
 *
 * The mapping records which calendars in each account count as work vs personal
 * (or are ignored). The "AI Calendar" is the app's own write-back target and is
 * deliberately EXCLUDED from the busy sources — the AI must not treat its own
 * placements as busy time.
 */
import { resolve } from "path";
import { getBlobStore } from "@/lib/storage/blobStore";
import type { GoogleCalendarClient } from "./client";

const DEFAULT_FILE = ".google-config.json";
const KV_KEY = "awp:google-config";
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
  get(): Promise<CalendarMapping>;
  set(mapping: CalendarMapping): Promise<void>;
  /**
   * Busy-source calendars per account. The personal list EXCLUDES the AI
   * Calendar so the planner never counts its own events as busy time.
   */
  busySources(): Promise<{ work: string[]; personal: string[] }>;
}

export function createGoogleConfig(
  opts: { filePath?: string } = {},
): GoogleConfigStore {
  const blob = () =>
    getBlobStore({
      filePath:
        opts.filePath ??
        process.env.GOOGLE_CONFIG_FILE ??
        resolve(process.cwd(), DEFAULT_FILE),
      kvKey: KV_KEY,
    });

  const get = async (): Promise<CalendarMapping> => {
    const raw = await blob().read();
    if (raw == null) return { ...EMPTY };
    try {
      return { ...EMPTY, ...(JSON.parse(raw) as CalendarMapping) };
    } catch {
      return { ...EMPTY };
    }
  };

  const set = async (mapping: CalendarMapping): Promise<void> => {
    await blob().write(JSON.stringify(mapping, null, 2));
  };

  return {
    get,
    set,
    async busySources() {
      const m = await get();
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
  const current = await config.get();
  if (current.aiCalendarId) return current.aiCalendarId;
  const id = await client.ensureCalendar(AI_CALENDAR_NAME);
  await config.set({ ...current, aiCalendarId: id });
  return id;
}
