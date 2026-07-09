/**
 * GET /api/google/events?week=<offset> — fetch + map events for the displayed
 * week from the mapped calendars.
 *
 * Returns busy (real work + personal) events as immovable blocks and any
 * "AI Calendar" events as movable approved blocks, plus all-day events. When no
 * account is connected the response is empty (the UI shows a connect prompt).
 */
import { NextResponse } from "next/server";
import { isMockMode, resolveClient } from "@/lib/google/client";
import { googleConfig } from "@/lib/google/config";
import { mapEvents, type CalendarMeta } from "@/lib/google/eventMap";
import { tokenStore } from "@/lib/google/tokenStore";
import type { GoogleAccount } from "@/lib/google/types";
import { weekDates } from "@/lib/week";
import type { RawEvent } from "@/lib/google/client";
import { nowInPacific } from "@/lib/timezone";
import { addDays } from "@/lib/date";
import { workHoursConfig } from "@/lib/workHours/config";
import { expandWorkHours } from "@/lib/workHours/expand";
import { nestWithinWorkHours } from "@/lib/workHours/nest";

interface Source {
  account: GoogleAccount;
  calendarId: string;
  meta: CalendarMeta;
}

export async function GET(req: Request) {
  const weekOffset = Number(new URL(req.url).searchParams.get("week") ?? "0") || 0;
  const client = resolveClient();
  const status = await tokenStore.status();
  const connected = (a: GoogleAccount) => isMockMode() || status[a];
  const mapping = await googleConfig.get();

  // Resolve which calendars to read per account. Fall back to every calendar in
  // an account when the user hasn't saved an explicit mapping yet.
  const idsFor = async (account: GoogleAccount, mapped: string[]) => {
    if (mapped.length > 0) return mapped;
    if (!connected(account)) return [];
    try {
      return (await client.listCalendars(account)).map((c) => c.id);
    } catch {
      return [];
    }
  };

  const sources: Source[] = [];
  for (const id of await idsFor("work", mapping.work)) {
    sources.push({ account: "work", calendarId: id, meta: { source: "work", immovable: true } });
  }
  const personalIds = await idsFor("personal", mapping.personal);
  for (const id of personalIds) {
    if (id === mapping.aiCalendarId) continue; // AI Calendar handled below (not busy)
    sources.push({ account: "personal", calendarId: id, meta: { source: "personal", immovable: true } });
  }
  if (mapping.aiCalendarId) {
    sources.push({
      account: "personal",
      calendarId: mapping.aiCalendarId,
      meta: { source: "personal", immovable: false },
    });
  }

  const reference = nowInPacific();
  const dates = weekDates(reference, weekOffset);
  // Padded a full day on each side of the Pacific week boundary: exact instant
  // precision doesn't matter here (any real-world server-timezone-vs-Pacific
  // skew is well under 24h), because correctness of which day an event lands
  // on is enforced downstream by mapEvents' own Pacific-based day-bucketing.
  const timeMin = addDays(dates[0], -1);
  timeMin.setHours(0, 0, 0, 0);
  const timeMax = addDays(dates[6], 1);
  timeMax.setHours(23, 59, 59, 999);

  const metaByCalendar: Record<string, CalendarMeta> = {};
  const raw: RawEvent[] = [];
  for (const s of sources) {
    metaByCalendar[s.calendarId] = s.meta;
    try {
      raw.push(
        ...(await client.listEvents(
          s.account,
          s.calendarId,
          timeMin.toISOString(),
          timeMax.toISOString(),
        )),
      );
    } catch {
      // Skip a calendar that fails; the rest still render.
    }
  }

  const { timed, allDay } = mapEvents(raw, metaByCalendar, reference, weekOffset);

  const workHoursRule = await workHoursConfig.get();
  const workHoursBlocks = expandWorkHours(workHoursRule, reference, weekOffset);
  const nestedTimed = nestWithinWorkHours(workHoursBlocks, timed);

  return NextResponse.json({
    weekOffset,
    blocks: [...workHoursBlocks, ...nestedTimed],
    allDay,
  });
}
