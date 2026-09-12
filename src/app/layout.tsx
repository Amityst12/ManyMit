import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ManyMit — your own Instagram DM automation",
  description: "Run keyword → DM automation for your Instagram, 100% locally on your machine.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
