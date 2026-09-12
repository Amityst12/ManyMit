# AGENTS.md — instructions for AI coding agents

This file is for you, the AI agent (Claude Code, Gemini CLI, Cursor, Codex, or
any other agent with terminal + file access) helping a human set up and run
**ManyMit**. Read this fully before doing anything in this repo.

## What this project is

A single-user, self-hosted Next.js app that auto-replies to Instagram Story
replies and comments with a DM when a keyword matches. It talks directly to
the official Meta Graph API. There is no backend service, no database server,
and no multi-tenancy — everything (tokens, automations) lives in one local
JSON file at `data/db.json` on the human's own machine.

**Golden rule: keep it that way.** Do not add hosting/deployment tooling
(Docker, PM2, systemd, Vercel config, CI/CD), do not add multi-user auth or a
real database, and do not switch the Instagram integration to an unofficial
API (username/password login). If the human asks for something that breaks
this model, flag the tradeoff before doing it.

## Your job when a human runs this repo

Walk them through setup end-to-end, running every command yourself, and
clearly calling out the handful of steps *only they* can do (anything that
requires clicking around in their own Facebook/Instagram/Meta account — you
don't have browser access to their session, so don't pretend to; ask them to
do it and paste back what you need).

### Step 1 — Meta App (human does this in their browser)

Tell them to:
1. Go to https://developers.facebook.com/apps → **Create App** → type **Other** → **Business**.
2. In the app dashboard, add **Facebook Login for Business** and the **Instagram Graph API** product. The setup wizard prompts them to connect a Facebook Page.
3. They need a **Facebook Page** linked to an **Instagram Professional (Business/Creator) account**. If they don't have one, they convert their IG account to Professional in the Instagram app, then link it to a Page via Meta Business Suite.
4. **App Roles → Roles** → add themselves (and anyone else who'll use it, up to 24 more) as **Instagram Tester**. Then from the Instagram app on each tester's phone: **Settings → Apps and Websites → Tester Invites → Accept**. This step is what lets them message without Meta's App Review — do not skip explaining it.
5. **App Settings → Basic** → copy **App ID** and **App Secret**.

If they get stuck on "no Facebook Page found" or "no Instagram account linked to page" later during OAuth, it means step 3 wasn't completed correctly — send them back there.

### Step 2 — Local config (you do this)

```bash
npm install
cp .env.example .env.local
```

Ask the human to paste their App ID and App Secret, then write them into
`.env.local` yourself:

```env
META_APP_ID=<paste>
META_APP_SECRET=<paste>
INSTAGRAM_VERIFY_TOKEN=<make up any random string, or generate one>
```

**Never** hardcode a shared App ID/Secret into the repo's source code — every
user needs their own app (Meta caps Instagram Testers at 25 per app, and a
secret committed to a public repo is a leaked credential). `.env.local` and
`data/` are already git-ignored; keep them that way.

### Step 3 — Tunnel domain (optional, recommended)

Ask if they want a stable webhook URL (recommended) or are fine re-pasting a
new URL every restart (fine for a quick test).

- **Stable**: they sign up free at https://dashboard.ngrok.com (no card),
  grab a static domain under **Domains → New Domain**, and an authtoken under
  **Your Authtoken**. You add both to `.env.local` as `NGROK_AUTHTOKEN` and
  `NGROK_DOMAIN`.
- **Quick/no signup**: skip this — `npm run dev` falls back to a free
  Cloudflare quick tunnel automatically. Just warn them the URL changes every
  restart, so they'll need to update their Meta App's redirect URI and
  webhook URL again after each restart if they go this route.

### Step 4 — Run it

```bash
npm run dev
```

This starts Next.js **and** the tunnel together. Watch the terminal output —
it prints a banner like:

```
🌍 Public URL: https://xxxx.ngrok-free.app
   OAuth redirect URI   → https://xxxx.ngrok-free.app/api/auth/callback/instagram
   Webhook callback URL → https://xxxx.ngrok-free.app/api/webhooks/instagram
```

Give the human those two URLs. They go back to the Meta App dashboard:
- **Facebook Login for Business → Settings → Valid OAuth Redirect URIs** → paste the OAuth redirect URI.
- **Webhooks → Add Callback URL** → paste the webhook callback URL, put the *same* `INSTAGRAM_VERIFY_TOKEN` value from `.env.local` as the verify token, then **Subscribe** to the `messages` and `comments` fields.

### Step 5 — Connect & test (human does the browser part)

Have them open http://localhost:3000, click **Connect Instagram**, log in via
Facebook, pick the right Page. Then create one automation (e.g. keyword
`GUIDE` → a DM with their link) in the UI.

To verify it actually works: have them reply to their own Story with the
keyword from a second account (or ask a friend), and confirm a DM arrives
within a few seconds. If not, check your dev server's terminal logs — every
webhook event and match/no-match is logged there.

## Troubleshooting reference

| Symptom | Cause | Fix |
|---|---|---|
| Redirected to `?error=no_facebook_page_linked` | No Facebook Page on the account used to log in | Create/link a Page in Meta Business Suite |
| Redirected to `?error=no_instagram_linked_to_page` | Page has no linked IG Professional account | Link IG account to the Page (Meta Business Suite) |
| Redirected to `?error=csrf_detected` | Stale/second OAuth attempt, or cookies blocked | Retry from `/api/auth/instagram` fresh |
| Webhook returns 403 / never verifies | `INSTAGRAM_VERIFY_TOKEN` in `.env.local` doesn't match what's typed in Meta dashboard | Make them identical, restart `npm run dev` |
| DM never arrives, no log line at all | Webhook not subscribed to `messages`/`comments`, or tunnel URL changed since last Meta dashboard update | Re-check Meta App → Webhooks subscription fields; re-paste current tunnel URL if using the Cloudflare quick tunnel |
| `EADDRINUSE` on port 3000 | Another process (or a previous `npm run dev`) still running | Kill it, or run with `PORT=3001 npm run dev` |

## Code map (for when you're asked to change something)

- `src/lib/store.ts` — the entire "database" (lowdb JSON file). Profile + automations + dedup event ids.
- `src/lib/instagram/api.ts` — Graph API calls (send DM, fetch profile, error classification).
- `src/lib/instagram/match.ts` — keyword fuzzy-matching logic.
- `src/lib/base-url.ts` — derives the public base URL from request headers (works with any tunnel, no fixed env var needed).
- `src/app/api/auth/instagram/route.ts` + `.../callback/instagram/route.ts` — OAuth flow.
- `src/app/api/webhooks/instagram/route.ts` — receives Meta webhooks, matches, sends the DM.
- `src/app/api/automations/**` — CRUD for automations.
- `src/components/Dashboard.tsx` — the entire UI, one client component.
- `scripts/dev.mjs` — boots Next.js + the tunnel together and prints the banner.

## Style

The codebase is small and intentionally uncomplicated — Next.js App Router,
no ORM, no state management library, no test framework. Match that. Don't
introduce new dependencies unless there's no reasonable way around it.
