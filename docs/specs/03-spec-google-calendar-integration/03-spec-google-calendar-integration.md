# 03-spec-google-calendar-integration.md

## Introduction/Overview

Story 3 connects the AI Week Planner to **real Google Calendar data across two accounts**.
The app gains its own server-side Google OAuth integration (not the agent's MCP tools):
Jack connects his **Liatrio work account** (read-only) and his **personal account**
(`the-blackburns.com`, read + write). After connecting, Jack picks which calendars in
each account map to **work** vs **personal**. The calendar view then shows real events —
work meetings and personal events — for the displayed week, refreshed every time the app
opens (plus a manual Refresh button).

When Jack approves an AI plan in chat, the approved blocks are written as real events to a
dedicated **"AI Calendar"** in his personal account (auto-created if missing). The planner
now computes free space around **real busy time** — every work-calendar event and every
real personal-calendar event is immovable and must never be overlapped — while events the
app itself wrote into the "AI Calendar" are **not** treated as busy, so the AI can move and
replace its own placements when replanning.

Per Jack's direction, there is **no hardcoded work-hours block** in this story (work hours
stay blank until a future in-app capability lets Jack set them via the AI). Class times and
the Work/School todo lists remain mock until Canvas (Story 4) and Granola (Story 5).

## Goals

- Add the app's own **server-side Google OAuth** for two accounts: Liatrio work
  (read-only) and personal (read + write), with refresh tokens stored **encrypted at rest**
  in a gitignored local file (no database yet).
- Let Jack **map calendars to work vs personal** after connecting, and **auto-create /
  designate an "AI Calendar"** in the personal account as the write-back target.
- **Read and display real events** for the displayed week (with prev/next week
  navigation): work meetings as nested work-colored blocks, personal events as blocks, and
  all-day events in a thin per-day strip; refresh on open + a manual Refresh button.
- **Write approved blocks** to the "AI Calendar" on plan approval, and surface them on the
  calendar as approved (solid) blocks.
- Extend the planner's **busy model** so real work + personal events are immovable
  (never-overlap) while "AI Calendar" events are excluded from busy time.
