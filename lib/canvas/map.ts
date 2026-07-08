/**
 * Pure mapping from raw Canvas assignments to School `TodoItem`s, plus the scope
 * filter. Framework-free and fully unit-tested — no network or SDK here.
 *
 * Scope (confirmed with Jack): include assignments due in the future OR overdue
 * within a recent window, AND include undated assignments (shown as "No due
 * date", manually checkable). "Current-term only" is enforced upstream at fetch
 * time (active enrollments); this filter handles the date window.
 */
import type { TodoItem } from "@/lib/types";
import { daysUntil, isoDate } from "@/lib/date";
import type { CanvasAssignment } from "./types";

/** How many days an overdue assignment stays in the list before it drops off. */
export const OVERDUE_WINDOW_DAYS = 14;

/** Canvas `due_at` (ISO, often UTC) → local `YYYY-MM-DD`, or undefined if none. */
function toDueDate(dueAt: string | null): string | undefined {
  if (!dueAt) return undefined;
  const d = new Date(dueAt);
  if (Number.isNaN(d.getTime())) return undefined;
  return isoDate(d);
}

/** Whether an assignment falls inside the displayed scope window. */
export function inScope(assignment: CanvasAssignment, today: Date): boolean {
  const due = toDueDate(assignment.dueAt);
  if (!due) return true; // undated → always included (just checkable)
  // Keep everything due today-or-later, and overdue items within the window.
  return daysUntil(due, today) >= -OVERDUE_WINDOW_DAYS;
}

/** Map one raw assignment to a School todo. Submitted/graded → done. */
export function mapAssignmentToTodo(assignment: CanvasAssignment): TodoItem {
  return {
    id: `canvas-${assignment.id}`,
    section: "school",
    title: assignment.title,
    metaLabel: assignment.courseName || "Canvas",
    dueDate: toDueDate(assignment.dueAt),
    done: Boolean(assignment.submitted || assignment.graded),
  };
}

/** Filter to scope, then map to School todos. */
export function mapAssignments(
  assignments: CanvasAssignment[],
  today: Date,
): TodoItem[] {
  return assignments
    .filter((a) => inScope(a, today))
    .map((a) => mapAssignmentToTodo(a));
}
