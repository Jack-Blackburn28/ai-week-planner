import { describe, expect, it } from "vitest";
import { createMockClient } from "./client.mock";
import { demoSeed } from "./demoSeed";

describe("mock GranolaClient over the demo seed", () => {
  const client = createMockClient(demoSeed());

  it("lists recent meetings within the window", async () => {
    const meetings = await client.listRecentMeetings(30);
    expect(meetings.length).toBeGreaterThan(0);
    expect(meetings.map((m) => m.title)).toContain("Platform Sync");
  });

  it("returns a transcript for a known meeting and null otherwise", async () => {
    const t = await client.getTranscript("mtg-platform-sync");
    expect(t?.text).toContain("Q3 roadmap");
    expect(await client.getTranscript("nope")).toBeNull();
  });
});
