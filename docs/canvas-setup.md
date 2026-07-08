# Canvas setup

How to connect the app to your Canvas assignments (Story 4). Like the Google
integration, **all secrets live in `.env.local`** (git-ignored) and are read
server-side only — nothing is entered in the browser.

There are two ways to connect. The app tries them in this order:

1. **API token (recommended)** — the Canvas REST API. Richer data: course names,
   due dates, **and** whether you've submitted/been graded (so submitted items
   show as checked). Requires you to mint a personal access token.
2. **Calendar feed (ICS) fallback** — a secret per-user calendar URL. Trivial to
   set up (paste one URL), but read-only and gives basically title + due date
   only (no submission state).

You only need **one** of these. If both are set, the API token wins.

## Option 1 — API token (primary)

1. Log in to Canvas in a browser.
2. Go to **Account → Settings**.
3. Under **Approved Integrations**, click **+ New Access Token**. Give it a
   purpose (e.g. "AI Week Planner") and leave the expiry blank (or set one).
4. Click **Generate Token** and copy the token value — Canvas shows it once.
5. Note your Canvas base URL — the part before `/` in your Canvas address, e.g.
   `https://<institution>.instructure.com`.
6. Put both in `.env.local`:

   ```bash
   CANVAS_BASE_URL=https://<institution>.instructure.com
   CANVAS_API_TOKEN=<your-token>
   ```

The token grants full access to your Canvas account — treat it like a password.
Never commit it. Revoke it in the same Settings page if it leaks.

## Option 2 — Calendar feed (ICS) fallback

Use this if you can't create an API token.

1. In Canvas, open **Calendar**.
2. In the right sidebar, click **Calendar Feed**.
3. Copy the `.ics` URL (it contains a secret per-user token — anyone with the URL
   can read your calendar, so treat it as a secret).
4. Put it in `.env.local`:

   ```bash
   CANVAS_ICS_URL=https://<institution>.instructure.com/feeds/calendars/user_<token>.ics
   ```

## Verifying

- Open the app, click the **⚙︎ Settings** icon. The **Canvas** row shows
  "Connected via API token" or "Connected via calendar feed" when configured.
- Your current-term assignments appear in the **School** list with due dates.

## Demo mode (no credentials)

Set `CANVAS_MOCK=1` to run the whole integration against an in-memory sample of
assignments — useful for local demos and screenshots without connecting a real
Canvas account:

```bash
CANVAS_MOCK=1 GOOGLE_MOCK=1 TOKEN_ENC_SECRET=dev npm run dev
```

## Notes

- ICS parsing dependency: the fallback parses the calendar feed with
  [`node-ical`](https://www.npmjs.com/package/node-ical) (see `lib/canvas/ics.ts`).
- The integration is **read-only** — the app never writes to Canvas.
