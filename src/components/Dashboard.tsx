"use client";

import { useEffect, useState, useCallback } from "react";
import Footer from "@/components/Footer";
import type { Automation } from "@/lib/store";

type Status = {
  hasCredentials: boolean;
  connected: boolean;
  profile: { igAccountName: string; igAvatarUrl: string | null; connectedAt: string } | null;
};

type Config = {
  configured: boolean;
  appId: string | null;
  verifyToken: string | null;
};

export default function Dashboard() {
  const [status, setStatus] = useState<Status | null>(null);
  const [config, setConfig] = useState<Config | null>(null);
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [origin, setOrigin] = useState("");
  const [loading, setLoading] = useState(true);
  const [editingConfig, setEditingConfig] = useState(false);

  const refresh = useCallback(async () => {
    const [statusRes, configRes, automationsRes] = await Promise.all([
      fetch("/api/status").then((r) => r.json()),
      fetch("/api/config").then((r) => r.json()),
      fetch("/api/automations").then((r) => r.json()),
    ]);
    setStatus(statusRes);
    setConfig(configRes);
    setAutomations(automationsRes.automations || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    setOrigin(window.location.origin);
    refresh();
  }, [refresh]);

  async function disconnect() {
    if (!confirm("Disconnect this Instagram account? Your automations stay saved.")) return;
    await fetch("/api/disconnect", { method: "POST" });
    refresh();
  }

  if (loading) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-16 text-center text-[var(--mm-muted)]">Loading…</main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <header className="mb-10 text-center">
        <h1 className="text-4xl font-bold tracking-tight">
          Many<span className="text-[var(--mm-accent-1)]">Mit</span>
        </h1>
        <p className="mt-2 text-[var(--mm-muted)]">
          Auto-reply to Instagram Story replies &amp; comments with a keyword. Runs entirely on your
          machine.
        </p>
      </header>

      {/^(localhost|127\.0\.0\.1)$/.test(new URL(origin || "http://x").hostname) && (
        <div className="mb-8 rounded-xl border border-amber-400/30 bg-amber-400/10 p-4 text-sm text-amber-200">
          ⚠️ You&apos;re viewing this at <code>localhost</code>. Meta needs to redirect back to your{" "}
          <strong>public tunnel URL</strong> instead (printed in the terminal where you ran{" "}
          <code>npm run dev</code>) - open that URL in your browser before connecting Instagram, or
          the login will fail with a redirect mismatch.
        </div>
      )}

      {(!config?.configured || editingConfig) && (
        <MetaAppForm
          origin={origin}
          config={config}
          onSaved={() => {
            setEditingConfig(false);
            refresh();
          }}
        />
      )}

      {config?.configured && !editingConfig && (
        <ConfiguredBar config={config} onEdit={() => setEditingConfig(true)} />
      )}

      {config?.configured && !editingConfig && !status?.connected && <ConnectCard />}

      {status?.connected && status.profile && (
        <ConnectedCard profile={status.profile} onDisconnect={disconnect} />
      )}

      {status?.connected && !editingConfig && (
        <AutomationsManager automations={automations} onChange={refresh} />
      )}

      {config?.configured && !editingConfig && <MetaDashboardReference origin={origin} config={config} />}

      <Footer />
    </main>
  );
}