- Keep the app **fully runnable when nothing is connected yet** (graceful "Connect your
  Google accounts" state), preserving the mock/manual flow from Stories 1–2.

## User Stories

- **As Jack**, I want to connect my Liatrio and personal Google accounts once and have the
  app remember them, so I don't re-authenticate every visit.
- **As Jack**, I want to choose which calendars count as work and which count as personal,
  so the app shows exactly the events I care about.
- **As Jack**, I want my real work meetings and personal events to appear on the week view
  and stay current whenever I open the app, so the calendar reflects reality.
- **As Jack**, I want approved AI plans to show up as real events in a dedicated "AI
  Calendar," so my planned time lives in Google Calendar without cluttering my real
  personal calendar.
- **As Jack**, I want the AI to plan only around my real commitments (work + personal
  events) and freely rearrange its own AI-Calendar blocks, so proposals never double-book
  me but replanning stays flexible.
- **As Jack (nothing connected yet)**, I want the app to still load and clearly prompt me to
  connect my accounts, so it never breaks before setup.

## Demoable Units of Work

### Unit 1: Connect two Google accounts (OAuth + encrypted token storage)

**Purpose:** Give the app its own Google sign-in for both accounts and persist the
resulting refresh tokens securely, so calendar access survives restarts.

**Functional Requirements:**
- The system shall provide two distinct "Connect Google" entry points — one labeled
  **Work** (Liatrio, read-only scope) and one labeled **Personal** (read + write scope) —
  each starting a standard Google OAuth 2.0 authorization-code flow handled **server-side**.
- The system shall request offline access (`access_type=offline`, `prompt=consent`) so a
  **refresh token** is obtained, and request scopes `calendar.readonly` for Work and full
  `calendar` for Personal (full scope is required to create the "AI Calendar").
- The system shall store each account's refresh token in a **gitignored, encrypted** local
  file, using a symmetric key read from `TOKEN_ENC_SECRET` in the environment; tokens shall
  never be committed, logged in plaintext, or sent to the browser.
- The system shall expose the connection status of each account (connected / not connected)
  to the UI and allow disconnecting an account (clearing its stored token).
- The `google_client_id` / `google_client_secret` shall be read from environment variables
  and used only in server-side code.

**Proof Artifacts:**
- Screenshot: the app's connect UI showing **Work: connected** and **Personal: connected**
  demonstrates both OAuth flows complete.
- File listing: `.tokens.json` exists and is gitignored (shown in `.gitignore`), and its
  contents are ciphertext (not readable tokens) demonstrates encryption at rest.
- Test: token encrypt→decrypt round-trip and "refresh token never returned to client"
  guard pass demonstrates secure storage.
- Doc: `docs/google-calendar-setup.md` walks through creating the OAuth client and setting
  the consent screen to **In production** demonstrates the setup is reproducible.

### Unit 2: Map calendars to work / personal (+ auto-create "AI Calendar")

**Purpose:** Let Jack decide which calendars feed the work and personal views, and
establish the dedicated write-back calendar.

**Functional Requirements:**
- The system shall list the available calendars for each connected account (id + display
  name) and let Jack assign each to **work**, **personal**, or **ignored**.
- The system shall persist these mappings alongside the connection config (same encrypted
  local file / a sibling gitignored config file).
- The system shall ensure a personal calendar named **"AI Calendar"** exists — creating it
  in the personal account if absent — and use it as the sole **write-back target** for
  approved blocks; its calendar id shall be recorded in config.
- The system shall treat the "AI Calendar" as the app's own layer: it is **not** offered as
  a "busy/immovable" source even though it lives in the personal account.

**Proof Artifacts:**
- Screenshot: the calendar-mapping UI with calendars assigned to work/personal demonstrates
  mapping works.
- Screenshot / API response: the personal account now contains an "AI Calendar"
  demonstrates auto-creation.
- Test: mapping persistence and "AI Calendar excluded from busy sources" pass demonstrates
  the ownership rule.

### Unit 3: Read & display real events for the displayed week

**Purpose:** Show real work meetings and personal events on the week calendar, current on
open, with week navigation.

**Functional Requirements:**
- The system shall fetch events, **server-side**, for the mapped work and personal
  calendars over the displayed week's real date range (Mon–Sun containing the selected
  week), on every app load and whenever a **Refresh** control is used.
- The system shall render **work-calendar** events as work-colored blocks using the
  existing work-block + nested-meeting structure (work-hours container left unset/grayed),
  and **personal-calendar** events as personal-colored blocks, positioned by their real
  start/end times converted to the calendar's minutes-from-midnight model.
- The system shall render **all-day** events in a thin per-day strip and shall **not** count
  them as busy time.
- The system shall provide **previous / next week** navigation with real dates on the day
  columns, re-fetching events for the newly displayed week.
- The system shall auto-expand the visible time window (per `lib/config.ts`) when a timed
  event falls outside the default 6am–10pm range, and render events in the user's local
  timezone.
- The system shall degrade gracefully: if an account is not connected or a fetch fails, the
  app still loads and shows a clear connect/retry state rather than crashing.

**Proof Artifacts:**
- Screenshot: the week view showing real work meetings (nested) and personal events on
  their real dates demonstrates reading + display.
- Screenshot: prev/next week navigation showing a different week's real events demonstrates
  week navigation + per-week fetch.
- Screenshot: an all-day event in the top strip demonstrates all-day handling.
- Test: event mapping (Google event → `CalendarBlock` with correct day/times/source) and
  all-day classification pass demonstrates correct transformation.

### Unit 4: Write approved plans to "AI Calendar" + real busy model

**Purpose:** Close the loop — approving a plan creates real events, and the planner plans
around real commitments while owning its AI-Calendar blocks.

