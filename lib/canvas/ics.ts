/**
 * Parse a Canvas calendar-feed (ICS) into raw assignments. SERVER-ONLY.
 *
 * This is the fallback source (used when no API token is configured). An ICS
 * feed carries essentially the event title + date only — no submission state —
 * so `submitted`/`graded` are left undefined and the mapped todo relies on
 * manual checking.
 *
 * Uses `ical.js` (Mozilla, pure-JS — no heavy Node deps), confirmed as the
 * current parsing API via context7.
 */
import ICAL from "ical.js";
import type { CanvasAssignment } from "./types";

/**
 * Canvas puts assignment due dates in the event start (DTSTART). Some feeds
 * prefix the course in brackets, e.g. "Essay: Cold War [HIST 202]" — pull that
 * out as the course label when present.
 */
/**
 * Turn Canvas's raw section code into a friendly label:
 * "2263-CHEM-311-01-33416" → "CHEM 311". Falls back to the raw value.
 */
function prettifyCourse(raw: string): string {
  const m = raw.match(/([A-Za-z]{2,})[-\s]?(\d{2,4})/);
  return m ? `${m[1].toUpperCase()} ${m[2]}` : raw.trim();
}

function splitTitleAndCourse(summary: string): { title: string; courseName: string } {
  const match = summary.match(/^(.*?)\s*\[([^\]]+)\]\s*$/);
  if (match) return { title: match[1].trim(), courseName: prettifyCourse(match[2]) };
  return { title: summary.trim(), courseName: "" };
}

/** Parse an ICS string into raw Canvas assignments (title + due date). */
export function parseIcsAssignments(ics: string): CanvasAssignment[] {
  let vevents: ICAL.Component[];
  try {
    const comp = new ICAL.Component(ICAL.parse(ics));
    vevents = comp.getAllSubcomponents("vevent") ?? [];
  } catch {
    return [];
  }

  const out: CanvasAssignment[] = [];

  for (const vevent of vevents) {
    let event: ICAL.Event;
    try {
      event = new ICAL.Event(vevent);
    } catch {
      continue;
    }
    const summary = event.summary ?? "";
    if (!summary) continue;

    const { title, courseName } = splitTitleAndCourse(summary);
    const dueAt = event.startDate ? event.startDate.toJSDate().toISOString() : null;

    out.push({
      id: event.uid || `${title}-${dueAt ?? "nodue"}`,
      title,
      courseName,
      dueAt,
    });
  }

  return out;
}
