import { describe, expect, it } from "vitest";
import type { CalendarBlock } from "@/lib/types";
import { nestWithinWorkHours } from "./nest";

const workHours: CalendarBlock[] = [
  {
    id: "work-hours-mon",
    title: "Work Hours",
    source: "work",
    status: "approved",
    day: 0,
    startMinutes: 9 * 60,
    endMinutes: 17 * 60,
    immovable: true,
  },
];

function event(overrides: Partial<CalendarBlock>): CalendarBlock {
  return {
    id: "e",
    title: "Event",
    source: "work",
    status: "approved",
    day: 0,
    startMinutes: 10 * 60,
    endMinutes: 11 * 60,
    ...overrides,
  };
}

describe("nestWithinWorkHours", () => {
  it("nests a work-source event fully inside the work-hours window", () => {
    const [result] = nestWithinWorkHours(workHours, [event({ id: "meeting" })]);
    expect(result.parentId).toBe("work-hours-mon");
  });

  it("nests a personal-source event too — containment is time-based, not account-based", () => {
    const dentist = event({
      id: "dentist",
      source: "personal",
      startMinutes: 14 * 60,
      endMinutes: 15 * 60,
    });
    const [result] = nestWithinWorkHours(workHours, [dentist]);
    expect(result.parentId).toBe("work-hours-mon");
  });

  it("leaves an event outside the work-hours window unchanged", () => {
    const evening = event({ id: "dinner", startMinutes: 19 * 60, endMinutes: 20 * 60 });
    const [result] = nestWithinWorkHours(workHours, [evening]);
    expect(result.parentId).toBeUndefined();
  });

  it("leaves a different day's event unchanged", () => {
    const tuesday = event({ id: "tue-meeting", day: 1 });
    const [result] = nestWithinWorkHours(workHours, [tuesday]);
    expect(result.parentId).toBeUndefined();
  });

  it("does NOT nest an event that only partially overlaps the work-hours window", () => {
    const spillsOver = event({
      id: "late",
      startMinutes: 16 * 60,
      endMinutes: 18 * 60, // ends after the 5pm work-hours boundary
    });
    const [result] = nestWithinWorkHours(workHours, [spillsOver]);
    expect(result.parentId).toBeUndefined();
  });

  it("does not mutate the input events array", () => {
    const original = event({ id: "meeting" });
    const events = [original];
    nestWithinWorkHours(workHours, events);
    expect(original.parentId).toBeUndefined();
  });
});
