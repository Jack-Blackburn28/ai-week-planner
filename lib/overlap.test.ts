import { describe, expect, it } from "vitest";
import { cascadeDepths } from "./overlap";

describe("cascadeDepths", () => {
  it("gives non-overlapping blocks depth 0", () => {
    const d = cascadeDepths([
      { id: "a", startMinutes: 540, endMinutes: 600 },
      { id: "b", startMinutes: 600, endMinutes: 660 },
    ]);
    expect(d).toEqual({ a: 0, b: 0 });
  });

  it("cascades an event that starts before the previous one ends", () => {
    // A 9:00–10:00, B 9:30–10:30 (Jack's Friday case): B overlaps A -> depth 1.
    const d = cascadeDepths([
      { id: "a", startMinutes: 540, endMinutes: 600 },
      { id: "b", startMinutes: 570, endMinutes: 630 },
    ]);
    expect(d).toEqual({ a: 0, b: 1 });
  });

  it("increments depth for each concurrent earlier block", () => {
    const d = cascadeDepths([
      { id: "a", startMinutes: 540, endMinutes: 660 },
      { id: "b", startMinutes: 550, endMinutes: 660 },
      { id: "c", startMinutes: 560, endMinutes: 660 },
    ]);
    expect(d).toEqual({ a: 0, b: 1, c: 2 });
  });

  it("resets depth once earlier blocks have ended", () => {
    const d = cascadeDepths([
      { id: "a", startMinutes: 540, endMinutes: 600 },
      { id: "b", startMinutes: 570, endMinutes: 630 },
      { id: "c", startMinutes: 660, endMinutes: 720 }, // after both -> depth 0
    ]);
    expect(d.c).toBe(0);
  });
});
