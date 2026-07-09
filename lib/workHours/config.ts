/**
 * Work-hours rule persistence, mirroring `lib/google/config.ts`'s
 * `BlobStore`-backed pattern (gitignored file locally, hosted KV on
 * Vercel). SERVER-ONLY (uses the blob store's `fs`/KV backends).
 */
import { resolve } from "path";
import { getBlobStore } from "@/lib/storage/blobStore";
import type { WorkHoursRule } from "./types";

const DEFAULT_FILE = ".work-hours.json";
const KV_KEY = "awp:work-hours";

const EMPTY: WorkHoursRule = { days: {} };

export interface WorkHoursConfigStore {
  get(): Promise<WorkHoursRule>;
  set(rule: WorkHoursRule): Promise<void>;
}

export function createWorkHoursConfig(
  opts: { filePath?: string } = {},
): WorkHoursConfigStore {
  const blob = () =>
    getBlobStore({
      filePath:
        opts.filePath ??
        process.env.WORK_HOURS_CONFIG_FILE ??
        resolve(process.cwd(), DEFAULT_FILE),
      kvKey: KV_KEY,
    });

  const get = async (): Promise<WorkHoursRule> => {
    const raw = await blob().read();
    if (raw == null) return { ...EMPTY, days: {} };
    try {
      const parsed = JSON.parse(raw) as WorkHoursRule;
      return { ...EMPTY, ...parsed, days: parsed.days ?? {} };
    } catch {
      return { ...EMPTY, days: {} };
    }
  };

  const set = async (rule: WorkHoursRule): Promise<void> => {
    await blob().write(JSON.stringify(rule, null, 2));
  };

  return { get, set };
}

/** Default config store used by the app/routes. */
export const workHoursConfig = createWorkHoursConfig();
