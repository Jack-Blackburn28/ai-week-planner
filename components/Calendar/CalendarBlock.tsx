import type { BlockSource, CalendarBlock as Block } from "@/lib/types";
import {
  durationToHeightPx,
  formatRange,
  minutesToTopPx,
  type GridWindow,
} from "@/lib/time";

/**
 * Literal Tailwind class strings per source, so the JIT compiler can see them
 * (dynamic `bg-${source}` template strings would NOT be detected).
 */
const SOURCE_STYLE: Record<
  BlockSource,
  { fill: string; border: string; text: string; solid: string }
> = {
  work: {
    fill: "bg-work-soft",
    border: "border-work",
    text: "text-work",
    solid: "bg-work",
  },
  school: {
    fill: "bg-school-soft",
    border: "border-school",
    text: "text-school",
    solid: "bg-school",
  },
  personal: {
    fill: "bg-personal-soft",
    border: "border-personal",
    text: "text-personal",
    solid: "bg-personal",
  },
};

/** Horizontal offset (px) applied per cascade level for overlapping blocks. */
const CASCADE_STEP = 16;

interface CalendarBlockProps {
  block: Block;
  window: GridWindow;
  /** Meetings shown inside a work-hours block get an inset, solid style. */
  nested?: boolean;
  /** Cascade depth: how many earlier overlapping blocks. Offsets this one right. */
  depth?: number;
}

export function CalendarBlock({
  block,
  window,
  nested,
  depth = 0,
}: CalendarBlockProps) {
  const style = SOURCE_STYLE[block.source];
  const top = minutesToTopPx(block.startMinutes, window);
  const height = durationToHeightPx(block.startMinutes, block.endMinutes);
  const isProposed = block.status === "proposed";
  // Overlapping blocks fan out: each deeper block is nudged right and layered on
  // top, so the ones behind still peek out on the left instead of being covered.
  const leftPx = (nested ? 10 : 2) + depth * CASCADE_STEP;

  // Nested meetings: solid fill, white text, inset from the left so the parent
  // work block reads as "containing" them. Everything else: soft fill.
  const appearance = nested
    ? `${style.solid} border ${style.border} text-white`
    : isProposed
      ? `${style.fill} ${style.text} border-2 border-dashed ${style.border} opacity-80`
      : `${style.fill} ${style.text} border-l-4 ${style.border}`;

  return (
    <div
      data-testid="calendar-block"
      data-block-id={block.id}
      data-source={block.source}
      data-status={block.status}
      data-nested={nested ? "true" : "false"}
      className={`absolute overflow-hidden rounded-md px-2 py-1 text-left ${appearance}`}
      style={{
        top: `${top}px`,
        height: `${Math.max(height, 18)}px`,
        left: `${leftPx}px`,
        right: "2px",
        zIndex: (nested ? 10 : 1) + depth,
      }}
      title={`${block.title} · ${formatRange(block.startMinutes, block.endMinutes)}`}
    >
      <p className="truncate text-[11px] font-semibold leading-tight">
        {block.title}
        {isProposed && (
          <span className="ml-1 font-normal opacity-80">(proposed)</span>
        )}
      </p>
      {height >= 34 && (
        <p className="truncate text-[10px] leading-tight opacity-90">
          {formatRange(block.startMinutes, block.endMinutes)}
        </p>
      )}
    </div>
  );
}
