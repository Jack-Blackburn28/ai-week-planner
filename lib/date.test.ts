import { describe, expect, it } from "vitest";
import { addDays, classifyDue, daysUntil, isoDate } from "@/lib/date";

const TODAY = new Date(2026, 6, 8); // 2026-07-08 (month is 0-indexed)

describe("isoDate / addDays", () => {
  it("formats a date as YYYY-MM-DD", () => {
    expect(isoDate(TODAY)).toBe("2026-07-08");
  });

  it("adds and subtracts days across month boundaries", () => {
    expect(isoDate(addDays(TODAY, -8))).toBe("2026-06-30");
    expect(isoDate(addDays(TODAY, 25))).toBe("2026-08-02");
  });
});

describe("daysUntil", () => {
  it("returns 0 for today, positive for future, negative for past", () => {
    expect(daysUntil("2026-07-08", TODAY)).toBe(0);
    expect(daysUntil("2026-07-10", TODAY)).toBe(2);
    expect(daysUntil("2026-07-05", TODAY)).toBe(-3);
  });
});

describe("classifyDue", () => {
  it("classifies past dates as overdue", () => {
    expect(classifyDue("2026-07-07", TODAY)).toBe("overdue");
  });

  it("classifies today and the next two days as soon", () => {
    expect(classifyDue("2026-07-08", TODAY)).toBe("soon");
    expect(classifyDue("2026-07-10", TODAY)).toBe("soon");
  });

  it("classifies dates further out as normal", () => {
    expect(classifyDue("2026-07-11", TODAY)).toBe("normal");
  });
});
