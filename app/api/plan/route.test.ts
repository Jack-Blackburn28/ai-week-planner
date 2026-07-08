import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CalendarBlock } from "@/lib/types";

// Mock the Anthropic SDK so no live calls happen. `parseMock` stands in for
// client.messages.parse and is controlled per-test.
const { parseMock } = vi.hoisted(() => ({ parseMock: vi.fn() }));
vi.mock("@anthropic-ai/sdk", () => ({
  default: class {
    messages = { parse: (...args: unknown[]) => parseMock(...args) };
  },
}));
vi.mock("@anthropic-ai/sdk/helpers/zod", () => ({
  zodOutputFormat: () => ({ type: "json_schema" }),
}));

import { POST } from "./route";

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

const week = { blocks: [workMon], todos: [] };
const messages = [{ id: "1", role: "user", text: "plan my week" }];

function post(body: unknown): Promise<Response> {
  return POST(
    new Request("http://localhost/api/plan", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
}

const ORIGINAL_KEY = process.env.ANTHROPIC_API_KEY;
beforeEach(() => {
  parseMock.mockReset();
});
afterEach(() => {
  if (ORIGINAL_KEY === undefined) delete process.env.ANTHROPIC_API_KEY;
  else process.env.ANTHROPIC_API_KEY = ORIGINAL_KEY;
});

describe("POST /api/plan", () => {
  it("returns the AI proposal when a key is set (mocked SDK)", async () => {
    process.env.ANTHROPIC_API_KEY = "sk-test-REDACTED";
    parseMock.mockResolvedValue({
      parsed_output: {
        reply: "Here's a plan.",
        proposal: {
          summary: "Gym Monday evening.",
          blocks: [
            { title: "Gym", source: "personal", day: 0, startMinutes: 1080, endMinutes: 1140 },
          ],
        },
      },
    });

    const res = await post({ messages, week });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.reply).toBe("Here's a plan.");
    expect(json.proposal.blocks).toHaveLength(1);
    expect(json.proposal.blocks[0].title).toBe("Gym");
  });

  it("drops an AI block that overlaps an immovable block (untrusted output)", async () => {
    process.env.ANTHROPIC_API_KEY = "sk-test-REDACTED";
    parseMock.mockResolvedValue({
      parsed_output: {
        reply: "Trying to book during work.",
        proposal: {
          summary: "Bad plan.",
          // 10:00 Monday — squarely inside the immovable work block
          blocks: [
            { title: "Bad", source: "personal", day: 0, startMinutes: 600, endMinutes: 660 },
          ],
        },
      },
    });

    const res = await post({ messages, week });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.proposal).toBeUndefined(); // the only block was validated out
    expect(json.reply).toBeTruthy();
  });

  it("uses the mock planner when no key is set", async () => {
    delete process.env.ANTHROPIC_API_KEY;
    const res = await post({ messages, week: { blocks: [], todos: [] } });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.proposal.blocks.length).toBeGreaterThan(0);
    expect(parseMock).not.toHaveBeenCalled();
  });

  it("rejects a malformed body with a safe 4xx error", async () => {
    const res = await post({ messages }); // missing `week`
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBeTruthy();
    expect(JSON.stringify(json)).not.toContain("sk-");
  });

  it("returns a clarifying reply with NO proposal on a conflict (mock path)", async () => {
    delete process.env.ANTHROPIC_API_KEY;
    const res = await post({
      messages: [{ id: "1", role: "user", text: "put gym during work on Monday" }],
      week: { blocks: [workMon], todos: [] },
    });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.proposal).toBeUndefined();
    expect(json.reply).toBeTruthy();
  });

  it("never returns a proposal overlapping any immovable block (bad AI output)", async () => {
    process.env.ANTHROPIC_API_KEY = "sk-test-REDACTED";
    // A second immovable block: Tuesday class 6:00–7:30 PM.
    const classTue: CalendarBlock = {
      id: "class-tue",
      title: "HIST 202",
      source: "school",
      status: "approved",
      day: 1,
      startMinutes: 18 * 60,
      endMinutes: 19 * 60 + 30,
      immovable: true,
    };
    parseMock.mockResolvedValue({
      parsed_output: {
        reply: "Draft.",
        proposal: {
          summary: "Deliberately bad output.",
          blocks: [
            { title: "Over work", source: "personal", day: 0, startMinutes: 600, endMinutes: 660 },
            { title: "Over class", source: "school", day: 1, startMinutes: 18 * 60 + 15, endMinutes: 18 * 60 + 45 },
            { title: "Free", source: "personal", day: 0, startMinutes: 1080, endMinutes: 1140 },
          ],
        },
      },
    });

    const res = await post({ messages, week: { blocks: [workMon, classTue], todos: [] } });
    const json = await res.json();
    // Only the free-space block survives; nothing overlaps an immovable block.
    expect(json.proposal.blocks).toHaveLength(1);
    expect(json.proposal.blocks[0].title).toBe("Free");
  });
});
