# 08-spec-nowline-header-bleed-fix.md

## Introduction/Overview

The current-time red indicator line on the week calendar visually bleeds up
into the day-header and all-day-events area on both mobile and desktop. This
happens because the line renders inside the same shared, single-scroll
region as the sticky header/all-day strip, with a higher stacking order —
so whenever the scroll position brings the line's row underneath where the
sticky elements are pinned, the line paints over them. This spec makes the
line structurally impossible to render outside the hourly grid, by giving
the grid body its own independent vertical scroll region, separate from the
header and all-day strip.

## Goals

- The current-time line never visually overlaps the day-header or all-day
  strip, on both mobile and desktop, at any scroll position.
- The fix is a structural containment fix (the line is physically clipped
  out of that region), not a z-index reorder that depends on the header/
  strip having opaque backgrounds.
- Existing calendar behavior is fully preserved: synced horizontal scroll
  across header/strip/grid body (for the mobile minimum-width layout),
  vertical scroll through all displayed hours, sticky-feeling header/strip
  visibility, and all existing tests continue to pass unmodified.
- No regression to Spec 07's Pacific Time "now" computation — this is a
  layout/clipping fix only.

## User Stories

- **As Jack**, I want the current-time line to stay confined to the hourly
  grid, so the header and all-day events area always stays clean and
  readable no matter where I've scrolled or what time it is.
- **As Jack**, I want this to work the same way on my phone and on desktop,
  since I check the calendar from both.

## Demoable Units of Work

### Unit 1: Independent grid-body scroll region

**Purpose:** Restructure the calendar's scroll containers so the hourly grid
body (day columns, hour gutter, and the current-time line inside it) scrolls
vertically in its own region, decoupled from the day-header and all-day
strip — which no longer need to rely on `position: sticky` layered in the
same scrolling context as the line.

**Functional Requirements:**
- The system shall render the day-header and all-day strip in a region that
  is never vertically scrolled together with the hourly grid body, so their
  screen position and the grid body's screen position can never overlap.
- The system shall keep the hourly grid body (day columns + hour gutter)
  vertically scrollable within its own bounded region, showing all
  configured hours via internal scroll.
- The system shall keep the day-header, all-day strip, and grid body
  horizontally scrolling together in sync (needed for the existing
  `min-w-[760px]` mobile layout), so day columns stay aligned under their
  headers at any horizontal scroll position.
- The system shall render the current-time line only within the grid
  body's own bounded region, such that it is geometrically impossible for
  it to render over the day-header or all-day strip at any scroll position
  — verified by a test that scrolls the grid to a position where the old
  implementation would have bled, and asserts the line's rendered
  bounding box never overlaps the header/strip's bounding box.
- The system shall not regress any existing Calendar/AllDayStrip/NowLine
  test (`data-testid="day-header"`, `data-testid="all-day-strip"`,
  `data-testid="day-column"`, `data-testid="now-line"`), all of which must
  continue to pass unmodified.

**Proof Artifacts:**
- Test: a new/extended `components/Calendar/Calendar.test.tsx` (or a
  dedicated layout test) that renders the calendar with a "now" position
  that would have bled under the old implementation (e.g. near the top of
  the visible window after scrolling), and asserts the now-line's
  measured position never exceeds the grid body's own top edge, demonstrates
  the structural fix.
- Test: existing `Calendar.test.tsx`, `NowLine.test.tsx`, and
  `accessibility.test.tsx` suites pass unmodified, demonstrating no
  regression to existing calendar behavior.
- Manual check (screenshots optional, per Jack's preference to review
  live rather than via screenshots): scrolling the calendar on both a
  narrow (mobile-width) and wide (desktop-width) viewport confirms the red
  line never visually overlaps the header or all-day strip at any scroll
  position, including when "now" falls near the start of the visible hour
  window.

## Non-Goals (Out of Scope)

1. **Pacific Time correctness**: already fixed in Spec 07; this unit must
   not change `NowLine`'s time computation, only its rendering containment.
2. **Calendar event outline/visual polish**: tracked separately (a later
   unit in the current work plan).
