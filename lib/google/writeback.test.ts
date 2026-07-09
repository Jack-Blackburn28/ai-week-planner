import { afterEach, describe, expect, it } from "vitest";
import { mkdtempSync, rmSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { createGoogleConfig } from "./config";
import { createMockClient } from "./client.mock";
import { commitBlocks } from "./writeback";
import type { CalendarBlock } from "@/lib/types";

const REFERENCE = new Date(2026, 6, 8); // Wed 2026-07-08

const dirs: string[] = [];
function tempConfig() {
  const dir = mkdtempSync(join(tmpdir(), "wb-"));
  dirs.push(dir);
  return createGoogleConfig({ filePath: join(dir, ".google-config.json") });
}
afterEach(() => dirs.splice(0).forEach((d) => rmSync(d, { recursive: true, force: true })));

const proposed: CalendarBlock[] = [
  {
    id: "prop-0",
    title: "Gym",
    source: "personal",
    status: "proposed",
    day: 2, // Wed
    startMinutes: 18 * 60,
    endMinutes: 19 * 60,
  },
];

describe("commitBlocks (write-back to AI Calendar)", () => {
  it("ensures the AI Calendar, inserts each block there, and returns id pairs", async () => {
    const client = createMockClient();
    const config = tempConfig();

    const results = await commitBlocks(client, config, proposed, REFERENCE, 0);

    const aiId = (await config.get()).aiCalendarId!;
    expect(aiId).toBeTruthy();
    const written = client.inserted(aiId);
    expect(written).toHaveLength(1);
    expect(written[0].summary).toBe("Gym");
    // Source is stored so it round-trips with the right color.
    expect(written[0].extendedProperties?.private?.source).toBe("personal");
    expect(results).toEqual([{ id: "prop-0", googleEventId: "mock-evt-1" }]);
  });

  it("writes only to the AI Calendar, never to a busy source", async () => {
    const client = createMockClient();
    const config = tempConfig();
    await commitBlocks(client, config, proposed, REFERENCE, 0);
    expect(client.inserted("work-primary")).toHaveLength(0);
    expect(client.inserted("personal-primary")).toHaveLength(0);
  });

  it("sends a timezone-naive local dateTime with an explicit America/Los_Angeles timeZone, not a computed UTC offset", async () => {
    const client = createMockClient();
    const config = tempConfig();
    await commitBlocks(client, config, proposed, REFERENCE, 0);
    const aiId = (await config.get()).aiCalendarId!;
    const [event] = client.inserted(aiId);
    // proposed[0] is day 2 (Wed) 18:00-19:00 of the week containing REFERENCE
    // (Wed 2026-07-08 itself, so day 2 of that week is 2026-07-08).
    expect(event.start).toEqual({
      dateTime: "2026-07-08T18:00:00",
      timeZone: "America/Los_Angeles",
    });
    expect(event.end).toEqual({
      dateTime: "2026-07-08T19:00:00",
      timeZone: "America/Los_Angeles",
    });
  });

  it("formats the correct dateTime even when the block falls on a DST transition day", async () => {
    // Sun 2026-03-08 is the spring-forward day; the week of Thu 2026-03-05 runs
    // Mon 3/2 -> Sun 3/8, so day index 6 is 2026-03-08.
    const referenceNearDst = new Date(2026, 2, 5); // Thu 2026-03-05
    const blockOnTransitionDay: CalendarBlock[] = [
      {
        id: "prop-dst",
        title: "Afternoon walk",
        source: "personal",
        status: "proposed",
        day: 6, // Sun
        startMinutes: 14 * 60,
        endMinutes: 15 * 60,
      },
    ];
    const client = createMockClient();
    const config = tempConfig();
    await commitBlocks(client, config, blockOnTransitionDay, referenceNearDst, 0);
    const aiId = (await config.get()).aiCalendarId!;
    const [event] = client.inserted(aiId);
    // Formatting doesn't compute a UTC offset itself — Google resolves DST via
    // the explicit timeZone field — so this just confirms the naive local
    // dateTime string is correctly formatted for a transition-day date.
    expect(event.start).toEqual({
      dateTime: "2026-03-08T14:00:00",
      timeZone: "America/Los_Angeles",
    });
  });
});
