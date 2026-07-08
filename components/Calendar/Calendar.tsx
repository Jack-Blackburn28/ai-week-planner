"use client";

import { useMemo, useState } from "react";
import type { CalendarBlock as Block } from "@/lib/types";
import { DAY_LABELS } from "@/lib/config";
import {
  gridHeightPx,
  HOUR_PX,
  formatHour,
  hourMarks,
  minutesToTopPx,
  windowForBlocks,
} from "@/lib/time";
import { formatWeekRange, isSameDay, weekDates } from "@/lib/week";
import { cascadeDepths } from "@/lib/overlap";
import type { AllDayEvent } from "@/lib/google/eventMap";
import { CalendarBlock } from "./CalendarBlock";
import { NowLine } from "./NowLine";
import { AllDayStrip } from "./AllDayStrip";
import { Legend } from "@/components/Legend";

const GUTTER_PX = 52;

interface CalendarProps {
  blocks: Block[];
  /** "Today" — drives the highlighted column and the default week. */
  referenceDate: Date;
  /** All-day events for the displayed week (thin top strip; not busy). */
  allDayEvents?: AllDayEvent[];
  /** Controlled week offset (0 = this week). Falls back to internal state. */
  weekOffset?: number;
  onWeekOffsetChange?: (offset: number) => void;
  /** Optional manual refresh (re-pull events from Google). */
  onRefresh?: () => void;
  loading?: boolean;
}

export function Calendar({
  blocks,
  referenceDate,
  allDayEvents = [],
  weekOffset,
  onWeekOffsetChange,
  onRefresh,
  loading = false,
}: CalendarProps) {
  const [internalOffset, setInternalOffset] = useState(0);
  const offset = weekOffset ?? internalOffset;
  const changeOffset = onWeekOffsetChange ?? setInternalOffset;

  const dates = useMemo(
    () => weekDates(referenceDate, offset),
    [referenceDate, offset],
  );
  // Widen the window to fit any out-of-range Google events.
  const window = useMemo(() => windowForBlocks(blocks), [blocks]);
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
          {offset === 0 && (
            <span className="ml-2 rounded-full bg-work-soft px-2 py-0.5 text-[11px] font-medium text-work">
              This week
            </span>
          )}
        </h2>
        <div className="flex items-center gap-3">
          <Legend className="hidden lg:flex" />
          <div className="flex items-center gap-1">
            {onRefresh && (
              <button
                type="button"
                aria-label="Refresh calendar"
                onClick={onRefresh}
                disabled={loading}
                className="mr-1 rounded-md border border-hairline bg-panel px-2 py-1 text-xs font-medium text-ink-soft hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-work-ring disabled:opacity-50"
              >
                {loading ? "Refreshing…" : "Refresh"}
              </button>
            )}
            <button
              type="button"
              aria-label="Previous week"
              onClick={() => changeOffset(offset - 1)}
              className="rounded-md border border-hairline bg-panel px-2 py-1 text-sm text-ink-soft hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-work-ring"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={() => changeOffset(0)}
              className="rounded-md border border-hairline bg-panel px-2 py-1 text-xs font-medium text-ink hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-work-ring"
            >
              Today
            </button>
            <button
              type="button"
              aria-label="Next week"
              onClick={() => changeOffset(offset + 1)}
              className="rounded-md border border-hairline bg-panel px-2 py-1 text-sm text-ink-soft hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-work-ring"
            >
              ›
            </button>
          </div>
        </div>
      </div>

      {/* Scroll area — scrolls vertically always, and horizontally on narrow
          screens (min-width keeps day columns readable on a phone). */}
      <div className="min-h-0 flex-1 overflow-auto">
        <div className="min-w-[760px] md:min-w-0">
          {/* Day headers (stick to the top while scrolling vertically) */}
          <div
            className="sticky top-0 z-20 grid border-b border-hairline bg-surface"
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
                  data-date={`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`}
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

          {/* All-day strip (context only — not busy) */}
          <AllDayStrip events={allDayEvents} gutterPx={GUTTER_PX} />

          {/* Grid body */}
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
              const dayTop = topLevel.filter((b) => b.day === dayIndex);
              const dayNested = nested.filter((b) => b.day === dayIndex);
              // Cascade depth per group so overlapping meetings fan out.
              const topDepth = cascadeDepths(dayTop);
              const nestedDepth = cascadeDepths(dayNested);
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
                  {dayTop.map((b) => (
                    <CalendarBlock
                      key={b.id}
                      block={b}
                      window={window}
                      depth={topDepth[b.id] ?? 0}
                    />
                  ))}
                  {dayNested.map((b) => (
                    <CalendarBlock
                      key={b.id}
                      block={b}
                      window={window}
                      nested
                      depth={nestedDepth[b.id] ?? 0}
                    />
                  ))}
                  {today && <NowLine referenceDate={referenceDate} window={window} />}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
