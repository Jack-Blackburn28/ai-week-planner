# 03 Questions Round 1 — Google Calendar Integration (both accounts)

> Conducted interactively (one question at a time, per Jack's kickoff instruction).
> Recorded here for the SDD audit trail. **All answers below are confirmed by Jack.**

## 1. OAuth accounts — how to authenticate the two Google accounts

- (A) **Two separate sign-ins** — one "Connect Google" for Liatrio work (read-only),
  one for personal (read + write). App keeps two labeled token sets. ✅ **CHOSEN**
- (B) One account, two calendars (work calendar shared into personal account).

**Answer:** (A) Two separate sign-ins.
**Context provided by Jack:** personal email = `jack@the-blackburns.com`;
work email = `jack.blackburn@liatrio.com`.
**Why:** Liatrio-managed Workspace almost certainly blocks sharing the work calendar
into an outside account; two sign-ins matches the vision cleanly.

## 2. Token storage (no database yet)

- (A) **Encrypted local file** — gitignored `.tokens.json`, encrypted with
  `TOKEN_ENC_SECRET` from `.env.local`. Survives restarts; deploy-friendly. ✅ **CHOSEN**
- (B) Env variables (hand-paste tokens).
- (C) In-memory only (re-consent every restart).

**Answer:** (A) Encrypted local file.

## 3. Which calendars to read from each account

- (A) Primary calendar only.
- (B) **Let me pick calendars** — after connecting, app lists each account's calendars
  and Jack assigns them to work vs personal. ✅ **CHOSEN**

**Answer:** (B) A calendar-picker UI where Jack maps calendars to work / personal.

## 4. Write-back target calendar

- (A) A designated "write" calendar chosen in the picker.
- (B) Always the personal primary.

**Answer (Jack's note):** Use a **dedicated calendar named "AI Calendar"** in the
personal account as the write-back target. **Decision:** the app **auto-creates
"AI Calendar"** in the personal account if it doesn't already exist, then writes all
approved blocks there.

## 5. Refresh behavior ("current every time I open the app")

- (A) **Fetch on open + manual Refresh button**, no background polling. ✅ **CHOSEN**
- (B) Fetch on open + auto-poll every few minutes.
- (C) Cached with short TTL.

**Answer:** (A) Fetch fresh on every app load/refresh, plus a visible Refresh button.

## 6. Which week does the calendar show (real dates now)

- (A) Current real week only.
- (B) **Current week + prev/next navigation** (per-week fetch). ✅ **CHOSEN**

**Answer:** (B) Show the current real week with prev/next week navigation; Google
events and planning are anchored to the displayed week's real dates.

## 7. Real vs mock in Story 3

- (A) Google for events; keep the config skeleton.
- (B) Also derive work hours from Google.
- **Jack's override:** *Leave work hours blank for now* (Jack will set his work hours
  via the AI in the app in a future capability). **Pull only events from Google.**

**Answer (Jack's note):** No hardcoded work-hours immovable block in Story 3. The
calendar shows only real Google events (work meetings + personal events). Class times
and Work/School todos stay mock until Canvas (Story 4) / Granola (Story 5).

## 8. Are real Google events "busy" (never-overlap)?

**Answer (Jack's note):** Yes.
- **Busy / immovable:** all work-calendar events + real personal-calendar events
  (the non-AI ones Jack put there himself).
- **NOT busy:** everything in the **"AI Calendar"** — those are the AI's own
  placements. The AI knows it wrote them, so it can move/replace them when replanning
  and must not count them as busy time.

## 9. Meeting display given work hours are now blank

**Answer (Jack's note):** Keep the existing work-block + nested-meeting code structure
from Stories 1/2. The work-hours container is unset (grayed placeholder) until Jack
adds hours later. Work meetings from Google appear as the nested "secondary little
blocks." Exact rendering left to the code / implementation discretion.

## 10. All-day events

- (A) **Thin all-day row, NOT busy** (AI still sees them as context). ✅ **CHOSEN**
- (B) All-day = busy all day.
- (C) Ignore all-day events.

**Answer:** (A) Show all-day events in a slim per-day strip; do not treat them as busy.

## 11. OAuth publishing status (from current-standards research)

**Decision (informed by research, confirmed direction):** The Google Cloud OAuth
consent screen must be set to **"In production"** (not "Testing") so refresh tokens do
not expire every 7 days. Calendar is a "sensitive" (not "restricted") scope, so a
single-user app can publish without full Google verification — Jack clicks past a
one-time "unverified app" warning. This will be documented in a setup guide.

---

## Deferred to Open Questions / sensible defaults (non-blocking)

- **Timezone:** render events in the user's local (browser) timezone; assume a single
  timezone for the single user. (Open Question if multi-tz ever needed.)
- **AI Calendar event lifecycle across replans:** approving writes events; how stale
  AI-Calendar events are cleaned up on replanning is a technical consideration, kept
  minimal in Story 3.
- **Out-of-window events:** auto-expand the visible time window (already anticipated in
  `lib/config.ts`) to fit early/late timed events.
