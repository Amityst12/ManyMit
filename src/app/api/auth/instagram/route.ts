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
  // pages_show_list + business_management let us discover the connected Page;
  // the instagram_* scopes grant messaging + comment reply access.
  authorizeUrl.searchParams.set(
    "scope",
    [
      "pages_show_list",
      "pages_manage_metadata",
      "business_management",
      "instagram_basic",
      "instagram_manage_messages",
      "instagram_manage_comments",
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