function MetaAppForm({
  origin,
  config,
  onSaved,
}: {
  origin: string;
  config: Config | null;
  onSaved: () => void;
}) {
  const [appId, setAppId] = useState(config?.appId || "");
  const [appSecret, setAppSecret] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [saved, setSaved] = useState<{ verifyToken: string } | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const res = await fetch("/api/config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ appId, appSecret }),
    });
    const data = await res.json();
    setSubmitting(false);
    if (res.ok) setSaved({ verifyToken: data.verifyToken });
  }

  // Right after saving, show the verify token + URLs once so they can paste
  // it into the Meta dashboard before this panel disappears.
  if (saved) {
    return (
      <section className="mb-8 rounded-2xl border border-white/10 bg-[var(--mm-panel)] p-6">
        <h2 className="mb-3 text-lg font-semibold">✅ Saved - now finish the Meta dashboard side</h2>
        <p className="mb-4 text-sm text-[var(--mm-muted)]">
          Go back to your Meta App and paste these in:
        </p>
        <div className="space-y-2 text-xs text-[var(--mm-muted)]">
          <div>
            <span className="text-[var(--mm-text)]">OAuth redirect URI</span> (Facebook Login for
            Business → Settings → Valid OAuth Redirect URIs):
            <br />
            <code className="text-[var(--mm-accent-1)]">{origin}/api/auth/callback/instagram</code>
          </div>
          <div>
            <span className="text-[var(--mm-text)]">Webhook callback URL</span> (Webhooks → Add
            Callback URL) + <span className="text-[var(--mm-text)]">verify token</span> (subscribe to{" "}
            <code>messages</code> and <code>comments</code>):
            <br />
            <code className="text-[var(--mm-accent-1)]">{origin}/api/webhooks/instagram</code>
            <br />
            verify token: <code className="text-[var(--mm-accent-1)]">{saved.verifyToken}</code>
          </div>
        </div>
        <button
          onClick={onSaved}
          className="mt-5 rounded-full bg-gradient-to-r from-[var(--mm-accent-1)] to-[var(--mm-accent-2)] px-5 py-2 text-sm font-medium text-white"
        >
          Done, continue
        </button>
      </section>
    );
  }

  return (
    <section className="mb-8 rounded-2xl border border-white/10 bg-[var(--mm-panel)] p-6">
      <h2 className="mb-2 text-lg font-semibold">Set up your Meta App</h2>
      <p className="mb-4 text-sm text-[var(--mm-muted)]">
        Create a free app at{" "}
        <a
          href="https://developers.facebook.com/apps"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[var(--mm-accent-1)] hover:underline"
        >
          developers.facebook.com/apps
        </a>{" "}
        (see <code>README.md</code> for the exact clicks - no App Review needed, you add yourself as
        an Instagram Tester on your own app), then paste its credentials here:
      </p>
      <form onSubmit={save} className="space-y-3">
        <input
          required
          value={appId}
          onChange={(e) => setAppId(e.target.value)}
          placeholder="App ID"
          className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none focus:border-[var(--mm-accent-2)]"
        />
        <input
          required
          type="password"
          value={appSecret}
          onChange={(e) => setAppSecret(e.target.value)}
          placeholder="App Secret"
          className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none focus:border-[var(--mm-accent-2)]"
        />
        {config?.configured && (
          <p className="text-xs text-[var(--mm-muted)]">
            Already configured - re-enter both fields to change them (the secret isn&apos;t shown back for security).
          </p>
        )}
        <button
          disabled={submitting}
          className="rounded-full bg-gradient-to-r from-[var(--mm-accent-1)] to-[var(--mm-accent-2)] px-5 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {submitting ? "Saving…" : "Save"}
        </button>
      </form>
      <p className="mt-4 text-xs text-[var(--mm-muted)]">
        Saved locally to <code>data/db.json</code> on this machine only - never sent anywhere else,
        never committed to git.
      </p>
    </section>
  );
}

function ConfiguredBar({ config, onEdit }: { config: Config; onEdit: () => void }) {
  return (
    <div className="mb-6 flex items-center justify-between rounded-xl border border-white/10 bg-black/20 px-4 py-2 text-xs text-[var(--mm-muted)]">
      <span>
        Meta App configured (ID: <code>{config.appId}</code>)
      </span>
      <button onClick={onEdit} className="text-[var(--mm-accent-1)] hover:underline">
        Edit
      </button>
    </div>
  );
}

function MetaDashboardReference({ origin, config }: { origin: string; config: Config }) {
  return (
    <details className="mb-8 rounded-xl border border-white/10 bg-black/20 p-4 text-xs text-[var(--mm-muted)]">
      <summary className="cursor-pointer select-none text-[var(--mm-text)]">
        Meta App dashboard values (redirect URI, webhook URL, verify token)
      </summary>
      <div className="mt-3 space-y-2">
        <div>
          OAuth redirect URI: <code className="text-[var(--mm-accent-1)]">{origin}/api/auth/callback/instagram</code>
        </div>
        <div>
          Webhook callback URL: <code className="text-[var(--mm-accent-1)]">{origin}/api/webhooks/instagram</code>
        </div>
        <div>
          Verify token: <code className="text-[var(--mm-accent-1)]">{config.verifyToken}</code>
        </div>
      </div>
    </details>
  );
}

function ConnectCard() {
  return (
    <section className="mb-8 rounded-2xl border border-white/10 bg-[var(--mm-panel)] p-8 text-center">
      <h2 className="mb-2 text-lg font-semibold">Connect your Instagram account</h2>
      <p className="mb-6 text-sm text-[var(--mm-muted)]">
        This opens Facebook Login. Pick the Page linked to your Instagram professional account.
      </p>
      <a
        href="/api/auth/instagram"
        className="inline-block rounded-full bg-gradient-to-r from-[var(--mm-accent-1)] to-[var(--mm-accent-2)] px-6 py-3 font-medium text-white shadow-lg transition hover:opacity-90"
      >
        Connect Instagram
      </a>
    </section>
  );
}

