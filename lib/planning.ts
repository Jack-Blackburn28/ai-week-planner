/**
 * Pure planning rules — the heart of the app's guarantees. Framework-free and
 * unit-tested so the Story 2 AI planner reuses these exact functions instead of
 * reinventing them.
 *
 * Two core rules are encoded here:
 *   1. Never schedule over an immovable block  -> `overlapsImmovable` / `proposalFits`
 *   2. Approval required before commit          -> `approveProposal` / `discardProposal`
 */
import type { CalendarBlock, Proposal } from "@/lib/types";

/** Do two blocks occupy overlapping time on the same day? */
export function blocksOverlap(a: CalendarBlock, b: CalendarBlock): boolean {
  if (a.day !== b.day) return false;
  return a.startMinutes < b.endMinutes && b.startMinutes < a.endMinutes;
}

/**
 * Would `candidate` overlap any immovable block already on the calendar?
 * This is the guardrail enforcing "never schedule over work hours / class times".
 */
export function overlapsImmovable(
  candidate: CalendarBlock,
  existing: CalendarBlock[],
): boolean {
  return existing.some(
    (b) => b.immovable && b.id !== candidate.id && blocksOverlap(candidate, b),
  );
}

/** True only if every block in the proposal avoids all immovable blocks. */
export function proposalFits(proposal: Proposal, existing: CalendarBlock[]): boolean {
  return proposal.blocks.every((b) => !overlapsImmovable(b, existing));
}

/**
 * Approve: commit the plan by turning every `proposed` block into `approved`.
 * Returns a new array (does not mutate the input).
 */
export function approveProposal(blocks: CalendarBlock[]): CalendarBlock[] {
  return blocks.map((b) =>
    b.status === "proposed" ? { ...b, status: "approved" } : b,
  );
}

/**
 * Make Changes / discard: drop all `proposed` blocks, committing nothing.
 * Approved blocks are untouched. Returns a new array.
 */
export function discardProposal(blocks: CalendarBlock[]): CalendarBlock[] {
  return blocks.filter((b) => b.status !== "proposed");
}
