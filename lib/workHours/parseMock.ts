/**
 * Deterministic offline parser used when no ANTHROPIC_API_KEY is set, mirroring
 * `lib/planner/mock.ts`'s role: it does not need to handle arbitrary phrasing
 * as well as the real model, only common patterns (a simple time range, an
 * optional day range, and an optional "half day <weekday>" override). On
 * anything it doesn't recognize, it asks for clarification rather than
 * guessing.
 */
import type { WeekDay, WorkHoursRule } from "./types";

const MOCK_NOTE = "(Offline mock parser — add an API key for more flexible parsing.)";

const DAY_NAMES: Record<string, WeekDay> = {
  monday: 0, mon: 0,
  tuesday: 1, tue: 1, tues: 1,
  wednesday: 2, wed: 2,
  thursday: 3, thu: 3, thurs: 3,
  friday: 4, fri: 4,
  saturday: 5, sat: 5,
  sunday: 6, sun: 6,
};
const DAY_NAME_PATTERN = Object.keys(DAY_NAMES).sort((a, b) => b.length - a.length).join("|");

/** Parse a time token ("9", "9am", "9:30am", "5pm", "17:00") to minutes-of-day, or null. */
function parseTimeToken(token: string): number | null {
  const m = token.trim().match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/i);
  if (!m) return null;
  let hour = Number(m[1]);
  if (hour > 23) return null;
  const minute = m[2] ? Number(m[2]) : 0;
  const period = m[3]?.toLowerCase();
  if (period === "pm" && hour < 12) hour += 12;
  if (period === "am" && hour === 12) hour = 0;
  return hour * 60 + minute;
}

/** Parse a "start to end" time range, inferring AM/PM when only one side states it. */
function parseTimeRange(text: string): { startMinutes: number; endMinutes: number } | null {
  const m = text.match(
    /(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)\s*(?:to|-|–)\s*(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/i,
  );
  if (!m) return null;
  const rawStart = m[1];
  const rawEnd = m[2];
  const hasStartPeriod = /am|pm/i.test(rawStart);
  const hasEndPeriod = /am|pm/i.test(rawEnd);

  let startMinutes = parseTimeToken(hasStartPeriod ? rawStart : `${rawStart}am`);
  let endMinutes = parseTimeToken(hasEndPeriod ? rawEnd : `${rawEnd}pm`);
  if (startMinutes == null || endMinutes == null) return null;

  // If both sides gave an explicit period, trust it as-is (re-parse cleanly).
  if (hasStartPeriod) startMinutes = parseTimeToken(rawStart)!;
  if (hasEndPeriod) endMinutes = parseTimeToken(rawEnd)!;

  if (endMinutes <= startMinutes) return null;
  return { startMinutes, endMinutes };
}

/** Expand "monday through thursday" (inclusive, forward-only) to a list of days. */
function parseDayRange(text: string): WeekDay[] | null {
  const re = new RegExp(`\\b(${DAY_NAME_PATTERN})\\b\\s*(?:through|to|-)\\s*\\b(${DAY_NAME_PATTERN})\\b`, "i");
  const m = text.match(re);
  if (!m) return null;
  const start = DAY_NAMES[m[1].toLowerCase()];
  const end = DAY_NAMES[m[2].toLowerCase()];
  if (start > end) return null;
  const days: WeekDay[] = [];
  for (let d = start; d <= end; d++) days.push(d as WeekDay);
  return days;
}

/** Every "half day <weekday>" mention, as day indices needing a shortened range. */
function parseHalfDays(text: string): WeekDay[] {
  const re = new RegExp(`half[\\s-]?day\\s+(${DAY_NAME_PATTERN})`, "gi");
  const days: WeekDay[] = [];
  for (const m of text.matchAll(re)) {
    const day = DAY_NAMES[m[1].toLowerCase()];
    if (day !== undefined) days.push(day);
  }
  return days;
}

export function parseWorkHoursMock(
  message: string,
  currentRule: WorkHoursRule | null,
): { reply: string; proposedRule?: WorkHoursRule } {
  const text = message.toLowerCase();
  const range = parseTimeRange(text);
  const dayRange = parseDayRange(text);
  const halfDays = parseHalfDays(text);

  const explicitDays = [...text.matchAll(new RegExp(`\\b(${DAY_NAME_PATTERN})\\b`, "g"))]
    .map((m) => DAY_NAMES[m[1].toLowerCase()])
    .filter((d): d is WeekDay => d !== undefined);

  const days = new Set<WeekDay>([...(dayRange ?? []), ...explicitDays, ...halfDays]);

  if (!range || days.size === 0) {
    // Distinguish "I didn't understand a new instruction" from "what are my
    // hours" — never claim the user has none set when currentRule shows they do.
    const hasCurrent = currentRule && Object.keys(currentRule.days).length > 0;
    return {
      reply: hasCurrent
        ? `Your current hours are ${summarizeRule(currentRule!)}. To change them, try something like "9 to 5 Monday through Friday". ${MOCK_NOTE}`
        : `Sorry, I couldn't quite parse that — could you say it like "9 to 5 Monday through Friday"? ${MOCK_NOTE}`,
    };
  }

  const rule: WorkHoursRule = { days: {} };
  for (const day of days) {
    if (halfDays.includes(day)) {
      const half = Math.round((range.endMinutes - range.startMinutes) / 2);
      rule.days[day] = { startMinutes: range.startMinutes, endMinutes: range.startMinutes + half };
    } else {
      rule.days[day] = { ...range };
    }
  }

  const summary = summarizeRule(rule);
  const verb = currentRule ? "changing them to" : "setting them to";
  return {
    reply: `Got it — ${verb} ${summary}. Save this? ${MOCK_NOTE}`,
    proposedRule: rule,
  };
}

const DAY_LABEL = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function formatClock(minutes: number): string {
  const h24 = Math.floor(minutes / 60);
  const m = minutes % 60;
  const period = h24 >= 12 ? "pm" : "am";
  let h = h24 % 12;
  if (h === 0) h = 12;
  return m === 0 ? `${h}${period}` : `${h}:${String(m).padStart(2, "0")}${period}`;
}

/** A short plain-language summary of a rule, e.g. "Mon-Thu 9am-5pm, Fri 9am-1pm". */
export function summarizeRule(rule: WorkHoursRule): string {
  const entries = Object.entries(rule.days) as [string, { startMinutes: number; endMinutes: number }][];
  if (entries.length === 0) return "no working hours set";
  return entries
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([day, hours]) => `${DAY_LABEL[Number(day)]} ${formatClock(hours.startMinutes)}-${formatClock(hours.endMinutes)}`)
    .join(", ");
}
