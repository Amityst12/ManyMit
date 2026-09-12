"use client";

import { useEffect, useState, useCallback } from "react";
import Footer from "@/components/Footer";
import type { Automation } from "@/lib/store";

type Status = {
  hasCredentials: boolean;
  connected: boolean;
  profile: { igAccountName: string; igAvatarUrl: string | null; connectedAt: string } | null;
};

export default function Dashboard() {
  const [status, setStatus] = useState<Status | null>(null);
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [origin, setOrigin] = useState("");
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const [statusRes, automationsRes] = await Promise.all([
      fetch("/api/status").then((r) => r.json()),
      fetch("/api/automations").then((r) => r.json()),
    ]);
    setStatus(statusRes);
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

      {!status?.hasCredentials && <SetupChecklist origin={origin} />}

      {status?.hasCredentials && !status.connected && <ConnectCard />}

      {status?.connected && status.profile && (
        <ConnectedCard profile={status.profile} onDisconnect={disconnect} />
      )}

      {status?.connected && (
        <AutomationsManager automations={automations} onChange={refresh} />
      )}

      <WebhookInfo origin={origin} />

      <Footer />
    </main>
  );
}

function SetupChecklist({ origin }: { origin: string }) {
  return (
    <section className="rounded-2xl border border-white/10 bg-[var(--mm-panel)] p-6">
      <h2 className="mb-3 text-lg font-semibold">1. Set up your Meta App</h2>
      <p className="mb-4 text-sm text-[var(--mm-muted)]">
        You haven&apos;t added your Meta App credentials to <code>.env.local</code> yet. Follow the{" "}
        <code>README.md</code> to create your own free Meta Developer App (no App Review needed —
        you add yourself as an Instagram Tester on your own app), then fill in:
      </p>
      <pre className="overflow-x-auto rounded-lg bg-black/40 p-4 text-xs text-[var(--mm-muted)]">
{`META_APP_ID=...
META_APP_SECRET=...
INSTAGRAM_VERIFY_TOKEN=any-secret-string-you-pick`}
      </pre>
      <p className="mt-4 text-sm text-[var(--mm-muted)]">
        Your public tunnel URL will be shown in the terminal once you run <code>npm run dev</code>{" "}
        (currently: <code>{origin || "starting…"}</code>). Paste it as the OAuth redirect URI and
        webhook callback URL in your Meta App dashboard.
      </p>
    </section>
  );
}

function ConnectCard() {
  return (
    <section className="rounded-2xl border border-white/10 bg-[var(--mm-panel)] p-8 text-center">
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
          <p className="text-sm text-[var(--mm-muted)]">No automations yet — create your first one below.</p>
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

function WebhookInfo({ origin }: { origin: string }) {
  return (
    <section className="rounded-2xl border border-white/10 bg-black/20 p-5 text-xs text-[var(--mm-muted)]">
      <div className="mb-1 font-medium text-[var(--mm-text)]">Meta App configuration</div>
      <div>
        OAuth redirect URI: <code>{origin}/api/auth/callback/instagram</code>
      </div>
      <div>
        Webhook callback URL: <code>{origin}/api/webhooks/instagram</code>
      </div>
    </section>
  );
}
