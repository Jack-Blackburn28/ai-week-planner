# Deploying to Vercel (step by step)

This is a beginner-friendly walkthrough for putting AI Week Planner online with **Vercel**.
You've never used Vercel before — that's fine, every click is spelled out. Budget ~20 minutes.

**What you'll end up with:**

- The app live at a permanent URL like `https://ai-week-planner-jack.vercel.app`.
- It redeploys automatically every time you push to `main`; pull requests get their own preview
  URL.
- The whole app is behind one password.
- Everything that works locally (AI planner, Google Calendar, Canvas, Granola) works online.

> **Why Vercel and not AWS?** This is a Next.js app, and Vercel runs Next.js with zero config on
> a free tier that stays up permanently. No Docker, no Terraform.

---

## Before you start

- Your code is on GitHub at `Jack-Blackburn28/ai-week-planner` (it already is).
- You have your secrets handy from local `.env.local`: `ANTHROPIC_API_KEY`, `GOOGLE_CLIENT_ID`,
  `GOOGLE_CLIENT_SECRET`, `TOKEN_ENC_SECRET`, `GRANOLA_API_KEY`, `CANVAS_BASE_URL`,
  `CANVAS_ICS_URL`.

---

## Step 1 — Push the latest code to GitHub

Vercel deploys what's on GitHub, so make sure `main` is up to date:

```bash
git push origin main
```

(That push also triggers the GitHub Actions quality check — you'll see a green ✓ on the commit.)

---

## Step 2 — Create your Vercel account and import the repo

1. Go to **https://vercel.com** and click **Sign Up** (or **Log In**).
2. Choose **Continue with GitHub** and authorize Vercel. Pick the **Hobby (free)** plan when
   asked — no credit card needed.
3. On your dashboard click **Add New… → Project**.
4. Find **`ai-week-planner`** in the list of your GitHub repos and click **Import**. (If you don't
   see it, click **Adjust GitHub App Permissions** and grant access to the repo.)
5. Vercel auto-detects **Next.js** — leave every build setting at its default.
6. **Don't click Deploy yet** — first add storage and environment variables (next two steps). If
   you already clicked it, that's fine; just finish Steps 3–4 and redeploy.

---

## Step 3 — Add the free KV storage (so your data persists)

Vercel's servers have no permanent disk, so we store your Google login, Granola items, and
checked-off todos in a small key-value database.

1. In your project, open the **Storage** tab.
2. Click **Create Database** and choose a **Redis / KV** option from the Marketplace (e.g.
   **Upstash for Redis**). Pick the **Free** plan.
3. Give it any name and click **Create**, then **Connect** it to this project.
4. Vercel automatically adds the connection environment variables for you (named either
   `KV_REST_API_URL` / `KV_REST_API_TOKEN` or `UPSTASH_REDIS_REST_URL` /
   `UPSTASH_REDIS_REST_TOKEN`). The app understands both — you don't have to touch them.

---

## Step 4 — Add your environment variables

This is where your secrets go. **Never put secrets in code** — they live here only.

1. In your project, open **Settings → Environment Variables**.
2. For each row below, type the **Name**, paste the **Value**, leave the environment set to **All
   Environments** (Production, Preview, Development), and click **Save**.

| Name | Value | Where it comes from |
| --- | --- | --- |
| `ANTHROPIC_API_KEY` | your key | from `.env.local` |
| `GOOGLE_CLIENT_ID` | your id | from `.env.local` |
| `GOOGLE_CLIENT_SECRET` | your secret | from `.env.local` |
| `GOOGLE_REDIRECT_URI` | `https://<your-vercel-url>/api/google/callback` | **fill in after Step 5** |
| `TOKEN_ENC_SECRET` | your existing value | from `.env.local` |
| `GRANOLA_API_KEY` | your `grn_…` key | from `.env.local` |
| `CANVAS_BASE_URL` | your Canvas base URL | from `.env.local` |
| `CANVAS_ICS_URL` | your Canvas feed URL | from `.env.local` |
| `APP_PASSWORD` | a password you choose | **new** — this is the app's login password |
| `SESSION_SECRET` | a long random string | **new** — see below |

Generate `SESSION_SECRET` (a throwaway random value) by running this locally and pasting the
output:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

> The KV variables from Step 3 are already here — don't remove them.

---

## Step 5 — Deploy and get your URL

1. Go to the **Deployments** tab and click **Deploy** (or **Redeploy** the latest). Wait ~1–2
   minutes for it to finish.
2. Vercel shows your production URL, e.g. `https://ai-week-planner-jack.vercel.app`. Copy it.
3. Go back to **Settings → Environment Variables** and set **`GOOGLE_REDIRECT_URI`** to
   `https://<that-url>/api/google/callback` (exactly, no trailing slash). Save.

---

## Step 6 — Let Google accept the deployed app

Google only allows sign-ins that redirect to URLs you've registered.

1. Open **https://console.cloud.google.com** → your project → **APIs & Services → Credentials**.
2. Click your **OAuth 2.0 Client ID** (the one whose id/secret you used above).
3. Under **Authorized redirect URIs**, click **Add URI** and paste
   `https://<your-vercel-url>/api/google/callback`. **Save.**
4. Still in **APIs & Services**, open the **OAuth consent screen**. If its **Publishing status**
   is **Testing**, click **Publish app** (move it to **In production**). This matters: in Testing
   mode Google expires your login every 7 days, which would break the deployed calendar weekly.
   (If you prefer to stay in Testing, add your own email under **Test users** — but you'll re-login
   about weekly.)

---

## Step 7 — Redeploy and log in

1. Because you changed `GOOGLE_REDIRECT_URI`, trigger one more deploy: **Deployments → ⋯ →
   Redeploy** on the latest.
2. Open your Vercel URL. You should see the **password screen** — enter the `APP_PASSWORD` you
   chose. You're in.
3. Open the settings/connect panel and **connect Google** (Work + Personal). Because the redirect
   URI is registered, sign-in completes and your calendar loads.

---

## Step 8 — Verify everything works online

Confirm each integration on the live URL:

- **AI planner** — open chat, ask it to plan something, approve a proposal.
- **Google Calendar** — your real events show; an approved plan writes to your personal calendar.
- **Canvas** — assignments appear in the School list.
- **Granola** — recent-meeting action items appear in the Work list.
- **Persistence** — refresh / trigger a redeploy; your Google login and items are still there
  (that's the KV store working).
- **Phone** — open the same URL on your phone; the login and dashboard are usable.

---

## How deploys work from now on

- **Push to `main`** → Vercel builds and updates production automatically.
- **Open a pull request** → Vercel posts a unique **preview URL** for that branch.
- **GitHub Actions** runs lint + typecheck + tests on every push/PR; the green ✓ is your quality
  gate (it does not deploy — Vercel does that).

---

## Troubleshooting

- **Stuck on the password screen / "Incorrect password":** confirm `APP_PASSWORD` and
  `SESSION_SECRET` are both set in Vercel, then redeploy (env-var changes need a redeploy).
- **Google sign-in error / redirect mismatch:** the `GOOGLE_REDIRECT_URI` value must match the URI
  registered in Google Cloud Console *exactly* (scheme, host, path, no trailing slash).
- **Calendar/Granola empty after a while:** make sure the KV database is connected (Step 3) and
  the Google consent screen is **In production** (Step 6).
- **Build fails:** check the Vercel build log; the same build runs locally with `npm run build`.
