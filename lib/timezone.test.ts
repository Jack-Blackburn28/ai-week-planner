import { afterEach, describe, expect, it, vi } from "vitest";
import { nowInPacific, toPacific } from "@/lib/timezone";

describe("toPacific", () => {
  it("converts a known summer instant to Pacific Daylight Time (UTC-7)", () => {
    const d = toPacific(new Date("2026-07-08T16:00:00Z"));
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(6); // July, 0-indexed
    expect(d.getDate()).toBe(8);
    expect(d.getHours()).toBe(9);
    expect(d.getMinutes()).toBe(0);
  });

  it("converts a known winter instant to Pacific Standard Time (UTC-8)", () => {
    const d = toPacific(new Date("2026-01-08T16:00:00Z"));
    expect(d.getHours()).toBe(8);
  });

  describe("spring-forward DST transition (2026-03-08, 2:00 AM -> 3:00 AM)", () => {
    it("reads as PST (UTC-8) just before the jump", () => {
      const d = toPacific(new Date("2026-03-08T09:59:00Z"));
      expect(d.getHours()).toBe(1);
      expect(d.getMinutes()).toBe(59);
    });

    it("reads as PDT (UTC-7) right at/after the jump", () => {
      const d = toPacific(new Date("2026-03-08T10:00:00Z"));
      expect(d.getHours()).toBe(3);
      expect(d.getMinutes()).toBe(0);
    });
  });

  describe("fall-back DST transition (2026-11-01, 2:00 AM -> 1:00 AM)", () => {
    it("reads as PDT (UTC-7) just before the jump", () => {
      const d = toPacific(new Date("2026-11-01T08:59:00Z"));
      expect(d.getHours()).toBe(1);
      expect(d.getMinutes()).toBe(59);
    });

    it("reads as PST (UTC-8) right at/after the jump (the repeated hour)", () => {
      const d = toPacific(new Date("2026-11-01T09:00:00Z"));
      expect(d.getHours()).toBe(1);
      expect(d.getMinutes()).toBe(0);
    });
  });
});

describe("nowInPacific", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("reports Pacific wall-clock fields for the current system time", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-08T16:00:00Z"));
    const d = nowInPacific();
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(6);
    expect(d.getDate()).toBe(8);
    expect(d.getHours()).toBe(9);
  });

  it("is unaffected by the process's own timezone", () => {
    const originalTz = process.env.TZ;
    process.env.TZ = "UTC";
    try {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-07-08T16:00:00Z"));
      const d = nowInPacific();
      expect(d.getHours()).toBe(9);
    } finally {
      process.env.TZ = originalTz;
    }
  });
});
