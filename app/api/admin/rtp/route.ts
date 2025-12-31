import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getAdminClient } from "@/lib/serverSupabase";
import { loadAppleWeights, computeRtpPercentage, APPLE_RESULT_ORDER, WEIGHT_KEY_MAP, type AppleWeights } from "@/lib/rtp";

const ticketRewards: Record<string, number> = {
  bronze: 0,
  silver: 2,
  gold: 3,
  red: 5,
  poison: 0,
};

function isAuthorized(req: NextRequest) {
  const adminSecret = process.env.ADMIN_SECRET;
  const headerSecret = req.headers.get("x-admin-secret");
  return Boolean(adminSecret && headerSecret && adminSecret === headerSecret);
}

async function fetchResultCounts(adminClient: SupabaseClient | null) {
  if (!adminClient) return null;

  const counts: Record<string, number> = {};
  await Promise.all(
    APPLE_RESULT_ORDER.map(async (result) => {
      const { count } = await adminClient
        .from("apples")
        .select("id", { count: "exact", head: true })
        .eq("result", result);
      counts[result] = count ?? 0;
    })
  );
  return counts;
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const adminClient = getAdminClient();
  if (!adminClient) {
    return NextResponse.json({ error: "Service role key is not configured" }, { status: 500 });
  }

  const [weights, counts] = await Promise.all([loadAppleWeights(adminClient), fetchResultCounts(adminClient)]);

  const poisonCount = counts?.poison ?? 0;
  const totalTickets = (counts?.silver ?? 0) * ticketRewards.silver + (counts?.gold ?? 0) * ticketRewards.gold + (counts?.red ?? 0) * ticketRewards.red;
  const ratio = poisonCount > 0 ? totalTickets / poisonCount : 0;
  const healthStatus = poisonCount === 0 ? "neutral" : ratio < 0.9 || ratio > 1.1 ? "warning" : "normal";

  return NextResponse.json({
    weights,
    currentRtp: Number(computeRtpPercentage(weights).toFixed(2)),
    health: {
      status: healthStatus,
      poisonCount,
      totalTicketRewards: totalTickets,
      ratio,
    },
  });
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const adminClient = getAdminClient();
  if (!adminClient) {
    return NextResponse.json({ error: "Service role key is not configured" }, { status: 500 });
  }

  let payload: { weights?: Partial<AppleWeights> };
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  if (!payload.weights) {
    return NextResponse.json({ error: "weights is required" }, { status: 400 });
  }

  const sanitized: AppleWeights = {
    poison: Number(payload.weights.poison),
    bronze: Number(payload.weights.bronze),
    silver: Number(payload.weights.silver),
    gold: Number(payload.weights.gold),
    red: Number(payload.weights.red),
  };

  for (const key of APPLE_RESULT_ORDER) {
    if (!Number.isFinite(sanitized[key]) || sanitized[key] <= 0) {
      return NextResponse.json({ error: "全ての確率を正の数値で入力してください" }, { status: 400 });
    }
  }

  const total = Object.values(sanitized).reduce((sum, value) => sum + value, 0);
  if (Math.abs(total - 100) > 0.01) {
    return NextResponse.json({ error: "確率の合計が100%になるように調整してください" }, { status: 400 });
  }

  const descriptions: Record<keyof AppleWeights, string> = {
    poison: "Base probability weight for poison apple",
    bronze: "Base probability weight for bronze apple",
    silver: "Base probability weight for silver apple",
    gold: "Base probability weight for gold apple",
    red: "Base probability weight for red apple",
  };

  const rows = APPLE_RESULT_ORDER.map((result) => ({
    key: WEIGHT_KEY_MAP[result],
    value: String(sanitized[result]),
    description: descriptions[result],
  }));

  const { error } = await adminClient.from("system_settings").upsert(rows, { onConflict: "key" });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const [weights, counts] = await Promise.all([loadAppleWeights(adminClient), fetchResultCounts(adminClient)]);
  const poisonCount = counts?.poison ?? 0;
  const totalTickets = (counts?.silver ?? 0) * ticketRewards.silver + (counts?.gold ?? 0) * ticketRewards.gold + (counts?.red ?? 0) * ticketRewards.red;
  const ratio = poisonCount > 0 ? totalTickets / poisonCount : 0;
  const healthStatus = poisonCount === 0 ? "neutral" : ratio < 0.9 || ratio > 1.1 ? "warning" : "normal";

  return NextResponse.json({
    weights,
    currentRtp: Number(computeRtpPercentage(weights).toFixed(2)),
    health: {
      status: healthStatus,
      poisonCount,
      totalTicketRewards: totalTickets,
      ratio,
    },
  });
}
