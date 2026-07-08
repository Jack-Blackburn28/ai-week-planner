/**
 * Granola-integration domain types. Framework-free and free of any SDK so they
 * can be imported anywhere (network/secret handling stays server-only in
 * `auth.ts` / `client.ts` / `extract.ts`). Mirrors `lib/google/types.ts`.
 */

/** Connection status reported to the client. Never carries the API key. */
export interface GranolaStatus {
  connected: boolean;
}

/** A meeting/note as returned by Granola (only the fields we use). */
export interface GranolaMeeting {
  id: string;
  title: string;
  /** ISO timestamp of when the meeting occurred. */
  date: string;
}

/** A meeting transcript fed to the AI extractor. */
export interface GranolaTranscript {
  meetingId: string;
  title: string;
  date: string;
  /** The raw transcript text. */
  text: string;
}

/** One AI-extracted action item (before it becomes a Work TodoItem). */
export interface ExtractedActionItem {
  title: string;
}

/** A persisted, app-generated action item (open, in the Work list). */
export interface GranolaActionRecord {
  /** Stable id: `granola-<meetingId>-<n>` so clearing/never-regenerate is deterministic. */
  id: string;
  title: string;
  meetingId: string;
  /** Source meeting title → the Work item's metaLabel. */
  meetingTitle: string;
  /** ISO timestamp when the item was generated. */
  createdAt: string;
}

/** On-disk Granola store: which meetings we've read + the currently-open items. */
export interface GranolaStoreData {
  processedMeetingIds: string[];
  items: GranolaActionRecord[];
}
