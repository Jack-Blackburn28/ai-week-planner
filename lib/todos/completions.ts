/**
 * Source-agnostic "completed items" store. SERVER-ONLY (`fs`). Holds the items the
 * user has cleared from BOTH the Work (Granola) and School (Canvas) lists, so:
 *   - active lists can exclude anything already cleared, and
 *   - the combined Completed archive can list them (most-recent-first),
 * persisted across reloads.
 *
 * Introduced in T3.0 (the Work list needs cleared-ids to enforce never-regenerate);
 * the clear/list endpoints and UI arrive in T4.0. Gitignored JSON file.
 */
import { resolve } from "path";
import { getBlobStore } from "@/lib/storage/blobStore";
import type { TodoSectionKey } from "@/lib/types";

export interface CompletedItem {
  id: string;
  source: TodoSectionKey;
  title: string;
  metaLabel: string;
  /** ISO timestamp when the item was cleared. */
  completedAt: string;
}

const DEFAULT_FILE = ".completions.json";
const KV_KEY = "awp:completions";

export interface CompletionsStore {
  /** All completed items, most-recent-first. */
  list(): Promise<CompletedItem[]>;
  /** Set of completed item ids (for excluding from active lists). */
  ids(): Promise<Set<string>>;
  /** Record an item as completed (idempotent by id). */
  add(item: CompletedItem): Promise<void>;
}

export function createCompletionsStore(
  opts: { filePath?: string } = {},
): CompletionsStore {
  const blob = () =>
    getBlobStore({
      filePath:
        opts.filePath ??
        process.env.COMPLETIONS_FILE ??
        resolve(process.cwd(), DEFAULT_FILE),
      kvKey: KV_KEY,
      mode: 0o600,
    });

  const read = async (): Promise<CompletedItem[]> => {
    const raw = await blob().read();
    if (raw == null) return [];
    try {
      const data = JSON.parse(raw) as CompletedItem[];
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  };

  const write = async (items: CompletedItem[]): Promise<void> => {
    await blob().write(JSON.stringify(items, null, 2));
  };

  return {
    async list() {
      return [...(await read())].sort((a, b) =>
        b.completedAt.localeCompare(a.completedAt),
      );
    },
    async ids() {
      return new Set((await read()).map((i) => i.id));
    },
    async add(item) {
      const items = await read();
      if (items.some((i) => i.id === item.id)) return; // idempotent
      items.push(item);
      await write(items);
    },
  };
}

/** Default store used by the app/API routes. */
export const completionsStore = createCompletionsStore();
