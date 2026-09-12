import { NextResponse } from "next/server";
import { getProfile } from "@/lib/store";

export async function GET() {
  const profile = await getProfile();
  const hasCredentials = Boolean(process.env.META_APP_ID && process.env.META_APP_SECRET && process.env.INSTAGRAM_VERIFY_TOKEN);
  return NextResponse.json({
    hasCredentials,
    connected: Boolean(profile),
    profile: profile
      ? { igAccountName: profile.igAccountName, igAvatarUrl: profile.igAvatarUrl, connectedAt: profile.connectedAt }
      : null,
  });
}
