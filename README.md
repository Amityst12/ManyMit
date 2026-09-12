# ManyMit

Your own Instagram auto-reply bot. Runs on your laptop. Costs nothing.

> Someone comments **"GUIDE"** on your post or replies to your Story with it →
> they instantly get a DM from you with your link. That's the whole app.

No monthly fee, no SaaS, no Meta App Review queue - just your own Meta app,
your own machine, your own rules.

### 🩷 Enjoying this?

This is free and made by **[@amit.yehoshaphat](https://www.instagram.com/amit.yehoshaphat/)**.
If it's saving you time (or making you money), the best "thank you" is a follow. That's it, that's the ask.

---

## The 60-second version

1. You make a free Meta Developer App and add yourself as an **Instagram Tester** on it - this is the trick that skips Meta's App Review entirely, because you're both the developer *and* the tester.
2. `npm run dev` boots the app **and** a public tunnel together, so Meta can actually reach your laptop.
3. You paste that app's ID + Secret into a form on the ManyMit home page - no config files to edit.
4. You click "Connect Instagram," add a keyword → DM rule, done.

Prefer to skip reading and just have an AI do it? Point Claude Code, Gemini
CLI, or any terminal-based coding agent at this repo and say *"set this up
for me"* - it's already been briefed via [`AGENTS.md`](./AGENTS.md) and knows
exactly what to walk you through vs. what only you can click.

---

## Setup, step by step

### 1. Create your Meta App

1. [developers.facebook.com/apps](https://developers.facebook.com/apps) → **Create App** → **Other** → **Business**.
2. Add the **Facebook Login for Business** and **Instagram** products - the wizard will have you connect a Facebook Page.
3. You need a **Facebook Page** linked to an **Instagram Professional (Business/Creator) account**. No Page yet? Convert your IG to Professional in the app, then link it via Meta Business Suite.
4. **App roles → Roles** → add yourself as an **Instagram Tester**. Then on your phone: Instagram app → **Settings → Apps and Websites → Tester Invites → Accept**. (You can add up to 24 more people the same way - friends, clients, whoever.)
5. **App settings → Basic** → grab your **App ID** and **App Secret** (the secret is behind a "Show" button and will ask for your password).

Leave **App Mode** on **Development**. That's what makes the tester trick work:
in Development mode your app can fully message the accounts that hold a role
on it (you, plus anyone who accepted a tester invite), with no App Review.
Flipping it to Live is what would drag you into the review queue.

> Already run another Instagram tool (or your own SaaS) on a Meta app? Create a
> **separate** app for this. The webhook callback URL is per-app, so pointing an
> existing app at ManyMit would hijack webhook delivery away from whatever is
> already using it.

### 2. Install

```bash
git clone https://github.com/Amityst12/ManyMit.git
cd ManyMit
npm install
```

That's it - no `.env.local` needed for this part. Your App ID and Secret go
into the app itself once it's running (step 4).

### 3. (Optional but nice) get a permanent tunnel URL

Skip this and ManyMit uses a free instant Cloudflare tunnel - zero signup,
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

Open the **public URL** printed above (not `localhost:3000` - Meta's login
needs to redirect back to the same public address it's about to be
registered under, so use that one from here on). It'll ask you to paste your
**App ID** and **App Secret** from step 1 - do that, hit Save, and it hands
you back a verify token plus the two URLs from above. Paste those into your
Meta App dashboard:
- **Facebook Login for Business → Settings → Valid OAuth Redirect URIs** → the OAuth redirect URI.
- **Webhooks → Add Callback URL** → the webhook URL + the verify token it gave you → **Subscribe** to `messages` and `comments`.

Then click **Connect Instagram** → log in → pick your Page → add a keyword
automation. Test it by replying to your own Story with the keyword from
another account. DM should land in seconds.

Just leave your laptop running with `npm run dev` open - that's the whole
infrastructure.

### Keeping it alive (the honest part)

Your laptop *is* the server, so:

- **Sleep = downtime.** If the lid closes or the machine sleeps, Meta can't reach you and those DMs never go out. Meta retries for a while, but it also disables webhooks that keep failing, so for anything serious keep the machine awake (or run it on a spare machine / mini PC you leave on).
- **Free tunnel = new URL on every restart.** The Cloudflare quick tunnel hands you a different address each run, and you'd have to re-paste it into the Meta dashboard each time. If you plan to leave this running, do step 3 and get the free ngrok static domain - it's the difference between set-it-and-forget-it and re-configuring daily.
- **Reconnect about every 60 days.** Meta's long-lived tokens expire. When that happens DMs stop and your terminal prints a "connection has expired" line - just open ManyMit and hit **Connect Instagram** again.

### Rather not run a server at all?

Totally fair. Everything above is the DIY route and it does ask something of
you: your own Meta app, a tunnel, a machine that stays awake, a reconnect
every couple of months.

I also run the hosted version of this exact thing at
**[Lazyspond.com](https://lazyspond.com)** - same keyword-to-DM automation,
nothing to install, nothing to keep running, and there's a **free plan** you
can start on right now. Same person, same idea, someone else's servers.

Either way this repo stays free and open source. Pick whichever one fits you.

---

## What's in here (on purpose, kept small)

- ✅ Auto-DM on **Story replies** and **post comments**
- ✅ Optional button + link in the DM, and `{name}` in your message text
- ✅ Everything local - your tokens and automations live in `data/db.json` on your machine, nowhere else
- ❌ No accounts, billing, analytics dashboard, CRM, or mentions automation - that's a different, bigger product. This one does one thing.

### How matching actually works (read this one)

The keyword has to be **the whole message**, not a word inside it. Casing,
emoji, punctuation and repeated letters are all forgiven, so for the keyword
`GUIDE` these all fire:

`guide` · `GUIDE!!` · `Guideee` · `guide 🔥`

...but **"send me the guide"** does not. Tell people to reply with just the
word.

Also note: a plain DM does **not** trigger anything. Only replies to your
Story and comments on your posts do - so your normal inbox conversations are
never auto-answered.

## Under the hood

Next.js (App Router) + a local JSON file ([lowdb](https://github.com/typicode/lowdb))
instead of a database - nothing to host, nothing to pay for. Talks straight
to the official [Meta Graph API](https://developers.facebook.com/docs/instagram-platform)
for messaging.

## Security

- Your App Secret and access tokens live only in `data/db.json` on this machine, git-ignored by default. `.env.local` (only used for the optional ngrok settings) is git-ignored too. Don't commit either, don't share them.
- Every webhook request is checked against Meta's signature before anything runs.

---

Made with ❤️ by [@amit.yehoshaphat](https://www.instagram.com/amit.yehoshaphat/) - free and open source, forever.

Want it hosted instead of self-run? [Lazyspond.com](https://lazyspond.com) - free plan, zero setup.
