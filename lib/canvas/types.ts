/**
 * Canvas-integration domain types. Framework-free and free of any network SDK so
 * they can be imported anywhere (the actual fetching stays server-only in
 * `client.ts` / `ics.ts`). Mirrors the `lib/google/types.ts` boundary.
 */

/**
 * How the app is reading Canvas:
 * - `token` — the Canvas REST API via a personal access token (primary; richer,
 *   includes submission state).
 * - `ics`   — the Canvas calendar-feed (ICS) URL fallback (title + due date only).
 * - `none`  — not configured.
 */
export type CanvasMode = "token" | "ics" | "none";

/** Connection status reported to the client. Never carries the secret. */
export interface CanvasStatus {
  connected: boolean;
  mode: CanvasMode;
}

/** A course as returned by the Canvas API (only the fields we use). */
export interface CanvasCourse {
  id: number;
  name: string;
}

/**
 * A raw assignment gathered from either source, before mapping to a `TodoItem`.
 * `courseName` is the human label; `dueAt` is Canvas's ISO 8601 timestamp (often
 * UTC) or null when the assignment has no due date; `submitted`/`graded` come
 * from the API's submission workflow state (absent for the ICS fallback).
 */
export interface CanvasAssignment {
  id: string;
  title: string;
  courseName: string;
  /** ISO 8601 timestamp, or null when the assignment has no due date. */
  dueAt: string | null;
  /** True when Canvas reports the assignment as submitted. */
  submitted?: boolean;
  /** True when Canvas reports the assignment as graded. */
  graded?: boolean;
}
