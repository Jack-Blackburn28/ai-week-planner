import { describe, expect, it } from "vitest";
import { mapEvents, type CalendarMeta } from "./eventMap";
import { windowForBlocks } from "@/lib/time";
import { dayIndexForDate } from "@/lib/week";
import type { RawEvent } from "./client";

// Reference: Wed 2026-07-08 → week is Mon 7/6 … Sun 7/12.
const REFERENCE = new Date(2026, 6, 8);
const META: Record<string, CalendarMeta> = {
  "work-cal": { source: "work", immovable: true },
  "personal-cal": { source: "personal", immovable: true },
  "ai-cal": { source: "personal", immovable: false },
};

/** A timed event on `dateISO` from `startH:00` to `endH:00` (local). */
function timed(id: string, calendarId: string, dateISO: string, startH: number, endH: number): RawEvent {
  return {
    id,
    summary: id,
    start: { dateTime: new Date(`${dateISO}T${String(startH).padStart(2, "0")}:00:00`).toISOString() },
    end: { dateTime: new Date(`${dateISO}T${String(endH).padStart(2, "0")}:00:00`).toISOString() },
    calendarId,
  };
}

describe("mapEvents", () => {
  it("maps a timed work event to the right day/time/source and marks it immovable", () => {
    const { timed: blocks } = mapEvents(
      [timed("standup", "work-cal", "2026-07-08", 10, 11)], // Wed
      META,
      REFERENCE,
    );
    expect(blocks).toHaveLength(1);
    const b = blocks[0];
    expect(b.day).toBe(2); // Wed = index 2
    expect(b.startMinutes).toBe(10 * 60);
    expect(b.endMinutes).toBe(11 * 60);
    expect(b.source).toBe("work");
    expect(b.immovable).toBe(true);
    expect(b.googleEventId).toBe("standup");
    expect(b.calendarId).toBe("work-cal");
  });

  it("classifies an all-day event separately and does NOT make it a timed block", () => {
    const { timed: blocks, allDay } = mapEvents(
      [
        {
          id: "bday",
          summary: "Mom's birthday",
          start: { date: "2026-07-08" },
          end: { date: "2026-07-09" },
          calendarId: "personal-cal",
        },
      ],
      META,
      REFERENCE,
    );
    expect(blocks).toHaveLength(0);
    expect(allDay).toEqual([
      { id: "bday", title: "Mom's birthday", day: 2, source: "personal" },
    ]);
  });

  it("drops events outside the displayed week", () => {
    const { timed: blocks } = mapEvents(
      [timed("nextweek", "work-cal", "2026-07-15", 9, 10)], // following Wed
      META,
      REFERENCE,
    );
    expect(blocks).toHaveLength(0);
  });

  it("honors an app-recorded source on AI-written events and keeps them movable", () => {
    const ev = timed("gym", "ai-cal", "2026-07-09", 18, 19); // Thu
    ev.extendedProperties = { private: { source: "personal" } };
    const { timed: blocks } = mapEvents([ev], META, REFERENCE);
    expect(blocks[0].immovable).toBe(false); // AI Calendar events are not busy
    expect(blocks[0].source).toBe("personal");
  });

  it("expands the window to fit an early event (5am) via windowForBlocks", () => {
    const { timed: blocks } = mapEvents(
      [timed("early", "work-cal", "2026-07-06", 5, 6)], // Mon 5–6am (before 6am default)
      META,
      REFERENCE,
    );
    const win = windowForBlocks(blocks);
    expect(win.startHour).toBe(5); // widened down from the default 6
  });
});

describe("mapEvents — Pacific Time correctness", () => {
  it("buckets an event's dateTime to the correct Pacific hour/day regardless of the process's own timezone", () => {
    const originalTz = process.env.TZ;
    process.env.TZ = "UTC";
    try {
      // Constructed *inside* the forced-TZ block so encode and decode stay in
      // sync (Date's local fields are read dynamically against the current TZ).
      const referenceUtc = new Date(2026, 6, 8); // Wed 2026-07-08
      // 5–6 PM Pacific Daylight Time (UTC-7), expressed with its real offset —
      // exactly how Google's API returns a timed event's dateTime.
      const event: RawEvent = {
        id: "offset-event",
        summary: "Design review",
        start: { dateTime: "2026-07-08T17:00:00-07:00" },
        end: { dateTime: "2026-07-08T18:00:00-07:00" },
        calendarId: "work-cal",
      };
      const { timed: blocks } = mapEvents([event], META, referenceUtc);
      expect(blocks).toHaveLength(1);
      expect(blocks[0].day).toBe(2); // Wed
      expect(blocks[0].startMinutes).toBe(17 * 60);
      expect(blocks[0].endMinutes).toBe(18 * 60);
    } finally {
      process.env.TZ = originalTz;
    }
  });
});

describe("dayIndexForDate", () => {
  it("returns the Mon..Sun column for a date in the displayed week", () => {
    expect(dayIndexForDate(new Date(2026, 6, 6), REFERENCE)).toBe(0); // Mon
    expect(dayIndexForDate(new Date(2026, 6, 12), REFERENCE)).toBe(6); // Sun
  });
  it("returns -1 for a date outside the displayed week", () => {
    expect(dayIndexForDate(new Date(2026, 6, 13), REFERENCE)).toBe(-1);
  });
});
