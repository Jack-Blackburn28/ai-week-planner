import { describe, expect, it } from "vitest";
import { parseWorkHoursMock } from "./parseMock";

describe("parseWorkHoursMock", () => {
  it("parses a simple weekday range with a time range", () => {
    const result = parseWorkHoursMock("9 to 5 Monday through Friday", null);
    expect(result.proposedRule).toEqual({
      days: {
        0: { startMinutes: 9 * 60, endMinutes: 17 * 60 },
        1: { startMinutes: 9 * 60, endMinutes: 17 * 60 },
        2: { startMinutes: 9 * 60, endMinutes: 17 * 60 },
        3: { startMinutes: 9 * 60, endMinutes: 17 * 60 },
        4: { startMinutes: 9 * 60, endMinutes: 17 * 60 },
      },
    });
    expect(result.reply).toContain("Mon 9am-5pm");
    expect(result.reply).toContain("Fri 9am-5pm");
    expect(result.reply).toContain("Save this?");
  });

  it("applies a half-day override for a named day, distinct from the main range", () => {
    const result = parseWorkHoursMock(
      "9 to 5 Monday through Thursday, half day Friday",
      null,
    );
    expect(result.proposedRule!.days[0]).toEqual({ startMinutes: 540, endMinutes: 1020 });
    expect(result.proposedRule!.days[4]).toEqual({ startMinutes: 540, endMinutes: 780 }); // 9am-1pm
    expect(result.proposedRule!.days[5]).toBeUndefined(); // Sat untouched
  });

  it("references changing hours when a current rule is passed", () => {
    const current = { days: { 0: { startMinutes: 540, endMinutes: 1020 } } };
    const result = parseWorkHoursMock("9 to 5 Monday through Friday", current);
    expect(result.reply).toContain("changing them to");
  });

  it("asks for clarification and proposes nothing on an unrecognized message", () => {
    const result = parseWorkHoursMock("whenever I feel like it", null);
    expect(result.proposedRule).toBeUndefined();
    expect(result.reply).toBeTruthy();
  });

  it("answers truthfully from currentRule instead of claiming none are set", () => {
    const current = { days: { 0: { startMinutes: 540, endMinutes: 1020 } } };
    const result = parseWorkHoursMock("what are my working hours", current);
    expect(result.proposedRule).toBeUndefined();
    expect(result.reply).toContain("Mon 9am-5pm");
    expect(result.reply).not.toContain("couldn't quite parse");
  });
});
