/**
 * Granola client: lists recent meetings and fetches transcripts. SERVER-ONLY
 * (network + token). Mirrors the Google/Canvas boundary: an interface + a real
 * implementation + a `resolveClient()` that swaps in the demo fake when
 * `GRANOLA_MOCK=1`.
 *
 * The real client mints a fresh access token from the stored refresh token on
 * each call (rotating the stored refresh token if Granola returns a new one), so
 * the user connects once and never reconnects. Endpoint paths are env-overridable.
 */
import { refreshAccessToken } from "./auth";
import { isMockMode } from "./config";
import { createMockClient } from "./client.mock";
import { demoSeed } from "./demoSeed";
import { granolaTokenStore } from "./tokenStore";
import type { GranolaMeeting, GranolaTranscript } from "./types";

export interface GranolaClient {
  /** Recent meetings within the last `days`. */
  listRecentMeetings(days: number): Promise<GranolaMeeting[]>;
  /** Full transcript for a meeting, or null if unavailable. */
  getTranscript(meetingId: string): Promise<GranolaTranscript | null>;
}

const API_BASE = process.env.GRANOLA_API_BASE ?? "https://api.granola.ai/v1";

// --- Real API client ---------------------------------------------------------

interface RawMeeting {
  id: string;
  title?: string;
  name?: string;
  created_at?: string;
  date?: string;
}

function realClient(): GranolaClient {
  /** Mint a fresh access token, rotating the stored refresh token if rotated. */
  async function accessToken(): Promise<string> {
    const stored = granolaTokenStore.get();
    if (!stored) throw new Error("Granola not connected");
    const tokens = await refreshAccessToken(stored.refresh_token);
    if (tokens.refresh_token) {
      granolaTokenStore.save({ refresh_token: tokens.refresh_token });
    }
    return tokens.access_token;
  }

  async function authedGet<T>(path: string): Promise<T> {
    const token = await accessToken();
    const res = await fetch(`${API_BASE}${path}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(`Granola API ${res.status} for ${path}`);
    return (await res.json()) as T;
  }

  return {
    async listRecentMeetings(days) {
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
      const data = await authedGet<{ meetings?: RawMeeting[] }>(
        `/meetings?since=${encodeURIComponent(since)}`,
      );
      return (data.meetings ?? []).map((m) => ({
        id: m.id,
        title: m.title ?? m.name ?? "Untitled meeting",
        date: m.created_at ?? m.date ?? since,
      }));
    },
    async getTranscript(meetingId) {
      const data = await authedGet<{ transcript?: string; title?: string; date?: string }>(
        `/meetings/${encodeURIComponent(meetingId)}/transcript`,
      );
      if (!data.transcript) return null;
      return {
        meetingId,
        title: data.title ?? "Meeting",
        date: data.date ?? new Date().toISOString(),
        text: data.transcript,
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
