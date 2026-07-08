/**
 * Turn AI-proposed blocks into calendar blocks and enforce the core rule
 * server-side: the AI's output is UNTRUSTED, so any proposed block that would
 * overlap an immovable block is dropped before it can reach the calendar.
 */
import type { CalendarBlock } from "@/lib/types";
import { overlapsImmovable } from "@/lib/planning";
import type { ProposedBlock } from "./types";

/** Map AI `ProposedBlock`s to `proposed`-status `CalendarBlock`s with stable ids. */
export function toCalendarBlocks(blocks: ProposedBlock[]): CalendarBlock[] {
  return blocks.map((b, i) => ({
    id: `prop-${i}`,
    title: b.title,
    source: b.source,
    status: "proposed",
    day: b.day,
    startMinutes: b.startMinutes,
    endMinutes: b.endMinutes,
  }));
}

/**
 * Keep only proposed blocks that do NOT overlap an immovable block in the week.
 * `existing` is the current week's blocks (the immovable ones are what matter).
 */
export function validateProposedBlocks(
  proposed: CalendarBlock[],
  existing: CalendarBlock[],
): CalendarBlock[] {
  return proposed.filter((b) => !overlapsImmovable(b, existing));
}
