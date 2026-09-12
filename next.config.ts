import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["lowdb", "@ngrok/ngrok"],
};

export default nextConfig;
