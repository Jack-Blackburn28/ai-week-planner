# 03-tasks-google-calendar-integration.md

> Tasks for Story 3 — Google Calendar integration (both accounts).
> Spec: `03-spec-google-calendar-integration.md`. Questions: `03-questions-1-google-calendar-integration.md`.
> Implementation checkpoint mode = **Batch**: build all parent tasks, commit once per
> parent task, pause once at the end.

## Tasks

### [ ] 1.0 Google OAuth foundation + encrypted token store (connect both accounts)

Adds the app's own server-side Google OAuth for the Work (read-only) and Personal
(read+write) accounts, persists refresh tokens encrypted at rest, exposes connection
status/disconnect, and ships a reproducible Google Cloud setup guide. Maps to Spec Unit 1.

#### 1.0 Proof Artifact(s)

- Screenshot: connect UI showing **Work: connected** and **Personal: connected** demonstrates both OAuth authorization-code flows complete.
- CLI/File: `git check-ignore .tokens.json` returns the path AND a `head -c 80 .tokens.json` shows ciphertext (not a readable token) demonstrates gitignored + encrypted-at-rest storage.
- Test: `lib/google/tokenStore.test.ts` passes (encrypt→decrypt round-trip; malformed/missing file handled) demonstrates secure persistence.
- Test: a guard test proves the refresh token / client secret are never included in any client-facing payload demonstrates the server-only boundary.
- Doc: `docs/google-calendar-setup.md` exists with steps to create the OAuth client, set redirect URIs, choose scopes, and set the consent screen to **In production** demonstrates reproducible setup.

#### 1.0 Tasks

TBD

### [ ] 2.0 Calendar mapping + auto-created "AI Calendar" (choose work/personal sources)

Lists each connected account's calendars, lets Jack assign them to work / personal /
ignored, persists the mapping, and ensures a personal **"AI Calendar"** exists (creating
it if absent) as the write-back target excluded from busy sources. Maps to Spec Unit 2.

#### 2.0 Proof Artifact(s)

- Screenshot: calendar-mapping UI with calendars assigned to work/personal (and one ignored) demonstrates mapping.
- Screenshot/JSON: API response listing the personal account's calendars now including **"AI Calendar"** demonstrates auto-creation.
- Test: `lib/google/mapping.test.ts` passes (mapping persistence round-trip; "AI Calendar" excluded from the busy-source set; idempotent ensure-exists) demonstrates the ownership rule.

#### 2.0 Tasks

TBD

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
- Test: `lib/google/eventMap.test.ts` passes (Google event → `CalendarBlock` day/times/source; all-day classification; out-of-window window expansion) demonstrates correct transformation.

#### 3.0 Tasks

TBD

### [ ] 4.0 Write-back to "AI Calendar" + real busy model in the planner

On approval, writes each approved block as a real event to the personal "AI Calendar"
(recording Google event ids), and extends the planner's free-space/validation so real work
+ personal events are immovable while "AI Calendar" events are excluded from busy time —
preserving the tested "never overlap" rule against real data. Maps to Spec Unit 4.

#### 4.0 Proof Artifact(s)

- Screenshot: approved plan's blocks appearing as real events in Google's "AI Calendar" demonstrates write-back.
- Screenshot/transcript: a proposal that avoids a real work meeting and a real personal event demonstrates the real busy model.
- Test: `lib/planner/validate.test.ts` (extended) passes — a proposal overlapping a real event is rejected — demonstrates never-overlap against real data.
- Test: busy-set test passes — real work + personal events included, "AI Calendar" events excluded — demonstrates the ownership rule end-to-end.
- Test: write-back test passes with a mocked Google client — approval issues an insert into the AI Calendar and records the event id — demonstrates the approval→write loop.

#### 4.0 Tasks

TBD
