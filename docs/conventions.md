# Conventions

Keep the codebase consistent and easy for the next person (or agent) to pick up.

## Language & types

- **TypeScript strict** everywhere. No `any` unless truly unavoidable (and commented).
- Model the domain in `lib/types.ts`; import types rather than re-declaring shapes.
- Prefer discriminated unions (e.g. `status: "approved" | "proposed"`) over booleans
  when a value has more than two meaningful states later.

## Files & naming

- **Components:** PascalCase files (`Calendar.tsx`), one main component per file.
  Group a feature's parts in a folder (`components/Calendar/`).
- **Non-components:** camelCase (`mock-data.ts` is fine for data modules; helpers like
  `time.ts`, `planning.ts`).
- **Imports:** use the `@/*` path alias, not deep relative paths.

## React

- Interactive components declare `"use client"`; keep them as small as sensible.
- Keep business logic out of components — put it in `lib/` and call it. Components render.

## Styling

- Tailwind v4 utility classes. The **source colors** (`work`/`school`/`personal`, each
  with a `-soft` tint) are defined as `@theme` tokens in `app/globals.css`; use
  `bg-work`, `text-school`, `border-personal`, etc. rather than raw hex.
- Approved blocks = solid; proposed blocks = dashed border + faded. Never rely on color
  alone — pair it with a shape/label difference (accessibility).

## Testing

- Vitest + React Testing Library. Co-locate tests: `Thing.tsx` → `Thing.test.tsx`.
- **Every core planning rule must have a test** (overlap-with-immovable, approve,
  discard). This is a hard requirement, not a nice-to-have.
- Test behavior, not implementation details. Query by role/text like a user would.

## Quality gates

- `npm run lint`, `npm run typecheck`, and `npm test` must all pass. The Husky
  pre-commit hook runs them; do not bypass it (`--no-verify`) without a good reason.

## Git

- Small, focused commits. Conventional-ish messages (`feat:`, `fix:`, `docs:`, `chore:`).
- In this project, SDD implementation commits reference the task/spec, e.g.
  `feat: week calendar surface … Related to T3.0 in Spec 01`.

## Security

- Never commit secrets. `.env*` is git-ignored; use `.env.example` for shape.
- Proof-artifact screenshots/logs must contain only mock or sanitized data.
