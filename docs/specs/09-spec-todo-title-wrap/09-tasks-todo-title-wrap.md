# 09-tasks-todo-title-wrap.md

> Note: Jack pre-approved running SDD-1 through SDD-4 straight through for
> this and the other units in this run without pausing at confirmation
> checkpoints. Single Demoable Unit → single parent task.

## Relevant Files

| File | Why It Is Relevant |
| --- | --- |
| `components/TodoSection/TodoItem.tsx` | Owns the title rendering being changed from single-line `truncate` to a 2-line clamp with click-to-expand. |
| `components/TodoSection/TodoItem.test.tsx` | New co-located test file covering the clamp/expand toggle behavior. |
| `components/TodoSection/TodoSection.test.tsx` | Existing suite; must keep passing to confirm no regression to checkbox toggling, due-date emphasis, and meta-label rendering. |

### Notes

- Test command: `npm test`, or `npx vitest run <path>` for a single file.
- No new `lib/` module — this is local component state + Tailwind classes.
- `npm run lint` and `npm run typecheck` must stay green (Husky pre-commit
  gate).

## Tasks

### [x] 1.0 Two-line clamp with click-to-expand ✅ COMPLETE

#### 1.0 Proof Artifact(s)

- Test: new `components/TodoSection/TodoItem.test.tsx` verifies a long title
  renders with the 2-line clamp by default, and clicking it toggles to fully
  expanded and back, with the accessible expand/collapse affordance
  reflecting state.
- Test: existing `components/TodoSection/TodoSection.test.tsx` suite passes
  unmodified, demonstrating no regression.
- Manual check: a long title in the running app is fully readable after a
  click, and the checkbox stays visually aligned at 1-line, 2-line, and
  expanded row heights.

#### 1.0 Tasks

- [x] 1.1 Add local `expanded` state (`useState<boolean>`, default `false`)
  to `TodoItem`.
- [x] 1.2 Change the title `<p className="truncate ...">` to an interactive
  element (e.g. `<button type="button">` wrapping the text, left-aligned,
  no default button chrome) that toggles `expanded` on click, applies
  `line-clamp-2` when `!expanded` and no clamp class when `expanded`, and
  sets `aria-expanded={expanded}`.
- [x] 1.3 Verify the checkbox (`h-[18px] w-[18px] shrink-0 mt-0.5`) stays
  visually top-aligned as the title grows from 1 line to 2 lines to fully
  expanded — the row is already `items-start` flex, so this should hold
  without further change; adjust the `mt-0.5` offset only if a visual check
  in 1.6 shows misalignment.
- [x] 1.4 Create `components/TodoSection/TodoItem.test.tsx` with cases: (a) a
  short title has no visible truncation/clamp difference from today, (b) a
  long title defaults to the 2-line clamp class and `aria-expanded="false"`,
  (c) clicking the title toggles to the unclamped state and
  `aria-expanded="true"`, (d) clicking again toggles back.
- [x] 1.5 Run `npx vitest run components/TodoSection/TodoItem.test.tsx
  components/TodoSection/TodoSection.test.tsx` and confirm all pass.
- [x] 1.6 Manually verify in the dev server that a long todo title clamps to
  2 lines by default, expands fully on click, and the checkbox stays
  correctly aligned at each state.
