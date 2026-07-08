/**
 * In-memory fake Canvas client for demo mode (`CANVAS_MOCK=1`) and tests. Returns
 * a fixed set of raw assignments so the whole integration runs without live
 * credentials. Mirrors `lib/google/client.mock.ts`.
 */
import type { CanvasClient } from "./client";
import type { CanvasAssignment } from "./types";

export function createMockClient(seed: CanvasAssignment[]): CanvasClient {
  return {
    async fetchAssignments() {
      return seed;
    },
  };
}
