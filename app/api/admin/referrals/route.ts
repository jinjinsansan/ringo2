import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, getAdminClient } from "@/lib/serverSupabase";
import { fetchAuthUserMap } from "@/lib/adminUsers";
import { isAdminBypassEmail } from "@/lib/adminBypass";

export async function GET(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if ("error" in auth || !isAdminBypassEmail(auth.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const adminClient = getAdminClient();
  if (!adminClient) {
    return NextResponse.json({ error: "Service role key is not configured" }, { status: 500 });
  }

  const [summaryRes, rankingRes, authMap] = await Promise.all([
    adminClient.rpc("referral_summary"),
    adminClient
      .from("users")
      .select("id, referral_count, created_at, status")
      .order("referral_count", { ascending: false })
      .limit(100),
    fetchAuthUserMap(adminClient),
  ]);

  if (summaryRes.error) {
    return NextResponse.json({ error: summaryRes.error.message }, { status: 500 });
  }
  if (rankingRes.error) {
    return NextResponse.json({ error: rankingRes.error.message }, { status: 500 });
  }

  const totalReferrals = summaryRes.data?.[0]?.total_referrals ?? 0;
  const averageReferrals = Number(summaryRes.data?.[0]?.average_referrals ?? 0);

  const ranking = (rankingRes.data ?? []).map((row, index) => {
    const authInfo = authMap.get(row.id);
    return {
      rank: index + 1,
      id: row.id,
      email: authInfo?.email ?? null,
      referralCount: row.referral_count ?? 0,
      createdAt: row.created_at,
      status: row.status,
    };
  });

  return NextResponse.json({
    totalReferrals,
    averageReferrals: Number(averageReferrals.toFixed(2)),
    ranking,
    generatedAt: new Date().toISOString(),
  });
}
