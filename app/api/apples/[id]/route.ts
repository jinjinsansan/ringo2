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

type UserTicketSnapshot = {
  status: string;
  exemption_tickets_bronze?: number | null;
  exemption_tickets_silver?: number | null;
  exemption_tickets_gold?: number | null;
  exemption_tickets_red?: number | null;
  total_exemption_tickets?: number | null;
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

    const { data: stampedApple, error: stampError } = await adminClient
      .from("apples")
      .update({ reward_applied_at: new Date().toISOString() })
      .eq("id", apple.id)
      .is("reward_applied_at", null)
      .select("id")
      .maybeSingle();

    if (stampError) {
      return NextResponse.json({ error: stampError.message }, { status: 500 });
    }

    const isFirstProcessor = Boolean(stampedApple);

    if (isFirstProcessor) {
      const { data: userRecord, error: userError } = await adminClient
        .from("users")
        .select(
          "status, exemption_tickets_bronze, exemption_tickets_silver, exemption_tickets_gold, exemption_tickets_red, total_exemption_tickets"
        )
        .eq("id", auth.userId)
        .single<UserTicketSnapshot>();

      if (userError || !userRecord) {
        return NextResponse.json({ error: userError?.message ?? "User not found" }, { status: 500 });
      }

      const updates: Record<string, number | string> = {
        status: nextStatus,
      };

      if (reward > 0) {
        const columnMap: Record<ResultLabel, keyof UserTicketSnapshot | null> = {
          bronze: "exemption_tickets_bronze",
          silver: "exemption_tickets_silver",
          gold: "exemption_tickets_gold",
          red: "exemption_tickets_red",
          poison: null,
        };

        const targetColumn = columnMap[result];
        if (targetColumn) {
          const snapshot = userRecord as Record<string, number | string | null | undefined>;
          const current = Number(snapshot[targetColumn] ?? 0);
          updates[targetColumn] = current + reward;
        }
        const total = Number(userRecord.total_exemption_tickets ?? 0);
        updates.total_exemption_tickets = total + reward;
      }

      const { error: updateError } = await adminClient
        .from("users")
        .update(updates)
        .eq("id", auth.userId)
        .eq("status", "REVEALING");

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }
    } else {
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
