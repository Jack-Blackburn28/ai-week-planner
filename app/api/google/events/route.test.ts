import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtempSync, rmSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { createWorkHoursConfig } from "@/lib/workHours/config";
import { createMockClient } from "@/lib/google/client.mock";
import { nowInPacific } from "@/lib/timezone";
import { weekDates } from "@/lib/week";
import type { CalendarBlock } from "@/lib/types";

let dir: string;
const mockHolder = globalThis as unknown as { __awpMockClient?: unknown };

/** The correct UTC ISO instant for `hour:minute` Pacific time on `date`'s day. */
function pacificISOString(date: Date, hour: number, minute: number): string {
  const y = date.getFullYear();
  const m = date.getMonth();
  const d = date.getDate();
  const guessUtc = new Date(Date.UTC(y, m, d, hour, minute, 0));
  const offsetPart = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Los_Angeles",
    timeZoneName: "shortOffset",
  })
    .formatToParts(guessUtc)
    .find((p) => p.type === "timeZoneName")!.value; // e.g. "GMT-7"
  const offsetHours = Number(offsetPart.replace("GMT", ""));
  return new Date(Date.UTC(y, m, d, hour - offsetHours, minute, 0)).toISOString();
}

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "events-route-"));
  process.env.GOOGLE_MOCK = "1";
  process.env.GOOGLE_CONFIG_FILE = join(dir, ".google-config.json");
  process.env.WORK_HOURS_CONFIG_FILE = join(dir, ".work-hours.json");
  mockHolder.__awpMockClient = undefined;
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
  delete process.env.GOOGLE_MOCK;
  delete process.env.GOOGLE_CONFIG_FILE;
  delete process.env.WORK_HOURS_CONFIG_FILE;
  mockHolder.__awpMockClient = undefined;
});

function req(week = 0) {
  return new Request(`http://localhost/api/google/events?week=${week}`);
}

describe("GET /api/google/events — work-hours merge + nesting", () => {
  it("is unaffected when no work-hours rule is configured", async () => {
    const { GET } = await import("./route");
    const res = await GET(req());
    const json = (await res.json()) as { blocks: CalendarBlock[] };
    expect(json.blocks.some((b) => b.title === "Work Hours")).toBe(false);
  });

  it("merges the expanded work-hours block and nests a fully-contained event, leaving one outside untouched", async () => {
    await createWorkHoursConfig({ filePath: process.env.WORK_HOURS_CONFIG_FILE! }).set({
      days: { 0: { startMinutes: 9 * 60, endMinutes: 17 * 60 } }, // Mon 9-5
    });

    const reference = nowInPacific();
    const monday = weekDates(reference, 0)[0];

    mockHolder.__awpMockClient = createMockClient({
      events: [
        {
          id: "standup",
          summary: "Standup",
          start: { dateTime: pacificISOString(monday, 10, 0) },
          end: { dateTime: pacificISOString(monday, 10, 30) },
          calendarId: "work-primary",
        },
        {
          id: "dinner",
          summary: "Dinner",
          start: { dateTime: pacificISOString(monday, 19, 0) },
          end: { dateTime: pacificISOString(monday, 20, 0) },
          calendarId: "personal-primary",
        },
      ],
    });

    const { GET } = await import("./route");
    const res = await GET(req());
    const json = (await res.json()) as { blocks: CalendarBlock[] };

    const workHours = json.blocks.find((b) => b.title === "Work Hours");
    expect(workHours).toBeTruthy();
    expect(workHours!.day).toBe(0);

    const standup = json.blocks.find((b) => b.title === "Standup");
    expect(standup!.parentId).toBe(workHours!.id);

    const dinner = json.blocks.find((b) => b.title === "Dinner");
    expect(dinner!.parentId).toBeUndefined();
  });
});
