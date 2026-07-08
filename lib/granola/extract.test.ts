import { describe, expect, it } from "vitest";
import { mockExtract } from "./extract.mock";
import { buildActionRecords, recordToTodo } from "./map";
import type { GranolaMeeting, GranolaTranscript } from "./types";

const transcript: GranolaTranscript = {
  meetingId: "m1",
  title: "Platform Sync",
  date: "2026-07-07T12:00:00.000Z",
  text: [
    "Jack: intro chatter, nothing actionable here.",
    "- Send the Q3 roadmap draft",
    "ACTION: Review PR #482",
    "Some discussion that is not an action.",
    "* Follow up with the Acme vendor",
  ].join("\n"),
};

describe("mockExtract", () => {
  it("pulls bullet/action lines and strips their prefixes", () => {
    const items = mockExtract(transcript);
    expect(items.map((i) => i.title)).toEqual([
      "Send the Q3 roadmap draft",
      "Review PR #482",
      "Follow up with the Acme vendor",
    ]);
  });

  it("returns nothing for a transcript with no action-ish lines", () => {
    expect(
      mockExtract({ ...transcript, text: "Just casual conversation." }),
    ).toEqual([]);
  });
});

describe("buildActionRecords / recordToTodo", () => {
  const meeting: GranolaMeeting = { id: "m1", title: "Platform Sync", date: transcript.date };

  it("builds stable ids and maps to Work todos with no due date", () => {
    const records = buildActionRecords(meeting, mockExtract(transcript), "2026-07-08T00:00:00.000Z");
    expect(records[0].id).toBe("granola-m1-0");
    expect(records[2].id).toBe("granola-m1-2");

    const todo = recordToTodo(records[0]);
    expect(todo).toMatchObject({
      id: "granola-m1-0",
      section: "work",
      title: "Send the Q3 roadmap draft",
      metaLabel: "Platform Sync",
      done: false,
    });
    expect(todo.dueDate).toBeUndefined();
  });
});