3. **Todo title wrapping**: unrelated, tracked separately.
4. **Any change to which hours are shown or how the window widens for
   out-of-range events** (`lib/time.ts`'s `windowForBlocks`): unaffected by
   this fix.
5. **Reverting the sticky-header visual behavior**: the header and all-day
   strip must remain visually anchored at the top while the grid scrolls —
   this spec changes *how* that's achieved (independent scroll region
   instead of `position: sticky` sharing a stacking context with the line),
   not the resulting user-visible behavior.

## Design Considerations

No visual design changes — the header, all-day strip, and grid body should
look identical to today; only the scroll/clipping mechanics change so the
current-time line can never render outside the hourly grid. Must hold on
both mobile (narrow, horizontally-scrolling `min-w-[760px]` layout) and
desktop viewports.

## Repository Standards

- Business/layout logic stays in the component (`components/Calendar/`);
  no new `lib/` module is needed since this is purely a CSS/DOM structure
  fix with no new framework-free logic to extract.
- Co-locate any new/updated tests with the component under test, per
  `docs/conventions.md`.
- Tailwind v4 utility classes only, consistent with the rest of
  `Calendar.tsx`/`AllDayStrip.tsx` (no new raw CSS files).
- `npm run lint`, `npm run typecheck`, and `npm test` must stay green.

## Technical Considerations

- **Root cause (confirmed via code reading of `components/Calendar/
  Calendar.tsx` and `AllDayStrip.tsx`):** today, `Calendar.tsx` renders one
  shared `overflow-auto` region (line ~119) containing the day-header
  (`sticky top-0 z-20`), the all-day strip (`sticky top-[57px] z-10`, only
  rendered when there are all-day events), and the grid body (plain,
  non-sticky, containing the day columns and `NowLine`, which renders at
  `z-30`). Because all three share one scrolling coordinate space and
  `NowLine`'s z-index is higher than the sticky elements', whenever the
  scroll position causes the grid body's content (including wherever "now"
  falls) to visually coincide with the screen band the sticky header/strip
  occupy, `NowLine` paints over them — regardless of the header/strip
  having opaque backgrounds, since paint order there is governed purely by
  z-index, not overflow clipping.
- **Fix:** split the single shared scroll region into two nested regions —
  an outer region that scrolls **horizontally only** (preserving the
  existing `min-w-[760px] md:min-w-0` mobile behavior, keeping header/strip/
  grid-body columns aligned), and an inner region, wrapping only the grid
  body, that scrolls **vertically only** and is height-bounded (e.g. `flex-1
  min-h-0 overflow-y-auto` inside a flex column). Once the grid body has its
  own independent vertical scroll region, the header and all-day strip no
  longer need to share that scrolling coordinate space at all — they simply
  sit above it as normal (non-scrolling) flow content, so `NowLine`,
  confined entirely within the grid body's own box, can never occupy the
  same screen region as the header/strip, regardless of z-index. `position:
  sticky` on the header/strip becomes unnecessary under this structure (they
  no longer scroll), though it may be left in place harmlessly if simpler
  to implement without removing it — implementation should verify no visual
  regression either way.
- No existing test asserts on the specific `sticky`/`overflow-auto` Tailwind
  classes directly (confirmed via `grep` of `Calendar.test.tsx` and
  `accessibility.test.tsx`) — only on `data-testid` attributes — so this
  restructuring is expected to be safe against the existing test suite.

## Security Considerations

No specific security considerations identified — this is a client-side
layout/CSS fix with no data handling changes.

## Success Metrics

1. **Zero visual overlap**: manually verified on both a narrow and wide
   viewport that the current-time line never paints over the header or
   all-day strip at any scroll position.
2. **No regressions**: full existing test suite (`npm test`), `npm run
   lint`, and `npm run typecheck` stay green, with no changes required to
   existing `Calendar.test.tsx`/`NowLine.test.tsx`/`accessibility.test.tsx`
   assertions.

## Open Questions

No open questions at this time — scope and the "clip via containment, not
z-index reordering" approach were confirmed with Jack in a prior
clarification session before this spec was written.
