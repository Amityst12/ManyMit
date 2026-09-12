import { NextResponse } from "next/server";
import { getMetaConfig, getProfile } from "@/lib/store";

export async function GET() {
  const [profile, metaConfig] = await Promise.all([getProfile(), getMetaConfig()]);
  return NextResponse.json({
    hasCredentials: Boolean(metaConfig),
    connected: Boolean(profile),
    profile: profile
      ? { igAccountName: profile.igAccountName, igAvatarUrl: profile.igAvatarUrl, connectedAt: profile.connectedAt }
      : null,
  });
}
