import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdtempSync, rmSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { createGranolaStore, syncActions } from "./store";
import type { GranolaClient } from "./client";
import type { GranolaTranscript } from "./types";

/**
 * The two core rules: GENERATE ONCE (a processed meeting is never re-extracted)
 * and NEVER REGENERATE (a cleared item id cannot reappear).
 */
let dir: string;
let filePath: string;

const MEETING = { id: "m1", title: "Sync", date: "2026-07-07T12:00:00.000Z" };
const transcript: GranolaTranscript = {
  meetingId: "m1",
  title: "Sync",
  date: MEETING.date,
  text: "- Do the thing\n- Do the other thing",
};

function makeClient(): GranolaClient {
  return {
    listRecentMeetings: async () => [MEETING],
    getTranscript: async () => transcript,
  };
}

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "granola-store-"));
  filePath = join(dir, ".granola-store.json");
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

describe("syncActions", () => {
  it("generates once — a processed meeting is not re-extracted on the next sync", async () => {
    const store = createGranolaStore({ filePath });
    const extract = vi.fn(async (t: GranolaTranscript) =>
      t.text.split("\n").map((l) => ({ title: l.replace(/^- /, "") })),
    );
    const base = { store, client: makeClient(), extract, completedIds: new Set<string>(), now: "t0" };

    const first = await syncActions(base);
    expect(first.map((i) => i.id)).toEqual(["granola-m1-0", "granola-m1-1"]);
    expect(extract).toHaveBeenCalledTimes(1);

    const second = await syncActions(base);
    expect(second.map((i) => i.id)).toEqual(["granola-m1-0", "granola-m1-1"]);
    expect(extract).toHaveBeenCalledTimes(1); // NOT called again
  });

  it("never regenerates a cleared item", async () => {
    const store = createGranolaStore({ filePath });
    const extract = async (t: GranolaTranscript) =>
      t.text.split("\n").map((l) => ({ title: l.replace(/^- /, "") }));

    await syncActions({ store, client: makeClient(), extract, completedIds: new Set(), now: "t0" });

    // Clear the first item, then re-sync: it must not come back.
    const cleared = new Set(["granola-m1-0"]);
    const open = await syncActions({ store, client: makeClient(), extract, completedIds: cleared, now: "t1" });
    expect(open.map((i) => i.id)).toEqual(["granola-m1-1"]);
  });
});
