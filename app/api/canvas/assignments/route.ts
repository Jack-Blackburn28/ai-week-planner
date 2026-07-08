/**
 * GET /api/canvas/assignments — School todos from the configured Canvas source.
 * Resolves the source (token / ICS / mock), fetches raw assignments, applies the
 * scope filter, and maps them to `TodoItem`s. Fails soft: a fetch error or an
 * unconfigured Canvas returns `[]` (the UI then shows the "Connect Canvas" empty
 * state) rather than crashing.
 */
import { NextResponse } from "next/server";
import { resolveClient } from "@/lib/canvas/client";
import { resolveMode } from "@/lib/canvas/config";
import { mapAssignments } from "@/lib/canvas/map";
import type { TodoItem } from "@/lib/types";

export async function GET() {
  try {
    const raw = await resolveClient().fetchAssignments();
    // The ICS feed carries no submission status, so past-due can't be told from
    // done — show upcoming-only (overdue window 0). The token path keeps 14 days.
    const overdueWindowDays = resolveMode() === "ics" ? 0 : undefined;
    const todos = mapAssignments(raw, new Date(), overdueWindowDays);
    return NextResponse.json<TodoItem[]>(todos);
  } catch (err) {
    console.error("[canvas] failed to fetch assignments:", err);
    return NextResponse.json<TodoItem[]>([]);
  }
}
