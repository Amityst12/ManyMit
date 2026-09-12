import { NextResponse } from "next/server";
import { deleteAutomation, updateAutomation } from "@/lib/store";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  const patch: Record<string, unknown> = {};
  if (typeof body.keyword === "string") patch.keyword = body.keyword.trim();
  if (typeof body.replyMessage === "string") patch.replyMessage = body.replyMessage.trim();
  if (typeof body.isActive === "boolean") patch.isActive = body.isActive;
  if (typeof body.buttonText === "string") patch.buttonText = body.buttonText.trim() || null;
  if (typeof body.buttonUrl === "string") patch.buttonUrl = body.buttonUrl.trim() || null;

  const automation = await updateAutomation(id, patch);
  if (!automation) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ automation });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const deleted = await deleteAutomation(id);
  if (!deleted) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ success: true });
}
