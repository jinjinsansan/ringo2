import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, getAdminClient } from "@/lib/serverSupabase";
import { isAdminBypassEmail } from "@/lib/adminBypass";
import { fetchAuthUsers } from "@/lib/adminUsers";
import { buildWishlistFulfilledEmail } from "@/lib/emailTemplates";
import { dispatchNotifications } from "@/lib/notifications";

const screenshotBucket = process.env.SUPABASE_SCREENSHOT_BUCKET;
const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://ringokai.app";
export async function GET(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if ("error" in auth || !isAdminBypassEmail(auth.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const adminClient = getAdminClient();
  if (!adminClient) {
    return NextResponse.json(
      { error: "Service role key is not configured" },
      { status: 500 }
    );
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

  const purchaseIds = purchasesWithUrls.map((purchase) => purchase.id);
  const assignmentsResult = purchaseIds.length
    ? await adminClient
        .from("wishlist_assignments")
        .select("id, purchase_id, buyer_id, target_user_id, status")
        .in("purchase_id", purchaseIds)
    : { data: [], error: null };

  if (assignmentsResult.error) {
    return NextResponse.json({ error: assignmentsResult.error.message }, { status: 500 });
  }

  const assignmentMap = new Map<string, (typeof assignmentsResult.data)[number]>();
  for (const row of assignmentsResult.data ?? []) {
    if (row.purchase_id) {
      assignmentMap.set(row.purchase_id, row);
    }
  }

  const targetIds = Array.from(new Set((assignmentsResult.data ?? []).map((row) => row.target_user_id).filter(Boolean)));

  const [targetUsersResult, targetWishlistsResult] = targetIds.length
    ? await Promise.all([
        adminClient
          .from("users")
          .select("id, status, wishlist_url")
          .in("id", targetIds),
        adminClient
          .from("wishlists")
          .select("user_id, primary_item_name, primary_item_url, item_price_jpy")
          .in("user_id", targetIds),
      ])
    : [{ data: [], error: null }, { data: [], error: null }];

  if (targetUsersResult.error || targetWishlistsResult.error) {
    return NextResponse.json({ error: targetUsersResult.error?.message ?? targetWishlistsResult.error?.message ?? "Failed to load target details" }, { status: 500 });
  }

  const targetUserMap = new Map<string, (typeof targetUsersResult.data)[number]>();
  for (const user of targetUsersResult.data ?? []) {
    targetUserMap.set(user.id, user);
  }

  const wishlistMap = new Map<string, (typeof targetWishlistsResult.data)[number]>();
  for (const wishlist of targetWishlistsResult.data ?? []) {
    if (wishlist.user_id) {
      wishlistMap.set(wishlist.user_id, wishlist);
    }
  }

  const authUserIds = Array.from(
    new Set([
      ...purchasesWithUrls.map((purchase) => purchase.user_id),
      ...targetIds,
    ])
  );
  const authMap = await fetchAuthUsers(adminClient, authUserIds);

  const enriched = purchasesWithUrls.map((purchase) => {
    const assignment = assignmentMap.get(purchase.id);
    const targetUser = assignment?.target_user_id ? targetUserMap.get(assignment.target_user_id) : null;
    const targetWishlist = assignment?.target_user_id ? wishlistMap.get(assignment.target_user_id) : null;

    return {
      ...purchase,
      buyerAuth: authMap.get(purchase.user_id) ?? null,
      assignment: assignment
        ? {
            id: assignment.id,
            status: assignment.status,
            targetUser: targetUser
              ? {
                  id: targetUser.id,
                  status: targetUser.status,
                  wishlist_url: targetUser.wishlist_url,
                  email: authMap.get(targetUser.id)?.email ?? null,
                  wishlist: targetWishlist ?? null,
                }
              : null,
          }
        : null,
    };
  });

  return NextResponse.json({ purchases: enriched });
}

export async function POST(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if ("error" in auth || !isAdminBypassEmail(auth.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const adminClient = getAdminClient();
  if (!adminClient) {
    return NextResponse.json(
      { error: "Service role key is not configured" },
      { status: 500 }
    );
  }

  const { purchaseId, action, userId } = await req.json();
  if (!purchaseId || !action || !userId) {
    return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
  }

  if (!["approve", "reject"].includes(action)) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  const purchaseResult = await adminClient
    .from("purchases")
    .select("id, user_id, status, screenshot_url, notes, created_at")
    .eq("id", purchaseId)
    .maybeSingle();

  if (purchaseResult.error || !purchaseResult.data) {
    return NextResponse.json({ error: purchaseResult.error?.message ?? "Purchase not found" }, { status: 404 });
  }

  if (purchaseResult.data.user_id !== userId) {
    return NextResponse.json({ error: "User mismatch" }, { status: 400 });
  }

  if (purchaseResult.data.status !== "submitted") {
    return NextResponse.json({ error: "This purchase has already been processed" }, { status: 400 });
  }

  const nextPurchaseStatus = action === "approve" ? "approved" : "rejected";
  const nextUserStatus =
    action === "approve" ? "READY_TO_REGISTER_WISHLIST" : "READY_TO_PURCHASE";

  const { error: purchaseError } = await adminClient
    .from("purchases")
    .update({ status: nextPurchaseStatus })
    .eq("id", purchaseId)
    .eq("status", "submitted");

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

  const assignmentResult = await adminClient
    .from("wishlist_assignments")
    .select("id, status, buyer_id, target_user_id")
    .eq("purchase_id", purchaseId)
    .maybeSingle();

  if (assignmentResult.error) {
    return NextResponse.json({ error: assignmentResult.error.message }, { status: 500 });
  }

  if (assignmentResult.data) {
    if (action === "approve") {
      await adminClient
        .from("wishlist_assignments")
        .update({ status: "completed", completed_at: new Date().toISOString() })
        .eq("id", assignmentResult.data.id);

      if (assignmentResult.data.target_user_id) {
        await adminClient
          .from("users")
          .update({ status: "CYCLE_COMPLETE", can_use_ticket: true })
          .eq("id", assignmentResult.data.target_user_id)
          .eq("status", "WAITING_FOR_FULFILLMENT");

        const targetUserId = assignmentResult.data.target_user_id;
        const [{ data: wishlist }] = await Promise.all([
          adminClient
            .from("wishlists")
            .select("primary_item_name")
            .eq("user_id", targetUserId)
            .maybeSingle(),
        ]);

        const authMap = await fetchAuthUsers(adminClient, [targetUserId]);
        const targetEmail = authMap.get(targetUserId)?.email ?? null;
        const template = buildWishlistFulfilledEmail({
          wishlistName: wishlist?.primary_item_name ?? null,
          myPageUrl: `${appUrl}/my-page`,
        });

        await dispatchNotifications(adminClient, [
          {
            userId: targetUserId,
            title: "あなたの欲しいものが購入されました",
            body: "発送状況はマイページでご確認ください。",
            category: "wishlist_fulfilled",
            metadata: { assignmentId: assignmentResult.data.id, purchaseId },
            email: targetEmail
              ? {
                  to: targetEmail,
                  subject: template.subject,
                  html: template.html,
                  text: template.text,
                }
              : null,
          },
        ]);

        await adminClient
          .from("wishlist_assignments")
          .update({ recipient_notified_at: new Date().toISOString() })
          .eq("id", assignmentResult.data.id);
      }
    } else {
      await adminClient
        .from("wishlist_assignments")
        .update({ status: "pending", purchase_id: null, submitted_at: null, completed_at: null })
        .eq("id", assignmentResult.data.id);
    }
  }

  await adminClient.from("fulfillment_events").insert({
    purchase_id: purchaseId,
    assignment_id: assignmentResult.data?.id ?? null,
    buyer_id: purchaseResult.data.user_id,
    recipient_id: assignmentResult.data?.target_user_id ?? null,
    status: action === "approve" ? "completed" : "rejected",
    screenshot_url: purchaseResult.data.screenshot_url,
    buyer_notes: purchaseResult.data.notes ?? null,
    purchase_created_at: purchaseResult.data.created_at,
  });

  return NextResponse.json({ ok: true });
}
