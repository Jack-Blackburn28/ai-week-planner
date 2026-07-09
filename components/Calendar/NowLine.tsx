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
 * a thin red line with a dot on the left edge. Ticks every minute. Hidden when
 * the current time falls outside the visible window.
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
      <div className="relative border-t-2 border-red-500">
        {/* Dot on the left edge (like Google Calendar). */}
        <span className="absolute -left-[1px] top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full bg-red-500" />
      </div>
    </div>
  );
}
