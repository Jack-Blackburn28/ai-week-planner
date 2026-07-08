import { describe, expect, it } from "vitest";
import { formatWeekRange, isSameDay, startOfWeekMonday, weekDates } from "@/lib/week";
import { isoDate } from "@/lib/date";

describe("startOfWeekMonday", () => {
  it("returns the same week's Monday for a midweek date", () => {
    // 2026-07-08 is a Wednesday → Monday is 2026-07-06.
    expect(isoDate(startOfWeekMonday(new Date(2026, 6, 8)))).toBe("2026-07-06");
  });

  it("treats Sunday as the end of the week (previous Monday)", () => {
    // 2026-07-12 is a Sunday → Monday is 2026-07-06.
    expect(isoDate(startOfWeekMonday(new Date(2026, 6, 12)))).toBe("2026-07-06");
  });

  it("returns Monday itself unchanged", () => {
    expect(isoDate(startOfWeekMonday(new Date(2026, 6, 6)))).toBe("2026-07-06");
  });
});

describe("weekDates", () => {
  it("returns 7 dates Mon→Sun for the current week", () => {
    const dates = weekDates(new Date(2026, 6, 8), 0);
    expect(dates).toHaveLength(7);
    expect(isoDate(dates[0])).toBe("2026-07-06"); // Mon
    expect(isoDate(dates[6])).toBe("2026-07-12"); // Sun
  });

  it("shifts by whole weeks with the offset", () => {
    expect(isoDate(weekDates(new Date(2026, 6, 8), 1)[0])).toBe("2026-07-13");
    expect(isoDate(weekDates(new Date(2026, 6, 8), -1)[0])).toBe("2026-06-29");
  });
});

describe("isSameDay + formatWeekRange", () => {
  it("detects same calendar day", () => {
    expect(isSameDay(new Date(2026, 6, 8, 9), new Date(2026, 6, 8, 20))).toBe(true);
    expect(isSameDay(new Date(2026, 6, 8), new Date(2026, 6, 9))).toBe(false);
  });

  it("formats a week range", () => {
    expect(formatWeekRange(weekDates(new Date(2026, 6, 8), 0))).toBe("Jul 6 – 12");
  });
});
