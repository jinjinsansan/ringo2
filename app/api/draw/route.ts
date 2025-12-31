import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, getAdminClient } from "@/lib/serverSupabase";
import { isAdminBypassEmail } from "@/lib/adminBypass";
import { loadAppleWeights, DEFAULT_APPLE_WEIGHTS, type AppleWeights } from "@/lib/rtp";

type Result = "bronze" | "silver" | "gold" | "red" | "poison";

function getPersonalWeights(base: AppleWeights, referralCount: number | null | undefined): AppleWeights {
  const count = typeof referralCount === "number" && referralCount > 0 ? referralCount : 0;
  if (!count) return { ...base };

  const reduction = Math.min(20, count * 1.5);
  const redistributed = reduction;
  return {
    poison: Math.max(15, base.poison - reduction),
    bronze: base.bronze + redistributed * 0.5,
    silver: base.silver + redistributed * 0.25,
    gold: base.gold + redistributed * 0.2,
    red: base.red + redistributed * 0.05,
  };
}

function pickResult(weightMap: AppleWeights): Result {
  const entries = Object.entries(weightMap) as [Result, number][];
  const total = entries.reduce((sum, [, weight]) => sum + weight, 0);
  const r = Math.random() * total;
  let acc = 0;
  for (const [result, weight] of entries) {
    acc += weight;
    if (r <= acc) return result;
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
    .select("status, referral_count")
    .eq("id", auth.userId)
    .single();

  if (userError || !userRecord) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const bypass = isAdminBypassEmail(auth.email);

  if (!bypass && userRecord.status !== "READY_TO_DRAW") {
    return NextResponse.json({ error: "現在は抽選できません" }, { status: 400 });
  }

  const referralCount = typeof userRecord.referral_count === "number" ? userRecord.referral_count : 0;

  const baseWeights = await loadAppleWeights(adminClient);

  const now = Date.now();
  const revealAt = new Date(now + 60 * 60 * 1000).toISOString();
  const result = pickResult(getPersonalWeights(baseWeights ?? DEFAULT_APPLE_WEIGHTS, referralCount));

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
