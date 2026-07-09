import { describe, expect, it } from "vitest";
import type { CalendarBlock } from "@/lib/types";
import { toCalendarBlocks, validateProposedBlocks } from "./validate";
import type { ProposedBlock } from "./types";
import { expandWorkHours } from "@/lib/workHours/expand";

const workMon: CalendarBlock = {
  id: "work-0",
  title: "Work",
  source: "work",
  status: "approved",
  day: 0,
  startMinutes: 9 * 60,
  endMinutes: 17 * 60,
  immovable: true,
};

describe("toCalendarBlocks", () => {
  it("maps proposed blocks to proposed-status calendar blocks with ids", () => {
    const proposed: ProposedBlock[] = [
      { title: "Gym", source: "personal", day: 4, startMinutes: 1080, endMinutes: 1140 },
    ];
    const [block] = toCalendarBlocks(proposed);
    expect(block.status).toBe("proposed");
    expect(block.id).toBeTruthy();
    expect(block.title).toBe("Gym");
  });
});

describe("validateProposedBlocks (AI output is untrusted)", () => {
  it("drops a proposed block that overlaps an immovable block", () => {
    const proposed = toCalendarBlocks([
      // 10:00 Monday — squarely inside work hours
      { title: "Bad", source: "personal", day: 0, startMinutes: 600, endMinutes: 660 },
    ]);
    const result = validateProposedBlocks(proposed, [workMon]);
    expect(result).toHaveLength(0);
  });

  it("keeps a proposed block in free space", () => {
    const proposed = toCalendarBlocks([
      // 6:00 PM Monday — after work
      { title: "Gym", source: "personal", day: 0, startMinutes: 1080, endMinutes: 1140 },
    ]);
    const result = validateProposedBlocks(proposed, [workMon]);
    expect(result).toHaveLength(1);
  });

  it("keeps free blocks and drops overlapping ones from a mixed proposal", () => {
    const proposed = toCalendarBlocks([
      { title: "Bad", source: "personal", day: 0, startMinutes: 600, endMinutes: 660 },
      { title: "Good", source: "personal", day: 0, startMinutes: 1080, endMinutes: 1140 },
    ]);
    const result = validateProposedBlocks(proposed, [workMon]);
    expect(result.map((b) => b.title)).toEqual(["Good"]);
  });

  it("rejects a proposal overlapping a real (fetched) Google event", () => {
    // A real work meeting fetched from Google — immovable, like the mock skeleton.
    const realMeeting: CalendarBlock = {
      id: "g-standup",
      title: "Team standup",
      source: "work",
      status: "approved",
      day: 2, // Wed
      startMinutes: 10 * 60,
      endMinutes: 10 * 60 + 30,
      immovable: true,
      googleEventId: "standup",
      calendarId: "work-primary",
    };
    const proposed = toCalendarBlocks([
      // 10:15 Wed — squarely inside the real meeting
      { title: "Focus", source: "personal", day: 2, startMinutes: 615, endMinutes: 675 },
    ]);
    expect(validateProposedBlocks(proposed, [realMeeting])).toHaveLength(0);
  });

  it("rejects a proposal overlapping a configured work-hours block (Spec 11)", () => {
    // The same expandWorkHours() output the events route merges in — proves
    // the planner respects it as immovable with zero changes to this module.
    const [workHours] = expandWorkHours(
      { days: { 0: { startMinutes: 9 * 60, endMinutes: 17 * 60 } } },
      new Date(2026, 6, 6), // Mon 2026-07-06
    );
    const proposed = toCalendarBlocks([
      // 11:00 Monday — squarely inside the configured work hours
      { title: "Golf", source: "personal", day: 0, startMinutes: 660, endMinutes: 720 },
    ]);
    expect(validateProposedBlocks(proposed, [workHours])).toHaveLength(0);
  });

  it("allows a proposal overlapping an AI-Calendar event (not busy)", () => {
    // An AI-written block is NOT immovable, so the AI may re-plan over it.
    const aiBlock: CalendarBlock = {
      id: "g-gym",
      title: "Gym",
      source: "personal",
      status: "approved",
      day: 2,
      startMinutes: 18 * 60,
      endMinutes: 19 * 60,
      immovable: false,
      googleEventId: "gym",
      calendarId: "ai-cal",
    };
    const proposed = toCalendarBlocks([
      { title: "Reading", source: "school", day: 2, startMinutes: 1080, endMinutes: 1140 },
    ]);
    expect(validateProposedBlocks(proposed, [aiBlock])).toHaveLength(1);
  });
});
