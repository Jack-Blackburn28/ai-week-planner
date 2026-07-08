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

    const aiId = config.get().aiCalendarId!;
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
});
