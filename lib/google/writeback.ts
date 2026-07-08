/**
 * Write approved plan blocks to the personal "AI Calendar" as real events.
 * Framework-free (takes a client + config), so it's unit-testable with the fake
 * client and no live credentials.
 *
 * Each block's `source` is stored in the event's private extended properties so
 * it round-trips back with the right color/kind when the calendar is re-read.
 */
import type { CalendarBlock } from "@/lib/types";
import { weekDates } from "@/lib/week";
import type { GoogleCalendarClient } from "./client";
import { ensureAiCalendar, type GoogleConfigStore } from "./config";

export interface CommitResult {
  /** The originating (local) block id. */
  id: string;
  /** The Google event id created for it. */
  googleEventId: string;
}

/** A Date on `date` at `minutes` from midnight (local time). */
function atMinutes(date: Date, minutes: number): Date {
  const d = new Date(date);
  d.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
  return d;
}

/**
 * Write each block to the AI Calendar for the week `weekOffset` weeks from
 * `reference`. Returns the id pairing so the caller can track written events.
 */
export async function commitBlocks(
  client: GoogleCalendarClient,
  config: GoogleConfigStore,
  blocks: CalendarBlock[],
  reference: Date,
  weekOffset = 0,
): Promise<CommitResult[]> {
  const aiCalendarId = await ensureAiCalendar(client, config);
  const dates = weekDates(reference, weekOffset);
  const results: CommitResult[] = [];

  for (const b of blocks) {
    const date = dates[b.day];
    if (!date) continue;
    const { id } = await client.insertEvent(aiCalendarId, {
      summary: b.title,
      start: { dateTime: atMinutes(date, b.startMinutes).toISOString() },
      end: { dateTime: atMinutes(date, b.endMinutes).toISOString() },
      extendedProperties: { private: { source: b.source } },
    });
    results.push({ id: b.id, googleEventId: id });
  }

  return results;
}
