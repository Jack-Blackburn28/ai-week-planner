# Task 03 Proofs — GitHub Actions CI quality gate

## Task Summary

This task adds a slim GitHub Actions workflow that runs the repo's quality gate — lint,
typecheck, and the full test suite — on every push to `main` and every pull request. It does
**not** deploy; Vercel owns deploying, and this green check is the separate quality signal.

## What This Task Proves

- A single workflow (`.github/workflows/ci.yml`) runs `npm ci` → `npm run lint` →
  `npm run typecheck` → `npm test` on `ubuntu-latest` (Node 22).
- It triggers on `push` to `main` and on `pull_request`.
- It contains **no deploy step** — the gate is purely quality.
- The exact commands the workflow runs pass locally, so the run will be green on push.

## Evidence Summary

- The workflow file parses as valid YAML with the expected trigger, runner, and step order, and
  no deploy step.
- Running the workflow's exact commands locally passes: lint, typecheck, and 171 tests.
- The live green GitHub Actions run is captured at first push (see Task 05's end-to-end proof) —
  pushing requires the remote and is sequenced with connecting Vercel.

## Artifact: Workflow definition

**What it proves:** the CI gate exists, is slim, and does not deploy.

**Why it matters:** the visible green check on GitHub is the story's quality signal, deliberately
separate from Vercel's deploy.

**Artifact path:** `.github/workflows/ci.yml`

**Result summary:** structured parse confirms trigger `push:[main]` + `pull_request`, runner
`ubuntu-latest`, steps `Checkout -> Set up Node -> Install dependencies -> Lint -> Typecheck ->
Test`, and `has deploy step: false`.

```text
parsed OK
runs-on: ubuntu-latest
steps: Checkout -> Set up Node -> Install dependencies -> Lint -> Typecheck -> Test
has deploy step: false
```

## Artifact: Workflow commands pass locally (parity with the gate)

**What it proves:** the gate will pass on the runner because the same commands pass here.

**Why it matters:** de-risks the first CI run; it mirrors the existing pre-commit gate
(`lint && typecheck && test`).

**Command:**

```bash
npm run lint && npm run typecheck && npm test
```

**Result summary:**

```text
lint: PASS
typecheck: PASS
test: PASS   (Test Files 39 passed, Tests 171 passed)
```

## Pending (captured at first push)

- Screenshot of the **green GitHub Actions run** on a push and on a PR. This requires pushing to
  the GitHub remote, which is sequenced with connecting Vercel (Task 04) and demonstrated in the
  end-to-end proof (Task 05). The workflow above is validated and its commands pass locally, so
  the run is expected green.

## Reviewer Conclusion

The CI quality gate is defined as a slim, deploy-free workflow running lint + typecheck + tests on
push and PR; its commands pass locally, so the visible green check will appear on the first push.
