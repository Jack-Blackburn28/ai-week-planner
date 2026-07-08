import { describe, expect, it } from "vitest";
import {
  HOUR_PX,
  formatClock,
  formatHour,
  formatRange,
  gridHeightPx,
  hourMarks,
  minutesToTopPx,
} from "@/lib/time";

const DEFAULT = { startHour: 6, endHour: 22 };

describe("grid math (default window)", () => {
  it("puts the window start at the top (0px)", () => {
    expect(minutesToTopPx(6 * 60, DEFAULT)).toBe(0);
  });

  it("positions 9:00 AM three hours down", () => {
    expect(minutesToTopPx(9 * 60, DEFAULT)).toBe(3 * HOUR_PX);
  });

  it("computes total grid height from the window", () => {
    expect(gridHeightPx(DEFAULT)).toBe(16 * HOUR_PX);
  });
});

describe("window-agnostic positioning (Story 3 forward-compat)", () => {
  it("re-anchors offsets when the window starts earlier", () => {
    const early = { startHour: 5, endHour: 23 };
    // 9:00 AM is now 4 hours below a 5 AM start, not 3.
    expect(minutesToTopPx(9 * 60, early)).toBe(4 * HOUR_PX);
    expect(gridHeightPx(early)).toBe(18 * HOUR_PX);
  });
});

describe("hour marks + formatting", () => {
  it("lists every hour inclusive of both ends", () => {
    const marks = hourMarks(DEFAULT);
    expect(marks[0]).toBe(6);
    expect(marks[marks.length - 1]).toBe(22);
    expect(marks).toHaveLength(17);
  });

  it("formats hours and clock times with AM/PM", () => {
    expect(formatHour(6)).toBe("6 AM");
    expect(formatHour(12)).toBe("12 PM");
    expect(formatHour(22)).toBe("10 PM");
    expect(formatClock(540)).toBe("9:00 AM");
    expect(formatClock(780)).toBe("1:00 PM");
    expect(formatRange(540, 630)).toBe("9:00 AM – 10:30 AM");
  });
});
