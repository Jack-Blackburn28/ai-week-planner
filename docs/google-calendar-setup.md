# Google Calendar setup (Story 3)

This guide gets the AI Week Planner talking to your two Google accounts:

- **Work** — your Liatrio calendar (`jack.blackburn@liatrio.com`), **read-only**.
- **Personal** — your `the-blackburns.com` calendar, **read + write** (approved plans are
  written to a dedicated **"AI Calendar"** the app creates for you).

You only do this once. It takes ~10 minutes.

> **Why "In production" matters:** if you leave the OAuth app in *Testing* mode, Google
> **expires your login every 7 days** for calendar access, forcing you to reconnect weekly.
> Publishing to *In production* (step 5) removes that limit. Because Calendar is a
> *sensitive* (not *restricted*) scope, a single-user app can publish without Google's full
> verification review — you just click past a one-time "unverified app" warning.

---

## 1. Create a Google Cloud project

1. Go to <https://console.cloud.google.com/> and sign in.
2. Top bar → project dropdown → **New Project**. Name it e.g. `ai-week-planner`. Create it
   and make sure it is selected.

## 2. Enable the Google Calendar API

1. Left menu → **APIs & Services → Library**.
2. Search **Google Calendar API** → open it → **Enable**.

## 3. Configure the OAuth consent screen

1. **APIs & Services → OAuth consent screen**.
2. User type: **External** → Create.
3. App name `AI Week Planner`, your email as support + developer contact. Save and continue.
4. **Scopes:** you can skip adding scopes here (the app requests them at sign-in). Continue.
5. **Test users:** add both `jack.blackburn@liatrio.com` and your personal address (this lets
   you sign in even before publishing).

## 4. Create the OAuth client credentials

1. **APIs & Services → Credentials → Create credentials → OAuth client ID**.
2. Application type: **Web application**. Name it `ai-week-planner-web`.
3. **Authorized redirect URIs → Add URI:**
   ```
   http://localhost:3000/api/google/callback
   ```
   (Add your deployed URL's `/api/google/callback` too, once you have one in Story 6.)
4. **Create.** Copy the **Client ID** and **Client secret**.

## 5. Publish the app (avoid the 7-day expiry)

1. Back on **OAuth consent screen**, set **Publishing status → In production**
   (a.k.a. "Publish app"). Confirm.
2. It's fine that the app is "unverified" — you'll click past the warning at sign-in.

## 6. Put the secrets in `.env.local`

Copy `.env.example` to `.env.local` (gitignored) and fill in:

```bash
GOOGLE_CLIENT_ID=<your client id>.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=<your client secret>
GOOGLE_REDIRECT_URI=http://localhost:3000/api/google/callback
# generate a random 32-byte key to encrypt stored tokens:
TOKEN_ENC_SECRET=<paste output of the command below>
```

Generate the token-encryption secret:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## 7. Connect from the app

1. `npm run dev`, open <http://localhost:3000>.
2. Click the **⚙︎ Settings** button → **Google accounts**.
3. **Connect** the Work account → sign in with Liatrio → allow (click past the "unverified"
   warning). You'll return to the app showing **Work: Connected**.
4. **Connect** the Personal account the same way. It will show **Personal: Connected**.
5. Map your calendars to work / personal (Story 3, Task 2). The app creates the **"AI
   Calendar"** in your personal account automatically.

## Security notes

- `GOOGLE_CLIENT_SECRET` and `TOKEN_ENC_SECRET` are secrets — they live only in `.env.local`,
  which is gitignored. Never commit them.
- Refresh tokens are stored **encrypted at rest** in `.tokens.json` (also gitignored).
- The app only ever **writes** to the "AI Calendar"; your work calendar is read-only.
