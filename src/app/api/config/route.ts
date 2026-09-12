import { NextResponse } from "next/server";
import { getMetaConfig, saveMetaConfig } from "@/lib/store";

// Never send the App Secret back down to the browser once saved - the UI
// only needs to know it's configured, not what it is.
export async function GET() {
  const config = await getMetaConfig();
  return NextResponse.json({
    configured: Boolean(config),
    appId: config?.appId || null,
    verifyToken: config?.verifyToken || null,
  });
}

export async function POST(request: Request) {
  const body = await request.json();
  const appId = (body.appId || "").trim();
  const appSecret = (body.appSecret || "").trim();

  if (!appId || !appSecret) {
    return NextResponse.json({ error: "appId and appSecret are required" }, { status: 400 });
  }

  const config = await saveMetaConfig(appId, appSecret);
  return NextResponse.json({ appId: config.appId, verifyToken: config.verifyToken });
}
