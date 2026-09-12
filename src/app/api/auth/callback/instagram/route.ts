import { NextResponse } from "next/server";
import { getBaseUrl } from "@/lib/base-url";
import { getMetaConfig, saveProfile } from "@/lib/store";
import { subscribePageToWebhooks } from "@/lib/instagram/api";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const baseUrl = getBaseUrl(request);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  const cookieState = request.headers
    .get("cookie")
    ?.split("; ")
    .find((c) => c.startsWith("mm_oauth_state="))
    ?.split("=")[1];

  if (error) {
    console.error("Facebook OAuth error:", error, searchParams.get("error_description"));
    return NextResponse.redirect(new URL("/?error=oauth_failed", baseUrl));
  }
  if (!code || !state) {
    return NextResponse.redirect(new URL("/?error=invalid_request", baseUrl));
  }
  if (!cookieState || cookieState !== state) {
    console.error("OAuth state mismatch — possible CSRF attempt, rejecting.");
    return NextResponse.redirect(new URL("/?error=csrf_detected", baseUrl));
  }

  const metaConfig = await getMetaConfig();
  if (!metaConfig) {
    return NextResponse.redirect(new URL("/?error=server_config_error", baseUrl));
  }
  const { appId, appSecret } = metaConfig;

  try {
    const redirectUri = `${baseUrl}/api/auth/callback/instagram`;

    // 1. Exchange the authorization code for a short-lived user token.
    const tokenRes = await fetch(
      `https://graph.facebook.com/v21.0/oauth/access_token?client_id=${appId}&redirect_uri=${encodeURIComponent(
        redirectUri
      )}&client_secret=${appSecret}&code=${code}`
    );
    const tokenData = await tokenRes.json();
    if (tokenData.error) {
      console.error("Token exchange failed:", tokenData.error);
      return NextResponse.redirect(new URL("/?error=token_exchange_failed", baseUrl));
    }
    const shortLivedToken = tokenData.access_token as string;

    // 2. Exchange for a long-lived user token (~60 days).
    const longLivedRes = await fetch(
      `https://graph.facebook.com/v21.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${shortLivedToken}`
    );
    const longLivedData = await longLivedRes.json();
    const userAccessToken: string = longLivedData.access_token || shortLivedToken;

    // 3. Discover the connected Facebook Page.
    const pagesRes = await fetch(
      `https://graph.facebook.com/v21.0/me/accounts?fields=id,name,access_token,instagram_business_account&access_token=${userAccessToken}`
    );
    const pagesData = await pagesRes.json();

    type PageEntry = { id: string; access_token: string; instagram_business_account?: { id: string } };
    let page: PageEntry | null = null;
    if (pagesData.data?.length > 0) {
      page = pagesData.data.find((p: PageEntry) => p.instagram_business_account) || pagesData.data[0];
    }

    if (!page) {
      console.warn("No Facebook Page found for this user.");
      return NextResponse.redirect(new URL("/?error=no_facebook_page_linked", baseUrl));
    }

    if (!page.access_token) {
      const ptRes = await fetch(
        `https://graph.facebook.com/v21.0/${page.id}?fields=id,access_token&access_token=${userAccessToken}`
      );
      const ptData = await ptRes.json();
      if (ptData.access_token) page.access_token = ptData.access_token;
    }

    const pageAccessToken = page.access_token;

    // 4. Fetch the linked Instagram professional account.
    const igRes = await fetch(
      `https://graph.facebook.com/v21.0/${page.id}?fields=instagram_business_account&access_token=${pageAccessToken}`
    );
    const igData = await igRes.json();
    const igAccountId: string | undefined = igData.instagram_business_account?.id;

    if (!igAccountId) {
      console.warn("Page found, but no Instagram professional account is linked to it.");
      return NextResponse.redirect(new URL("/?error=no_instagram_linked_to_page", baseUrl));
    }

    const igProfileRes = await fetch(
      `https://graph.facebook.com/v21.0/${igAccountId}?fields=username,profile_picture_url&access_token=${pageAccessToken}`
    );
    const igProfile = await igProfileRes.json();

    // 5. Persist the connection locally.
    await saveProfile({
      igAccountId,
      igAccountName: igProfile.username ? `@${igProfile.username}` : "Connected Instagram",
      igAvatarUrl: igProfile.profile_picture_url || null,
      pageId: page.id,
      pageAccessToken,
      userAccessToken,
      connectedAt: new Date().toISOString(),
    });

    // 6. Subscribe the Page to this app's webhook so messages/comments start flowing in.
    const subscribeResult = await subscribePageToWebhooks(page.id, pageAccessToken);
    if (!subscribeResult.success) {
      console.warn("Could not auto-subscribe the Page to webhooks:", subscribeResult.error?.message);
    }

    const res = NextResponse.redirect(new URL("/?connected=1", baseUrl));
    res.cookies.delete("mm_oauth_state");
    return res;
  } catch (err) {
    console.error("Unhandled OAuth exception:", err);
    return NextResponse.redirect(new URL("/?error=unknown_error", baseUrl));
  }
}
