import { NextResponse } from "next/server";
import crypto from "crypto";
import { getBaseUrl } from "@/lib/base-url";

export async function GET(request: Request) {
  const appId = process.env.META_APP_ID;
  if (!appId) {
    return new NextResponse(
      "META_APP_ID is missing. Set it in your .env.local file first.",
      { status: 500 }
    );
  }

  const baseUrl = getBaseUrl(request);
  const redirectUri = `${baseUrl}/api/auth/callback/instagram`;
  const state = crypto.randomBytes(16).toString("hex");

  const authorizeUrl = new URL("https://www.facebook.com/v21.0/dialog/oauth");
  authorizeUrl.searchParams.set("client_id", appId);
  authorizeUrl.searchParams.set("redirect_uri", redirectUri);
  authorizeUrl.searchParams.set("state", state);
  // Matches the exact scope list Lazyspond uses in production — trimming this
  // down looks reasonable but pages_messaging/pages_read_engagement turn out
  // to be required in practice, not just pages_show_list + instagram_basic.
  authorizeUrl.searchParams.set(
    "scope",
    [
      "instagram_manage_messages",
      "instagram_manage_comments",
      "pages_manage_metadata",
      "pages_messaging",
      "pages_show_list",
      "instagram_basic",
      "business_management",
      "pages_read_engagement",
    ].join(",")
  );

  const res = NextResponse.redirect(authorizeUrl.toString());
  res.cookies.set("mm_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });
  return res;
}
