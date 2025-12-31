import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, getAdminClient } from "@/lib/serverSupabase";

type TicketType = "bronze" | "silver" | "gold" | "red";
type TicketColumn =
  | "exemption_tickets_bronze"
  | "exemption_tickets_silver"
  | "exemption_tickets_gold"
  | "exemption_tickets_red";

const TICKET_COLUMNS: Record<TicketType, TicketColumn> = {
  bronze: "exemption_tickets_bronze",
  silver: "exemption_tickets_silver",
  gold: "exemption_tickets_gold",
  red: "exemption_tickets_red",
};

type UserCounts = {
  status: string;
  can_use_ticket: boolean;
  exemption_tickets_bronze: number;
  exemption_tickets_silver: number;
  exemption_tickets_gold: number;
  exemption_tickets_red: number;
  total_exemption_tickets: number;
};

const PRIORITY: TicketType[] = ["red", "gold", "silver", "bronze"];

export async function POST(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if ("error" in auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const adminClient = getAdminClient();
  if (!adminClient) {
    return NextResponse.json({ error: "Service role key is not configured" }, { status: 500 });
  }

  let body: { ticketType?: TicketType } = {};
  try {
    body = (await req.json()) ?? {};
  } catch {
    // ignore, ticketType is optional
  }

  const { data: user, error: userError } = await adminClient
    .from("users")
    .select(
      "status, can_use_ticket, exemption_tickets_bronze, exemption_tickets_silver, exemption_tickets_gold, exemption_tickets_red, total_exemption_tickets"
    )
    .eq("id", auth.userId)
    .single<UserCounts>();

  if (userError || !user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  if (!user.can_use_ticket) {
    return NextResponse.json({ error: "現在チケットは使用できません" }, { status: 400 });
  }

  const chosenType = body.ticketType ?? PRIORITY.find((type) => user[TICKET_COLUMNS[type]] > 0);
  if (!chosenType) {
    return NextResponse.json({ error: "利用可能なチケットがありません" }, { status: 400 });
  }

  const column = TICKET_COLUMNS[chosenType];
  if (user[column] <= 0) {
    return NextResponse.json({ error: "指定されたチケットが不足しています" }, { status: 400 });
  }

  const updates: Record<string, unknown> = {
    status: "READY_TO_DRAW",
    can_use_ticket: false,
    total_exemption_tickets: Math.max(0, user.total_exemption_tickets - 1),
  };

  updates[column] = user[column] - 1;

  const { data: updateResult, error: updateError } = await adminClient
    .from("users")
    .update(updates)
    .eq("id", auth.userId)
    .eq("can_use_ticket", true)
    .select("id")
    .single();

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  if (!updateResult) {
    return NextResponse.json({ error: "更新対象が見つかりませんでした" }, { status: 400 });
  }

  return NextResponse.json({ ok: true, nextStatus: "READY_TO_DRAW" });
}
