import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, getAdminClient } from "@/lib/serverSupabase";
import { fetchAuthUserMap } from "@/lib/adminUsers";
import { loadAppleWeights, computeRtpPercentage } from "@/lib/rtp";
import { isAdminBypassEmail } from "@/lib/adminBypass";

const STATUS_ORDER = [
  "AWAITING_TOS_AGREEMENT",
  "AWAITING_GUIDE_CHECK",
  "READY_TO_PURCHASE",
  "AWAITING_APPROVAL",
  "READY_TO_REGISTER_WISHLIST",
  "READY_TO_DRAW",
  "REVEALING",
  "WAITING_FOR_FULFILLMENT",
  "CYCLE_COMPLETE",
];

export async function GET(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if ("error" in auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isAdminBypassEmail(auth.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const adminClient = getAdminClient();
  if (!adminClient) {
    return NextResponse.json({ error: "Service role key is not configured" }, { status: 500 });
  }

  const [{ data: usersData, error: usersError, count: totalUsers }, pendingPurchaseRes, weights] = await Promise.all([
    adminClient
      .from("users")
      .select("id, status, created_at", { count: "exact" })
      .order("created_at", { ascending: true }),
    adminClient
      .from("purchases")
      .select("id", { count: "exact", head: true })
      .eq("status", "submitted"),
    loadAppleWeights(adminClient),
  ]);

  if (usersError) {
    return NextResponse.json({ error: usersError.message }, { status: 500 });
  }

  const pendingScreenshots = pendingPurchaseRes.count ?? 0;

  const authMap = await fetchAuthUserMap(adminClient);
  const now = Date.now();
  const activeUsers24h = Array.from(authMap.values()).filter((entry) => {
    if (!entry.lastSignInAt) return false;
    const ts = Date.parse(entry.lastSignInAt);
    if (Number.isNaN(ts)) return false;
    return now - ts <= 24 * 60 * 60 * 1000;
  }).length;

  const statusSummary: Record<string, number> = {};
  const users = (usersData ?? []).map((user) => {
    statusSummary[user.status] = (statusSummary[user.status] ?? 0) + 1;
    const authInfo = authMap.get(user.id);
    return {
      id: user.id,
      email: authInfo?.email ?? null,
      status: user.status,
      createdAt: user.created_at,
      lastLoginAt: authInfo?.lastSignInAt ?? null,
    };
  });

  const sortedUsers = users.sort((a, b) => {
    const aIdx = STATUS_ORDER.indexOf(a.status);
    const bIdx = STATUS_ORDER.indexOf(b.status);
    if (aIdx !== bIdx) {
      return aIdx - bIdx;
    }
    return (new Date(b.createdAt).getTime() || 0) - (new Date(a.createdAt).getTime() || 0);
  });

  return NextResponse.json({
    kpis: {
      totalUsers: totalUsers ?? users.length,
      activeUsers24h,
      pendingScreenshots,
      currentRtp: Number(computeRtpPercentage(weights).toFixed(2)),
      weights,
    },
    statusSummary,
    users: sortedUsers,
    generatedAt: new Date().toISOString(),
  });
}
