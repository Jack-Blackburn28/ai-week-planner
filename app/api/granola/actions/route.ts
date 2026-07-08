/**
 * GET /api/granola/actions — Work todos generated from recent Granola meetings.
 *
 * Runs the persistent sync: each recent meeting is processed once (its transcript
 * read and action items AI-extracted), items are stored, and the current OPEN items
 * (excluding anything the user has cleared) are returned as Work `TodoItem`s. An
 * already-processed meeting is never re-extracted, and cleared items never
 * regenerate. Fails soft to `[]` so the UI degrades gracefully.
 */
import { NextResponse } from "next/server";
import { resolveClient } from "@/lib/granola/client";
import { extractActionItems } from "@/lib/granola/extract";
import { recordToTodo } from "@/lib/granola/map";
import { granolaStore, normalizeTitle, syncActions } from "@/lib/granola/store";
import { completionsStore } from "@/lib/todos/completions";
import type { TodoItem } from "@/lib/types";

export async function GET() {
  try {
    const completed = completionsStore.list();
    const open = await syncActions({
      store: granolaStore,
      client: resolveClient(),
      extract: extractActionItems,
      completedIds: new Set(completed.map((c) => c.id)),
      completedTitles: new Set(completed.map((c) => normalizeTitle(c.title))),
      now: new Date().toISOString(),
    });
    return NextResponse.json<TodoItem[]>(open.map(recordToTodo));
  } catch (err) {
    console.error("[granola] failed to build actions:", err);
    return NextResponse.json<TodoItem[]>([]);
  }
}
