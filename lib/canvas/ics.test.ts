import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import { parseIcsAssignments } from "./ics";

const sample = readFileSync(join(__dirname, "fixtures", "sample.ics"), "utf8");

describe("parseIcsAssignments", () => {
  it("parses each VEVENT into a raw assignment with title + due date", () => {
    const items = parseIcsAssignments(sample);
    expect(items).toHaveLength(3);

    const essay = items[0];
    expect(essay.title).toBe("Essay: Cold War causes");
    expect(essay.courseName).toBe("HIST 202");
    expect(essay.dueAt).toBe("2026-07-10T23:59:00.000Z");
    // ICS carries no submission state.
    expect(essay.submitted).toBeUndefined();
  });

  it("extracts a bracketed course tag when present, else leaves it blank", () => {
    const items = parseIcsAssignments(sample);
    expect(items[1].courseName).toBe("MATH 301");
    expect(items[2].title).toBe("Reading response (no course tag)");
    expect(items[2].courseName).toBe("");
  });

  it("returns an empty array for unparseable input", () => {
    expect(parseIcsAssignments("not an ics file")).toEqual([]);
    expect(parseIcsAssignments("")).toEqual([]);
  });
});
