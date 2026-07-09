import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtempSync, rmSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { createCompletionsStore } from "./completions";

let dir: string;
let filePath: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "completions-"));
  filePath = join(dir, ".completions.json");
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

const store = () => createCompletionsStore({ filePath });

describe("completions store", () => {
  it("appends items and lists them most-recent-first", async () => {
    const s = store();
    await s.add({ id: "a", source: "school", title: "Essay", metaLabel: "HIST", completedAt: "2026-07-07T10:00:00.000Z" });
    await s.add({ id: "b", source: "work", title: "Send draft", metaLabel: "Sync", completedAt: "2026-07-08T10:00:00.000Z" });

    expect((await s.list()).map((i) => i.id)).toEqual(["b", "a"]); // newest first
    expect([...(await s.ids())].sort()).toEqual(["a", "b"]);
  });

  it("excludes completed ids from an active list", async () => {
    const s = store();
    await s.add({ id: "canvas-1", source: "school", title: "X", metaLabel: "Y", completedAt: "2026-07-08T00:00:00.000Z" });
    const ids = await s.ids();
    const active = ["canvas-1", "canvas-2", "granola-m-0"].filter((id) => !ids.has(id));
    expect(active).toEqual(["canvas-2", "granola-m-0"]);
  });

  it("is idempotent — adding the same id twice keeps one entry", async () => {
    const s = store();
    const item = { id: "a", source: "work" as const, title: "T", metaLabel: "M", completedAt: "2026-07-08T00:00:00.000Z" };
    await s.add(item);
    await s.add({ ...item, completedAt: "2026-07-09T00:00:00.000Z" });
    expect(await s.list()).toHaveLength(1);
  });
});
