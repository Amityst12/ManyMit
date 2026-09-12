import { NextResponse } from "next/server";
import crypto from "crypto";
import { getMetaConfig, getProfile, incrementReplyCount, isDuplicateWebhookEvent, listAutomations } from "@/lib/store";
import { findMatchingAutomation } from "@/lib/instagram/match";
import { fetchInstagramProfile, logMetaApiError, sendDirectMessage } from "@/lib/instagram/api";

const RATE_LIMIT_MS = 30000;

// In-memory is enough here: one process, one account, and forgetting the
// throttle on restart is harmless.
const lastReplyBySender = new Map<string, number>();

function allowSend(senderId: string): boolean {
  const now = Date.now();
  const last = lastReplyBySender.get(senderId);
  if (last && now - last < RATE_LIMIT_MS) return false;
  lastReplyBySender.set(senderId, now);
  return true;
}

// --- Webhook payload shapes (subset of what Meta sends) ---
interface WebhookMessage {
  mid?: string;
  text?: string;
  is_echo?: boolean;
  reply_to?: { story?: { id: string } };
}
interface WebhookMessagingEvent {
  sender?: { id: string };
  message?: WebhookMessage;
}
interface WebhookCommentValue {
  id: string;
  text: string;
  from?: { id: string };
  media?: { id: string };
}
interface WebhookChangeEvent {
  field: string;
  value?: WebhookCommentValue;
}
interface WebhookEntry {
  id: string;
  messaging?: WebhookMessagingEvent[];
  changes?: WebhookChangeEvent[];
}
interface WebhookPayload {
  object: string;
  entry?: WebhookEntry[];
}
// ------------------------------------------------------------

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  const metaConfig = await getMetaConfig();
  if (!metaConfig) {
    console.error("Meta App isn't configured yet - set it up on the ManyMit home page first.");
    return new NextResponse("Internal Server Error", { status: 500 });
  }

  if (mode === "subscribe" && token === metaConfig.verifyToken) {
    console.log("✅ Webhook verified by Meta.");
    return new NextResponse(challenge, { status: 200, headers: { "Content-Type": "text/plain" } });
  }
  return new NextResponse("Forbidden", { status: 403 });
}

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();

    // --- Signature verification: reject anything not actually from Meta ---
    const metaConfig = await getMetaConfig();
    if (!metaConfig) {
      return new NextResponse("Forbidden", { status: 403 });
    }
    const signatureHeader = request.headers.get("x-hub-signature-256");
    if (!signatureHeader) {
      return new NextResponse("Forbidden", { status: 403 });
    }
    const signature = signatureHeader.replace("sha256=", "");
    const expected = crypto.createHmac("sha256", metaConfig.appSecret).update(rawBody).digest("hex");
    const sigBuf = Buffer.from(signature, "hex");
    const expBuf = Buffer.from(expected, "hex");
    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
      console.error("Invalid webhook signature - rejecting.");
      return new NextResponse("Forbidden", { status: 403 });
    }

    const body = JSON.parse(rawBody) as WebhookPayload;
    if (body.object !== "instagram") {
      return new NextResponse("Not Supported", { status: 404 });
    }

    for (const entry of body.entry || []) {
      const destinationId = entry.id;

      for (const messagingEvent of entry.messaging || []) {
        const senderId = messagingEvent.sender?.id;
        const message = messagingEvent.message;
        if (!senderId || !message?.text || message.is_echo) continue;

        // Only Story Replies trigger the DM automation (matches Lazyspond's proven UX:
        // regular DMs are left alone so you can still chat manually).
        if (!message.reply_to?.story) continue;

        await handleInteraction({
          destinationId,
          senderId,
          text: message.text,
          triggerType: "story_reply",
          eventId: message.mid || `msg_${senderId}_${Date.now()}`,
        });
      }

      for (const change of entry.changes || []) {
        if (change.field !== "comments" || !change.value) continue;
        const { id: commentId, text, from } = change.value;
        const senderId = from?.id;
        if (!senderId) continue;

        await handleInteraction({
          destinationId,
          senderId,
          text,
          triggerType: "comment",
          eventId: commentId,
          commentId,
        });
      }
    }

    return NextResponse.json({ status: "success" });
  } catch (err) {
    console.error("Webhook processing failed:", err);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

async function handleInteraction(args: {
  destinationId: string;
  senderId: string;
  text: string;
  triggerType: "story_reply" | "comment";
  eventId: string;
  commentId?: string;
}) {
  const { destinationId, senderId, text, triggerType, eventId, commentId } = args;

  if (await isDuplicateWebhookEvent(eventId)) return;

  const profile = await getProfile();
  if (!profile || profile.igAccountId !== destinationId) {
    console.log(`Ignoring interaction for unlinked Instagram account ${destinationId}.`);
    return;
  }

  const automations = await listAutomations();
  const automation = findMatchingAutomation(automations, triggerType, text);
  if (!automation) {
    console.log(`No matching automation for "${text}" (${triggerType}).`);
    return;
  }

  // Throttle per sender, but only once a keyword actually matched, so someone
  // chatting normally can still trigger an automation right afterwards.
  if (!allowSend(senderId)) {
    console.warn(`⏳ Rate limited: skipping reply to ${senderId} (one reply per ${RATE_LIMIT_MS / 1000}s).`);
    return;
  }

  console.log(`✅ Match found for keyword "${automation.keyword}" - replying to ${senderId}...`);

  const { displayName } = await fetchInstagramProfile(senderId, profile.pageAccessToken);
  const placeholderName = displayName || "there";
  const finalMessage = automation.replyMessage.replace(/\{name\}/gi, placeholderName);

  const recipientPayload = commentId ? { comment_id: commentId } : { id: senderId };
  const send = (token: string) =>
    sendDirectMessage(
      profile.pageId,
      recipientPayload,
      finalMessage,
      token,
      automation.buttonText,
      automation.buttonUrl
    );

  let dmRes = await send(profile.pageAccessToken);

  // Some Page setups reject the Page token with "cannot impersonate" (190/492).
  // Lazyspond hit this in production; retrying with the user token clears it.
  if (!dmRes.ok && profile.userAccessToken && profile.userAccessToken !== profile.pageAccessToken) {
    const errBody = await dmRes
      .clone()
      .json()
      .catch(() => null);
    if (errBody?.error?.code === 190 && errBody?.error?.error_subcode === 492) {
      console.log("Page token was blocked as impersonation, retrying with the user token...");
      dmRes = await send(profile.userAccessToken);
    }
  }

  if (dmRes.ok) {
    console.log(`✉️ Reply sent to ${senderId}.`);
    await incrementReplyCount(automation.id);
  } else {
    const { errorMessage } = await logMetaApiError("DM send", dmRes);
    if (errorMessage.includes('"code":190')) {
      console.error(
        "👉 Your Instagram connection has expired (Meta tokens last ~60 days). Open ManyMit and click Connect Instagram again."
      );
    }
  }
}
