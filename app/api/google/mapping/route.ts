/**
 * GET  /api/google/mapping — current calendar→work/personal/ignored mapping.
 * POST /api/google/mapping — save a new mapping and ensure the "AI Calendar"
 *                            exists in the personal account (write-back target).
 */
import { NextResponse } from "next/server";
import { resolveClient } from "@/lib/google/client";
import {
  ensureAiCalendar,
  googleConfig,
  type CalendarMapping,
} from "@/lib/google/config";

export async function GET() {
  return NextResponse.json(await googleConfig.get());
}

export async function POST(req: Request) {
  const body = (await req.json()) as Partial<CalendarMapping>;
  const mapping: CalendarMapping = {
    work: body.work ?? [],
    personal: body.personal ?? [],
    ignored: body.ignored ?? [],
    aiCalendarId: (await googleConfig.get()).aiCalendarId,
  };
  await googleConfig.set(mapping);

  // Make sure the write-back calendar exists (idempotent).
  try {
    await ensureAiCalendar(resolveClient());
  } catch {
    // Personal account may not be connected yet; mapping is still saved.
  }
  return NextResponse.json(await googleConfig.get());
}
