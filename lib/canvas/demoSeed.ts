/**
 * Sample Canvas assignments for demo mode (`CANVAS_MOCK=1`). All fabricated
 * placeholders — nothing real is connected. Due dates are relative to "now" so
 * the School list always looks current: one recently overdue, a few upcoming,
 * one already submitted (checked), and one with no due date.
 */
import type { CanvasAssignment } from "./types";

/** ISO timestamp `n` days from now at local noon (avoids date-boundary drift). */
function dueInDays(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  d.setHours(12, 0, 0, 0);
  return d.toISOString();
}

export function demoSeed(): CanvasAssignment[] {
  return [
    {
      id: "hist-essay",
      title: "Essay: Cold War causes",
      courseName: "HIST 202",
      dueAt: dueInDays(-2), // recently overdue
      submitted: false,
    },
    {
      id: "hist-reading",
      title: "Reading: chapters 4–5",
      courseName: "HIST 202",
      dueAt: dueInDays(-5), // overdue but already submitted → checked
      submitted: true,
    },
    {
      id: "math-pset5",
      title: "Problem set 5",
      courseName: "MATH 301",
      dueAt: dueInDays(1), // due tomorrow
      submitted: false,
    },
    {
      id: "math-pset6",
      title: "Problem set 6",
      courseName: "MATH 301",
      dueAt: dueInDays(6),
      submitted: false,
    },
    {
      id: "cs-project",
      title: "Final project proposal",
      courseName: "CS 350",
      dueAt: dueInDays(3),
      graded: false,
    },
    {
      id: "cs-participation",
      title: "Discussion participation (ongoing)",
      courseName: "CS 350",
      dueAt: null, // no due date → shown as "No due date", checkable
    },
  ];
}
