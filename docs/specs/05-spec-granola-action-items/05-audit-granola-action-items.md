# 05-audit-granola-action-items.md

Planning audit for **Story 5 — Granola Action Items** (run 1).

## Executive Summary

- Overall Status: **PASS**
- Required Gate Failures: **0**
- Flagged Risks: **2**

## Gateboard

| Gate | Status | Notes (<=10 words) | Evidence |
| --- | --- | --- | --- |
| Requirement-to-test traceability | PASS | Every behavioral FR maps to a planned test | `tokenStore`/`extract`/`store`/`completions`/planner tests + component tests |
| Proof artifact verifiability | PASS | Commands/paths/tests, sanitized demo data | `curl` endpoints, named tests, demo screenshots |
| Repository standards consistency | PASS | 6 sources read; no conflicts | Standards table below |
| Open question resolution | PASS | Resolved with explicit assumptions | Endpoints pinned in impl vs reverse-eng docs; interface fixed; Canvas-clear = archive |
| Regression-risk blind spots | FLAG | Layout + Work-source swap | FLAG 1 |
| Non-goal leakage | FLAG | Archive touches Story 4 Canvas semantics | FLAG 2 |

## Standards Evidence Table

| Source File | Read | Standards Extracted | Conflicts |
| --- | --- | --- | --- |
| `AGENTS.md` / `CLAUDE.md` | yes | Server-only integration boundary; Anthropic only in server; core-rule tests; `@/*` alias | none |
| `README.md` | yes | Node 20+; lint/typecheck/test scripts; pre-commit runs all | none |
| `docs/conventions.md` | yes | TS strict no `any`; PascalCase; logic in `lib/`; co-located tests; conventional commits | none |
| `docs/architecture.md` | yes | Unified Next.js; `lib/` framework-free; reserves `/api/granola` | none |
| `lib/google/{auth,tokenStore}.ts` | yes | OAuth + AES-256-GCM store pattern to mirror for Granola | none |
| `lib/planner/{server,schema}.ts` | yes | Anthropic-in-server + zod structured output pattern to mirror for extraction | none |

## Findings

### REQUIRED Failures

None.

### FLAG Findings

1. **Regression risk: Work-list source swap + layout change.** Replacing the mock Work
   list with persisted Granola items and restructuring the right column could disturb
   Story 1–4 behavior (todo rendering, mobile view, planner input).
   - Mitigation (in plan): T5.2 asserts Work items still reach the planner; existing
     `TodoSection`/`DashboardShell` tests must stay green; T5.1 verifies mobile + desktop.
   - Watch-item, not a plan defect.

2. **Non-goal boundary: the Completed archive spans into Story 4 (Canvas).** The
   completions store is source-agnostic, so clearing a School item now archives it.
   - Resolution (documented in spec Non-Goals #3 + Open Q #2): Canvas auto-submitted
     items keep Story 4 behavior (checked in place); only **user-initiated clears** enter
     the archive. This is intentional and bounded, not scope creep.

## Chain-of-Verification

- All REQUIRED gates pass with explicit evidence (gateboard + standards table).
- Each behavioral FR traces to a named planned test; the server-only boundary is
  enforced by import location (matching Stories 3/4).
- Open questions carry explicit assumptions (Granola endpoints pinned during impl against
  reverse-engineered/personal-API docs; `GranolaClient` contract fixed; demo mode
  exercises the whole pipeline) that don't change the contracts in this spec.
- Final status: **PASS — ready for implementation.**
