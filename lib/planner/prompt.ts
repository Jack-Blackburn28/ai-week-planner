/**
 * Pure prompt builders — the system prompt (core rules) and a compact
 * serialization of the week. No SDK/DOM here, so they are unit-tested directly.
 */
import type { CalendarBlock } from "@/lib/types";
import { DAY_LABELS } from "@/lib/config";
import { formatRange } from "@/lib/time";
import type { WeekState } from "./types";

/** The system prompt encoding the planner's non-negotiable rules. */
export function buildSystemPrompt(): string {
  return [
    "You are Jack's personal week-planning assistant.",
    "Jack's work hours and class times are IMMOVABLE — never schedule anything over them.",
    "Only place proposed blocks in FREE time that does not overlap any immovable block.",
    "You PROPOSE plans; you never commit them. Jack approves or rejects each plan in the app.",
    "If a request cannot fit without overlapping an immovable block, DO NOT propose blocks.",
    "  Instead, reply asking how to resolve it and offer concrete options (shorten it,",
    "  move it to another day, or pick a different time). Never guess or overlap.",
    "The School todos are REAL assignment deadlines (from Canvas). Treat their due",
    "  dates as real: prioritize the soonest-due and any overdue work first, and if a",
    "  request would leave no time to finish something before its due date, warn Jack",
    "  and suggest scheduling it sooner. Still only propose blocks when Jack asks.",
    "Pick the right source for each block: work, school, or personal.",
    "Keep replies short and friendly.",
    "Times are minutes from midnight; day is 0=Monday … 6=Sunday.",
    "Return the required structured output: a `reply` string, and a `proposal`",
    "  (summary + blocks) ONLY when proposing time blocks; otherwise set proposal to null.",
  ].join("\n");
}

/** A compact, model-readable description of the current week. */
export function serializeWeek(week: WeekState): string {
  const fmt = (b: CalendarBlock) =>
    `${DAY_LABELS[b.day]} ${formatRange(b.startMinutes, b.endMinutes)} — ${b.title}`;

  const immovable = week.blocks.filter((b) => b.immovable).map(fmt);
  const approved = week.blocks
    .filter((b) => !b.immovable && b.status === "approved")
    .map(fmt);
  const todos = week.todos.map(
    (t) =>
      `[${t.section}] ${t.title} (${t.metaLabel}, ${
        t.dueDate ? `due ${t.dueDate}` : "no due date"
      })`,
  );

  return [
    "IMMOVABLE blocks (never schedule over these):",
    ...(immovable.length ? immovable : ["(none)"]),
    "",
    "Already-approved blocks:",
    ...(approved.length ? approved : ["(none)"]),
    "",
    "Todos (factor in due dates):",
    ...(todos.length ? todos : ["(none)"]),
  ].join("\n");
}
