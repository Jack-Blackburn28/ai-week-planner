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

  it("emphasizes real deadlines and prioritizing soonest-due / overdue work", () => {
    const p = buildSystemPrompt().toLowerCase();
    expect(p).toContain("deadline");
    expect(p).toContain("overdue");
    expect(p).toContain("soonest-due");
    // The approval + propose-on-request rules must remain intact.
    expect(p).toContain("only propose blocks when jack asks");
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

  it("renders undated todos as 'no due date' rather than 'due undefined'", () => {
    const out = serializeWeek({
      blocks,
      todos: [{ id: "u", section: "school", title: "Discussion", metaLabel: "CS 350", done: false }],
    });
    expect(out).toContain("Discussion");
    expect(out).toContain("no due date");
    expect(out).not.toContain("undefined");
  });
});
