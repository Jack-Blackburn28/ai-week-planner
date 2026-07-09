# 10-tasks-calendar-event-polish.md

> Note: Jack pre-approved running SDD-1 through SDD-4 straight through for
> this and the other units in this run without pausing at confirmation
> checkpoints. Single Demoable Unit → single parent task.

## Relevant Files

| File | Why It Is Relevant |
| --- | --- |
| `app/globals.css` | Add new darker-shade `--color-{source}-outline` theme tokens. |
| `components/Calendar/CalendarBlock.tsx` | Owns block appearance (fill/border/shadow) being changed. |
| `components/Calendar/CalendarBlock.test.tsx` | New co-located test covering the outline color per source and shadow/hover classes. |
| `components/Calendar/Calendar.test.tsx` | Existing suite (block positioning, proposed/nested assertions); must keep passing unmodified. |

### Notes

- Test command: `npm test`, or `npx vitest run <path>` for a single file.
- No new `lib/` module — pure styling change confined to
  `components/Calendar/` and the theme tokens in `app/globals.css`.
- `npm run lint` and `npm run typecheck` must stay green (Husky pre-commit
  gate).

## Tasks

### [x] 1.0 Darker per-category outline + subtle polish ✅ COMPLETE

#### 1.0 Proof Artifact(s)

- Test: new `components/Calendar/CalendarBlock.test.tsx` verifies each
  source (work/school/personal) renders its own darker outline border
  class, and that proposed blocks keep `border-dashed` alongside the new
  outline color.
- Test: existing `components/Calendar/Calendar.test.tsx` assertions pass
  unmodified (block positioning, proposed dashed style, nested flag).
- Manual check in the running app: overlapping/adjacent blocks are visually
  distinct via their outline, and hovering a block shows a subtle shadow
  lift (no screenshot gate required — Jack reviews live).

#### 1.0 Tasks

- [x] 1.1 Add `--color-work-outline`, `--color-school-outline`,
  `--color-personal-outline` tokens to the `@theme` block in
  `app/globals.css`, a darker shade of each existing base category color
  (same hue family, one step darker — e.g. roughly the 700-weight
  equivalent of the existing ~600-weight base colors).
- [x] 1.2 Add an `outline` field to `CalendarBlock.tsx`'s `SOURCE_STYLE`
  record per source (e.g. `"border-work-outline"`), alongside the existing
  `fill`/`border`/`text`/`solid` fields.
- [x] 1.3 Update the `nested` appearance branch to use `border-2
  ${style.outline}` (upgrading from the current 1px `border`).
- [x] 1.4 Update the `isProposed` appearance branch to use
  `border-2 border-dashed ${style.outline}` (swap the border color source
  from `style.border` to `style.outline`; keep `border-dashed`).
- [x] 1.5 Update the default (non-nested, non-proposed) appearance branch
  from `border-l-4 ${style.border}` to a full `border-2 ${style.outline}`.
- [x] 1.6 Add `shadow-sm hover:shadow-md transition-shadow duration-150` (or
  equivalent) to the block's base className, applied uniformly across all
  variants.
- [x] 1.7 Create `components/Calendar/CalendarBlock.test.tsx` with cases:
  (a) a work-source block renders `border-work-outline`, (b) a
  school-source block renders `border-school-outline`, (c) a
  personal-source block renders `border-personal-outline`, (d) a proposed
  block's className contains both `border-dashed` and its outline class,
  (e) the block's className contains the shadow/hover classes.
- [x] 1.8 Run `npx vitest run components/Calendar/CalendarBlock.test.tsx
  components/Calendar/Calendar.test.tsx` and confirm all pass.
- [x] 1.9 Manually verify in the dev server that overlapping/adjacent
  blocks are visually distinct via the new outline, and that hovering a
  block shows the shadow lift.
