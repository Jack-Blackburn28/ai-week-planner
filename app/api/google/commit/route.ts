/**
 * POST /api/google/commit — write approved plan blocks to the personal
 * "AI Calendar" as real events. Body: `{ blocks: CalendarBlock[], weekOffset }`.
 * Returns `{ committed: { id, googleEventId }[] }`.
 *
 * Writes ONLY to the AI Calendar (never a busy/read-only source).
 */
import { NextResponse } from "next/server";
import { resolveClient } from "@/lib/google/client";
import { googleConfig } from "@/lib/google/config";
import { commitBlocks } from "@/lib/google/writeback";
import type { CalendarBlock } from "@/lib/types";

export async function POST(req: Request) {
  const body = (await req.json()) as {
    blocks?: CalendarBlock[];
    weekOffset?: number;
  };
  const blocks = body.blocks ?? [];
  const weekOffset = body.weekOffset ?? 0;

  try {
    const committed = await commitBlocks(
      resolveClient(),
      googleConfig,
      blocks,
      new Date(),
      weekOffset,
    );
    return NextResponse.json({ committed });
  } catch {
    return NextResponse.json(
      { error: "write_failed", committed: [] },
      { status: 502 },
    );
  }
}
