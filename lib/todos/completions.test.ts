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
  it("appends items and lists them most-recent-first", () => {
    const s = store();
    s.add({ id: "a", source: "school", title: "Essay", metaLabel: "HIST", completedAt: "2026-07-07T10:00:00.000Z" });
    s.add({ id: "b", source: "work", title: "Send draft", metaLabel: "Sync", completedAt: "2026-07-08T10:00:00.000Z" });

    expect(s.list().map((i) => i.id)).toEqual(["b", "a"]); // newest first
    expect([...s.ids()].sort()).toEqual(["a", "b"]);
  });

  it("excludes completed ids from an active list", () => {
    const s = store();
    s.add({ id: "canvas-1", source: "school", title: "X", metaLabel: "Y", completedAt: "2026-07-08T00:00:00.000Z" });
    const active = ["canvas-1", "canvas-2", "granola-m-0"].filter((id) => !s.ids().has(id));
    expect(active).toEqual(["canvas-2", "granola-m-0"]);
  });

  it("is idempotent — adding the same id twice keeps one entry", () => {
    const s = store();
    const item = { id: "a", source: "work" as const, title: "T", metaLabel: "M", completedAt: "2026-07-08T00:00:00.000Z" };
    s.add(item);
    s.add({ ...item, completedAt: "2026-07-09T00:00:00.000Z" });
    expect(s.list()).toHaveLength(1);
  });
});
