# 04-audit-canvas-assignments.md

Planning audit for **Story 4 — Canvas Assignments** (run 1).

## Executive Summary

- Overall Status: **PASS**
- Required Gate Failures: **0**
- Flagged Risks: **1**

## Gateboard

| Gate | Status | Notes (<=10 words) | Evidence |
| --- | --- | --- | --- |
| Requirement-to-test traceability | PASS | Every behavioral FR maps to a planned test | `config.test.ts`, `map.test.ts`, `ics.test.ts`, `status.test.ts`, shell test, `prompt.test.ts` |
| Proof artifact verifiability | PASS | Artifacts are commands/paths/tests, sanitized | mock-mode `curl`, named test files, demo screenshots |
| Repository standards consistency | PASS | 6 sources read; no conflicts | Standards table below |
| Open question resolution | PASS | Resolved with explicit assumptions | Endpoint/ICS-lib deferred to T2.2; term via `enrollment_state=active` |
| Regression-risk blind spots | FLAG | `dueDate` optional ripple | See FLAG 1 |
| Non-goal leakage | PASS | Tasks stay read-only, env-only, no auto-propose | Spec Non-Goals honored |

## Standards Evidence Table

| Source File | Read | Standards Extracted | Conflicts |
| --- | --- | --- | --- |
| `AGENTS.md` / `CLAUDE.md` | yes | Server-only integration boundary; SDD per story; core-rule tests mandatory; `@/*` alias | none |
| `README.md` | yes | Node 20+; `lint`/`typecheck`/`test` scripts; pre-commit runs all three | none |
| `docs/conventions.md` | yes | TS strict no `any`; PascalCase components; logic in `lib/`; co-located tests; conventional commits | none |
| `docs/architecture.md` | yes | Unified Next.js app; `lib/` framework-free; reserves `/api/canvas` | none |
| `.husky/pre-commit` | yes | `lint && typecheck && test`; no `--no-verify` | none |
| `package.json` | yes | `zod` available; no ICS lib yet (add in T2); test = `vitest run` | none |

## Findings

### REQUIRED Failures

None.

### FLAG Findings

1. **`TodoItem.dueDate` → optional is a cross-cutting change (regression risk).**
   - Risk: Making `dueDate` optional ripples into `lib/mock-data.ts`,
     `lib/planner/prompt.ts` (`serializeWeek`), `lib/date.ts`
     (`classifyDue`/`formatDueLabel` currently take a required string),
     `components/TodoSection/TodoItem.tsx`, and existing Story 1/2 tests. A missed
     consumer could break School-todo rendering or the planner serialization that Stories
     1–2 already rely on.
   - Suggested remediation (already reflected in tasks): T2.1 explicitly audits every
     consumer and adjusts `lib/date.ts`/`TodoItem.tsx`; T2.0 proof requires "existing
     suite compiles/passes"; T3.1 covers the undated render path; T4.1 covers undated
     serialization. Keep the full suite green after T2.1 before moving on. No new task
     needed — this FLAG is a watch-item, not a plan defect.

## Chain-of-Verification

- Do all REQUIRED gates pass with explicit evidence? **Yes** — see Gateboard + Standards
  table.
- Each FR traces to a named planned test (behavioral FRs) or to an architectural
  constraint enforced by import location (server-only boundary), matching Story 3
  precedent.
- Open questions carry explicit assumptions (active-enrollment term filter; ICS lib +
  exact endpoints confirmed in T2 via context7) that do not change the mapping contract.
- Final status: **PASS — ready for `/SDD-3-manage-tasks`** once Jack acknowledges the
  single FLAG (watch-item, no remediation edit required).
