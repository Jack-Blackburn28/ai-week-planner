/**
 * Build a WeekState for a planner request from the app's current state.
 * Proposed (pending) blocks are excluded — the planner reasons about what's
 * fixed/approved, not about a draft it may be replacing. Framework-free, so it's
 * safe to import from client components (no SDK).
 */
import type { CalendarBlock, TodoItem } from "@/lib/types";
import type { WeekState } from "./types";

export function toWeekState(
  blocks: CalendarBlock[],
  todos: TodoItem[],
): WeekState {
  return {
    blocks: blocks.filter((b) => b.status !== "proposed"),
    todos,
  };
}
