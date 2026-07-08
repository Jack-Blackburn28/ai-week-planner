/**
 * Granola client: lists recent notes (meetings) and fetches transcripts from the
 * personal API. SERVER-ONLY (network + key). Mirrors the Google/Canvas boundary:
 * an interface + a real implementation + a `resolveClient()` that swaps in the
 * demo fake when `GRANOLA_MOCK=1`.
 *
 * Real API (https://public-api.granola.ai/v1, Bearer `grn_…`):
 *   GET /notes?created_after=<ISO>&cursor=<...>   → { notes[], hasMore, cursor }
 *   GET /notes/{id}?include=transcript            → { ..., transcript[] }
 * The API only returns notes that have a generated AI summary + transcript.
 */
import { getGranolaConfig, isMockMode } from "./config";
import { createMockClient } from "./client.mock";
import { demoSeed } from "./demoSeed";
import type { GranolaMeeting, GranolaTranscript } from "./types";

export interface GranolaClient {
  /** Recent notes/meetings within the last `days`. */
  listRecentMeetings(days: number): Promise<GranolaMeeting[]>;
  /** Full transcript for a note, or null if unavailable. */
  getTranscript(meetingId: string): Promise<GranolaTranscript | null>;
}

// --- Granola personal API shapes (only the fields we read) -------------------

interface RawNote {
  id: string;
  title?: string;
  created_at?: string;
  created?: string;
}
interface RawNotesPage {
  notes?: RawNote[];
  hasMore?: boolean;
  cursor?: string | null;
}
interface RawTranscriptTurn {
  speaker?: { source?: string; diarization_label?: string };
  text?: string;
}
interface RawNoteDetail {
  id: string;
  title?: string;
  created_at?: string;
  transcript?: RawTranscriptTurn[];
}

function realClient(): GranolaClient {
  const authedGet = async <T>(path: string): Promise<T> => {
    const { apiKey, baseUrl } = getGranolaConfig();
    const res = await fetch(`${baseUrl}${path}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!res.ok) throw new Error(`Granola API ${res.status} for ${path}`);
    return (await res.json()) as T;
  };

  return {
    async listRecentMeetings(days) {
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
      const out: GranolaMeeting[] = [];
      let cursor: string | null | undefined;
      // Paginate via the cursor until hasMore is false.
      do {
        const q = new URLSearchParams({ created_after: since });
        if (cursor) q.set("cursor", cursor);
        const page: RawNotesPage = await authedGet(`/notes?${q.toString()}`);
        for (const n of page.notes ?? []) {
          out.push({
            id: n.id,
            title: n.title ?? "Untitled meeting",
            date: n.created_at ?? n.created ?? since,
          });
        }
        cursor = page.hasMore ? page.cursor : null;
      } while (cursor);
      return out;
    },

    async getTranscript(meetingId) {
      const note: RawNoteDetail = await authedGet(
        `/notes/${encodeURIComponent(meetingId)}?include=transcript`,
      );
      const turns = note.transcript ?? [];
      if (turns.length === 0) return null;
      const text = turns
        .map((t) => t.text?.trim())
        .filter((t): t is string => Boolean(t))
        .join("\n");
      if (!text) return null;
      return {
        meetingId,
        title: note.title ?? "Meeting",
        date: note.created_at ?? new Date().toISOString(),
        text,
      };
    },
  };
}

// --- Demo fake, shared across route modules ----------------------------------

const mockHolder = globalThis as unknown as { __awpGranolaMock?: GranolaClient };

/** Resolve the client the routes should use (real, or the shared demo fake). */
export function resolveClient(): GranolaClient {
  if (isMockMode()) {
    mockHolder.__awpGranolaMock ??= createMockClient(demoSeed());
    return mockHolder.__awpGranolaMock;
  }
  return realClient();
}
