/**
 * In-memory fake Granola client for demo mode (`GRANOLA_MOCK=1`) and tests. Serves
 * a fixed set of seeded meetings + transcripts so the whole pipeline runs without
 * live credentials. Mirrors `lib/google/client.mock.ts` / `lib/canvas/client.mock.ts`.
 */
import type { GranolaClient } from "./client";
import type { SeededMeeting } from "./demoSeed";
import type { GranolaMeeting, GranolaTranscript } from "./types";

export function createMockClient(seed: SeededMeeting[]): GranolaClient {
  const withinDays = (iso: string, days: number) => {
    const ms = Date.now() - new Date(iso).getTime();
    return ms >= 0 && ms <= days * 24 * 60 * 60 * 1000;
  };

  return {
    async listRecentMeetings(days: number): Promise<GranolaMeeting[]> {
      return seed
        .filter((s) => withinDays(s.meeting.date, days))
        .map((s) => s.meeting);
    },
    async getTranscript(meetingId: string): Promise<GranolaTranscript | null> {
      const found = seed.find((s) => s.meeting.id === meetingId);
      if (!found) return null;
      return {
        meetingId,
        title: found.meeting.title,
        date: found.meeting.date,
        text: found.transcriptText,
      };
    },
  };
}
