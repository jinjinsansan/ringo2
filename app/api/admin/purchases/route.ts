import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const adminSecret = process.env.ADMIN_SECRET;
const screenshotBucket = process.env.SUPABASE_SCREENSHOT_BUCKET;

if (!supabaseUrl) {
  throw new Error("NEXT_PUBLIC_SUPABASE_URL is not set");
}

const adminClient = serviceRoleKey
  ? createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  : null;

function checkAuth(req: Request) {
  const headerSecret = req.headers.get("x-admin-secret");
  if (!adminSecret || !headerSecret || headerSecret !== adminSecret) {
    return false;
  }
  return true;
}

export async function GET(req: Request) {
  if (!adminClient) {
    return NextResponse.json(
      { error: "Service role key is not configured" },
      { status: 500 }
    );
  }
  if (!checkAuth(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await adminClient
    .from("purchases")
    .select(
      `id, user_id, screenshot_url, status, created_at, notes,
      users(status, wishlist_url, wishlists(item_price_jpy, primary_item_name, primary_item_url))`
    )
    .eq("status", "submitted")
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const purchasesWithUrls = await Promise.all(
    (data ?? []).map(async (purchase) => {
      if (screenshotBucket && purchase.screenshot_url && !purchase.screenshot_url.startsWith("http")) {
        const { data: signed, error: signedError } = await adminClient.storage
          .from(screenshotBucket)
          .createSignedUrl(purchase.screenshot_url, 60 * 60 * 24);
        if (!signedError && signed?.signedUrl) {
          return { ...purchase, screenshot_url: signed.signedUrl };
        }
      }
      return purchase;
    })
  );

  return NextResponse.json({ purchases: purchasesWithUrls });
}

export async function POST(req: Request) {
  if (!adminClient) {
    return NextResponse.json(
      { error: "Service role key is not configured" },
      { status: 500 }
    );
  }
  if (!checkAuth(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { purchaseId, action, userId } = await req.json();
  if (!purchaseId || !action || !userId) {
    return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
  }

  const nextPurchaseStatus = action === "approve" ? "approved" : "rejected";
  const nextUserStatus =
    action === "approve" ? "READY_TO_REGISTER_WISHLIST" : "READY_TO_PURCHASE";

  const { error: purchaseError } = await adminClient
    .from("purchases")
    .update({ status: nextPurchaseStatus })
    .eq("id", purchaseId);

  if (purchaseError) {
    return NextResponse.json({ error: purchaseError.message }, { status: 500 });
  }

  const { error: userError } = await adminClient
    .from("users")
    .update({ status: nextUserStatus })
    .eq("id", userId);

  if (userError) {
    return NextResponse.json({ error: userError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
