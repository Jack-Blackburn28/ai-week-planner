import { describe, expect, it } from "vitest";
import type { CalendarBlock } from "@/lib/types";
import { toCalendarBlocks, validateProposedBlocks } from "./validate";
import type { ProposedBlock } from "./types";

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
});
