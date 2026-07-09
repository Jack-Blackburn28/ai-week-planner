import { describe, expect, it } from "vitest";
import { inScope, mapAssignments, mapAssignmentToTodo } from "./map";
import type { CanvasAssignment } from "./types";

// Fixed "today" so scope math is deterministic regardless of the machine clock.
const today = new Date(2026, 6, 8); // 2026-07-08 (local)

// Noon-UTC due times so the local-date conversion stays on the same calendar day
// in US timezones (the app treats due dates at day granularity, local time).
const noon = (iso: string) => `${iso}T12:00:00.000Z`;

const make = (over: Partial<CanvasAssignment>): CanvasAssignment => ({
  id: "1",
  title: "Essay",
  courseName: "HIST 202",
  dueAt: noon("2026-07-10"),
  ...over,
});

describe("mapAssignmentToTodo", () => {
  it("maps course→metaLabel, due_at→local date, into a School item", () => {
    const todo = mapAssignmentToTodo(make({}));
    expect(todo).toMatchObject({
      id: "canvas-1",
      section: "school",
      title: "Essay",
      metaLabel: "HIST 202",
      dueDate: "2026-07-10",
      done: false,
    });
  });

  it("marks submitted OR graded assignments done", () => {
    expect(mapAssignmentToTodo(make({ submitted: true })).done).toBe(true);
    expect(mapAssignmentToTodo(make({ graded: true })).done).toBe(true);
  });

  it("leaves dueDate undefined for undated assignments", () => {
    const todo = mapAssignmentToTodo(make({ dueAt: null }));
    expect(todo.dueDate).toBeUndefined();
  });

  it("defaults metaLabel to 'Canvas' when no course is known", () => {
    expect(mapAssignmentToTodo(make({ courseName: "" })).metaLabel).toBe(
      "Canvas",
    );
  });

  it("buckets due_at to the correct Pacific calendar day, not the UTC day, regardless of process timezone", () => {
    const originalTz = process.env.TZ;
    process.env.TZ = "UTC";
    try {
      // 2026-07-10T02:00:00Z is 2026-07-09, 7:00 PM Pacific (PDT, UTC-7) — a
      // different calendar day in Pacific than in UTC.
      const todo = mapAssignmentToTodo(
        make({ dueAt: "2026-07-10T02:00:00.000Z" }),
      );
      expect(todo.dueDate).toBe("2026-07-09");
    } finally {
      process.env.TZ = originalTz;
    }
  });
});

describe("inScope / mapAssignments (scope filter)", () => {
  it("includes future and recently-overdue, excludes far-overdue", () => {
    const future = make({ id: "f", dueAt: noon("2026-07-20") });
    const recentOverdue = make({ id: "r", dueAt: noon("2026-07-01") }); // 7d ago
    const farOverdue = make({ id: "o", dueAt: noon("2026-06-01") }); // >14d ago

    expect(inScope(future, today)).toBe(true);
    expect(inScope(recentOverdue, today)).toBe(true);
    expect(inScope(farOverdue, today)).toBe(false);

    const todos = mapAssignments([future, recentOverdue, farOverdue], today);
    expect(todos.map((t) => t.id)).toEqual(["canvas-f", "canvas-r"]);
  });

  it("always includes undated assignments", () => {
    const undated = make({ id: "u", dueAt: null });
    expect(inScope(undated, today)).toBe(true);
    expect(mapAssignments([undated], today)).toHaveLength(1);
  });

  it("upcoming-only (overdue window 0) drops all past-due, keeps future + undated", () => {
    const future = make({ id: "f", dueAt: noon("2026-07-20") });
    const overdue = make({ id: "o", dueAt: noon("2026-07-01") }); // any past date
    const undated = make({ id: "u", dueAt: null });

    expect(inScope(overdue, today, 0)).toBe(false);
    expect(inScope(future, today, 0)).toBe(true);
    expect(inScope(undated, today, 0)).toBe(true);

    const todos = mapAssignments([future, overdue, undated], today, 0);
    expect(todos.map((t) => t.id)).toEqual(["canvas-f", "canvas-u"]);
  });
});
