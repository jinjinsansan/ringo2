import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, getAdminClient } from "@/lib/serverSupabase";
import { isAdminBypassEmail } from "@/lib/adminBypass";

type WishlistPayload = {
  wishlistUrl?: string;
  primaryItemName?: string;
  primaryItemUrl?: string;
  itemPrice?: number | null;
  budgetMin?: number | null;
  budgetMax?: number | null;
  note?: string;
};

const URL_PATTERN = /^https?:\/\//i;

const toBudgetValue = (value: unknown) => {
  if (typeof value !== "number") return null;
  if (!Number.isFinite(value) || value < 0) return null;
  return Math.round(value);
};

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

  const [userResult, wishlistResult] = await Promise.all([
    adminClient
      .from("users")
      .select("status, wishlist_url")
      .eq("id", userId)
      .single(),
    adminClient
      .from("wishlists")
      .select("primary_item_name, primary_item_url, budget_min, budget_max, note, item_price_jpy")
      .eq("user_id", userId)
      .maybeSingle(),
  ]);

  if (userResult.error || !userResult.data) {
    return NextResponse.json({ error: "User record not found" }, { status: 404 });
  }

  if (wishlistResult.error && wishlistResult.error.code !== "PGRST116") {
    return NextResponse.json({ error: wishlistResult.error.message }, { status: 500 });
  }

  return NextResponse.json({
    status: userResult.data.status,
    wishlistUrl: userResult.data.wishlist_url,
    wishlist: wishlistResult.data ?? null,
  });
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

  let body: WishlistPayload;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const wishlistUrl = body.wishlistUrl?.trim();
  if (!wishlistUrl || !URL_PATTERN.test(wishlistUrl)) {
    return NextResponse.json({ error: "有効なAmazon欲しいものリストURLを入力してください" }, { status: 400 });
  }

  const primaryItemName = body.primaryItemName?.trim();
  if (!primaryItemName) {
    return NextResponse.json({ error: "購入候補の商品名を入力してください" }, { status: 400 });
  }

  if (body.primaryItemUrl && body.primaryItemUrl.trim().length > 0 && !URL_PATTERN.test(body.primaryItemUrl)) {
    return NextResponse.json({ error: "商品のURLが正しくありません" }, { status: 400 });
  }

  const price = typeof body.itemPrice === "number" ? Math.round(body.itemPrice) : null;
  if (!price || price < 3000 || price > 4000) {
    return NextResponse.json({ error: "商品の価格は3,000〜4,000円の間で入力してください" }, { status: 400 });
  }

  const payload = {
    primary_item_name: primaryItemName,
    primary_item_url: body.primaryItemUrl?.trim() || null,
    budget_min: toBudgetValue(body.budgetMin ?? null),
    budget_max: toBudgetValue(body.budgetMax ?? null),
    note: body.note?.trim() || null,
    user_id: auth.userId,
    item_price_jpy: price,
  };

  const userResult = await adminClient
    .from("users")
    .select("status")
    .eq("id", auth.userId)
    .single();

  if (userResult.error || !userResult.data) {
    return NextResponse.json({ error: "User record not found" }, { status: 404 });
  }

  const { error: wishlistError } = await adminClient
    .from("wishlists")
    .upsert(payload, { onConflict: "user_id" });

  if (wishlistError) {
    return NextResponse.json({ error: wishlistError.message }, { status: 500 });
  }

  const userUpdates: Record<string, unknown> = {
    wishlist_url: wishlistUrl,
  };

  const bypass = isAdminBypassEmail(auth.email);
  const nextStatus = bypass
    ? "READY_TO_DRAW"
    : userResult.data.status === "READY_TO_REGISTER_WISHLIST"
        ? "READY_TO_DRAW"
        : userResult.data.status;

  if (nextStatus !== userResult.data.status) {
    userUpdates.status = nextStatus;
  }

  const { error: userUpdateError } = await adminClient
    .from("users")
    .update(userUpdates)
    .eq("id", auth.userId);

  if (userUpdateError) {
    return NextResponse.json({ error: userUpdateError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, status: nextStatus });
}
