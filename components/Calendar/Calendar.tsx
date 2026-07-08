"use client";

import { useMemo, useState } from "react";
import type { CalendarBlock as Block } from "@/lib/types";
import { DAY_LABELS } from "@/lib/config";
import {
  defaultWindow,
  gridHeightPx,
  HOUR_PX,
  formatHour,
  hourMarks,
  minutesToTopPx,
  type GridWindow,
} from "@/lib/time";
import { formatWeekRange, isSameDay, weekDates } from "@/lib/week";
import { CalendarBlock } from "./CalendarBlock";

const GUTTER_PX = 52;

interface CalendarProps {
  blocks: Block[];
  /** "Today" — drives the highlighted column and the default week. */
  referenceDate: Date;
  /** Visible time window; defaults to the configured 6am–10pm. */
  window?: GridWindow;
}

export function Calendar({
  blocks,
  referenceDate,
  window = defaultWindow,
}: CalendarProps) {
  const [weekOffset, setWeekOffset] = useState(0);

  const dates = useMemo(
    () => weekDates(referenceDate, weekOffset),
    [referenceDate, weekOffset],
  );
  const marks = hourMarks(window);
  const bodyHeight = gridHeightPx(window);
  const gridCols = `${GUTTER_PX}px repeat(7, minmax(0, 1fr))`;

  const topLevel = blocks.filter((b) => !b.parentId);
  const nested = blocks.filter((b) => b.parentId);

  return (
    <div data-testid="calendar" className="flex h-full flex-col">
      {/* Controls */}
      <div className="flex items-center justify-between gap-3 px-1 pb-3">
        <h2 className="text-sm font-semibold text-ink">
          {formatWeekRange(dates)}
          {weekOffset === 0 && (
            <span className="ml-2 rounded-full bg-work-soft px-2 py-0.5 text-[11px] font-medium text-work">
              This week
            </span>
          )}
        </h2>
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="Previous week"
            onClick={() => setWeekOffset((w) => w - 1)}
            className="rounded-md border border-hairline bg-panel px-2 py-1 text-sm text-ink-soft hover:bg-surface"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={() => setWeekOffset(0)}
            className="rounded-md border border-hairline bg-panel px-2 py-1 text-xs font-medium text-ink hover:bg-surface"
          >
            Today
          </button>
          <button
            type="button"
            aria-label="Next week"
            onClick={() => setWeekOffset((w) => w + 1)}
            className="rounded-md border border-hairline bg-panel px-2 py-1 text-sm text-ink-soft hover:bg-surface"
          >
            ›
          </button>
        </div>
      </div>

      {/* Day headers */}
      <div
        className="grid border-b border-hairline"
        style={{ gridTemplateColumns: gridCols }}
      >
        <div />
        {dates.map((date, i) => {
          const today = isSameDay(date, referenceDate);
          return (
            <div
              key={i}
              data-testid="day-header"
              data-today={today ? "true" : "false"}
              className="flex flex-col items-center py-2"
            >
              <span className="text-[11px] font-medium uppercase tracking-wide text-ink-soft">
                {DAY_LABELS[i]}
              </span>
              <span
                className={
                  today
                    ? "mt-0.5 flex h-7 w-7 items-center justify-center rounded-full bg-work text-sm font-semibold text-white"
                    : "mt-0.5 flex h-7 w-7 items-center justify-center text-sm font-semibold text-ink"
                }
              >
                {date.getDate()}
              </span>
            </div>
          );
        })}
      </div>

      {/* Scrollable grid body */}
      <div className="min-h-0 flex-1 overflow-auto">
        <div
          className="grid"
          style={{ gridTemplateColumns: gridCols, height: `${bodyHeight}px` }}
        >
          {/* Hour gutter */}
          <div className="relative">
            {marks.map((h) => (
              <span
                key={h}
                className="absolute right-1 -translate-y-1/2 text-[10px] text-ink-soft"
                style={{ top: `${minutesToTopPx(h * 60, window)}px` }}
              >
                {formatHour(h)}
              </span>
            ))}
          </div>

          {/* Day columns */}
          {dates.map((date, dayIndex) => {
            const today = isSameDay(date, referenceDate);
            return (
              <div
                key={dayIndex}
                data-testid="day-column"
                className={`relative border-l border-hairline ${
                  today ? "bg-work-soft/30" : ""
                }`}
                style={{
                  backgroundImage:
                    "repeating-linear-gradient(to bottom, transparent 0, transparent 59px, var(--color-hairline) 59px, var(--color-hairline) 60px)",
                  backgroundSize: `100% ${HOUR_PX}px`,
                }}
              >
                {topLevel
                  .filter((b) => b.day === dayIndex)
                  .map((b) => (
                    <CalendarBlock key={b.id} block={b} window={window} />
                  ))}
                {nested
                  .filter((b) => b.day === dayIndex)
                  .map((b) => (
                    <CalendarBlock key={b.id} block={b} window={window} nested />
                  ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
