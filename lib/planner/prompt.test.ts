import { describe, expect, it } from "vitest";
import type { CalendarBlock, TodoItem } from "@/lib/types";
import { buildSystemPrompt, serializeWeek } from "./prompt";

describe("buildSystemPrompt", () => {
  it("encodes the core planner rules", () => {
    const p = buildSystemPrompt().toLowerCase();
    expect(p).toContain("immovable");
    expect(p).toContain("never schedule");
    expect(p).toContain("propose");
    expect(p).toContain("do not propose"); // the conflict rule
  });
});

describe("serializeWeek", () => {
  const blocks: CalendarBlock[] = [
    {
      id: "w",
      title: "Work",
      source: "work",
      status: "approved",
      day: 0,
      startMinutes: 540,
      endMinutes: 1020,
      immovable: true,
    },
    {
      id: "gym",
      title: "Gym",
      source: "personal",
      status: "approved",
      day: 2,
      startMinutes: 420,
      endMinutes: 480,
    },
  ];
  const todos: TodoItem[] = [
    {
      id: "s1",
      section: "school",
      title: "Essay draft",
      metaLabel: "HIST 202",
      dueDate: "2026-07-10",
      done: false,
    },
  ];

  it("lists immovable blocks, approved blocks, and todos with due dates", () => {
    const out = serializeWeek({ blocks, todos });
    expect(out).toContain("IMMOVABLE");
    expect(out).toContain("Mon"); // day label for the work block
    expect(out).toContain("Work");
    expect(out).toContain("Gym"); // approved block
    expect(out).toContain("Essay draft");
    expect(out).toContain("2026-07-10"); // due date surfaced
  });
});
