/**
 * Persistent Granola action-item store. SERVER-ONLY (`fs`). Backs the two core
 * rules Jack asked for:
 *   1. GENERATE ONCE — each meeting is processed a single time; already-processed
 *      meetings are never re-extracted (no repeat AI calls, stable items).
 *   2. NEVER REGENERATE — a cleared item id is excluded from the open list, so it
 *      cannot reappear on a later refresh.
 *
 * State lives in a gitignored JSON file (mirrors `lib/google/config.ts`).
 */
import { existsSync, readFileSync, writeFileSync } from "fs";
import { resolve } from "path";
import type { GranolaClient } from "./client";
import { buildActionRecords } from "./map";
import type {
  ExtractedActionItem,
  GranolaActionRecord,
  GranolaStoreData,
  GranolaTranscript,
} from "./types";

const DEFAULT_FILE = ".granola-store.json";
const EMPTY: GranolaStoreData = { processedMeetingIds: [], items: [] };

export interface GranolaStore {
  read(): GranolaStoreData;
  write(data: GranolaStoreData): void;
}

export function createGranolaStore(opts: { filePath?: string } = {}): GranolaStore {
  const resolvePath = () =>
    opts.filePath ??
    process.env.GRANOLA_STORE_FILE ??
    resolve(process.cwd(), DEFAULT_FILE);

  return {
    read() {
      const path = resolvePath();
      if (!existsSync(path)) return { ...EMPTY };
      try {
        return { ...EMPTY, ...(JSON.parse(readFileSync(path, "utf8")) as GranolaStoreData) };
      } catch {
        return { ...EMPTY };
      }
    },
    write(data) {
      writeFileSync(resolvePath(), JSON.stringify(data, null, 2), { mode: 0o600 });
    },
  };
}

/** Default store used by the app/API routes. */
export const granolaStore = createGranolaStore();

/** Extractor signature (real AI or mock) — injected so `syncActions` stays testable. */
export type Extract = (t: GranolaTranscript) => Promise<ExtractedActionItem[]>;

export interface SyncOpts {
  store: GranolaStore;
  client: GranolaClient;
  extract: Extract;
  /** Ids the user has cleared — never returned, never regenerated. */
  completedIds: Set<string>;
  /** ISO timestamp for newly-created records (injected for determinism). */
  now: string;
  /** Recency window in days (default 30). */
  windowDays?: number;
}

/**
 * Fetch recent meetings, extract action items for any NOT-yet-processed meeting,
 * persist them, and return the current OPEN items (excluding cleared ids).
 * Already-processed meetings are skipped entirely — `extract` is not called for
 * them — which is what makes generation stable and clearing permanent.
 */
export async function syncActions(opts: SyncOpts): Promise<GranolaActionRecord[]> {
  const { store, client, extract, completedIds, now, windowDays = 30 } = opts;
  const data = store.read();
  const processed = new Set(data.processedMeetingIds);
  const existingIds = new Set(data.items.map((i) => i.id));

  const meetings = await client.listRecentMeetings(windowDays);
  let changed = false;

  for (const meeting of meetings) {
    if (processed.has(meeting.id)) continue; // GENERATE ONCE
    try {
      const transcript = await client.getTranscript(meeting.id);
      if (transcript) {
        const records = buildActionRecords(meeting, await extract(transcript), now);
        for (const rec of records) {
          // Skip anything already known or already cleared (NEVER REGENERATE).
          if (existingIds.has(rec.id) || completedIds.has(rec.id)) continue;
          data.items.push(rec);
          existingIds.add(rec.id);
        }
      }
    } catch (err) {
      console.error(`[granola] extraction failed for ${meeting.id}:`, err);
    }
    processed.add(meeting.id);
    changed = true;
  }

  if (changed) {
    data.processedMeetingIds = [...processed];
    store.write(data);
  }

  // Open = persisted items minus anything cleared.
  return data.items.filter((i) => !completedIds.has(i.id));
}
