/**
 * GET /api/todos/completed — the combined Completed archive (Work + School),
 * most-recent-first. Read-only review; persisted across reloads.
 */
import { NextResponse } from "next/server";
import { completionsStore, type CompletedItem } from "@/lib/todos/completions";

export async function GET() {
  return NextResponse.json<CompletedItem[]>(await completionsStore.list());
}
