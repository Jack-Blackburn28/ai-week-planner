/**
 * The busy model: the planner must never overlap a "busy" block. Real work and
 * personal events are marked `immovable` by `eventMap`, while "AI Calendar"
 * events are marked NOT immovable — so filtering to immovable blocks yields
 * exactly the set the AI must plan around, and excludes the AI's own placements.
 */
import type { CalendarBlock } from "@/lib/types";

/** The busy (immovable) blocks — real work + personal events, never AI-Calendar. */
export function busyBlocks(blocks: CalendarBlock[]): CalendarBlock[] {
  return blocks.filter((b) => b.immovable);
}
