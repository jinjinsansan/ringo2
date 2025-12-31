import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, getAdminClient } from "@/lib/serverSupabase";

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

  const [appleRes, purchaseRes, assignmentsRes, selfRes, referralRes, winCountRes, purchaseCountRes] = await Promise.all([
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
      .from("users")
      .select("id, status, created_at, wishlist_url")
      .eq("referred_by", userId)
      .order("created_at", { ascending: false })
      .limit(10),
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
  if (selfRes.error || !selfRes.data) return NextResponse.json({ error: selfRes.error?.message ?? "User not found" }, { status: 500 });
  if (referralRes.error) return NextResponse.json({ error: referralRes.error.message }, { status: 500 });

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
      code: selfRes.data.referral_code,
      count: selfRes.data.referral_count ?? 0,
      friends: (referralRes.data ?? []).map((friend) => ({
        id: friend.id,
        status: friend.status,
        joinedAt: friend.created_at,
        wishlistUrl: friend.wishlist_url,
      })),
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
