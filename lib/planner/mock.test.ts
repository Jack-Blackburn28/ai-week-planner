import { describe, expect, it } from "vitest";
import type { ChatMessage } from "@/lib/types";
import { mockPlanner } from "./mock";
import type { WeekState } from "./types";

const week: WeekState = { blocks: [], todos: [] };
const msg = (text: string): ChatMessage[] => [{ id: "1", role: "user", text }];

describe("mockPlanner", () => {
  it("returns a proposal with blocks for a normal planning request", () => {
    const res = mockPlanner({ messages: msg("plan my week"), week });
    expect(res.proposal).toBeDefined();
    expect(res.proposal!.blocks.length).toBeGreaterThan(0);
    expect(res.reply).toBeTruthy();
  });

  it("asks (no proposal) when the request signals a conflict", () => {
    const res = mockPlanner({
      messages: msg("put gym during work on Monday"),
      week,
    });
    expect(res.proposal).toBeUndefined();
    expect(res.reply.toLowerCase()).toContain("collides");
  });

  it("anchors the gym block to a named day (replanning)", () => {
    const res = mockPlanner({ messages: msg("move gym to Friday"), week });
    const gym = res.proposal!.blocks.find((b) => b.title === "Gym");
    expect(gym?.day).toBe(4); // Friday
  });
});
