"use client";

import { useEffect, useState } from "react";
import { minutesToTopPx, type GridWindow } from "@/lib/time";
import { nowInPacific } from "@/lib/timezone";

interface NowLineProps {
  /** "Today" — used only to seed the initial clock (avoids hydration mismatch). */
  referenceDate: Date;
  window: GridWindow;
}

/**
 * A red current-time indicator across today's column (Google Calendar style):
 * a thin red line with an arrowhead on the left edge. Ticks every minute.
 * Hidden when the current time falls outside the visible window.
 *
 * The line and arrowhead are both centered on this container's own `top`
 * (the exact current-time y-coordinate) via `top-0 -translate-y-1/2`, rather
 * than nesting the arrow inside a zero-height `border-top` line — that
 * indirection put the arrow's center on the line's edge, not its middle.
 */
export function NowLine({ referenceDate, window }: NowLineProps) {
  const [now, setNow] = useState<Date>(referenceDate);

  useEffect(() => {
    const id = setInterval(() => setNow(nowInPacific()), 60_000);
    return () => clearInterval(id);
  }, []);

  const minutes = now.getHours() * 60 + now.getMinutes();
  if (minutes < window.startHour * 60 || minutes > window.endHour * 60) {
    return null;
  }

  return (
    <div
      data-testid="now-line"
      className="pointer-events-none absolute left-0 right-0 z-30"
      style={{ top: `${minutesToTopPx(minutes, window)}px` }}
    >
      <div className="absolute inset-x-0 top-0 h-0.5 -translate-y-1/2 bg-red-500" />
      {/* Arrowhead at the left edge, tip touching the start of the line. */}
      <span
        aria-hidden
        className="absolute -left-[7px] top-0 h-0 w-0 -translate-y-1/2 border-y-[5px] border-l-[7px] border-y-transparent border-l-red-500"
      />
    </div>
  );
}
