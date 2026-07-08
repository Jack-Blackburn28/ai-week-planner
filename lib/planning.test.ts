import { describe, expect, it } from "vitest";
import type { CalendarBlock } from "@/lib/types";
import {
  approveProposal,
  blocksOverlap,
  discardProposal,
  overlapsImmovable,
  proposalFits,
} from "@/lib/planning";
import { initialBlocks, mockProposal } from "@/lib/mock-data";

function block(overrides: Partial<CalendarBlock>): CalendarBlock {
  return {
    id: "b",
    title: "Block",
    source: "personal",
    status: "approved",
    day: 0,
    startMinutes: 600,
    endMinutes: 660,
    ...overrides,
  };
}

describe("blocksOverlap", () => {
  it("is true for overlapping ranges on the same day", () => {
    const a = block({ startMinutes: 600, endMinutes: 700 });
    const b = block({ startMinutes: 650, endMinutes: 750 });
    expect(blocksOverlap(a, b)).toBe(true);
  });

  it("is false for the same times on different days", () => {
    const a = block({ day: 0 });
    const b = block({ day: 1 });
    expect(blocksOverlap(a, b)).toBe(false);
  });

  it("is false for back-to-back ranges (end == start)", () => {
    const a = block({ startMinutes: 600, endMinutes: 660 });
    const b = block({ startMinutes: 660, endMinutes: 720 });
    expect(blocksOverlap(a, b)).toBe(false);
  });
});

describe("overlapsImmovable (never schedule over immovable blocks)", () => {
  const work = block({
    id: "work",
    source: "work",
    status: "approved",
    day: 2,
    startMinutes: 540, // 9:00
    endMinutes: 1020, // 17:00
    immovable: true,
  });

  it("flags a candidate that lands inside an immovable block", () => {
    const candidate = block({
      id: "c",
      day: 2,
      startMinutes: 600,
      endMinutes: 660,
    });
    expect(overlapsImmovable(candidate, [work])).toBe(true);
  });

  it("allows a candidate in free space", () => {
    const candidate = block({
      id: "c",
      day: 2,
      startMinutes: 1080, // 18:00, after work
      endMinutes: 1140,
    });
    expect(overlapsImmovable(candidate, [work])).toBe(false);
  });

  it("ignores non-immovable existing blocks", () => {
    const movable = { ...work, id: "movable", immovable: false };
    const candidate = block({
      id: "c",
      day: 2,
      startMinutes: 600,
      endMinutes: 660,
    });
    expect(overlapsImmovable(candidate, [movable])).toBe(false);
  });
});

describe("proposalFits", () => {
  it("accepts the mock proposal against the seeded week (all free space)", () => {
    expect(proposalFits(mockProposal, initialBlocks)).toBe(true);
  });

  it("rejects a proposal whose block collides with work hours", () => {
    const bad = {
      ...mockProposal,
      blocks: [
        block({
          id: "bad",
          status: "proposed",
          day: 0,
          startMinutes: 600, // 10:00 Monday — during work
          endMinutes: 660,
        }),
      ],
    };
    expect(proposalFits(bad, initialBlocks)).toBe(false);
  });
});

describe("approveProposal (approval commits the plan)", () => {
  const blocks: CalendarBlock[] = [
    block({ id: "keep", status: "approved" }),
    block({ id: "p1", status: "proposed" }),
    block({ id: "p2", status: "proposed" }),
  ];

  it("turns every proposed block into approved", () => {
    const result = approveProposal(blocks);
    expect(result.every((b) => b.status === "approved")).toBe(true);
  });

  it("does not mutate the original array", () => {
    approveProposal(blocks);
    expect(blocks.filter((b) => b.status === "proposed")).toHaveLength(2);
  });
});

describe("discardProposal (Make Changes commits nothing)", () => {
  const blocks: CalendarBlock[] = [
    block({ id: "keep", status: "approved" }),
    block({ id: "p1", status: "proposed" }),
  ];

  it("removes proposed blocks and keeps approved ones", () => {
    const result = discardProposal(blocks);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("keep");
  });

  it("never approves a proposed block", () => {
    const result = discardProposal(blocks);
    expect(result.some((b) => b.status === "proposed")).toBe(false);
    expect(result.every((b) => b.id !== "p1")).toBe(true);
  });
});
