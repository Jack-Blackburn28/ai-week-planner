/**
 * GET /api/canvas/assignments — School todos from the configured Canvas source.
 * Resolves the source (token / ICS / mock), fetches raw assignments, applies the
 * scope filter, and maps them to `TodoItem`s. Fails soft: a fetch error or an
 * unconfigured Canvas returns `[]` (the UI then shows the "Connect Canvas" empty
 * state) rather than crashing.
 */
import { NextResponse } from "next/server";
import { resolveClient } from "@/lib/canvas/client";
import { mapAssignments } from "@/lib/canvas/map";
import type { TodoItem } from "@/lib/types";

export async function GET() {
  try {
    const raw = await resolveClient().fetchAssignments();
    const todos = mapAssignments(raw, new Date());
    return NextResponse.json<TodoItem[]>(todos);
  } catch (err) {
    console.error("[canvas] failed to fetch assignments:", err);
    return NextResponse.json<TodoItem[]>([]);
  }
}
