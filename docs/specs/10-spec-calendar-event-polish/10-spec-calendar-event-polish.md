# 10-spec-calendar-event-polish.md

## Introduction/Overview

Calendar event blocks currently only get a left-edge accent border
(`border-l-4`), which makes adjacent or overlapping events hard to tell
apart at a glance, and the blocks overall feel visually flat (no shadow, no
hover feedback). This spec adds a full, darker-shade outline per category
around every block for clear separation, plus a subtle general polish pass
(spacing, shadow, hover) — staying close to the current clean, flat look
rather than a bold redesign.

## Goals

- Adjacent/overlapping event blocks are visually distinct from each other
  at a glance, via a full outline instead of a left-only accent.
- The outline is a darker shade of each block's own category color (work
  stays blue, school purple, personal green) — not literally blue on every
  block regardless of category.
- A subtle general polish pass (shadow, hover elevation) makes blocks feel
  less flat, without a bold visual redesign or color-palette change.
- No regression to existing block rendering (proposed/dashed styling,
  nested/solid styling, cascade offsetting for overlaps).

## User Stories

- **As Jack**, I want overlapping or adjacent calendar events to be clearly
  separated visually, so I can tell them apart at a glance without having to
  read the fine print.
- **As Jack**, I want the calendar to feel a little more polished overall
  (not rough), without it turning into a different-looking app.

## Demoable Units of Work

### Unit 1: Darker per-category outline + subtle polish

**Purpose:** Give every calendar event block a full, darker-shade outline in
its own category color, and a light shadow/hover treatment, replacing the
current left-accent-only border and fully flat appearance.

**Functional Requirements:**
- The system shall render a full (all-sides) border around every calendar
  event block — top-level, nested, and proposed — instead of the current
  left-only accent border, using a darker shade of that block's category
  color (work/school/personal), not a single fixed color across categories.
- The system shall introduce a new "outline" color token per category
  (darker than the existing base category color already used for fills/
  accents) as a Tailwind `@theme` token in `app/globals.css`, following the
  existing `--color-{source}`/`--color-{source}-soft` naming convention.
- The system shall apply a subtle default shadow and a slightly stronger
  shadow on hover to every block, with a smooth transition between the two,
  as the "general polish" pass — no change to block colors, fill, or text.
- The system shall preserve the existing visual distinction between
  approved (solid border), proposed (dashed border), and nested (solid
  fill + white text) block variants — only the border's color/weight and
  the new shadow/hover treatment change, not the variants' existing
  identifying styles.
- The system shall not regress cascade-offset rendering for overlapping
  blocks (the existing `depth`-based horizontal offset and `z-index`
  stacking).

**Proof Artifacts:**
- Test: a new `components/Calendar/CalendarBlock.test.tsx` verifies each
  source (work/school/personal) renders its own darker outline color class,
  and that proposed blocks keep their dashed border alongside the new
  outline color.
- Test: existing `Calendar.test.tsx` assertions (block positioning, proposed
  dashed style, nested flag) pass unmodified.
- Manual check in the running app (screenshots optional — Jack will review
  live rather than via a screenshot gate): overlapping/adjacent blocks in
  the same day column are visually distinct, and hovering a block shows a
  subtle shadow lift.

## Non-Goals (Out of Scope)

1. **Changing category colors themselves** (the base `work`/`school`/
   `personal` fill and text colors stay exactly as they are today).
2. **A bold visual redesign** (no new layout, no gradient fills, no
   animation beyond a simple shadow transition) — Jack chose the subtle
   refinement direction, not a bolder one.
3. **Making blocks clickable/interactive**: the hover treatment is a visual
   polish only; this spec does not add any new click behavior to blocks.
4. **Timezone, now-line, todo-wrap, or work-hours work**: unrelated,
   tracked as separate units in the current work plan.

## Design Considerations

- Outline color per category: a darker shade one step down Tailwind's own
  palette progression from the existing base color (e.g. work's existing
  base `#2563eb` is roughly Tailwind's blue-600; the new outline uses
  roughly the 700-weight equivalent for each category), keeping the same
  hue family so it reads as "the same color, just darker" rather than a
  different color entirely.
- Fill colors, text colors, and the dashed/solid/nested distinctions all
  stay exactly as today — only the border treatment and shadow/hover change.
- No screenshot review gate for this unit — Jack will check the running app
  himself.

## Repository Standards

- New color tokens go in `app/globals.css`'s existing `@theme` block,
  following the established `--color-{source}[-suffix]` naming pattern
  (`docs/conventions.md`: use `bg-work`, `border-personal`, etc. — never
  raw hex in component code).
- `SOURCE_STYLE` in `CalendarBlock.tsx` stays the single source of truth
  mapping category → Tailwind class strings (per the existing comment in
  that file: literal class strings only, since Tailwind's JIT can't detect
  dynamically-templated class names).
- Co-locate the new test with the component under test.
- `npm run lint`, `npm run typecheck`, and `npm test` must stay green.

## Technical Considerations

- New tokens: `--color-work-outline`, `--color-school-outline`,
  `--color-personal-outline` in `app/globals.css`, generating
  `border-work-outline` / `border-school-outline` / `border-personal-outline`
  Tailwind utilities automatically (same mechanism as the existing
  `-soft`/`-ring` suffixed tokens).
- `CalendarBlock.tsx`'s `SOURCE_STYLE` record gains an `outline` field per
  source; all three appearance branches (`nested`, `isProposed`, default)
  switch their border-color class from the existing `style.border` (the
  base category color) to the new `style.outline` (the darker shade), and
  the default (non-nested, non-proposed) branch changes from `border-l-4`
  to a full `border-2`.
- Shadow/hover: add `shadow-sm hover:shadow-md transition-shadow duration-150`
  (or equivalent Tailwind utilities) to the block's base className, applied
  uniformly across all variants.

## Security Considerations

No specific security considerations identified.

## Success Metrics

1. **Clear visual separation**: adjacent/overlapping blocks are visually
   distinguishable by their outline, verified live by Jack.
2. **No regressions**: `npm test`, `npm run lint`, `npm run typecheck` stay
   green, with existing `Calendar.test.tsx` block-styling assertions passing
   unmodified.

## Open Questions

No open questions at this time — scope (darker per-category outline, subtle
shadow/hover polish, no screenshot review gate) was confirmed with Jack in a
prior clarification session before this spec was written.
