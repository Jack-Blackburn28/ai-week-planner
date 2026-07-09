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
import { resolve } from "path";
import { getBlobStore } from "@/lib/storage/blobStore";
import type { GranolaClient } from "./client";
import { buildActionRecords } from "./map";
import type {
  ExtractedActionItem,
  GranolaActionRecord,
  GranolaStoreData,
  GranolaTranscript,
} from "./types";

const DEFAULT_FILE = ".granola-store.json";
const KV_KEY = "awp:granola-store";
const EMPTY: GranolaStoreData = { processedMeetingIds: [], items: [] };

export interface GranolaStore {
  read(): Promise<GranolaStoreData>;
  write(data: GranolaStoreData): Promise<void>;
}

export function createGranolaStore(opts: { filePath?: string } = {}): GranolaStore {
  const blob = () =>
    getBlobStore({
      filePath:
        opts.filePath ??
        process.env.GRANOLA_STORE_FILE ??
        resolve(process.cwd(), DEFAULT_FILE),
      kvKey: KV_KEY,
      mode: 0o600,
    });

  return {
    async read() {
      const raw = await blob().read();
      if (raw == null) return { ...EMPTY };
      try {
        return { ...EMPTY, ...(JSON.parse(raw) as GranolaStoreData) };
      } catch {
        return { ...EMPTY };
      }
    },
    async write(data) {
      await blob().write(JSON.stringify(data, null, 2));
    },
  };
}

/** Default store used by the app/API routes. */
export const granolaStore = createGranolaStore();

/** Extractor signature (real AI or mock) — injected so `syncActions` stays testable. */
export type Extract = (t: GranolaTranscript) => Promise<ExtractedActionItem[]>;

/** Normalize an action-item title for duplicate detection. */
export function normalizeTitle(title: string): string {
  return title.trim().toLowerCase().replace(/\s+/g, " ");
}

export interface SyncOpts {
  store: GranolaStore;
  client: GranolaClient;
  extract: Extract;
  /** Ids the user has cleared — never returned, never regenerated. */
  completedIds: Set<string>;
  /** Normalized titles of cleared items — never recreated (cross-meeting dedup). */
  completedTitles?: Set<string>;
  /** ISO timestamp for newly-created records (injected for determinism). */
  now: string;
  /** Recency window in days (default 7 — last week). */
  windowDays?: number;
}

/**
 * Fetch recent meetings, extract action items for any NOT-yet-processed meeting,
 * persist them, and return the current OPEN items (excluding cleared ids).
 * Already-processed meetings are skipped entirely — `extract` is not called for
 * them — which is what makes generation stable and clearing permanent.
 */
/**
 * In-process lock: serialize concurrent syncActions calls (e.g. the app's mount
 * fetch + a manual refresh hitting the route at once) so they don't race on the
 * file store and create duplicate items. Shared via globalThis because Next dev
 * isolates route modules.
 */
function withGranolaLock<T>(fn: () => Promise<T>): Promise<T> {
  const holder = globalThis as unknown as { __awpGranolaLock?: Promise<unknown> };
  const prev = holder.__awpGranolaLock ?? Promise.resolve();
  const run = prev.then(fn, fn);
  holder.__awpGranolaLock = run.catch(() => undefined);
  return run;
}

export function syncActions(opts: SyncOpts): Promise<GranolaActionRecord[]> {
  return withGranolaLock(() => syncActionsUnlocked(opts));
}

async function syncActionsUnlocked(
  opts: SyncOpts,
): Promise<GranolaActionRecord[]> {
  const {
    store,
    client,
    extract,
    completedIds,
    completedTitles = new Set(),
    now,
    windowDays = 7,
  } = opts;
  const data = await store.read();
  let changed = false;

  // Clean any duplicate items a prior concurrent write may have left (by id or
  // normalized title), so the list self-heals and never renders duplicate keys.
  const seenId = new Set<string>();
  const seenTitle = new Set<string>();
  const cleaned = data.items.filter((i) => {
    const t = normalizeTitle(i.title);
    if (seenId.has(i.id) || seenTitle.has(t)) return false;
    seenId.add(i.id);
    seenTitle.add(t);
    return true;
  });
  if (cleaned.length !== data.items.length) {
    data.items = cleaned;
    changed = true;
  }

  const processed = new Set(data.processedMeetingIds);
  const existingIds = new Set(data.items.map((i) => i.id));
  const existingTitles = new Set(data.items.map((i) => normalizeTitle(i.title)));

  const meetings = await client.listRecentMeetings(windowDays);

  for (const meeting of meetings) {
    if (processed.has(meeting.id)) continue; // GENERATE ONCE
    try {
      const transcript = await client.getTranscript(meeting.id);
      if (transcript) {
        const records = buildActionRecords(meeting, await extract(transcript), now);
        for (const rec of records) {
          const title = normalizeTitle(rec.title);
          // Skip anything already known, already cleared (by id or text), or a
          // duplicate of an item we already have (NEVER REGENERATE + no dup text).
          if (
            existingIds.has(rec.id) ||
            completedIds.has(rec.id) ||
            existingTitles.has(title) ||
            completedTitles.has(title)
          ) {
            continue;
          }
          data.items.push(rec);
          existingIds.add(rec.id);
          existingTitles.add(title);
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
    await store.write(data);
  }

  // Open = persisted items minus anything cleared.
  return data.items.filter((i) => !completedIds.has(i.id));
}
