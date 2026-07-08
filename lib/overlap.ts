/**
 * Cascade layout for overlapping calendar blocks. Pure + framework-free.
 *
 * For a set of blocks in one day column, each block gets a "depth" = how many
 * earlier-starting blocks it overlaps. The renderer offsets each block right by
 * `depth × step` and layers it on top, so overlapping meetings fan out and the
 * left edge of the ones behind stays visible (instead of one fully covering the
 * next).
 */
export interface Span {
  id: string;
  startMinutes: number;
  endMinutes: number;
}

/** Map of block id → cascade depth (0 = no earlier overlap). */
export function cascadeDepths(spans: Span[]): Record<string, number> {
  const sorted = [...spans].sort(
    (a, b) => a.startMinutes - b.startMinutes || a.endMinutes - b.endMinutes,
  );
  const depths: Record<string, number> = {};
  // `active` = blocks started earlier that are still open when `b` starts.
  let active: Span[] = [];
  for (const b of sorted) {
    active = active.filter((a) => a.endMinutes > b.startMinutes);
    depths[b.id] = active.length;
    active.push(b);
  }
  return depths;
}
