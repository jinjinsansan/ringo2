import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, getAdminClient } from "@/lib/serverSupabase";
import { isAdminBypassEmail } from "@/lib/adminBypass";
import { findAuthUserByEmail } from "@/lib/adminUsers";

const DEFAULT_TEST_EMAIL = "goldbenchan@gmail.com";
const ALLOWED_STATUSES = new Set([
  "AWAITING_TOS_AGREEMENT",
  "AWAITING_GUIDE_CHECK",
  "READY_TO_PURCHASE",
  "AWAITING_APPROVAL",
  "READY_TO_REGISTER_WISHLIST",
  "READY_TO_DRAW",
  "REVEALING",
  "WAITING_FOR_FULFILLMENT",
  "CYCLE_COMPLETE",
]);

export async function POST(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if ("error" in auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isAdminBypassEmail(auth.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const adminClient = getAdminClient();
  if (!adminClient) {
    return NextResponse.json({ error: "Service role key is not configured" }, { status: 500 });
  }

  let body: { email?: string; targetStatus?: string } = {};
  try {
    body = await req.json();
  } catch {
    // ignore, fallback to defaults
  }

  const requestedEmail = (body.email ?? DEFAULT_TEST_EMAIL).trim();
  if (!requestedEmail) {
    return NextResponse.json({ error: "email is required" }, { status: 400 });
  }

  const requestedStatus = typeof body.targetStatus === "string" ? body.targetStatus : "";
  const targetStatus = ALLOWED_STATUSES.has(requestedStatus) ? requestedStatus : "READY_TO_PURCHASE";

  const targetAuthUser = await findAuthUserByEmail(adminClient, requestedEmail);
  if (!targetAuthUser) {
    return NextResponse.json({ error: "User not found for given email" }, { status: 404 });
  }

  const targetUserId = targetAuthUser.id;
  const { data: userRow, error: userFetchError } = await adminClient
    .from("users")
    .select("id")
    .eq("id", targetUserId)
    .maybeSingle();

  if (userFetchError) {
    return NextResponse.json({ error: userFetchError.message }, { status: 500 });
  }

  if (!userRow) {
    return NextResponse.json({ error: "Application user record not found" }, { status: 404 });
  }

  const deleteAssignmentsAsBuyer = await adminClient
    .from("wishlist_assignments")
    .delete()
    .eq("buyer_id", targetUserId)
    .select("id");

  if (deleteAssignmentsAsBuyer.error) {
    return NextResponse.json({ error: deleteAssignmentsAsBuyer.error.message }, { status: 500 });
  }

  const deleteAssignmentsAsTarget = await adminClient
    .from("wishlist_assignments")
    .delete()
    .eq("target_user_id", targetUserId)
    .select("id");

  if (deleteAssignmentsAsTarget.error) {
    return NextResponse.json({ error: deleteAssignmentsAsTarget.error.message }, { status: 500 });
  }

  const assignmentsDeletedCount = (deleteAssignmentsAsBuyer.data?.length ?? 0) + (deleteAssignmentsAsTarget.data?.length ?? 0);

  const deletePurchases = await adminClient
    .from("purchases")
    .delete()
    .eq("user_id", targetUserId)
    .select("id");

  if (deletePurchases.error) {
    return NextResponse.json({ error: deletePurchases.error.message }, { status: 500 });
  }

  const deleteApples = await adminClient
    .from("apples")
    .delete()
    .eq("user_id", targetUserId)
    .select("id");

  if (deleteApples.error) {
    return NextResponse.json({ error: deleteApples.error.message }, { status: 500 });
  }

  const deleteEventsAsBuyer = await adminClient
    .from("fulfillment_events")
    .delete()
    .eq("buyer_id", targetUserId)
    .select("id");

  if (deleteEventsAsBuyer.error) {
    return NextResponse.json({ error: deleteEventsAsBuyer.error.message }, { status: 500 });
  }

  const deleteEventsAsRecipient = await adminClient
    .from("fulfillment_events")
    .delete()
    .eq("recipient_id", targetUserId)
    .select("id");

  if (deleteEventsAsRecipient.error) {
    return NextResponse.json({ error: deleteEventsAsRecipient.error.message }, { status: 500 });
  }

  const eventsDeletedCount = (deleteEventsAsBuyer.data?.length ?? 0) + (deleteEventsAsRecipient.data?.length ?? 0);

  const deleteWishlist = await adminClient
    .from("wishlists")
    .delete()
    .eq("user_id", targetUserId)
    .select("user_id");

  if (deleteWishlist.error) {
    return NextResponse.json({ error: deleteWishlist.error.message }, { status: 500 });
  }

  const { error: resetUserError } = await adminClient
    .from("users")
    .update({
      status: targetStatus,
      can_use_ticket: true,
      wishlist_url: null,
      exemption_tickets_bronze: 0,
      exemption_tickets_silver: 0,
      exemption_tickets_gold: 0,
      exemption_tickets_red: 0,
      total_exemption_tickets: 0,
    })
    .eq("id", targetUserId);

  if (resetUserError) {
    return NextResponse.json({ error: resetUserError.message }, { status: 500 });
  }

  return NextResponse.json({
    summary: {
      email: requestedEmail,
      userId: targetUserId,
      resetTo: targetStatus,
      deleted: {
        assignments: assignmentsDeletedCount,
        purchases: deletePurchases.data?.length ?? 0,
        apples: deleteApples.data?.length ?? 0,
        fulfillmentEvents: eventsDeletedCount,
        wishlists: deleteWishlist.data?.length ?? 0,
      },
    },
  });
}
