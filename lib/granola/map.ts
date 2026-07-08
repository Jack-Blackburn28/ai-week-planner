/**
 * Pure mapping from extracted action items to persisted records and Work todos.
 * Framework-free and unit-tested — no network or SDK here.
 */
import type { TodoItem } from "@/lib/types";
import type {
  ExtractedActionItem,
  GranolaActionRecord,
  GranolaMeeting,
} from "./types";

/**
 * Build persisted action records for a meeting. Ids are stable
 * (`granola-<meetingId>-<n>`) so clearing + never-regenerate are deterministic:
 * re-processing the same meeting would produce the same ids.
 */
export function buildActionRecords(
  meeting: GranolaMeeting,
  items: ExtractedActionItem[],
  createdAt: string,
): GranolaActionRecord[] {
  return items.map((item, i) => ({
    id: `granola-${meeting.id}-${i}`,
    title: item.title,
    meetingId: meeting.id,
    meetingTitle: meeting.title,
    createdAt,
  }));
}

/** A persisted action record → a Work `TodoItem` (no due date; meeting = metaLabel). */
export function recordToTodo(record: GranolaActionRecord): TodoItem {
  return {
    id: record.id,
    section: "work",
    title: record.title,
    metaLabel: record.meetingTitle,
    done: false,
  };
}
