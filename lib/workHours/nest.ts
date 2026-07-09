/**
 * Assign `parentId` to any event fully contained within a work-hours block
 * on the same day — regardless of which account/calendar it came from. Pure
 * and framework-free; does not mutate its inputs.
 */
import type { CalendarBlock } from "@/lib/types";

/**
 * Return `events` with `parentId` set on any event whose full
 * `[startMinutes, endMinutes]` range falls within a same-day block in
 * `workHoursBlocks`. Events with no containing work-hours block, or only a
 * partial overlap, are returned unchanged.
 */
export function nestWithinWorkHours(
  workHoursBlocks: CalendarBlock[],
  events: CalendarBlock[],
): CalendarBlock[] {
  return events.map((event) => {
    const container = workHoursBlocks.find(
      (w) =>
        w.day === event.day &&
        event.startMinutes >= w.startMinutes &&
        event.endMinutes <= w.endMinutes,
    );
    return container ? { ...event, parentId: container.id } : event;
  });
}
