import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, getAdminClient } from "@/lib/serverSupabase";
import { isAdminBypassEmail } from "@/lib/adminBypass";

type Result = "bronze" | "silver" | "gold" | "red" | "poison";

const weights: { result: Result; weight: number }[] = [
  { result: "poison", weight: 50 },
  { result: "bronze", weight: 35 },
  { result: "silver", weight: 10 },
  { result: "gold", weight: 4.9 },
  { result: "red", weight: 0.1 },
];

function pickResult(): Result {
  const total = weights.reduce((sum, w) => sum + w.weight, 0);
  const r = Math.random() * total;
  let acc = 0;
  for (const w of weights) {
    acc += w.weight;
    if (r <= acc) return w.result;
  }
  return "poison";
}

export async function POST(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if ("error" in auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const adminClient = getAdminClient();
  if (!adminClient) {
    return NextResponse.json({ error: "Service role key is not configured" }, { status: 500 });
  }

  const { data: userRecord, error: userError } = await adminClient
    .from("users")
    .select("status")
    .eq("id", auth.userId)
    .single();

  if (userError || !userRecord) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const bypass = isAdminBypassEmail(auth.email);

  if (!bypass && userRecord.status !== "READY_TO_DRAW") {
    return NextResponse.json({ error: "現在は抽選できません" }, { status: 400 });
  }

  const now = Date.now();
  const revealAt = new Date(now + 60 * 60 * 1000).toISOString();
  const result = pickResult();

  const { data: apple, error: appleError } = await adminClient
    .from("apples")
    .insert({
      user_id: auth.userId,
      result,
      reveal_at: revealAt,
    })
    .select("id, reveal_at")
    .single();

  if (appleError || !apple) {
    return NextResponse.json({ error: appleError?.message ?? "抽選の保存に失敗しました" }, { status: 500 });
  }

  const { error: statusError } = await adminClient
    .from("users")
    .update({ status: "REVEALING" })
    .eq("id", auth.userId);

  if (statusError) {
    return NextResponse.json({ error: statusError.message }, { status: 500 });
  }

  return NextResponse.json({ appleId: apple.id, revealAt: apple.reveal_at });
}
