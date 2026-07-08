# 03-tasks-google-calendar-integration.md

> Tasks for Story 3 — Google Calendar integration (both accounts).
> Spec: `03-spec-google-calendar-integration.md`. Questions: `03-questions-1-google-calendar-integration.md`.
> Implementation checkpoint mode = **Batch**: build all parent tasks, commit once per
> parent task, pause once at the end.

## Relevant Files

| File | Why It Is Relevant |
| --- | --- |
| `package.json` | Add the `googleapis` dependency (official Node client, server-side only). |
| `.env.example` | Document new secret names: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`, `TOKEN_ENC_SECRET`. |
| `.gitignore` | Ignore the encrypted token/config files (`.tokens.json`, `.google-config.json`). |
| `docs/google-calendar-setup.md` | Step-by-step Google Cloud OAuth setup guide (client, redirect URIs, scopes, consent screen → In production). |
| `lib/google/types.ts` | Google-integration domain types: account (`work`/`personal`), stored token, calendar mapping, fetched event. |
| `lib/google/auth.ts` | Build the OAuth2 client, authorization URL (offline + consent), and code→token exchange. Server-only. |
| `lib/google/auth.test.ts` | Tests: correct scopes per account; authorization URL has `access_type=offline`, `prompt=consent`. |
| `lib/google/tokenStore.ts` | Encrypt/decrypt refresh tokens with `TOKEN_ENC_SECRET`; read/write gitignored `.tokens.json`; connection status; disconnect. |
| `lib/google/tokenStore.test.ts` | Tests: encrypt→decrypt round-trip; missing/malformed file handled; disconnect clears an account. |
| `lib/google/config.ts` | Persist calendar mapping + resolved "AI Calendar" id (gitignored `.google-config.json`); expose busy-source calendar ids (excludes AI Calendar). |
| `lib/google/mapping.test.ts` | Tests: mapping persistence round-trip; "AI Calendar" excluded from busy-source set. |
| `lib/google/client.ts` | Calendar API wrapper behind an interface: list calendars, list events (time range), insert event, ensure "AI Calendar" exists. Auto-refreshes access tokens. |
| `lib/google/client.mock.ts` | In-memory fake implementing the client interface, for tests and no-credentials runs. |
| `lib/google/ensureAiCalendar.test.ts` | Tests: ensure-exists is idempotent (creates once, reuses id thereafter) using the fake client. |
| `lib/google/eventMap.ts` | Transform a Google event → `CalendarBlock` (real date → day index vs displayed week, minutes, source); classify all-day events; compute needed window expansion. |
| `lib/google/eventMap.test.ts` | Tests: timed event → correct day/start/end/source; all-day event classified & not busy; out-of-window event triggers window expansion. |
| `lib/google/busy.ts` | Assemble the planner's immovable/busy set: mock class times + fetched work + fetched personal events, excluding "AI Calendar" events. |
| `lib/google/busy.test.ts` | Tests: real work + personal events included; "AI Calendar" events excluded; feeds `overlapsImmovable`. |
| `lib/week-context.ts` | Resolve the displayed week (Monday date) from a week offset; map real dates ↔ day index (0..6); build day-column dates. |
| `lib/week-context.test.ts` | Tests: offset 0 = current week Monday; date↔day-index mapping; correct dates for prev/next. |
| `app/api/google/connect/[account]/route.ts` | GET: start OAuth for `work`/`personal` (redirect to Google authorization URL). |
| `app/api/google/callback/[account]/route.ts` | GET: OAuth callback — exchange code, store encrypted refresh token, redirect back to app. |
| `app/api/google/status/route.ts` | GET: connection status of both accounts (booleans only — never token values). |
| `app/api/google/status.test.ts` | Test: response contains connection booleans and no secret/token fields. |
| `app/api/google/disconnect/[account]/route.ts` | POST: clear a stored account token. |
| `app/api/google/calendars/route.ts` | GET: list calendars for both connected accounts (id + name). |
| `app/api/google/mapping/route.ts` | GET/POST: read and save the calendar→work/personal/ignored mapping; ensures "AI Calendar". |
| `app/api/google/events/route.ts` | GET: fetch + map events for a given week offset from the mapped calendars (server-side). |
| `app/api/google/commit/route.ts` | POST: write approved blocks to the personal "AI Calendar"; return created event ids. |
| `app/api/google/commit.test.ts` | Test: with the fake client, approval inserts events into the AI Calendar and returns ids. |
| `lib/planner/validate.ts` | Extend so proposals are re-validated against the real busy set (real events immovable); AI-Calendar events excluded. |
| `lib/planner/validate.test.ts` | Extend: a proposal overlapping a real (fetched) event is rejected. |
| `lib/planner/week.ts` | Ensure `toWeekState` includes fetched real events (as immovable) and excludes AI-Calendar events from busy. |
| `components/DashboardShell.tsx` | Add week-offset state + prev/next nav; fetch `/api/google/events` on load/refresh/nav; render connect state; route approval through `/api/google/commit`. |
| `components/Settings/GoogleConnect.tsx` | Connect UI (Work/Personal buttons + status) and calendar-mapping UI. |
| `components/Settings/GoogleConnect.test.tsx` | Test: shows connect buttons when disconnected; shows connected + mapping when connected (mocked status). |
| `components/Calendar/Calendar.tsx` | Show real dates on day columns; render an all-day strip; support the expanded window. |
| `components/Calendar/AllDayStrip.tsx` | New: thin per-day strip rendering all-day events (not on the hourly grid). |
| `components/Calendar/Calendar.test.tsx` | Extend: real dates render; all-day events appear in the strip, not the grid. |
| `lib/config.ts` | Support dynamic window expansion (min start / max end) driven by fetched events. |

### Notes

- Co-locate tests: `Thing.ts` → `Thing.test.ts`. Run with `npm test` (Vitest).
- **All Google/OAuth SDK usage stays server-side** (`lib/google/*` imported only by
  `app/api/google/*` routes + the planner route) — mirror the Anthropic boundary in
  `lib/planner/server.ts`. Never import `googleapis` from a `"use client"` component.
- Framework-free logic (transforms, busy-set, week-context, token crypto) lives in `lib/`
  so it is unit-testable without a browser or live Google credentials.
- Use the `client.mock.ts` fake so the suite runs with **no real credentials**, matching
  the no-API-key mock-planner pattern from Story 2.
- Core-rule tests are mandatory: never overlap a real busy event; approval writes only to
  the AI Calendar.
- Tailwind v4 `@theme` tokens (`bg-work` etc.); never rely on color alone.
- Secrets never committed; proof screenshots must not reveal tokens or the client secret.

## Tasks

### [ ] 1.0 Google OAuth foundation + encrypted token store (connect both accounts)

Adds the app's own server-side Google OAuth for the Work (read-only) and Personal
(read+write) accounts, persists refresh tokens encrypted at rest, exposes connection
status/disconnect, and ships a reproducible Google Cloud setup guide. Maps to Spec Unit 1.

#### 1.0 Proof Artifact(s)

- Screenshot: connect UI showing **Work: connected** and **Personal: connected** demonstrates both OAuth authorization-code flows complete.
- CLI/File: `git check-ignore .tokens.json` returns the path AND a `head -c 80 .tokens.json` shows ciphertext (not a readable token) demonstrates gitignored + encrypted-at-rest storage.
- Test: `lib/google/tokenStore.test.ts` passes (encrypt→decrypt round-trip; malformed/missing file handled) demonstrates secure persistence.
- Test: `app/api/google/status.test.ts` passes — the status payload contains only booleans, no token/secret — demonstrates the server-only boundary.
- Doc: `docs/google-calendar-setup.md` exists with steps to create the OAuth client, set redirect URIs, choose scopes, and set the consent screen to **In production** demonstrates reproducible setup.

#### 1.0 Tasks

- [ ] 1.1 Add `googleapis` to `package.json` dependencies and install (`npm install googleapis`).
- [ ] 1.2 Define `lib/google/types.ts`: `GoogleAccount = "work" | "personal"`, stored-token shape, `TokenStore` state, and OAuth scope constants (`calendar.readonly` for work; full `calendar` for personal).
- [ ] 1.3 Implement `lib/google/auth.ts`: build the OAuth2 client from `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`/`GOOGLE_REDIRECT_URI`; `getAuthUrl(account)` with `access_type=offline`, `prompt=consent`, per-account scopes; `exchangeCode(account, code)`. Server-only.
- [ ] 1.4 Write `lib/google/auth.test.ts`: work gets read-only scope, personal gets full scope; auth URL includes offline + consent params.
- [ ] 1.5 Implement `lib/google/tokenStore.ts`: AES-GCM encrypt/decrypt with a key derived from `TOKEN_ENC_SECRET`; read/write `.tokens.json`; `saveToken`, `getToken`, `status()`, `disconnect(account)`; tolerate missing/corrupt file.
- [ ] 1.6 Write `lib/google/tokenStore.test.ts`: encrypt→decrypt round-trip; missing file → empty status; malformed file handled; disconnect clears one account only.
- [ ] 1.7 Add API routes: `connect/[account]` (redirect to auth URL), `callback/[account]` (exchange code, save token, redirect home), `status` (booleans only), `disconnect/[account]`.
- [ ] 1.8 Write `app/api/google/status.test.ts`: asserts the payload exposes only connection booleans (no `refresh_token`/secret fields).
- [ ] 1.9 Build `components/Settings/GoogleConnect.tsx` (connect buttons + live status from `/api/google/status`) and surface it from `DashboardShell` (e.g. a settings affordance). Client component; no SDK import.
- [ ] 1.10 Update `.env.example` (new secret names) and `.gitignore` (`.tokens.json`, `.google-config.json`); write `docs/google-calendar-setup.md` (OAuth client, redirect URIs, scopes, **In production** consent-screen step to avoid 7-day token expiry).

### [ ] 2.0 Calendar mapping + auto-created "AI Calendar" (choose work/personal sources)

Lists each connected account's calendars, lets Jack assign them to work / personal /
ignored, persists the mapping, and ensures a personal **"AI Calendar"** exists (creating
it if absent) as the write-back target excluded from busy sources. Maps to Spec Unit 2.

#### 2.0 Proof Artifact(s)

- Screenshot: calendar-mapping UI with calendars assigned to work/personal (and one ignored) demonstrates mapping.
- Screenshot/JSON: API response listing the personal account's calendars now including **"AI Calendar"** demonstrates auto-creation.
- Test: `lib/google/mapping.test.ts` passes (mapping persistence round-trip; "AI Calendar" excluded from busy-source set) demonstrates the ownership rule.
- Test: `lib/google/ensureAiCalendar.test.ts` passes (idempotent create-once/reuse) demonstrates safe auto-creation.

#### 2.0 Tasks

- [ ] 2.1 Define the Calendar API wrapper interface in `lib/google/client.ts`: `listCalendars(account)`, `listEvents(account, calendarId, timeMin, timeMax)`, `insertEvent(calendarId, event)`, `ensureCalendar(name)`. Real impl uses `googleapis` with auto-refresh; token updates persisted back to the token store.
- [ ] 2.2 Implement `lib/google/client.mock.ts`: in-memory fake honoring the same interface (seeded calendars/events) for tests and no-credential runs.
- [ ] 2.3 Implement `lib/google/config.ts`: persist mapping (`{ work: calId[], personal: calId[], ignored: calId[], aiCalendarId }`) to gitignored `.google-config.json`; `getBusySourceCalendars()` returns work+personal ids **excluding** `aiCalendarId`.
- [ ] 2.4 Implement `ensureAiCalendar()` (in `config.ts` or `client.ts`): look up a personal calendar named "AI Calendar"; create it if missing; store its id in config. Idempotent.
- [ ] 2.5 Write `lib/google/ensureAiCalendar.test.ts` (fake client): first call creates, second reuses the same id; id persisted.
- [ ] 2.6 Add `app/api/google/calendars/route.ts` (GET list) and `app/api/google/mapping/route.ts` (GET/POST mapping; POST also runs `ensureAiCalendar`).
- [ ] 2.7 Extend `components/Settings/GoogleConnect.tsx` with the mapping UI (assign each calendar to work/personal/ignored; save to `/api/google/mapping`).
- [ ] 2.8 Write `lib/google/mapping.test.ts`: mapping persistence round-trip; `getBusySourceCalendars()` excludes the AI Calendar id.

### [ ] 3.0 Read & display real events for the displayed week (with navigation + refresh)

Fetches events server-side for the mapped calendars over the displayed week's real dates,
transforms them into `CalendarBlock`s (work nested, personal, all-day strip), adds
prev/next week navigation + a Refresh control, auto-expands the time window, renders in
local timezone, and degrades gracefully when disconnected. Maps to Spec Unit 3.

#### 3.0 Proof Artifact(s)

- Screenshot: week view showing real work meetings (nested) + personal events on their real dates demonstrates read + display.
- Screenshot: prev/next navigation showing a different week's real events demonstrates per-week fetch + navigation.
- Screenshot: an all-day event in the top strip (not occupying the hourly grid) demonstrates all-day handling.
- Screenshot: app loaded with no accounts connected showing a clear "Connect your Google accounts" state demonstrates graceful degradation.
- Test: `lib/google/eventMap.test.ts` + `lib/week-context.test.ts` pass (event→block mapping, all-day classification, window expansion, week offsets) demonstrates correct transformation.

#### 3.0 Tasks

- [ ] 3.1 Implement `lib/week-context.ts`: resolve displayed week Monday from an offset (0 = this week); map a real date to a day index (0..6) within that week; build the 7 column dates. Write `lib/week-context.test.ts`.
- [ ] 3.2 Implement `lib/google/eventMap.ts`: Google event → `CalendarBlock` (day index vs displayed week, start/end minutes in local tz, `source` from the calendar's mapping, carry `googleEventId`/`calendarId`); classify all-day (date-only) events separately; report the min-start/max-end needed for window expansion. Write `lib/google/eventMap.test.ts`.
- [ ] 3.3 Update `lib/config.ts` to support a dynamic visible window (expand start/end to fit out-of-range timed events) while keeping the default 6am–10pm.
- [ ] 3.4 Add `app/api/google/events/route.ts`: given a week offset, fetch events for all mapped busy-source calendars, map to blocks (+ all-day list), and return them; graceful empty result when nothing is connected.
- [ ] 3.5 Update `components/DashboardShell.tsx`: add week-offset state + prev/next controls + a Refresh button; fetch `/api/google/events` on mount, on refresh, and on week change; merge fetched blocks into calendar state; show a "Connect your Google accounts" empty state when disconnected.
- [ ] 3.6 Update `components/Calendar/Calendar.tsx` to label day columns with real dates and honor the (possibly expanded) window; add `components/Calendar/AllDayStrip.tsx` for the all-day row.
- [ ] 3.7 Extend `components/Calendar/Calendar.test.tsx`: real dates render on columns; all-day events show in the strip and not on the hourly grid.

### [ ] 4.0 Write-back to "AI Calendar" + real busy model in the planner

On approval, writes each approved block as a real event to the personal "AI Calendar"
(recording Google event ids), and extends the planner's free-space/validation so real work
+ personal events are immovable while "AI Calendar" events are excluded from busy time —
preserving the tested "never overlap" rule against real data. Maps to Spec Unit 4.

#### 4.0 Proof Artifact(s)

- Screenshot: approved plan's blocks appearing as real events in Google's "AI Calendar" demonstrates write-back.
- Screenshot/transcript: a proposal that avoids a real work meeting and a real personal event demonstrates the real busy model.
- Test: `lib/planner/validate.test.ts` (extended) passes — a proposal overlapping a real (fetched) event is rejected — demonstrates never-overlap against real data.
- Test: `lib/google/busy.test.ts` passes — real work + personal events included, "AI Calendar" events excluded — demonstrates the ownership rule.
- Test: `app/api/google/commit.test.ts` passes with the fake client — approval inserts into the AI Calendar and records event ids — demonstrates the approval→write loop.

#### 4.0 Tasks

- [ ] 4.1 Implement `lib/google/busy.ts`: assemble the immovable/busy set = mock class times + fetched work events + fetched personal events, **excluding** any block whose `calendarId` is the AI Calendar. Write `lib/google/busy.test.ts`.
- [ ] 4.2 Update `lib/planner/week.ts` / `toWeekState` so the week snapshot passed to the planner includes fetched real events as immovable blocks (and excludes AI-Calendar blocks from busy).
- [ ] 4.3 Extend `lib/planner/validate.ts` so proposals are re-validated against the real busy set; add a `lib/planner/validate.test.ts` case where a proposal overlapping a fetched real event is rejected.
- [ ] 4.4 Implement `app/api/google/commit/route.ts`: accept approved blocks, `ensureAiCalendar()`, insert each as a timed event on the AI Calendar, return `{ id, googleEventId }[]`. Write `app/api/google/commit.test.ts` with the fake client.
- [ ] 4.5 Update `components/DashboardShell.tsx` approval handler to POST approved blocks to `/api/google/commit`, then mark them approved with their returned `googleEventId`; keep the existing `approveProposal`/`discardProposal` UX and handle commit failure gracefully.
- [ ] 4.6 Confirm the full suite is green and the "never overlap real events" + "AI Calendar excluded" rules are covered; run `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`.
