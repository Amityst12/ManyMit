import { NextResponse } from "next/server";
import { createAutomation, listAutomations } from "@/lib/store";

export async function GET() {
  const automations = await listAutomations();
  return NextResponse.json({ automations });
}

export async function POST(request: Request) {
  const body = await request.json();
  const keyword = (body.keyword || "").trim();
  const replyMessage = (body.replyMessage || "").trim();
  const triggerType = body.triggerType === "comment" ? "comment" : "story_reply";

  if (!keyword || !replyMessage) {
    return NextResponse.json({ error: "keyword and replyMessage are required" }, { status: 400 });
  }

  let buttonUrl: string | null = body.buttonUrl?.trim() || null;
  if (buttonUrl && !/^https?:\/\//.test(buttonUrl)) buttonUrl = `https://${buttonUrl}`;

  const automation = await createAutomation({
    keyword,
    triggerType,
    replyMessage,
    buttonText: body.buttonText?.trim() || null,
    buttonUrl,
    isActive: true,
  });

  return NextResponse.json({ automation });
}
