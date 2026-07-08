import { describe, expect, it } from "vitest";
import { toWeekState } from "./week";
import { serializeWeek } from "./prompt";
import type { TodoItem } from "@/lib/types";

/**
 * Story 5: Granola-generated Work items (no due date) must reach the planner's
 * week state alongside School items, so the AI can propose time blocks for them.
 */
const todos: TodoItem[] = [
  { id: "granola-m1-0", section: "work", title: "Send the roadmap", metaLabel: "Platform Sync", done: false },
  { id: "canvas-1", section: "school", title: "Essay", metaLabel: "HIST 202", dueDate: "2026-07-10", done: false },
];

describe("toWeekState — todos reach the planner", () => {
  it("includes Work (Granola) and School (Canvas) todos", () => {
    const week = toWeekState([], todos);
    expect(week.todos.map((t) => t.id)).toEqual(["granola-m1-0", "canvas-1"]);
  });

  it("serializes an undated Work action item as 'no due date'", () => {
    const out = serializeWeek(toWeekState([], todos));
    expect(out).toContain("Send the roadmap");
    expect(out).toContain("no due date");
    expect(out).not.toContain("undefined");
  });
});
