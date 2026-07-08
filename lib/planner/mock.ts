/**
 * Deterministic offline planner used when no ANTHROPIC_API_KEY is set. It lets the
 * whole app run and be tested without a key. It mirrors the real planner's contract:
 * a friendly reply plus an optional proposal, and it declines (asks) on a conflict
 * signal instead of proposing an overlapping block.
 */
import type { PlannerRequest, PlannerResponse } from "./types";

const DAY_NAMES = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

/** Phrases that signal the user is asking for something that can't fit. */
const CONFLICT_HINTS = [
  "during work",
  "over my meeting",
  "impossible",
  "can't move",
  "cannot move",
  "double book",
  "double-book",
  "9am monday",
];

const MOCK_NOTE = "(Offline mock planner — add an API key for real AI planning.)";

function lastUserText(req: PlannerRequest): string {
  return (
    [...req.messages].reverse().find((m) => m.role === "user")?.text ?? ""
  ).toLowerCase();
}

export function mockPlanner(req: PlannerRequest): PlannerResponse {
  const text = lastUserText(req);

  if (CONFLICT_HINTS.some((h) => text.includes(h))) {
    return {
      reply: `That time collides with a fixed commitment on your calendar. Want me to (a) find the nearest open slot, (b) shorten it, or (c) move it to another day? ${MOCK_NOTE}`,
    };
  }

  // Light replanning: if a weekday is named, anchor the gym block to that day.
  const namedDay = DAY_NAMES.findIndex((d) => text.includes(d));
  const gymDay = namedDay >= 0 ? namedDay : 4; // default Friday

  return {
    reply: `Here's a draft plan in your free evenings and weekend — review it on the calendar, then Approve or Make changes. ${MOCK_NOTE}`,
    proposal: {
      summary: "Gym, a study block, and reading placed in open slots around your week.",
      blocks: [
        { title: "Gym", source: "personal", day: gymDay, startMinutes: 20 * 60, endMinutes: 21 * 60 },
        { title: "Study session", source: "school", day: 3, startMinutes: 20 * 60, endMinutes: 21 * 60 + 30 },
        { title: "Reading", source: "personal", day: 6, startMinutes: 14 * 60, endMinutes: 15 * 60 },
      ],
    },
  };
}