**Functional Requirements:**
- On plan approval in chat, the system shall **write each approved block as a real event**
  to the personal "AI Calendar" (server-side), and reflect them on the calendar as approved
  (solid) blocks. The link between an approved block and its Google event id shall be
  recorded so blocks can be updated/removed on replanning.
- The planner's free-space computation shall treat **all work-calendar events and all real
  personal-calendar events as immovable/busy** (extending Story 2's "never overlap an
  immovable block" rule to real events), and shall **exclude "AI Calendar" events from busy
  time** so the AI does not count its own placements against itself.
- The system shall re-validate any AI proposal against the real busy set on the server
  before returning it (AI output remains untrusted), and shall never write over a busy
  event.
- Replanning shall be able to move/replace the AI's own "AI Calendar" blocks without
  treating them as conflicts.

**Proof Artifacts:**
- Screenshot: an approved plan's blocks appearing as real events in Google's "AI Calendar"
  demonstrates write-back.
- Screenshot / transcript: a proposal that avoids a real work meeting and a real personal
  event demonstrates the real busy model.
- Test: "proposal overlapping a real event is rejected," "AI-Calendar events excluded from
  busy set," and "approval writes to AI Calendar (mockable Google client)" pass demonstrate
  the core rules with real data.

## Non-Goals (Out of Scope)

1. **Setting work hours / class times.** Work hours stay blank (future in-app capability);
   class times remain mock until Canvas (Story 4).
2. **Canvas assignments and Granola action items.** The Work/School todo lists stay mock
   (Stories 4 and 5).
3. **Multi-user / shared accounts.** Single user only; no per-user token tables.
4. **Two-way sync / editing real (non-AI) Google events from the app.** Work and real
   personal events are read-only in the app; the app only writes to the "AI Calendar."
5. **Background polling / push notifications / webhooks.** Freshness is fetch-on-open + a
   manual Refresh button only.
6. **A database or hosted secret store.** Tokens live in an encrypted local file for now;
   deployment-grade secret storage is Story 6.
7. **Recurring-event authoring** beyond writing simple timed events for approved blocks.

## Design Considerations

- Reuse the existing calendar UI, color-by-source scheme (Work = blue, School = purple,
  Personal = green), and dashed=proposed / solid=approved conventions from Stories 1–2.
- Keep the **work-block + nested-meeting** structure in the code; the work-hours container
  is an unset/grayed placeholder in this story, with Google work meetings shown as the
  nested "secondary" blocks. Exact rendering is left to implementation discretion (per
  Jack's guidance).
- All-day events render in a slim strip at the top of each day column.
- Connection + calendar-mapping UI should be reachable but unobtrusive (e.g. a settings
  affordance), and the app must present a clear "Connect your Google accounts" state before
  setup.
- Day columns show real dates; a Refresh control and prev/next-week controls are visible on
  the calendar.
- Mobile usability from Story 1 must be preserved.

## Repository Standards

- Next.js (App Router) + TypeScript strict; Tailwind v4 CSS-first (no `tailwind.config.js`).
- Framework-free logic in `lib/`; Google/OAuth SDK usage confined to **server-side** code
  (Route Handlers / server modules) — mirror the planner boundary where the Anthropic SDK
  lives only in `lib/planner/server.ts`. Suggested home: `lib/google/*` (client, auth,
  token store, mapping, event→block transforms) imported by `app/api/*` routes.
- Vitest + React Testing Library; co-located `*.test.ts(x)`; core-rule logic must have tests.
- Import via the `@/*` alias.
- Conventional commits ending with the `Co-Authored-By: Claude Opus 4.8 (1M context)`
  trailer; baseline planning commit at story start; push to `origin main` at story end.
- Husky pre-commit (`lint`, `typecheck`, `test`) must stay green.

## Technical Considerations

- **Library:** use Google's official `googleapis` Node client (`google-api-nodejs-client`)
  server-side for OAuth2 and the Calendar API. The client auto-refreshes access tokens from
  the stored refresh token; capture updated tokens via its `tokens` event.
- **OAuth flow:** authorization-code flow with `access_type=offline` and `prompt=consent`
  to reliably receive a refresh token; two OAuth clients/config entries distinguished by
  the connect entry point (work vs personal) and their scopes.
- **Consent-screen publishing:** the OAuth app must be set to **"In production"** to avoid
  the 7-day refresh-token expiry that applies to apps in "Testing" status for sensitive
  scopes. Calendar is a *sensitive* (not *restricted*) scope, so a single-user app can
  publish without full Google verification (accept the one-time "unverified app" warning).
  Documented in `docs/google-calendar-setup.md`.
- **Token storage:** symmetric-encrypt refresh tokens at rest (Node `crypto`, key from
  `TOKEN_ENC_SECRET`) in a gitignored file; never log plaintext tokens.
- **Event → block mapping:** convert Google event start/end (RFC3339, with timezone) into
  the app's `{day, startMinutes, endMinutes}` model relative to the displayed week and the
  user's local timezone; classify all-day events (date-only start/end) separately; tag
  source (work vs personal) from the calendar it came from; carry the Google event id and
  source calendar id on the resulting block/metadata.
- **Busy set:** the planner's immovable set = mock class times (still present) **+** fetched
  work events **+** fetched real personal events, **minus** anything from the "AI Calendar."
  The server re-validates proposals against this set before returning (AI untrusted), reusing
  Story 2's `lib/planner/validate.ts` design.
- **Data-model shift:** blocks become anchored to a real displayed week. Introduce a
  week-context (the Monday date of the displayed week) threaded through fetch + planner so
  day-index math maps to real dates. Keep `lib/config.ts` as the single window/week source.
- **Graceful mock fallback:** when no Google accounts are connected, the app continues to
  run on mock/manual data (like the no-API-key planner fallback), so tests and demos work
  without live credentials. Google client calls should be behind an interface that can be
  mocked in tests.

## Security Considerations

- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `TOKEN_ENC_SECRET` are secrets: read from
  environment only, never committed. Add them to `.env.example` (names only) and keep
  `.env*` gitignored.
- Refresh/access tokens must be **encrypted at rest** and never exposed to client-side code
  or logs; the token file (`.tokens.json` / mapping config) must be gitignored.
- Request **least-privilege scopes**: `calendar.readonly` for work; full `calendar` for
  personal only because creating the "AI Calendar" requires it.
- OAuth redirect URIs must be restricted to the app's known origins in the Google Cloud
  console.
- Proof artifacts (screenshots) must not reveal token contents, client secret, or the
  `TOKEN_ENC_SECRET`.

## Success Metrics

1. **Both accounts connect** and persist across a server restart without re-consenting
   (verified after publishing the OAuth app to production).
2. **Real events render** on the correct real dates for the displayed week, with prev/next
   navigation and Refresh working, and all-day events in the strip.
3. **Approval writes** the approved blocks as real events into the personal "AI Calendar."
4. **Never-overlap holds against real data:** no AI proposal overlaps any real work or
   personal event; AI-Calendar events are excluded from busy time (test-covered).
5. **Graceful when disconnected:** the app loads and prompts to connect, with the mock flow
   intact, when no Google accounts are configured.
6. Quality gates green: `lint`, `typecheck`, `test`, `build`.

## Open Questions

1. **Timezone:** Story 3 assumes a single local (browser) timezone for the single user. Is
   an explicit timezone setting ever needed (e.g. travel)? (Default: browser local tz.)
2. **AI-Calendar lifecycle on replanning:** when a replan supersedes earlier approved
   blocks, should the old "AI Calendar" events be **deleted/updated** automatically, or left
   in place? (Story 3 records event ids to enable this; the exact cleanup policy can be
   minimal now and refined later.)
3. **Settings entry point:** where should the connect / calendar-mapping UI live (a settings
   drawer, a dedicated route, or inline empty-state)? (Design detail for SDD-2/3.)
