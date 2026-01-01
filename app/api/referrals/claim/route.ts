import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, getAdminClient } from "@/lib/serverSupabase";
import { decodeReferralCodeToUserId, ensureReferralCode, findUserIdByReferralCode } from "@/lib/referrals";

export async function POST(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if ("error" in auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const adminClient = getAdminClient();
  if (!adminClient) {
    return NextResponse.json({ error: "Service role key is not configured" }, { status: 500 });
  }

  let body: { referralCode?: string } = {};
  try {
    body = (await req.json()) ?? {};
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const code = body.referralCode?.trim();
  if (!code) {
    return NextResponse.json({ error: "紹介コードが指定されていません" }, { status: 400 });
  }

  let inviterId = decodeReferralCodeToUserId(code);
  if (!inviterId) {
    inviterId = await findUserIdByReferralCode(adminClient, code);
  }

  if (!inviterId) {
    return NextResponse.json({ error: "紹介コードが見つかりません" }, { status: 404 });
  }

  if (inviterId === auth.userId) {
    return NextResponse.json({ error: "自分のコードは使用できません" }, { status: 400 });
  }

  try {
    const { data: targetUser, error: targetError } = await adminClient.auth.admin.getUserById(auth.userId);
    if (targetError || !targetUser?.user) {
      throw targetError ?? new Error("対象ユーザーが見つかりません");
    }

    if (targetUser.user.user_metadata?.referred_by) {
      return NextResponse.json({ error: "すでに紹介コードが適用されています" }, { status: 400 });
    }

    await adminClient.auth.admin.updateUserById(auth.userId, {
      user_metadata: {
        ...(targetUser.user.user_metadata ?? {}),
        referred_by: inviterId,
      },
    });

    // Ensure inviter has a referral code generated for share consistency
    await ensureReferralCode(adminClient, inviterId);

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "紹介コードの適用に失敗しました" },
      { status: 500 }
    );
  }
}
