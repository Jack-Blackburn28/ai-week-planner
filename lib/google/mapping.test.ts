import { afterEach, describe, expect, it } from "vitest";
import { mkdtempSync, rmSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { createGoogleConfig } from "./config";

const dirs: string[] = [];
function tempConfig() {
  const dir = mkdtempSync(join(tmpdir(), "gcfg-"));
  dirs.push(dir);
  return createGoogleConfig({ filePath: join(dir, ".google-config.json") });
}
afterEach(() => dirs.splice(0).forEach((d) => rmSync(d, { recursive: true, force: true })));

describe("google config / mapping", () => {
  it("round-trips a mapping through disk", () => {
    const cfg = tempConfig();
    cfg.set({
      work: ["w1", "w2"],
      personal: ["p1"],
      ignored: ["x1"],
      aiCalendarId: "ai-1",
    });
    expect(cfg.get()).toEqual({
      work: ["w1", "w2"],
      personal: ["p1"],
      ignored: ["x1"],
      aiCalendarId: "ai-1",
    });
  });

  it("defaults to empty mapping when no file exists", () => {
    expect(tempConfig().get()).toEqual({ work: [], personal: [], ignored: [] });
  });

  it("excludes the AI Calendar from personal busy sources", () => {
    const cfg = tempConfig();
    cfg.set({
      work: ["w1"],
      personal: ["p1", "ai-1"],
      ignored: [],
      aiCalendarId: "ai-1",
    });
    expect(cfg.busySources()).toEqual({ work: ["w1"], personal: ["p1"] });
  });
});
