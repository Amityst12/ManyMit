// Thin wrapper around the Meta Graph API for Instagram messaging.
// Ported from the Lazyspond production codebase and trimmed to what a
// single-user, self-hosted setup actually needs.

const GRAPH_VERSION = "v21.0";
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_VERSION}`;

type MetaErrorBody = { error?: { code?: number; error_subcode?: number } };

export function isMetaRateLimitError(status: number, body?: MetaErrorBody): boolean {
  if (status === 429) return true;
  if (body?.error?.code === 4 || body?.error?.code === 32 || body?.error?.code === 613) return true;
  return false;
}

export function isMetaPrivacyError(status: number, body?: MetaErrorBody): boolean {
  const err = body?.error;
  if (!err) return false;
  // 200 / subcode 2534041 = User is currently unavailable (often a privacy block)
  if (err.code === 200 && err.error_subcode === 2534041) return true;
  // 10 = Application does not have permission to message this user
  if (err.code === 10) return true;
  // 2022 = Generic "User cannot be messaged" (deactivated / blocked / tight privacy)
  if (err.code === 2022) return true;
  return false;
}

export async function logMetaApiError(
  context: string,
  res: Response
): Promise<{ isRateLimit: boolean; isPrivacyError: boolean; errorMessage: string }> {
  let bodyText = "";
  let bodyJson: MetaErrorBody | undefined;
  try {
    bodyText = await res.text();
    bodyJson = JSON.parse(bodyText);
  } catch {
    /* body may not be JSON */
  }

  const isRateLimit = isMetaRateLimitError(res.status, bodyJson);
  const isPrivacyError = isMetaPrivacyError(res.status, bodyJson);

  if (isRateLimit) {
    console.error(`🚦 [RATE LIMIT] Meta API rate limit during ${context}. Status: ${res.status}. Body: ${bodyText}`);
  } else if (isPrivacyError) {
    console.warn(`🔒 [PRIVACY] Recipient has DMs disabled during ${context}.`);
  } else {
    console.error(`❌ [META API ERROR] ${context}. Status: ${res.status}. Body: ${bodyText}`);
  }

  return { isRateLimit, isPrivacyError, errorMessage: bodyText };
}

export async function fetchInstagramProfile(
  senderId: string,
  pageToken: string
): Promise<{ displayName?: string; profilePic?: string }> {
  const res = await fetch(
    `${GRAPH_BASE}/${senderId}?fields=username,name,profile_pic&access_token=${pageToken}`
  );
  if (!res.ok) return {};
  const data = await res.json();
  return {
    displayName: data.name || data.username || undefined,
    profilePic: data.profile_pic || undefined,
  };
}

export async function sendDirectMessage(
  sendEndpointId: string,
  recipientPayload: Record<string, unknown>,
  messageText: string,
  pageToken: string,
  buttonText?: string | null,
  buttonUrl?: string | null
) {
  let messagePayload: Record<string, unknown>;

  if (buttonText && buttonUrl) {
    let title = messageText;
    let subtitle = "";
    if (messageText.includes("|||")) {
      const parts = messageText.split("|||");
      title = parts[0]?.trim() || "";
      subtitle = parts.slice(1).join("|||")?.trim() || "";
    } else {
      title = messageText.substring(0, 80);
      if (messageText.length > 80) subtitle = messageText.substring(80, 160);
    }

    const element: { title: string; buttons: unknown[]; subtitle?: string } = {
      title: title.substring(0, 80) || "Follow link below",
      buttons: [{ type: "web_url", url: buttonUrl, title: buttonText.substring(0, 20) }],
    };
    if (subtitle) element.subtitle = subtitle.substring(0, 80);

    messagePayload = {
      attachment: { type: "template", payload: { template_type: "generic", elements: [element] } },
    };
  } else {
    messagePayload = { text: messageText.replace(/\|\|\|/g, "\n\n") };
  }

  return fetch(`${GRAPH_BASE}/${sendEndpointId}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      recipient: recipientPayload,
      message: messagePayload,
      messaging_type: "RESPONSE",
      access_token: pageToken,
    }),
  });
}

export async function sendCommentReply(commentId: string, messageText: string, pageToken: string) {
  return fetch(`${GRAPH_BASE}/${commentId}/replies`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: messageText, access_token: pageToken }),
  });
}

export async function subscribePageToWebhooks(pageId: string, pageAccessToken: string) {
  const params = new URLSearchParams({
    // Only fields the webhook route actually handles - "mentions" isn't
    // implemented in this trimmed-down core, so we don't subscribe to it.
    subscribed_fields: "messages,comments",
    access_token: pageAccessToken,
  });
  const res = await fetch(`${GRAPH_BASE}/${pageId}/subscribed_apps?${params.toString()}`, { method: "POST" });
  return res.json();
}
