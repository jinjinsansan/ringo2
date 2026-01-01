import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, getAdminClient } from "@/lib/serverSupabase";
import { isAdminBypassEmail } from "@/lib/adminBypass";
import { fetchAuthUsers } from "@/lib/adminUsers";

const screenshotBucket = process.env.SUPABASE_SCREENSHOT_BUCKET;

export async function GET(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if ("error" in auth || !isAdminBypassEmail(auth.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const adminClient = getAdminClient();
  if (!adminClient) {
    return NextResponse.json({ error: "Service role key is not configured" }, { status: 500 });
  }

  const url = new URL(req.url);
  const rawLimit = Number(url.searchParams.get("limit") ?? "50");
  const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(rawLimit, 1), 200) : 50;

  const { data, error } = await adminClient
    .from("fulfillment_events")
    .select("id, purchase_id, assignment_id, buyer_id, recipient_id, status, screenshot_url, buyer_notes, purchase_created_at, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const recipientIds = Array.from(new Set((data ?? []).map((event) => event.recipient_id).filter(Boolean)));
  let recipientUsers: { id: string; status: string; wishlist_url: string | null }[] = [];
  let recipientWishlists: { user_id: string; primary_item_name: string | null; primary_item_url: string | null; item_price_jpy: number | null }[] = [];

  if (recipientIds.length) {
    const [recipientUsersResult, recipientWishlistsResult] = await Promise.all([
      adminClient
        .from("users")
        .select("id, status, wishlist_url")
        .in("id", recipientIds),
      adminClient
        .from("wishlists")
        .select("user_id, primary_item_name, primary_item_url, item_price_jpy")
        .in("user_id", recipientIds),
    ]);

    if (recipientUsersResult.error || recipientWishlistsResult.error) {
      return NextResponse.json({ error: recipientUsersResult.error?.message ?? recipientWishlistsResult.error?.message ?? "Failed to load recipient details" }, { status: 500 });
    }

    recipientUsers = recipientUsersResult.data ?? [];
    recipientWishlists = recipientWishlistsResult.data ?? [];
  }

  const recipientUserMap = new Map(recipientUsers.map((user) => [user.id, user]));
  const recipientWishlistMap = new Map(recipientWishlists.map((wishlist) => [wishlist.user_id, wishlist]));

  const authUserIds = Array.from(
    new Set(
      (data ?? [])
        .flatMap((event) => [event.buyer_id, event.recipient_id])
        .filter((value): value is string => Boolean(value))
    )
  );
  const authMap = await fetchAuthUsers(adminClient, authUserIds);

  const events = await Promise.all(
    (data ?? []).map(async (event) => {
      let signedScreenshot = event.screenshot_url;
      if (screenshotBucket && signedScreenshot && !signedScreenshot.startsWith("http")) {
        const { data: signed, error: signedError } = await adminClient.storage
          .from(screenshotBucket)
          .createSignedUrl(signedScreenshot, 60 * 60 * 24);
        if (!signedError && signed?.signedUrl) {
          signedScreenshot = signed.signedUrl;
        }
      }

      const recipient = event.recipient_id ? recipientUserMap.get(event.recipient_id) : null;
      const recipientWishlist = event.recipient_id ? recipientWishlistMap.get(event.recipient_id) : null;

      return {
        id: event.id,
        status: event.status,
        createdAt: event.created_at,
        purchaseId: event.purchase_id,
        purchaseCreatedAt: event.purchase_created_at,
        screenshotUrl: signedScreenshot,
        buyerNotes: event.buyer_notes,
        buyer: event.buyer_id
          ? {
              id: event.buyer_id,
              email: authMap.get(event.buyer_id)?.email ?? null,
            }
          : null,
        recipient: recipient
          ? {
              id: recipient.id,
              email: recipient.id ? authMap.get(recipient.id)?.email ?? null : null,
              status: recipient.status,
              wishlistUrl: recipient.wishlist_url,
              wishlist: recipientWishlist ?? null,
            }
          : null,
      };
    })
  );

  return NextResponse.json({ events });
}
