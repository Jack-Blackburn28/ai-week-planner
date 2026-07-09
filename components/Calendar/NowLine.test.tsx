import { act, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { defaultWindow, minutesToTopPx } from "@/lib/time";
import { NowLine } from "./NowLine";

describe("NowLine", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("positions the line using Pacific time, not the process's own timezone", () => {
    const originalTz = process.env.TZ;
    process.env.TZ = "UTC";
    try {
      vi.useFakeTimers();
      // 2026-07-08T16:00:00Z = 9:00 AM Pacific (PDT, UTC-7) in July.
      const instant = new Date("2026-07-08T16:00:00Z");
      vi.setSystemTime(instant);

      render(<NowLine referenceDate={instant} window={defaultWindow} />);

      // Advance past the 60s tick so NowLine recomputes "now" via nowInPacific().
      act(() => {
        vi.advanceTimersByTime(60_000);
      });

      // The fake clock is now 1 minute past the seeded instant: 9:01 AM Pacific.
      const line = screen.getByTestId("now-line");
      const expectedTop = minutesToTopPx(9 * 60 + 1, defaultWindow);
      expect(line.style.top).toBe(`${expectedTop}px`);
    } finally {
      process.env.TZ = originalTz;
    }
  });
});
