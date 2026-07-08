# 04 Questions Round 1 — Canvas Assignments

Interactive clarification round (one topic at a time, Jack's preference — same as
Story 3). Recorded here after the fact for the SDD paper trail. **All six decisions
below are confirmed by Jack** and drive the spec.

Grounding research (current Canvas guidance) consulted before asking:

- [Canvas Access Tokens — Instructure Developer Docs](https://developerdocs.instructure.com/services/canvas/resources/access_tokens)
- [Canvas Calendar Events API](https://canvas.instructure.com/doc/api/calendar_events.html)
- [Canvas Assignments API](https://canvas.colorado.edu/doc/api/assignments.html)

Key facts that framed the questions:

- **API token** (personal access token, minted in Canvas → Account → Settings): richer
  data — course names, `due_at`, and submission/grading state (`submitted`, `graded`).
- **ICS calendar feed** (Canvas → Calendar → "Calendar Feed", a secret per-user
  `/feeds/calendars/user_*.ics` URL): trivial setup, but read-only, essentially
  title + due date only, **no submission state**, limited window.

---

## 1. Canvas access method

**How should the app pull assignments?**

✅ **CONFIRMED: API token primary, ICS calendar-feed fallback.**

- Build the Canvas **API token** path as primary (course names, due dates, submitted/
  graded state).
- Keep the **ICS feed** as a fallback for when a token isn't available (title + due
  date only).
- Matches the original kickoff prompt verbatim ("via the Canvas API token; if token
  access is unavailable, use the Canvas calendar feed URL as the fallback").

## 2. Which assignments (scope)

**Which assignments belong in the School section?**

✅ **CONFIRMED: current-term courses, upcoming + recently-overdue, with a due date —
PLUS include undated assignments as items Jack can just check off.**

- Include: active/current-term courses, assignment has a `due_at`, due in the future OR
  overdue within a recent window (~14 days).
- Exclude: past terms, far-future noise.
- **Addition (Jack's note):** also include assignments that have **no due date** — shown
  as "No due date" and manually checkable. This relaxes the current
  `TodoItem.dueDate`-required invariant (see spec Technical Considerations).

## 3. Submitted / done handling

**How does Canvas submission state map to the todo checkbox?**

✅ **CONFIRMED: submitted/graded → auto-checked (`done = true`), item stays visible;
manual toggle still allowed.**

- If Canvas reports submitted or graded → the item renders checked but remains in the
  list (Jack keeps a sense of what's finished this week).
- Not submitted → unchecked.
- Manual toggling still works, especially for undated items and the ICS fallback (which
  has no submission state).

## 4. Refresh behavior

**When does the app pull the latest assignments?**

✅ **CONFIRMED: fetch-on-open + manual Refresh button — identical to Google (Story 3).**

- Fetch on app load and whenever the existing Refresh button is pressed (same control as
  the calendar refresh).
- No background polling.

## 5. AI planner emphasis on due dates

**How proactive should the AI be about assignments?**

✅ **CONFIRMED: prioritize by due date, propose on request.**

- Strengthen the planner system prompt: School items are **real deadlines**; prioritize
  soonest-due and overdue work; warn if something looks at risk.
- The AI still proposes homework/study blocks **only when Jack asks in chat** — no
  auto-drafting on load. Preserves "chat is the only way to interact" and
  "approval required before write-back."

## 6. Config & secret storage

**Where does Jack enter the Canvas token / instance URL / ICS URL?**

✅ **CONFIRMED: environment variables in `.env.local`, exactly like Google's secrets.**

- `CANVAS_BASE_URL` (e.g. `https://<institution>.instructure.com`)
- `CANVAS_API_TOKEN` (primary)
- `CANVAS_ICS_URL` (fallback)
- The ⚙︎ Settings drawer shows **status only** (connected / not connected + which mode);
  no secret is entered in the browser.
- Most secure, least new code, maps cleanly to a mounted secret in Story 6 (deploy).
