import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, getAdminClient } from "@/lib/serverSupabase";
import { isAdminBypassEmail } from "@/lib/adminBypass";
import { loadAppleWeights, DEFAULT_APPLE_WEIGHTS, type AppleWeights } from "@/lib/rtp";
import type { SupabaseClient } from "@supabase/supabase-js";

type Result = "bronze" | "silver" | "gold" | "red" | "poison";

const BRONZE_STAGE_RATE = 0.7; // 70% of draws end immediately as bronze (物々交換)

async function addUpperRewardToken(client: SupabaseClient | null, amount = 1) {
  if (!client || amount <= 0) return;
  const { error } = await client.rpc("apple_reward_add_tokens", { amount });
  if (error) {
    console.error("Failed to add upper reward token", error);
  }
}

async function consumeUpperRewardToken(client: SupabaseClient | null): Promise<boolean> {
  if (!client) return false;
  const { data, error } = await client.rpc("apple_reward_consume_token");
  if (error) {
    console.error("Failed to consume upper reward token", error);
    return false;
  }
  return Boolean(data);
}

function pickUpperResult(weights: AppleWeights): Result {
  const upperWeight = Math.max(0, weights.silver + weights.gold + weights.red);
  if (upperWeight <= 0) {
    return "bronze";
  }
  const roll = Math.random() * upperWeight;
  if (roll <= weights.silver) {
    return "silver";
  }
  if (roll <= weights.silver + weights.gold) {
    return "gold";
  }
  return "red";
}

type DrawOutcome = {
  result: Result;
  tokensToAdd: number;
  tokensConsumed: number;
};

async function runStagedDraw(weights: AppleWeights, client: SupabaseClient | null): Promise<DrawOutcome> {
  const stageRoll = Math.random();
  if (stageRoll < BRONZE_STAGE_RATE) {
    return { result: "bronze", tokensToAdd: 0, tokensConsumed: 0 };
  }

  const poisonWeight = Math.max(0.0001, weights.poison);
  const upperWeight = Math.max(0, weights.silver + weights.gold + weights.red);
  const advancedTotal = poisonWeight + upperWeight;

  if (advancedTotal <= 0) {
    return { result: "bronze", tokensToAdd: 0, tokensConsumed: 0 };
  }

  const advancedRoll = Math.random() * advancedTotal;
  if (advancedRoll <= poisonWeight) {
    return { result: "poison", tokensToAdd: 1, tokensConsumed: 0 };
  }

  if (upperWeight <= 0) {
    return { result: "bronze", tokensToAdd: 0, tokensConsumed: 0 };
  }

  const hasToken = await consumeUpperRewardToken(client);
  if (!hasToken) {
    return { result: "bronze", tokensToAdd: 0, tokensConsumed: 0 };
  }

  return { result: pickUpperResult(weights), tokensToAdd: 0, tokensConsumed: 1 };
}

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

export async function POST(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if ("error" in auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const adminClient = getAdminClient();
  if (!adminClient) {
    return NextResponse.json({ error: "Service role key is not configured" }, { status: 500 });
  }

  let referralCount = 0;
  let userRecord: { status: string } | null = null;
  const { data: userData, error: userError } = await adminClient
    .from("users")
    .select("status, referral_count")
    .eq("id", auth.userId)
    .maybeSingle();

  if (userError) {
    const missingReferralColumn = userError.code === "42703" || (userError.message ?? "").includes("referral_count");
    if (!missingReferralColumn) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    const { data: fallbackData, error: fallbackError } = await adminClient
      .from("users")
      .select("status")
      .eq("id", auth.userId)
      .maybeSingle();
    if (fallbackError || !fallbackData) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    userRecord = fallbackData;
  } else if (userData) {
    userRecord = { status: userData.status };
    referralCount = typeof userData.referral_count === "number" ? userData.referral_count : 0;
  }

  if (!userRecord) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const bypass = isAdminBypassEmail(auth.email);

  if (!bypass && userRecord.status !== "READY_TO_DRAW") {
    return NextResponse.json({ error: "現在は抽選できません" }, { status: 400 });
  }

  const baseWeights = await loadAppleWeights(adminClient);
  const personalWeights = getPersonalWeights(baseWeights ?? DEFAULT_APPLE_WEIGHTS, referralCount);

  const now = Date.now();
  const revealAt = new Date(now + 60 * 60 * 1000).toISOString();
  const outcome = await runStagedDraw(personalWeights, adminClient);

  const {
    data: apple,
    error: appleError,
  } = await adminClient
    .from("apples")
    .insert({
      user_id: auth.userId,
      result: outcome.result,
      reveal_at: revealAt,
    })
    .select("id, reveal_at")
    .single();

  if (appleError || !apple) {
    if (outcome.tokensConsumed > 0) {
      await addUpperRewardToken(adminClient, outcome.tokensConsumed);
    }
    return NextResponse.json({ error: appleError?.message ?? "抽選の保存に失敗しました" }, { status: 500 });
  }

  if (outcome.tokensToAdd > 0) {
    await addUpperRewardToken(adminClient, outcome.tokensToAdd);
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
