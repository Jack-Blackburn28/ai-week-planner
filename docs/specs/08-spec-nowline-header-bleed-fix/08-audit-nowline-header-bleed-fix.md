# 08-audit-nowline-header-bleed-fix.md

## Executive Summary

- Overall Status: PASS
- Required Gate Failures: 0
- Flagged Risks: 1

## Gate Overview

| Gate | Status | Notes |
| --- | --- | --- |
| Requirement-to-test traceability | PASS | Every FR maps to a test artifact (new Calendar.test.tsx case) or an existing-suite regression check (NowLine.test.tsx, accessibility.test.tsx). |
| Proof artifact verifiability | PASS | Each artifact names an exact test file/case or a concrete manual reproduction method (specific viewport widths). |
| Repository standards consistency | PASS | AGENTS.md/CLAUDE.md, README.md, and docs/conventions.md reviewed (same sources as Spec 07's audit); no conflicts. |
| Open question resolution | PASS | Spec's Open Questions section is explicitly empty. |
| Regression-risk blind spots | FLAG | The fix touches shared scroll-container structure that other calendar behaviors (horizontal scroll sync, sticky-feel) depend on; task 1.5 covers the existing automated suites, but there's no automated test for horizontal-scroll-sync specifically (only a manual check in 1.6). |
| Non-goal leakage | PASS | No task touches Pacific Time logic, event styling/polish, or todo wrapping. |

## Standards Evidence Table

| Source File | Read | Standards Extracted | Conflicts |
| --- | --- | --- | --- |
| `AGENTS.md` / `CLAUDE.md` | yes | Layout/UI logic belongs in `components/`; small focused commits; pre-commit runs lint/typecheck/test | none |
| `README.md` | yes | Vitest + RTL; Husky pre-commit gate | none |
| `docs/conventions.md` | yes | Co-locate tests; Tailwind v4 utilities only, no raw CSS; quality gates must pass | none |

## Findings

### FLAG Findings

1. Horizontal-scroll-sync regression risk has only a manual proof artifact.
   - Risk: a future change could desync horizontal scroll between the
     header/strip and grid body without a failing automated test to catch
     it.
   - Suggested remediation: acceptable to accept as-is — writing a jsdom
     scroll-sync test for Tailwind-driven CSS scroll behavior has low
     signal (jsdom doesn't lay out real scrollbars/widths), so a manual
     viewport check is the more reliable signal here. Noted for awareness,
     not blocking.

## User-Approved Remediation Plan

- Not applicable — no REQUIRED failures. Proceeding per Jack's standing
  instruction to remediate only blocking issues and continue without
  stopping for FLAG-level items.
