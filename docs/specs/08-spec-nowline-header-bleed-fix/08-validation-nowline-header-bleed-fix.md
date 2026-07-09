# 08-validation-nowline-header-bleed-fix.md

## 1) Executive Summary

- **Overall:** PASS (no gates tripped)
- **Implementation Ready:** Yes — the single functional requirement set is
  fully verified via both an automated structural-containment test and
  independently re-executed live-browser evidence on desktop and mobile
  viewports; no unmapped core file changes; full quality gate clean.
- **Key metrics:** 100% Functional Requirements Verified (6/6), 100% Proof
  Artifacts Working (all re-executed/re-viewed during validation, not just
  trusted from the proof doc), 3 core files changed (all listed in the task
  list's Relevant Files table) + 1 commit.

## 2) Coverage Matrix

### Functional Requirements

| Requirement | Status | Evidence |
| --- | --- | --- |
| Header/all-day strip never share a vertical scroll region with the grid body | Verified | Code inspection: `Calendar.tsx` — header/strip now in normal flow (no `sticky`), only child of the outer horizontal-scroll wrapper; grid body wrapped in its own `overflow-y-auto` div; commit `be6cd98` |
| Grid body (day columns + hour gutter) remains vertically scrollable, showing all configured hours | Verified | `Calendar.test.tsx` "renders the week grid with 7 day headers" and block-positioning tests pass unmodified — grid content/height unchanged, only its scroll container changed |
| Header/strip/grid body stay horizontally in sync (mobile `min-w-[760px]`) | Verified | Code inspection: all three remain descendants of the single `min-w-[760px] md:min-w-0` flex-column child of the horizontal-scroll wrapper; live mobile screenshot (`mobile-scrolled-today.png`) shows header and grid columns correctly aligned after horizontal scroll |
| Now-line can never render over the header/strip, at any scroll position | Verified | New test `"confines the now-line inside the grid body, structurally separate from the header/strip"` in `Calendar.test.tsx` passes, asserting `gridBody.contains(nowLine) === true` and `gridBody.contains(header) === false`; corroborated by live screenshots at the exact boundary scroll position on both desktop and mobile |
| No regression to existing Calendar/AllDayStrip/NowLine tests | Verified | `npx vitest run components/Calendar/Calendar.test.tsx components/Calendar/NowLine.test.tsx components/accessibility.test.tsx` → 13/13 pass (re-executed during validation) |
| No regression to Spec 07's Pacific Time "now" computation | Verified | `NowLine.tsx`'s `nowInPacific()` call site untouched by this diff (confirmed via `git show be6cd98 -- components/Calendar/NowLine.tsx` → no changes); `NowLine.test.tsx` (Spec 07's Pacific-correctness test) passes unmodified |

### Repository Standards

| Standard Area | Status | Evidence & Compliance Notes |
| --- | --- | --- |
| Layout logic stays in components, no new `lib/` module | Verified | Only `components/Calendar/*` files touched |
| Tailwind v4 utilities only, no raw CSS | Verified | `git show be6cd98` diff is 100% Tailwind class changes, no new CSS files |
| Co-located tests | Verified | New test added directly to existing `Calendar.test.tsx`, no new test file needed |
| Quality Gates (`lint`, `typecheck`, `test`) | Verified | Re-run independently during validation: 185/185 tests, lint clean, typecheck clean |
| Git conventions (`feat:`/`fix:` prefix + spec/task reference) | Verified | Commit `be6cd98` uses `fix:` prefix (correct — this is a bug fix, not a new feature) and ends with `Related to T1.0 in Spec 08` |
| Security (no secrets in proof artifacts) | Verified | Grep scan of `docs/specs/08-spec-nowline-header-bleed-fix/` for API-key/token patterns returned no matches |

### Proof Artifacts

| Unit/Task | Proof Artifact | Status | Verification Result |
| --- | --- | --- | --- |
| Task 1.0 | Test: `Calendar.test.tsx` new structural-containment case | Verified | Re-run: 9/9 pass |
| Task 1.0 | Test: `Calendar.test.tsx`/`NowLine.test.tsx`/`accessibility.test.tsx` unmodified | Verified | Re-run: 13/13 pass |
| Task 1.0 | Screenshot: `desktop-initial.png` | Verified | File exists, embedded inline in proof doc, shows clean header/grid separation |
| Task 1.0 | Screenshot: `desktop-scrolled-top.png` | Verified | File exists, embedded inline, shows the boundary scroll position with no bleed |
| Task 1.0 | Screenshot: `mobile-initial.png` | Verified | File exists, embedded inline |
| Task 1.0 | Screenshot: `mobile-scrolled-today.png` | Verified | File exists, embedded inline, shows today's column with no header overlap |

## 3) Validation Issues

None. No CRITICAL, HIGH, MEDIUM, or LOW issues found.

- No unmapped core file changes: `Calendar.tsx` and `AllDayStrip.tsx` are
  both explicitly listed in the task list's Relevant Files table.
- No `Unknown` entries in the Coverage Matrix.
- Proof doc (`08-task-01-proofs.md`) follows the required reviewer-friendly
  structure: descriptive title, task summary, per-artifact "what it proves"/
  "why it matters" framing before each screenshot, inline images with the
  file path shown above each, and a closing reviewer conclusion.
- All 4 screenshots referenced in the proof doc were confirmed to exist on
  disk and were re-viewed during validation.

## 4) Evidence Appendix

### Git commit analyzed

```
be6cd98 fix: confine the now-line to the grid body's own scroll region
 components/Calendar/AllDayStrip.tsx   |   2 +-
 components/Calendar/Calendar.test.tsx |  28 ++++
 components/Calendar/Calendar.tsx      | 136 ++++++++--------
 (+ spec/task/audit/proof docs)
```

### Full suite re-run (final state)

```
npm test
 Test Files  41 passed (41)
      Tests  185 passed (185)

npm run lint
(clean)

npx tsc --noEmit
(clean)
```

### Security scan

```
grep -riE "sk-ant|api[_-]?key\s*[:=]\s*['\"a-zA-Z0-9]{10,}|AIza[0-9A-Za-z_-]{20,}|ghp_[0-9A-Za-z]{20,}" docs/specs/08-spec-nowline-header-bleed-fix/ -r
(no matches)
```

---

**Validation Completed:** 2026-07-09
**Validation Performed By:** Claude (Opus 4.8)
