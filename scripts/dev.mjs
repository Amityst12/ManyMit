#!/usr/bin/env node
// Boots the Next.js dev server AND a public tunnel together, then prints the
// URLs you need to paste into your Meta App dashboard.
//
// Tunnel strategy:
//   - If NGROK_AUTHTOKEN is set in .env.local, uses ngrok (recommended: grab a
//     free static domain at dashboard.ngrok.com so the URL never changes).
//   - Otherwise falls back to a Cloudflare quick tunnel (zero signup, but the
//     URL is random and changes every time you restart).

import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

const PORT = process.env.PORT || 3000;

loadEnvLocal();

function loadEnvLocal() {
  if (!existsSync(".env.local")) return;
  const lines = readFileSync(".env.local", "utf8").split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

const isWin = process.platform === "win32";

const next = spawn("npx", ["next", "dev", "--port", String(PORT)], {
  stdio: "inherit",
  env: process.env,
  shell: isWin,
});

let tunnelUrl = null;

async function startTunnel() {
  if (process.env.NGROK_AUTHTOKEN) {
    const ngrok = await import("@ngrok/ngrok");
    const listener = await ngrok.default.forward({
      addr: Number(PORT),
      authtoken: process.env.NGROK_AUTHTOKEN,
      domain: process.env.NGROK_DOMAIN || undefined,
    });
    tunnelUrl = listener.url();
    printBanner(tunnelUrl, true);
  } else {
    const cloudflared = spawn(
      "npx",
      ["cloudflared", "tunnel", "--url", `http://localhost:${PORT}`],
      { env: process.env, shell: isWin }
    );

    cloudflared.stderr.on("data", (chunk) => {
      const text = chunk.toString();
      const match = text.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/);
      if (match && !tunnelUrl) {
        tunnelUrl = match[0];
        printBanner(tunnelUrl, false);
      }
    });

    process.on("exit", () => cloudflared.kill());
  }
}

function printBanner(url, isStable) {
  console.log("\n============================================================");
  console.log(`🌍 Public URL: ${url}`);
  console.log(`   OAuth redirect URI  →  ${url}/api/auth/callback/instagram`);
  console.log(`   Webhook callback URL →  ${url}/api/webhooks/instagram`);
  if (!isStable) {
    console.log("   ⚠️  This is a free Cloudflare quick tunnel - the URL above");
    console.log("       will change next time you restart. Update it in your");
    console.log("       Meta App dashboard whenever it does. For a permanent");
    console.log("       URL, set NGROK_AUTHTOKEN + NGROK_DOMAIN in .env.local");
    console.log("       (see README.md).");
  }
  console.log("============================================================\n");
}

// Give Next a moment to bind to the port before we open the tunnel.
setTimeout(startTunnel, 1500);

process.on("exit", () => next.kill());
