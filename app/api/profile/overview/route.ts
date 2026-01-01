import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, getAdminClient } from "@/lib/serverSupabase";
import { ensureReferralCode } from "@/lib/referrals";
import { listAllAuthUsers } from "@/lib/adminUsers";

export async function GET(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if ("error" in auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const adminClient = getAdminClient();
  if (!adminClient) {
    return NextResponse.json({ error: "Service role key is not configured" }, { status: 500 });
  }

  const userId = auth.userId;

  let supportsReferralCode = true;
  let referralCode: string | null = null;
  let referralCount = 0;
  let referralFriends: { id: string; status: string; joinedAt: string; wishlistUrl: string | null }[] = [];

  const [appleRes, purchaseRes, assignmentsRes, selfRes, winCountRes, purchaseCountRes] = await Promise.all([
    adminClient
      .from("apples")
      .select("id, result, reveal_at, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(10),
    adminClient
      .from("purchases")
      .select("id, status, created_at, screenshot_url, notes")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(5),
    adminClient
      .from("wishlist_assignments")
      .select("id, status, created_at, target_user_id")
      .eq("buyer_id", userId)
      .order("created_at", { ascending: false })
      .limit(5),
    adminClient.from("users").select("referral_code, referral_count").eq("id", userId).single(),
    adminClient
      .from("apples")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .neq("result", "poison"),
    adminClient.from("purchases").select("id", { count: "exact", head: true }).eq("user_id", userId),
  ]);

  if (appleRes.error) return NextResponse.json({ error: appleRes.error.message }, { status: 500 });
  if (purchaseRes.error) return NextResponse.json({ error: purchaseRes.error.message }, { status: 500 });
  if (assignmentsRes.error) return NextResponse.json({ error: assignmentsRes.error.message }, { status: 500 });

  if (selfRes.error) {
    const message = selfRes.error.message ?? "Failed to load referral data";
    const missingColumn =
      selfRes.error.code === "42703" || message.includes("referral_code") || message.includes("referral_count");
    if (!missingColumn) {
      return NextResponse.json({ error: message }, { status: 500 });
    }
  } else if (selfRes.data) {
    referralCode = selfRes.data.referral_code ?? null;
    referralCount = selfRes.data.referral_count ?? 0;
  }

  if (supportsReferralCode && !referralCode) {
    try {
      referralCode = (await ensureReferralCode(adminClient, userId)) ?? null;
    } catch {
      supportsReferralCode = false;
    }
  }

  if (supportsReferralCode) {
    const authUsers = await listAllAuthUsers(adminClient);
    const invitedAuthUsers = authUsers.filter((user) => user.user_metadata?.referred_by === userId);
    referralCount = invitedAuthUsers.length;
    const invitedIds = invitedAuthUsers.map((user) => user.id);
    if (invitedIds.length > 0) {
      const { data: invitedProfiles } = await adminClient
        .from("users")
        .select("id, status, created_at, wishlist_url")
        .in("id", invitedIds);
      referralFriends = (invitedProfiles ?? []).map((profile) => ({
        id: profile.id,
        status: profile.status,
        joinedAt: profile.created_at,
        wishlistUrl: profile.wishlist_url,
      }));
    }
  }

  const assignments = assignmentsRes.data ?? [];
  const targetIds = Array.from(new Set(assignments.map((a) => a.target_user_id).filter(Boolean)));
  let wishlistMap: Record<string, { primary_item_name: string | null; primary_item_url: string | null; item_price_jpy: number | null }> = {};

  if (targetIds.length > 0) {
    const { data: wishlists, error: wishlistError } = await adminClient
      .from("wishlists")
      .select("user_id, primary_item_name, primary_item_url, item_price_jpy")
      .in("user_id", targetIds);
    if (wishlistError) {
      return NextResponse.json({ error: wishlistError.message }, { status: 500 });
    }
    wishlistMap = Object.fromEntries((wishlists ?? []).map((w) => [w.user_id, w]));
  }

  const response = {
    referral: {
      code: supportsReferralCode ? referralCode : null,
      count: supportsReferralCode ? referralCount : 0,
      friends: supportsReferralCode ? referralFriends : [],
    },
    appleHistory: appleRes.data ?? [],
    purchaseHistory: purchaseRes.data ?? [],
    giftHistory: assignments.map((assignment) => ({
      ...assignment,
      wish: wishlistMap[assignment.target_user_id] ?? null,
    })),
    stats: {
      totalWins: winCountRes.count ?? 0,
      totalPurchases: purchaseCountRes.count ?? 0,
    },
  };

  return NextResponse.json(response);
}
