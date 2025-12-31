import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, getAdminClient } from "@/lib/serverSupabase";

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

  const { data, error } = await adminClient.rpc("claim_referral_bonus", {
    new_user_id: auth.userId,
    ref_code: code,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: "紹介コードを適用できませんでした" }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
