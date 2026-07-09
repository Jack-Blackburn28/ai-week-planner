# 09-spec-todo-title-wrap.md

## Introduction/Overview

Long todo item titles are currently cut off with a single-line `truncate`
ellipsis, with no way to read the rest — the meta line (source label + due
date) has the same problem. This spec makes titles wrap onto multiple lines
so the full title is always reachable: a 2-line soft cap by default, with a
tap/click on the title to expand it fully for the rare title that's still
long enough to be clipped past 2 lines.

## Goals

- No todo title is ever permanently unreadable — every title's full text is
  reachable via a single click/tap.
- The default (unexpanded) row stays compact and Things3-style, not
  needlessly tall for short titles.
- The checkbox and layout stay visually clean as rows grow to 2 lines or
  expand further.
- No regression to existing `TodoSection`/`TodoItem` behavior (toggling
  done, due-date emphasis, meta label display).

## User Stories

- **As Jack**, I want to see a long todo title without it being cut off with
  no way to read the rest, so I always know exactly what the task is.
- **As Jack**, I want the list to stay visually compact for the common case
  (short titles), so scanning my todos doesn't require excessive scrolling.

## Demoable Units of Work

### Unit 1: Two-line clamp with click-to-expand

**Purpose:** Replace the single-line truncation with a 2-line soft cap, and
let clicking/tapping the title toggle full expansion for titles still long
enough to exceed 2 lines.

**Functional Requirements:**
- The system shall render a todo item's title clamped to 2 lines by default
  (via `line-clamp-2`), instead of the current single-line `truncate`.
- The user shall be able to click or tap the title text to toggle it between
  the 2-line clamped state and its fully expanded (unclamped) state.
- The system shall persist the expanded/collapsed state only for the
  lifetime of that rendered item (local component state) — no need to
  persist across reloads or between different todo items.
- The system shall keep the checkbox visually anchored at the top-left of
  the row as the title grows to 2 lines or expands further, without
  overlapping or misaligning relative to the (now taller) title text.
- The system shall expose the title's interactive/expandable nature
  accessibly (e.g. a button role or equivalent affordance with an
  `aria-expanded` state), not just a bare click handler with no semantic
  signal.
- The system shall not regress existing `TodoItem`/`TodoSection` behavior:
  checkbox toggling, due-date emphasis/classification, and meta-label
  display must continue to work exactly as before.

**Proof Artifacts:**
- Test: a new `components/TodoSection/TodoItem.test.tsx` (or an extension of
  `TodoSection.test.tsx`) verifies a long title renders with the 2-line
  clamp class by default, and that clicking it toggles to the expanded
  (unclamped) state and back.
- Test: existing `TodoSection.test.tsx` suite passes unmodified, confirming
  no regression to checkbox toggling, due-date emphasis, or meta-label
  rendering.
- Manual check (screenshots optional per Jack's stated preference to review
  live): a long title in the running app is fully readable after a click,
  and the checkbox stays visually aligned at 1, 2, and expanded-line-count
  row heights.

## Non-Goals (Out of Scope)

1. **The meta line (source label + due date)**: stays `truncate` (single
   line) — only the title itself changes to clamp/expand. Not requested by
   Jack, and the meta line is short structured text (a label + a due-date
   phrase), not the free-form long text titles can be.
2. **Persisting expanded state across renders/reloads**: purely ephemeral
   per-render local state, reset whenever the list re-renders with fresh
   data.
3. **Calendar event outline/polish, work hours, timezone, now-line fixes**:
   unrelated, tracked as separate units in the current work plan.

## Design Considerations

- Keep the Things3-style compact row feel for the common case — titles that
  fit within 2 lines should look identical to today except no longer
  ellipsis-truncated at 1 line.
- The click/tap target is the title text itself; no separate "more"
  link/chevron, per Jack's stated preference for a clean, uncluttered row.
- Only the title text should carry the click/expand affordance — the
  checkbox and meta line keep their existing click behavior (toggle-done for
  the checkbox; no interaction for the meta line).

## Repository Standards

- `TodoItem.tsx` is a component under `components/TodoSection/` — this
  fix stays confined there; no new `lib/` module needed (no framework-free
  logic beyond a boolean toggle).
- Co-locate the new/extended test with the component under test, per
  `docs/conventions.md`.
- Tailwind v4 utilities only (`line-clamp-2` is a built-in Tailwind
  utility as of v3.3+, still available in v4 — no plugin needed).
- Interactive elements need an accessible role/label, consistent with the
  existing checkbox button's `aria-label`/`aria-checked` pattern in the same
  file.

## Technical Considerations

- Add local component state (`useState<boolean>`) to `TodoItem` tracking
  whether the title is expanded. `TodoItem` already renders an interactive
  `<button>` (the checkbox) with click handling, so it's already part of a
  client-rendered tree — no new `"use client"` boundary is needed.
- Change the title `<p className="truncate ...">` to a clickable element
  (e.g. a `<button type="button">` wrapping the text, or a `<p>` with
  `role="button" tabIndex={0}` plus a matching `onKeyDown` for
  Enter/Space) using `line-clamp-2` when collapsed and no line-clamp class
  when expanded.
- The existing `<li className="flex items-start gap-3 ...">` row already
  uses `items-start` (top alignment) with the checkbox as a fixed-size
  (`h-[18px] w-[18px] shrink-0`) sibling — this should already keep the
  checkbox correctly top-anchored as the title grows taller, since the row
  is a flex container that grows with content rather than a fixed-height
  row. Implementation should verify this holds visually rather than assume
  it does, and adjust (e.g. the checkbox's `mt-0.5` top offset) only if a
  visual check shows misalignment.

## Security Considerations

No specific security considerations identified.

## Success Metrics

1. **No more unreachable text**: every todo title's full text is visible
   either by default (≤2 lines) or after one click.
2. **No regressions**: `npm test`, `npm run lint`, `npm run typecheck` stay
   green, with existing `TodoSection.test.tsx` assertions passing
   unmodified.

## Open Questions

No open questions at this time — scope (2-line cap, click-the-title-to-expand,
no separate "more" affordance) was confirmed with Jack in a prior
clarification session before this spec was written.
