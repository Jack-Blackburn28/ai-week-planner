# 04-validation-canvas-assignments.md

Validation of **Story 4 — Canvas Assignments** against
`04-spec-canvas-assignments.md` and the Task-04 proof artifacts.

## 1) Executive Summary

- **Overall: PASS** — no gate tripped (A–F all satisfied).
- **Implementation Ready: Yes** — all functional requirements are verified by tests,
  endpoint output, and screenshots; the build compiles and the full suite is green.
- **Key metrics:**
  - Requirements Verified: **15/15 (100%)**, 0 Unknown.
  - Proof Artifacts working: **9/9 (100%)** (4 proof docs + 5 screenshots, all
    backed by reproducible tests/CLI).
  - Files changed vs expected: **36 changed**, all mapped to Spec 04 tasks
    (core → FRs, supporting → linked); 0 out-of-scope core changes.
  - Tests: **127 passing** (was 104 pre-story, +23); lint + typecheck clean;
    `npm run build` compiles with both `/api/canvas/*` routes.

## 2) Coverage Matrix

### Functional Requirements

| Requirement | Status | Evidence |
| --- | --- | --- |
| U1 · read config from env vars only | Verified | `lib/canvas/config.ts`; `config.test.ts` (5 cases); commit `cef5c66` |
| U1 · select token→ICS→none by precedence | Verified | `config.test.ts` precedence matrix (token beats ICS; token needs base URL) |
| U1 · status endpoint `{connected,mode}`, no secret | Verified | `app/api/canvas/status.test.ts` (leak guard); `curl` → `{"connected":true,"mode":"token"}` (proof 01) |
| U1 · Settings drawer shows status, no secret input | Verified | `components/Settings/CanvasConnect.tsx`; screenshot `04-task-01-settings-drawer.png` |
| U1 · server-only boundary (`lib/canvas/*`) | Verified | All `lib/canvas/*` imported only by `app/api/canvas/*`; `CanvasConnect` reads only the status JSON |
| U2 · fetch + map assignments → `TodoItem` | Verified | `lib/canvas/{client,map}.ts`; `map.test.ts`; `curl /api/canvas/assignments` (proof 02) |
| U2 · scope filter (future + recent-overdue + undated) | Verified | `map.test.ts` "includes future and recently-overdue, excludes far-overdue"; "always includes undated" |
| U2 · submitted/graded → done, stays visible | Verified | `map.test.ts` (submitted OR graded → done); screenshot `04-task-03-school-populated.png` (Reading checked) |
| U2 · `TodoItem.dueDate` optional + "No due date" | Verified | `lib/types.ts`; `TodoItem.tsx`; screenshot `04-task-03-school-undated.png` |
| U2 · manual toggle any School item | Verified | `DashboardShell.toggleTodo` (both lists); `TodoSection.test.tsx` toggle behavior intact |
| U2 · "Connect Canvas" empty state when unconfigured | Verified | `DashboardShell.canvas.test.tsx`; screenshot `04-task-03-connect-empty-state.png` |
| U2 · ICS fallback maps feed → School items | Verified | `lib/canvas/ics.ts`; `ics.test.ts` against `fixtures/sample.ics` |
| U3 · fetch on load + Refresh, no polling | Verified | `DashboardShell` mount effect + Refresh; `DashboardShell.canvas.test.tsx` "re-fetches on Refresh" |
| U3 · School todos flow to planner `WeekState` | Verified | `allTodos` → `toWeekState`; `serializeWeek` renders todos; `prompt.test.ts` |
| U3 · prompt treats due dates as deadlines, rules intact | Verified | `prompt.ts`; `prompt.test.ts` (deadline/overdue/soonest-due + "only propose … when jack asks") |

### Repository Standards

