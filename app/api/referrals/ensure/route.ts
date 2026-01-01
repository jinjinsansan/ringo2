import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, getAdminClient } from "@/lib/serverSupabase";
import { ensureReferralCode } from "@/lib/referrals";

export async function POST(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if ("error" in auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const adminClient = getAdminClient();
  if (!adminClient) {
    return NextResponse.json({ error: "Service role key is not configured" }, { status: 500 });
  }

  try {
    const referralCode = await ensureReferralCode(adminClient, auth.userId);
    if (!referralCode) {
      return NextResponse.json({ error: "Failed to generate referral code" }, { status: 500 });
    }
    return NextResponse.json({ referralCode });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate referral code" },
      { status: 500 }
    );
  }
}