function ConnectedCard({
  profile,
  onDisconnect,
}: {
  profile: NonNullable<Status["profile"]>;
  onDisconnect: () => void;
}) {
  return (
    <section className="mb-8 flex items-center justify-between rounded-2xl border border-white/10 bg-[var(--mm-panel)] p-6">
      <div className="flex items-center gap-4">
        {profile.igAvatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={profile.igAvatarUrl} alt="" className="h-12 w-12 rounded-full object-cover" />
        ) : (
          <div className="h-12 w-12 rounded-full bg-white/10" />
        )}
        <div>
          <div className="font-medium">{profile.igAccountName}</div>
          <div className="text-xs text-[var(--mm-muted)]">Connected ✅</div>
        </div>
      </div>
      <button
        onClick={onDisconnect}
        className="rounded-full border border-white/20 px-4 py-2 text-sm text-[var(--mm-muted)] hover:bg-white/5"
      >
        Disconnect
      </button>
    </section>
  );
}

function AutomationsManager({
  automations,
  onChange,
}: {
  automations: Automation[];
  onChange: () => void;
}) {
  const [keyword, setKeyword] = useState("");
  const [triggerType, setTriggerType] = useState<"story_reply" | "comment">("story_reply");
  const [replyMessage, setReplyMessage] = useState("");
  const [buttonText, setButtonText] = useState("");
  const [buttonUrl, setButtonUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function createAutomation(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    await fetch("/api/automations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ keyword, triggerType, replyMessage, buttonText, buttonUrl }),
    });
    setKeyword("");
    setReplyMessage("");
    setButtonText("");
    setButtonUrl("");
    setSubmitting(false);
    onChange();
  }

  async function toggleActive(automation: Automation) {
    await fetch(`/api/automations/${automation.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !automation.isActive }),
    });
    onChange();
  }

  async function remove(id: string) {
    if (!confirm("Delete this automation?")) return;
    await fetch(`/api/automations/${id}`, { method: "DELETE" });
    onChange();
  }

  return (
    <section className="mb-8">
      <h2 className="mb-4 text-lg font-semibold">Automations</h2>

      <div className="mb-6 space-y-3">
        {automations.length === 0 && (
          <p className="text-sm text-[var(--mm-muted)]">No automations yet - create your first one below.</p>
        )}
        {automations.map((a) => (
          <div
            key={a.id}
            className="flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-[var(--mm-panel)] p-4"
          >
            <div>
              <div className="font-medium">
                <span className="text-[var(--mm-accent-1)]">&quot;{a.keyword}&quot;</span>{" "}
                <span className="text-xs text-[var(--mm-muted)]">
                  ({a.triggerType === "comment" ? "comment" : "story reply"})
                </span>
              </div>
              <div className="text-sm text-[var(--mm-muted)]">{a.replyMessage}</div>
              <div className="mt-1 text-xs text-[var(--mm-muted)]">Sent {a.replyCount} times</div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <button
                onClick={() => toggleActive(a)}
                className={`rounded-full px-3 py-1 text-xs font-medium ${
                  a.isActive ? "bg-emerald-500/20 text-emerald-300" : "bg-white/10 text-[var(--mm-muted)]"
                }`}
              >
                {a.isActive ? "Active" : "Paused"}
              </button>
              <button
                onClick={() => remove(a.id)}
                className="rounded-full border border-white/20 px-3 py-1 text-xs text-[var(--mm-muted)] hover:bg-white/5"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      <form
        onSubmit={createAutomation}
        className="space-y-3 rounded-xl border border-white/10 bg-[var(--mm-panel)] p-5"
      >
        <div className="flex gap-3">
          <input
            required
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="Keyword (e.g. GUIDE)"
            className="flex-1 rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none focus:border-[var(--mm-accent-2)]"
          />
          <select
            value={triggerType}
            onChange={(e) => setTriggerType(e.target.value as "story_reply" | "comment")}
            className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none"
          >
            <option value="story_reply">Story reply</option>
            <option value="comment">Comment</option>
          </select>
        </div>
        <textarea
          required
          value={replyMessage}
          onChange={(e) => setReplyMessage(e.target.value)}
          placeholder="DM reply message (use {name} to insert their name)"
          rows={3}
          className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none focus:border-[var(--mm-accent-2)]"
        />
        <div className="flex gap-3">
          <input
            value={buttonText}
            onChange={(e) => setButtonText(e.target.value)}
            placeholder="Button text (optional)"
            className="flex-1 rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none"
          />
          <input
            value={buttonUrl}
            onChange={(e) => setButtonUrl(e.target.value)}
            placeholder="Button URL (optional)"
            className="flex-1 rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none"
          />
        </div>
        <button
          disabled={submitting}
          className="rounded-full bg-gradient-to-r from-[var(--mm-accent-1)] to-[var(--mm-accent-2)] px-5 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {submitting ? "Saving…" : "Add automation"}
        </button>
      </form>
    </section>
  );
}
