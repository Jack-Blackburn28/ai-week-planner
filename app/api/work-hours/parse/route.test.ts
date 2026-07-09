import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock the Anthropic SDK so no live calls happen.
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

function post(body: unknown): Promise<Response> {
  return POST(
    new Request("http://localhost/api/work-hours/parse", {
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

describe("POST /api/work-hours/parse", () => {
  it("returns the AI-parsed rule when a key is set (mocked SDK)", async () => {
    process.env.ANTHROPIC_API_KEY = "sk-test-REDACTED";
    parseMock.mockResolvedValue({
      parsed_output: {
        reply: "Got it — Mon-Fri 9am-5pm. Save this?",
        proposedRule: { days: { "0": { startMinutes: 540, endMinutes: 1020 } } },
      },
    });

    const res = await post({ message: "9 to 5 weekdays" });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.proposedRule.days["0"]).toEqual({ startMinutes: 540, endMinutes: 1020 });
  });

  it("uses the mock parser when no key is set", async () => {
    delete process.env.ANTHROPIC_API_KEY;
    const res = await post({ message: "9 to 5 Monday through Friday" });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.proposedRule).toBeTruthy();
    expect(parseMock).not.toHaveBeenCalled();
  });

  it("rejects a malformed body with a safe 4xx error", async () => {
    const res = await post({});
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBeTruthy();
    expect(JSON.stringify(json)).not.toContain("sk-");
  });

  it("passes the current rule through for context on a re-ask", async () => {
    delete process.env.ANTHROPIC_API_KEY;
    const currentRule = { days: { "0": { startMinutes: 540, endMinutes: 1020 } } };
    const res = await post({ message: "9 to 5 Monday through Friday", currentRule });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.reply).toContain("changing them to");
  });
});
