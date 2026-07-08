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
import { existsSync, readFileSync, writeFileSync } from "fs";
import { resolve } from "path";
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

export interface CompletionsStore {
  /** All completed items, most-recent-first. */
  list(): CompletedItem[];
  /** Set of completed item ids (for excluding from active lists). */
  ids(): Set<string>;
  /** Record an item as completed (idempotent by id). */
  add(item: CompletedItem): void;
}

export function createCompletionsStore(
  opts: { filePath?: string } = {},
): CompletionsStore {
  const resolvePath = () =>
    opts.filePath ??
    process.env.COMPLETIONS_FILE ??
    resolve(process.cwd(), DEFAULT_FILE);

  const read = (): CompletedItem[] => {
    const path = resolvePath();
    if (!existsSync(path)) return [];
    try {
      const data = JSON.parse(readFileSync(path, "utf8")) as CompletedItem[];
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  };

  const write = (items: CompletedItem[]) =>
    writeFileSync(resolvePath(), JSON.stringify(items, null, 2), { mode: 0o600 });

  return {
    list() {
      return [...read()].sort((a, b) => b.completedAt.localeCompare(a.completedAt));
    },
    ids() {
      return new Set(read().map((i) => i.id));
    },
    add(item) {
      const items = read();
      if (items.some((i) => i.id === item.id)) return; // idempotent
      items.push(item);
      write(items);
    },
  };
}

/** Default store used by the app/API routes. */
export const completionsStore = createCompletionsStore();
