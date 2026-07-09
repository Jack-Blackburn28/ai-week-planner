import { afterEach, describe, expect, it } from "vitest";
import { mkdtempSync, rmSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { createWorkHoursConfig } from "./config";
import type { WorkHoursRule } from "./types";

const dirs: string[] = [];
function tempConfig() {
  const dir = mkdtempSync(join(tmpdir(), "wh-"));
  dirs.push(dir);
  return createWorkHoursConfig({ filePath: join(dir, ".work-hours.json") });
}
afterEach(() => dirs.splice(0).forEach((d) => rmSync(d, { recursive: true, force: true })));

describe("workHoursConfig", () => {
  it("returns an empty rule when nothing has been saved yet", async () => {
    const config = tempConfig();
    expect(await config.get()).toEqual({ days: {} });
  });

  it("round-trips a saved rule", async () => {
    const config = tempConfig();
    const rule: WorkHoursRule = {
      days: {
        0: { startMinutes: 9 * 60, endMinutes: 17 * 60 },
        4: { startMinutes: 9 * 60, endMinutes: 13 * 60 },
      },
    };
    await config.set(rule);
    expect(await config.get()).toEqual(rule);
  });

  it("persists across separate store instances pointed at the same file", async () => {
    const dir = mkdtempSync(join(tmpdir(), "wh-"));
    dirs.push(dir);
    const filePath = join(dir, ".work-hours.json");
    const rule: WorkHoursRule = { days: { 2: { startMinutes: 480, endMinutes: 1020 } } };

    await createWorkHoursConfig({ filePath }).set(rule);
    expect(await createWorkHoursConfig({ filePath }).get()).toEqual(rule);
  });
});
