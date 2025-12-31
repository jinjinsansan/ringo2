import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, getAdminClient } from "@/lib/serverSupabase";

type RouteContext = {
  params: Promise<{ id: string }>;
};

type ResultLabel = "bronze" | "silver" | "gold" | "red" | "poison";

const ticketRewards: Record<ResultLabel, number> = {
  bronze: 0,
  silver: 2,
  gold: 3,
  red: 5,
  poison: 0,
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
    const result = (apple.result ?? "poison") as ResultLabel;
    const reward = ticketRewards[result] ?? 0;
    const nextStatus = result === "poison" ? "READY_TO_PURCHASE" : "WAITING_FOR_FULFILLMENT";

    const { data: applied, error: rewardError } = await adminClient.rpc("apply_ticket_reward", {
      target_user: auth.userId,
      target_apple: apple.id,
      result_label: result,
      reward_count: reward,
      next_status: nextStatus,
    });

    if (rewardError) {
      return NextResponse.json({ error: rewardError.message }, { status: 500 });
    }

    if (!applied) {
      // already processed, but ensure status alignment
      await adminClient
        .from("users")
        .update({ status: nextStatus })
        .eq("id", auth.userId)
        .eq("status", "REVEALING");
    }
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
