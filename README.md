# ManyMit

Run your own Instagram **keyword → DM automation**, 100% on your machine. No SaaS,
no monthly fee, no waiting for Meta's App Review — you create your own free Meta
app and add yourself as a tester on it, which Meta allows instantly.

> Someone replies "GUIDE" to your Story or comments it on a post → ManyMit
> automatically sends them a DM with your link. That's the whole product.

Made by [@amit.yehoshaphat](https://www.instagram.com/amit.yehoshaphat/) — free and
open source, forever.

---

## How the "no approval needed" part works

Meta normally requires **App Review** before an app can message the public. But
every Meta app can freely add up to 25 **Instagram Testers** to itself — no review,
just an instant accept — as long as the tester *is* the developer. Since you're
building this app for yourself, you are both the developer and the tester, so you
get full messaging access immediately, for your own account.

The trade-off: this only works for accounts you personally add as testers (you,
or up to 24 friends/clients who accept your tester invite). It is not a path to
messaging the general public without review — that's Meta's line, not ours.

---

## Setup

### 1. Create your Meta App

1. Go to [developers.facebook.com/apps](https://developers.facebook.com/apps) → **Create App** → type **"Other"** → **"Business"**.
2. In the app dashboard, add the **Instagram** product (via "Facebook Login for Business" + Instagram Graph API — the app setup wizard will guide you to link a Facebook Page).
3. You'll need a **Facebook Page** linked to an **Instagram Professional (Business/Creator) account**. If you don't have one yet, convert your IG account to Professional in the Instagram app, then link it to a Facebook Page in Meta Business Suite.
4. Go to **App Roles → Roles**, add yourself (and anyone else who'll use this) as an **Instagram Tester**. Then, from the Instagram app on the tester's phone: **Settings → Apps and Websites → Tester Invites → Accept**.
5. Copy your **App ID** and **App Secret** from **App Settings → Basic**.

### 2. Configure ManyMit

```bash
git clone https://github.com/Amityst12/ManyMit.git
cd ManyMit
npm install
cp .env.example .env.local
```

Edit `.env.local`:

```env
META_APP_ID=your_app_id
META_APP_SECRET=your_app_secret
INSTAGRAM_VERIFY_TOKEN=pick-any-secret-string
```

### 3. (Recommended) Get a free stable tunnel domain

Meta needs a public HTTPS URL to reach your local server. Without a fixed domain,
you'll have to update your Meta App's redirect/webhook URLs every time you restart.

1. Sign up free at [dashboard.ngrok.com](https://dashboard.ngrok.com) (no credit card).
2. **Domains → New Domain** → copy the generated `*.ngrok-free.app` domain.
3. **Your Authtoken** page → copy your authtoken.
4. Add both to `.env.local`:

```env
NGROK_AUTHTOKEN=your_authtoken
NGROK_DOMAIN=your-domain.ngrok-free.app
```

Skipping this step still works — ManyMit falls back to a free Cloudflare quick
tunnel — but that URL changes every time you restart the app.

### 4. Run it

```bash
npm run dev
```

The terminal will print your public URL, e.g.:

```
🌍 Public URL: https://your-domain.ngrok-free.app
   OAuth redirect URI   → https://your-domain.ngrok-free.app/api/auth/callback/instagram
   Webhook callback URL → https://your-domain.ngrok-free.app/api/webhooks/instagram
```

### 5. Finish the Meta App configuration

Back in your Meta App dashboard:

- **Facebook Login for Business → Settings**: paste the OAuth redirect URI into **Valid OAuth Redirect URIs**.
- **Webhooks**: **Add Callback URL** → paste the webhook callback URL, and use the same `INSTAGRAM_VERIFY_TOKEN` value you put in `.env.local` → **Subscribe** to `messages` and `comments`.

### 6. Connect & create your first automation

Open [http://localhost:3000](http://localhost:3000):

1. Click **Connect Instagram**, log in with Facebook, pick your Page.
2. Add an automation: keyword `GUIDE` → reply message with your link.
3. Have someone reply "GUIDE" to your Story or comment it on a post — you should see a DM land within seconds.

---

## What's in scope (and what isn't)

This is a trimmed, single-user, self-hosted core — not a clone of a full SaaS:

- ✅ Keyword matching (typo/emoji tolerant) → automatic DM, on Story replies and comments
- ✅ Optional CTA button in the DM
- ✅ Runs fully locally — your tokens and automations live in `data/db.json` on your machine, nowhere else
- ❌ No multi-user accounts, billing, or analytics dashboard
- ❌ No lead CRM, mentions automation, or icebreakers — keeping this small on purpose

---

## Tech stack

Next.js (App Router) + a local JSON file store ([lowdb](https://github.com/typicode/lowdb)) —
no database server, no Supabase, nothing to host. The Instagram messaging logic
talks directly to the official [Meta Graph API](https://developers.facebook.com/docs/instagram-platform).

## Security notes

- Your Meta App Secret and access tokens are stored only in `.env.local` and
  `data/db.json` on your own machine — both are git-ignored by default.
- Webhook requests are verified against Meta's HMAC signature before being processed.
- Don't commit `.env.local` or the `data/` folder, and don't share your App Secret.
