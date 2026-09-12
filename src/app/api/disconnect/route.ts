import { NextResponse } from "next/server";
import { clearProfile } from "@/lib/store";

export async function POST() {
  await clearProfile();
  return NextResponse.json({ success: true });
}
