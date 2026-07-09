/**
 * Expand a recurring `WorkHoursRule` into real immovable `CalendarBlock`s for
 * a displayed week. Pure and framework-free (no SDK, no fetch), mirroring
 * `lib/google/eventMap.ts`'s role for the Google integration.
 */
import type { CalendarBlock } from "@/lib/types";
import { isoDate } from "@/lib/date";
import { weekDates } from "@/lib/week";
import type { WorkHoursRule } from "./types";

/** The block title shown for the work-hours container. */
export const WORK_HOURS_TITLE = "Work Hours";

/**
 * Expand `rule` into one immovable `CalendarBlock` per configured day, for
 * the week `weekOffset` weeks from `reference`. Days absent from the rule
 * produce no block.
 */
export function expandWorkHours(
  rule: WorkHoursRule,
  reference: Date,
  weekOffset = 0,
): CalendarBlock[] {
  const dates = weekDates(reference, weekOffset);
  const blocks: CalendarBlock[] = [];

  for (const [dayKey, hours] of Object.entries(rule.days)) {
    if (!hours) continue;
    const day = Number(dayKey);
    const date = dates[day];
    if (!date) continue;
    blocks.push({
      id: `work-hours-${isoDate(date)}`,
      title: WORK_HOURS_TITLE,
      source: "work",
      status: "approved",
      day,
      startMinutes: hours.startMinutes,
      endMinutes: hours.endMinutes,
      immovable: true,
    });
  }

  return blocks.sort((a, b) => a.day - b.day);
}