| Standard Area | Status | Evidence & Notes |
| --- | --- | --- |
| Coding standards | Verified | TS strict (typecheck clean, no `any`); PascalCase components; `@/*` alias; logic in `lib/` |
| Server-only boundary | Verified | Canvas SDK/network + secrets confined to `lib/canvas/*` → `app/api/canvas/*` (mirrors Google/Anthropic) |
| Testing patterns | Verified | Vitest + RTL, co-located `*.test.ts(x)`; +23 tests; core mapping/scope/submission covered |
| Quality gates | Verified | Husky pre-commit ran lint+typecheck+test on every commit; all green |
| Secrets handling | Verified | Env-var only; `.env.example` placeholders; `.env.*` gitignored; no secret in any endpoint/proof |
| Commit conventions | Verified | Conventional messages, `T#.0 … Spec 04` references, Co-Authored-By trailer |
| Docs | Verified | `docs/canvas-setup.md` added (token + ICS setup, demo mode, lib note) |

### Proof Artifacts

| Task | Proof Artifact | Status | Verification |
| --- | --- | --- | --- |
| T1.0 | `config.test.ts` + `status.test.ts`; `curl /api/canvas/status`; Settings screenshot | Verified | 9 tests pass; endpoint returns `{connected,mode}` with no secret |
| T2.0 | `map.test.ts` + `ics.test.ts`; `curl /api/canvas/assignments` JSON | Verified | Mapping/scope/submission/undated + ICS all pass; endpoint returns mapped School items |
| T3.0 | `DashboardShell.canvas.test.tsx`; 3 screenshots (populated/undated/empty) | Verified | 3 tests pass; screenshots show submitted-checked, "No due date", "Connect Canvas" |
| T4.0 | `prompt.test.ts`; planner-chat screenshot | Verified | Deadline guidance asserted + rules intact; chat propose→approve flow shown |

## 3) Validation Issues

No CRITICAL, HIGH, or MEDIUM issues.

**LOW (non-blocking) notes:**

1. **Live Canvas network path not exercised against real Canvas.** The real
   API-token/ICS clients are verified through the `CanvasClient` interface, the ICS
   parser against a fixture, and demo mode — not against a live Canvas instance
   (requires Jack's token/URL). This is **Success Metric 1** (Jack's live
   verification) and is expected/non-blocking, mirroring Story 3's Google-connect note.
2. **Deadline-prioritization behavior manifests only with a live model.** The
   strengthened prompt is verified deterministically by `prompt.test.ts`; the offline
   mock planner (no `ANTHROPIC_API_KEY`) returns a scripted draft and does not itself
   re-order by due date. Behavior takes effect with zero code change once a key is set
   (documented in the T4 proof). Non-blocking.

## 4) Evidence Appendix

- **Commits analyzed:** `cef5c66` (T1.0), `e07b1f0` (T2.0), `cd4eeb6` (T3.0),
  `e43106a` (T4.0); baseline `8f5f40e`, audit `225e9c5`.
- **Changed files:** 36 total. Core (`lib/canvas/*`, `app/api/canvas/*`,
  `components/{DashboardShell,Settings/CanvasConnect,TodoSection/*}`, `lib/types.ts`,
  `lib/planner/prompt.ts`) all map to FRs above. Supporting (tests, `fixtures/sample.ics`,
  `docs/canvas-setup.md`, `.env.example`, `package.json`/lock for `ical.js`, proofs) all
  linked to their tasks. No out-of-scope core changes (GATE D1 pass).
- **Test suite:** `npm test` → 28 files, 127 tests pass.
- **Build:** `npm run build` compiles; routes include `ƒ /api/canvas/assignments` and
  `ƒ /api/canvas/status`.
- **Security scan:** `grep -niE "token|secret|api_key|bearer"` over `04-proofs/` returns
  only descriptive prose and placeholders — no real credentials (GATE F pass). The one
  test string `1//leak-me-if-you-can` is an intentional fake asserting the status route
  does NOT echo it.

---

**Validation Completed:** 2026-07-08
**Validation Performed By:** Claude Opus 4.8 (1M context)
