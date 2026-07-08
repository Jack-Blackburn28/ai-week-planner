/**
 * Sample Granola meetings + transcripts for demo mode (`GRANOLA_MOCK=1`). All
 * fabricated placeholders — nothing real is connected. Meeting dates are relative
 * to "now" so recent-meeting filtering behaves naturally. The transcripts contain
 * bullet/action-style lines the mock extractor can pull, mimicking what the real
 * AI extractor produces from a live transcript.
 */
import type { GranolaMeeting } from "./types";

export interface SeededMeeting {
  meeting: GranolaMeeting;
  transcriptText: string;
}

/** ISO timestamp `n` days ago at local noon. */
function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(12, 0, 0, 0);
  return d.toISOString();
}

export function demoSeed(): SeededMeeting[] {
  return [
    {
      meeting: { id: "mtg-platform-sync", title: "Platform Sync", date: daysAgo(1) },
      transcriptText: [
        "Jack: Let's review where the platform work stands.",
        "Priya: The Q3 roadmap draft is close. Jack, can you send it out?",
        "- Send the Q3 roadmap draft to the team",
        "Jack: Sure. Also I noticed PR #482 is still open.",
        "- Review PR #482 before Thursday",
        "Priya: And we should sync with the Acme vendor about the API limits.",
        "- Follow up with the Acme vendor on API rate limits",
      ].join("\n"),
    },
    {
      meeting: { id: "mtg-design-review", title: "Design Review", date: daysAgo(3) },
      transcriptText: [
        "Sam: The new dashboard mockups look good overall.",
        "Jack: I'll write up the feedback for the calendar layout.",
        "- Write up feedback on the calendar layout mockup",
        "Sam: Can someone book time with the accessibility reviewer?",
        "- Schedule an accessibility review of the dashboard",
      ].join("\n"),
    },
  ];
}
