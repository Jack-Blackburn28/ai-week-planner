import type { BlockSource } from "@/lib/types";
import type { AllDayEvent } from "@/lib/google/eventMap";

/** Source → static Tailwind classes (kept static so JIT keeps them). */
const TONE: Record<BlockSource, string> = {
  work: "bg-work-soft text-work",
  school: "bg-school-soft text-school",
  personal: "bg-personal-soft text-personal",
};

interface Props {
  events: AllDayEvent[];
  gutterPx: number;
}

/**
 * A thin per-day strip for all-day events (e.g. birthdays, vacation). These are
 * shown for context but are NOT busy time — the AI may still plan on that day.
 */
export function AllDayStrip({ events, gutterPx }: Props) {
  if (events.length === 0) return null;
  const gridCols = `${gutterPx}px repeat(7, minmax(0, 1fr))`;

  return (
    <div
      data-testid="all-day-strip"
      className="grid shrink-0 border-b border-hairline bg-surface"
      style={{ gridTemplateColumns: gridCols }}
    >
      <div className="flex items-center justify-end pr-1 text-[10px] uppercase tracking-wide text-ink-soft">
        all-day
      </div>
      {Array.from({ length: 7 }, (_, day) => (
        <div key={day} className="flex flex-col gap-0.5 border-l border-hairline p-1">
          {events
            .filter((e) => e.day === day)
            .map((e) => (
              <span
                key={e.id}
                data-testid="all-day-event"
                title={e.title}
                className={`truncate rounded px-1 py-0.5 text-[10px] font-medium ${TONE[e.source]}`}
              >
                {e.title}
              </span>
            ))}
        </div>
      ))}
    </div>
  );
}
