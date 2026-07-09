import { describe, expect, it } from "vitest";
import { expandWorkHours } from "./expand";
import type { WorkHoursRule } from "./types";

// Reference: Wed 2026-07-08 → week is Mon 7/6 … Sun 7/12.
const REFERENCE = new Date(2026, 6, 8);

const rule: WorkHoursRule = {
  days: {
    0: { startMinutes: 9 * 60, endMinutes: 17 * 60 }, // Mon 9-5
    1: { startMinutes: 9 * 60, endMinutes: 17 * 60 }, // Tue 9-5
    2: { startMinutes: 9 * 60, endMinutes: 17 * 60 }, // Wed 9-5
    3: { startMinutes: 9 * 60, endMinutes: 17 * 60 }, // Thu 9-5
    4: { startMinutes: 9 * 60, endMinutes: 13 * 60 }, // Fri half-day 9-1
    // Sat/Sun absent — no work hours.
  },
};

describe("expandWorkHours", () => {
  it("produces one immovable block per configured day, none for absent days", () => {
    const blocks = expandWorkHours(rule, REFERENCE);
    expect(blocks).toHaveLength(5);
    expect(blocks.every((b) => b.immovable)).toBe(true);
    expect(blocks.every((b) => b.source === "work")).toBe(true);
    expect(blocks.some((b) => b.day === 5)).toBe(false); // Sat
    expect(blocks.some((b) => b.day === 6)).toBe(false); // Sun
  });

  it("uses the configured hours for a half-day, distinct from full days", () => {
    const blocks = expandWorkHours(rule, REFERENCE);
    const friday = blocks.find((b) => b.day === 4)!;
    expect(friday.startMinutes).toBe(9 * 60);
    expect(friday.endMinutes).toBe(13 * 60);
    const monday = blocks.find((b) => b.day === 0)!;
    expect(monday.endMinutes).toBe(17 * 60);
  });

  it("recurs correctly across weekOffset navigation (same hours, different dates)", () => {
    const thisWeek = expandWorkHours(rule, REFERENCE, 0);
    const nextWeek = expandWorkHours(rule, REFERENCE, 1);
    expect(thisWeek).toHaveLength(nextWeek.length);
    // Same day-of-week hours, but distinct block ids (anchored to the real date).
    const thisMon = thisWeek.find((b) => b.day === 0)!;
    const nextMon = nextWeek.find((b) => b.day === 0)!;
    expect(thisMon.startMinutes).toBe(nextMon.startMinutes);
    expect(thisMon.id).not.toBe(nextMon.id);
  });

  it("produces zero blocks for an empty rule", () => {
    expect(expandWorkHours({ days: {} }, REFERENCE)).toEqual([]);
  });
});
