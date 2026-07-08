import { describe, expect, it } from "vitest";
import { busyBlocks } from "./busy";
import { mapEvents, type CalendarMeta } from "./eventMap";
import type { RawEvent } from "./client";

const REFERENCE = new Date(2026, 6, 8);
const META: Record<string, CalendarMeta> = {
  "work-cal": { source: "work", immovable: true },
  "personal-cal": { source: "personal", immovable: true },
  "ai-cal": { source: "personal", immovable: false },
};

function timed(id: string, cal: string): RawEvent {
  return {
    id,
    summary: id,
    start: { dateTime: new Date("2026-07-08T10:00:00").toISOString() },
    end: { dateTime: new Date("2026-07-08T11:00:00").toISOString() },
    calendarId: cal,
  };
}

describe("busyBlocks", () => {
  it("includes real work + personal events and excludes AI-Calendar events", () => {
    const { timed: blocks } = mapEvents(
      [timed("meeting", "work-cal"), timed("dinner", "personal-cal"), timed("gym", "ai-cal")],
      META,
      REFERENCE,
    );
    const busy = busyBlocks(blocks).map((b) => b.googleEventId).sort();
    expect(busy).toEqual(["dinner", "meeting"]); // "gym" (AI Calendar) excluded
  });
});
