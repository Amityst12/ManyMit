# ManyMit 💌

Your own Instagram auto-reply bot. Runs on your laptop. Costs nothing.

> Someone comments **"GUIDE"** on your post or replies to your Story with it →
> they instantly get a DM from you with your link. That's the whole app.

No monthly fee, no SaaS, no Meta App Review queue — just your own Meta app,
your own machine, your own rules.

### 🩷 Enjoying this?

This is free and made by **[@amit.yehoshaphat](https://www.instagram.com/amit.yehoshaphat/)**.
If it's saving you time (or making you money), the best "thank you" is a follow. That's it, that's the ask.

---

## The 60-second version

1. You make a free Meta Developer App and add yourself as an **Instagram Tester** on it — this is the trick that skips Meta's App Review entirely, because you're both the developer *and* the tester.
2. `npm run dev` boots the app **and** a public tunnel together, so Meta can actually reach your laptop.
3. You paste that app's ID + Secret into a form on the ManyMit home page — no config files to edit.
4. You click "Connect Instagram," add a keyword → DM rule, done.

Prefer to skip reading and just have an AI do it? Point Claude Code, Gemini
CLI, or any terminal-based coding agent at this repo and say *"set this up
for me"* — it's already been briefed via [`AGENTS.md`](./AGENTS.md) and knows
exactly what to walk you through vs. what only you can click.

---

## Setup, step by step

### 1. Create your Meta App

1. [developers.facebook.com/apps](https://developers.facebook.com/apps) → **Create App** → **Other** → **Business**.
2. Add the **Facebook Login for Business** + **Instagram Graph API** products — the wizard will have you connect a Facebook Page.
3. You need a **Facebook Page** linked to an **Instagram Professional (Business/Creator) account**. No Page yet? Convert your IG to Professional in the app, then link it via Meta Business Suite.
4. **App Roles → Roles** → add yourself as an **Instagram Tester**. Then on your phone: Instagram app → **Settings → Apps and Websites → Tester Invites → Accept**. (You can add up to 24 more people the same way — friends, clients, whoever.)
5. **App Settings → Basic** → grab your **App ID** and **App Secret**.

### 2. Install

```bash
git clone https://github.com/Amityst12/ManyMit.git
cd ManyMit
npm install
```

That's it — no `.env.local` needed for this part. Your App ID and Secret go
into the app itself once it's running (step 4).

### 3. (Optional but nice) get a permanent tunnel URL

Skip this and ManyMit uses a free instant Cloudflare tunnel — zero signup,
but the URL changes every restart, so you'll re-paste it into your Meta App
each time. For a URL that never changes:

1. Free account at [dashboard.ngrok.com](https://dashboard.ngrok.com) (no card).
2. **Domains → New Domain** → copy it.
3. **Your Authtoken** → copy that too.
4. Create `.env.local` (`cp .env.example .env.local`) and fill in:

```env
NGROK_AUTHTOKEN=your_authtoken
NGROK_DOMAIN=your-domain.ngrok-free.app
```

### 4. Run it

```bash
npm run dev
```

Your terminal prints your public URL and the two links you need:

```
🌍 Public URL: https://your-domain.ngrok-free.app
   OAuth redirect URI   → https://your-domain.ngrok-free.app/api/auth/callback/instagram
   Webhook callback URL → https://your-domain.ngrok-free.app/api/webhooks/instagram
```

### 5. Finish setup in the browser

Open the **public URL** printed above (not `localhost:3000` — Meta's login
needs to redirect back to the same public address it's about to be
registered under, so use that one from here on). It'll ask you to paste your
**App ID** and **App Secret** from step 1 — do that, hit Save, and it hands
you back a verify token plus the two URLs from above. Paste those into your
Meta App dashboard:
- **Facebook Login for Business → Settings → Valid OAuth Redirect URIs** → the OAuth redirect URI.
- **Webhooks → Add Callback URL** → the webhook URL + the verify token it gave you → **Subscribe** to `messages` and `comments`.

Then click **Connect Instagram** → log in → pick your Page → add a keyword
automation. Test it by replying to your own Story with the keyword from
another account. DM should land in seconds.

Just leave your laptop running with `npm run dev` open — that's the whole
infrastructure.

---

## What's in here (on purpose, kept small)

- ✅ Typo/emoji-tolerant keyword matching → auto-DM, on Story replies and comments
- ✅ Optional button + link in the DM
- ✅ Everything local — your tokens and automations live in `data/db.json` on your machine, nowhere else
- ❌ No accounts, billing, analytics dashboard, CRM, or mentions automation — that's a different, bigger product. This one does one thing.

## Under the hood

Next.js (App Router) + a local JSON file ([lowdb](https://github.com/typicode/lowdb))
instead of a database — nothing to host, nothing to pay for. Talks straight
to the official [Meta Graph API](https://developers.facebook.com/docs/instagram-platform)
for messaging.

## Security

- Your App Secret and access tokens live only in `data/db.json` on this machine, git-ignored by default. `.env.local` (only used for the optional ngrok settings) is git-ignored too. Don't commit either, don't share them.
- Every webhook request is checked against Meta's signature before anything runs.

---

Made with ❤️ by [@amit.yehoshaphat](https://www.instagram.com/amit.yehoshaphat/) — free and open source, forever.
