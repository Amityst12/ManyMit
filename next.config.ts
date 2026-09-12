import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["lowdb", "@ngrok/ngrok"],
  // This app is always reached through a tunnel domain rather than localhost,
  // so the dev server has to treat those hosts as first-party or it stops
  // serving /_next/* assets to them.
  allowedDevOrigins: [
    "*.trycloudflare.com",
    "*.ngrok-free.app",
    "*.ngrok.app",
    "*.ngrok.io",
  ],
};

export default nextConfig;
