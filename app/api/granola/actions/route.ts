/**
 * GET /api/granola/actions — Work todos generated from recent Granola meetings.
 * Resolves the client, reads recent meetings' transcripts, and uses the AI
 * extractor to produce action items mapped to Work `TodoItem`s.
 *
 * NOTE: persistence (generate-once, never-regenerate, minus-completed) is layered
 * on in T3.0 via `lib/granola/store.ts`. This route is the extraction pipeline;
 * it fails soft to `[]` so the UI degrades gracefully.
 */
import { NextResponse } from "next/server";
import { resolveClient } from "@/lib/granola/client";
import { extractActionItems } from "@/lib/granola/extract";
import { buildActionRecords, recordToTodo } from "@/lib/granola/map";
import type { TodoItem } from "@/lib/types";

const WINDOW_DAYS = 30;

export async function GET() {
  try {
    const client = resolveClient();
    const meetings = await client.listRecentMeetings(WINDOW_DAYS);
    const now = new Date().toISOString();
    const todos: TodoItem[] = [];

    for (const meeting of meetings) {
      try {
        const transcript = await client.getTranscript(meeting.id);
        if (!transcript) continue;
        const items = await extractActionItems(transcript);
        for (const record of buildActionRecords(meeting, items, now)) {
          todos.push(recordToTodo(record));
        }
      } catch (err) {
        console.error(`[granola] extraction failed for ${meeting.id}:`, err);
      }
    }
    return NextResponse.json<TodoItem[]>(todos);
  } catch (err) {
    console.error("[granola] failed to build actions:", err);
    return NextResponse.json<TodoItem[]>([]);
  }
}
