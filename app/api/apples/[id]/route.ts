import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, getAdminClient } from "@/lib/serverSupabase";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(req: NextRequest, context: RouteContext) {
  const auth = await authenticateRequest(req);
  if ("error" in auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const adminClient = getAdminClient();
  if (!adminClient) {
    return NextResponse.json({ error: "Service role key is not configured" }, { status: 500 });
  }

  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ error: "Apple ID is required" }, { status: 400 });
  }

  const { data: apple, error } = await adminClient
    .from("apples")
    .select("id, user_id, result, reveal_at, created_at")
    .eq("id", id)
    .single();

  if (error || !apple) {
    return NextResponse.json({ error: error?.message ?? "Not found" }, { status: 404 });
  }

  if (apple.user_id !== auth.userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const now = new Date();
  const revealAt = new Date(apple.reveal_at);
  const isRevealed = now >= revealAt;

  if (isRevealed) {
    const nextStatus = apple.result === "poison" ? "READY_TO_PURCHASE" : "WAITING_FOR_FULFILLMENT";
    await adminClient.from("users").update({ status: nextStatus }).eq("id", auth.userId);
  }

  return NextResponse.json({
    apple: {
      id: apple.id,
      revealAt: apple.reveal_at,
      result: isRevealed ? apple.result : null,
      isRevealed,
    },
    serverTime: now.toISOString(),
  });
}
