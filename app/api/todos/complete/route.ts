/**
 * POST /api/todos/complete — clear (complete) a Work or School item. Records it in
 * the source-agnostic completions store with a timestamp so it (a) leaves the
 * active list, (b) never regenerates (Granola sync excludes completed ids), and
 * (c) appears in the combined Completed archive. Body: `{ id, source, title, metaLabel }`.
 */
import { NextRequest, NextResponse } from "next/server";
import { completionsStore } from "@/lib/todos/completions";
import type { TodoSectionKey } from "@/lib/types";

export async function POST(req: NextRequest) {
  let body: { id?: string; source?: TodoSectionKey; title?: string; metaLabel?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }
  const { id, source } = body;
  if (!id || (source !== "work" && source !== "school")) {
    return NextResponse.json({ error: "id and source required" }, { status: 400 });
  }
  completionsStore.add({
    id,
    source,
    title: body.title ?? "",
    metaLabel: body.metaLabel ?? "",
    completedAt: new Date().toISOString(),
  });
  return NextResponse.json({ ok: true });
}
