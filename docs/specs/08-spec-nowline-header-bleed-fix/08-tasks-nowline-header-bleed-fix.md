# 08-tasks-nowline-header-bleed-fix.md

> Note: Jack pre-approved running SDD-1 through SDD-4 straight through for
> this and the other units in this run without pausing at the parent-task/
> sub-task confirmation checkpoints. This spec has a single Demoable Unit, so
> a single parent task (with sub-tasks generated in the same pass) is
> appropriate rather than artificially splitting a cohesive layout fix.

## Relevant Files

| File | Why It Is Relevant |
| --- | --- |
| `components/Calendar/Calendar.tsx` | Owns the shared scroll region being split into independent horizontal/vertical scroll containers. |
| `components/Calendar/Calendar.test.tsx` | Extended with a scroll-position regression test proving the now-line can't bleed into the header/strip. |
| `components/Calendar/AllDayStrip.tsx` | Currently `sticky top-[57px] z-10`; the `sticky` positioning becomes unnecessary once it sits outside the independently-scrolling grid body. |
| `components/Calendar/NowLine.tsx` | Not expected to need changes — it just needs to keep rendering inside whatever container the grid body becomes; verified, not modified. |
| `components/accessibility.test.tsx` | Existing accessibility suite; must keep passing to confirm no regression from the DOM restructuring. |

### Notes

- Test command: `npm test`, or `npx vitest run <path>` for a single file.
- No new `lib/` module — this is a CSS/DOM structure fix confined to the
  `components/Calendar/` folder, per `docs/conventions.md`'s guidance to keep
  layout concerns in components.
- `npm run lint` and `npm run typecheck` must stay green (Husky pre-commit
  gate).

## Tasks

### [x] 1.0 Independent grid-body scroll region ✅ COMPLETE

#### 1.0 Proof Artifact(s)

- Test: a new case in `components/Calendar/Calendar.test.tsx` renders the
  calendar with a "now" position that would have bled into the header/strip
  under the old single-shared-scroll implementation, and asserts the
  now-line's rendered position stays within the grid body's own bounding
  box, demonstrating the structural fix.
- Test: existing `Calendar.test.tsx`, `NowLine.test.tsx`, and
  `accessibility.test.tsx` suites pass unmodified, demonstrating no
  regression.
- Manual check: scrolling the calendar on a narrow (mobile-width, e.g.
  375px) and a wide (desktop-width) viewport confirms the red line never
  visually overlaps the header or all-day strip at any scroll position.

#### 1.0 Tasks

- [x] 1.1 Restructure `Calendar.tsx`'s scroll region: change the outer
  `min-h-0 flex-1 overflow-auto` wrapper (currently holding header + strip +
  grid body together) to scroll **horizontally only** (`overflow-x-auto
  overflow-y-hidden`), and wrap only the grid body (the `<div className="grid" ...>`
  containing the hour gutter and day columns) in a new inner container that
  scrolls **vertically only** and fills remaining height (e.g. `flex-1
  min-h-0 overflow-y-auto` within a `flex flex-col` parent), so the header
  and all-day strip sit in normal flow above it, never sharing its vertical
  scroll.
- [x] 1.2 Remove the now-unnecessary `sticky top-0 z-20` classes from the
  day-header container and `sticky top-[57px] z-10` from
  `AllDayStrip.tsx`, since they no longer scroll and don't need to be
  pinned — verify visually that they still render correctly, always-visible,
  above the independently-scrolling grid body.
- [x] 1.3 Confirm the `min-w-[760px] md:min-w-0` mobile horizontal-scroll
  behavior still applies to header + strip + grid body together (i.e. the
  horizontal-scroll wrapper still contains all three, so day columns stay
  aligned under their headers at any horizontal scroll position).
- [x] 1.4 Add a regression test to `Calendar.test.tsx` that renders the
  calendar with `referenceDate`/window values chosen so "now" falls near the
  start of the visible hour window (the scroll position most likely to have
  bled under the old implementation), and asserts the now-line's computed
  `top` position plus the grid body's own container bounds never place it
  outside the grid body — e.g. by asserting the now-line's DOM ancestor is
  the new vertically-scrolling container, not a container shared with the
  header/strip.
- [x] 1.5 Run `npx vitest run components/Calendar/Calendar.test.tsx
  components/Calendar/NowLine.test.tsx components/accessibility.test.tsx`
  and confirm all pass unmodified (aside from the new case added in 1.4).
- [x] 1.6 Manually verify in the dev server on both a narrow (~375px) and
  wide viewport that scrolling the calendar never shows the red line
  overlapping the header or all-day strip.
