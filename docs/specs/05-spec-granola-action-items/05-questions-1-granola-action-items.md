# 05 Questions Round 1 — Granola Action Items

Interactive clarification round (one topic at a time, Jack's preference). Recorded
here for the SDD paper trail. **All decisions confirmed by Jack.** This round
materially reshaped the story beyond the original kickoff (see #2).

Grounding research (current Granola guidance) consulted before asking:

- [Granola API docs](https://docs.granola.ai/introduction)
- [Granola API launch — personal + enterprise APIs](https://www.createwith.com/tool/granola/updates/granola-launches-api-to-connect-meeting-notes-with-ai-agents-and-external-tools)
- [Reverse-engineered Granola API](https://github.com/getprobo/reverse-engineering-granola-api)

Key facts that framed the questions:

- Granola has a real **personal REST API** (2025): OAuth with a **short-lived
  (~1h) access token + rotating refresh token**; API keys exist on Business plans.
- Action items are **not a dedicated field** — they're extracted from each
  meeting's AI summary/notes/transcript.

---

## 1. Auth model

**How should the deployed app authenticate to Granola so Jack sets it up once and
never touches it again?**

✅ **CONFIRMED: Google-style OAuth — connect once, auto-refresh forever.**

- Mirror Story 3's Google pattern: an OAuth connect flow, the **refresh token
  AES-encrypted at rest**, and the app silently renews the ~1h access token in the
  background. Jack never re-authenticates.
- Rationale (Jack's hard requirement): "set it once and never touch it again." A raw
  short-lived token would force periodic re-pasting; only stored-refresh auto-renewal
  guarantees zero maintenance.
- `GRANOLA_MOCK=1` demo mode runs the whole flow without credentials (like
  `GOOGLE_MOCK` / `CANVAS_MOCK`).

## 2. What counts as an action item (MAJOR reshape)

**Which meetings, and whose action items?**

✅ **CONFIRMED — Jack's redirection:** *Do NOT use Granola's own action items.* Instead:

- Pull the **meeting transcripts**, and have the **app's own AI read each transcript
  and decide the action items** (Jack dislikes Granola's built-in ones).
- Create action items **after each meeting**, into the **Work** list.
- **Cleared = permanent:** once Jack clears an action item, it must **never
  regenerate** on a future refresh. This requires a small **persistent store** that
  remembers which meetings were already processed and which items were cleared.

Derived defaults (stated to Jack, accepted):

- **Window:** process meetings from the **last 30 days** on each refresh; each meeting
  is read **once** (no re-running the AI, no resurrecting cleared items).
- **AI engine:** the same **Anthropic API** the planner uses (`ANTHROPIC_API_KEY`);
  with no key, a **mock extractor** yields sample action items so demo mode works.

## 3. Clearing behavior

**When Jack clears an AI-generated action item, what happens?** (Never regenerates —
locked in regardless.)

✅ **CONFIRMED:** cleared items **disappear from the active Work list** (inbox-zero),
**but** Jack wants to be able to **review old checked-off items later** — for **both
Work (Granola) and School (Canvas)**.

## 4. Completed archive presentation

**How should the archive of checked-off items look?**

✅ **CONFIRMED: one combined "Completed" view.**

- A top-level **`Active | Completed`** toggle. Completed lists everything cleared
  across **both Work and School**, **most-recent first**, **labeled by source**, with a
  cleared date.
- **Persists across reloads** so Jack can look back anytime.

## 5. Layout (added by Jack after confirmation)

✅ **CONFIRMED:** In the right-hand dashboard, the **Work** and **School** lists must
each have a **bounded height and scroll independently**, so a long Work list can never
push School off-screen. Each section scrolls within its own area.

---

## Interaction with Story 4 (documented)

- Story 4 made `TodoItem.dueDate` optional and auto-checks **Canvas-submitted** items
  in place (visible). Story 5 keeps that: submitted-from-source Canvas items still
  render checked in the active School list. **User-initiated clearing** (clicking an
  item in either section) is what moves an item into the persisted **Completed**
  archive and out of the active list. This preserves Story 4 while adding the archive.
- Granola action items are tasks, not deadlines → **no due date** (shown without one).
