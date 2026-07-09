/**
 * Pacific Time helpers. This is a single-user, personal app hardcoded to
 * Jack's timezone by design — no timezone configuration is offered.
 *
 * `toPacific`/`nowInPacific` re-base an instant so its *local getters*
 * (`getFullYear`, `getMonth`, `getDate`, `getDay`, `getHours`, `getMinutes`,
 * `getSeconds`) report America/Los_Angeles wall-clock field values, no matter
 * what timezone the browser or server process itself runs in. This lets the
 * app's existing pure, local-getter-based date/week helpers (`lib/date.ts`,
 * `lib/week.ts`) work unchanged — they just need a Pacific-correct `Date` in.
 *
 * The returned `Date`'s `.getTime()`/`.toISOString()` do NOT represent the
 * original real-world instant — only its local-getter fields are meaningful.
 * Never use the return value to produce a UTC instant for an external system.
 */
const PACIFIC_TIME_ZONE = "America/Los_Angeles";

const PACIFIC_FORMATTER = new Intl.DateTimeFormat("en-US", {
  timeZone: PACIFIC_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

function partsToFields(date: Date): Record<string, number> {
  const parts = PACIFIC_FORMATTER.formatToParts(date);
  const fields: Record<string, number> = {};
  for (const part of parts) {
    if (part.type === "literal") continue;
    fields[part.type] = Number(part.value);
  }
  return fields;
}

/** Re-base `date` so its local getters report Pacific Time wall-clock fields. */
export function toPacific(date: Date): Date {
  const f = partsToFields(date);
  // Guard against the rare Intl "hour 24" edge case at local midnight.
  const hour = (f.hour ?? 0) % 24;
  return new Date(f.year, f.month - 1, f.day, hour, f.minute, f.second);
}

/** The current instant, re-based to report Pacific Time wall-clock fields. */
export function nowInPacific(): Date {
  return toPacific(new Date());
}
