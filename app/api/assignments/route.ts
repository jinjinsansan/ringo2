import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, getAdminClient } from "@/lib/serverSupabase";
import type { SupabaseClient } from "@supabase/supabase-js";

const ACTIVE_ASSIGNMENT_STATUSES = ["pending", "submitted"];
const TARGETABLE_USER_STATUSES = [
  "WAITING_FOR_FULFILLMENT",
  "READY_TO_DRAW",
  "READY_TO_REGISTER_WISHLIST",
  "CYCLE_COMPLETE",
];
const BUYER_ELIGIBLE_STATUSES = ["READY_TO_PURCHASE", "AWAITING_APPROVAL"];

type AssignmentRow = {
  id: string;
  buyer_id: string;
  target_user_id: string;
  status: string;
  purchase_id: string | null;
};

type AssignmentDetail = {
  id: string;
  status: string;
  purchaseId: string | null;
  target: {
    userId: string;
    maskedId: string;
    wishlistUrl: string | null;
    status: string;
    details: {
      primary_item_name: string | null;
      primary_item_url: string | null;
      budget_min: number | null;
      budget_max: number | null;
      note: string | null;
      item_price_jpy: number;
    } | null;
  };
};

const maskIdentifier = (id: string) => `${id.slice(0, 4)}••••${id.slice(-4)}`;

async function fetchAssignmentDetail(adminClient: SupabaseClient, row: AssignmentRow): Promise<AssignmentDetail | null> {
  const [targetUserResult, wishlistResult] = await Promise.all([
    adminClient
      .from("users")
      .select("id, wishlist_url, status")
      .eq("id", row.target_user_id)
      .maybeSingle(),
    adminClient
      .from("wishlists")
      .select("primary_item_name, primary_item_url, budget_min, budget_max, note, item_price_jpy")
      .eq("user_id", row.target_user_id)
      .maybeSingle(),
  ]);

  if (targetUserResult.error || !targetUserResult.data) {
    return null;
  }

  return {
    id: row.id,
    status: row.status,
    purchaseId: row.purchase_id,
    target: {
      userId: targetUserResult.data.id,
      maskedId: maskIdentifier(targetUserResult.data.id),
      wishlistUrl: targetUserResult.data.wishlist_url,
      status: targetUserResult.data.status,
      details: wishlistResult.data ?? null,
    },
  };
}

async function findActiveAssignment(adminClient: SupabaseClient, userId: string) {
  const { data, error } = await adminClient
    .from("wishlist_assignments")
    .select("id, buyer_id, target_user_id, status, purchase_id")
    .eq("buyer_id", userId)
    .in("status", ACTIVE_ASSIGNMENT_STATUSES);

  if (error) {
    throw new Error(error.message);
  }

  if (!data || data.length === 0) {
    return null;
  }

  // there should only be one active assignment thanks to constraint, take the first
  const detail = await fetchAssignmentDetail(adminClient, data[0]);
  return detail;
}

async function pickNextTarget(adminClient: SupabaseClient, userId: string) {
  const [candidatesResult, takenResult] = await Promise.all([
    adminClient
      .from("users")
      .select("id, wishlist_url, status, wishlists!inner(item_price_jpy)")
      .in("status", TARGETABLE_USER_STATUSES)
      .not("wishlist_url", "is", null)
      .neq("id", userId),
    adminClient
      .from("wishlist_assignments")
      .select("target_user_id, status")
      .in("status", ACTIVE_ASSIGNMENT_STATUSES),
  ]);

  if (candidatesResult.error) {
    throw new Error(candidatesResult.error.message);
  }

  if (takenResult.error) {
    throw new Error(takenResult.error.message);
  }

  const takenIds = new Set((takenResult.data ?? []).map((row: { target_user_id: string }) => row.target_user_id));

  const priority: Record<string, number> = {
    WAITING_FOR_FULFILLMENT: 0,
    READY_TO_DRAW: 1,
    READY_TO_REGISTER_WISHLIST: 2,
    CYCLE_COMPLETE: 3,
  };

  const available = (candidatesResult.data ?? [])
    .filter((candidate: { id: string; status: string }) => !takenIds.has(candidate.id))
    .sort((a: { status: string }, b: { status: string }) => {
      const left = priority[a.status] ?? 99;
      const right = priority[b.status] ?? 99;
      return left - right;
    });

  return available[0] ?? null;
}

async function createAssignment(adminClient: SupabaseClient, buyerId: string, targetUserId: string) {
  const { data, error } = await adminClient
    .from("wishlist_assignments")
    .insert({ buyer_id: buyerId, target_user_id: targetUserId })
    .select("id, buyer_id, target_user_id, status, purchase_id")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "割当を作成できませんでした");
  }

  return fetchAssignmentDetail(adminClient, data as AssignmentRow);
}

export async function GET(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if ("error" in auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const adminClient = getAdminClient();
  if (!adminClient) {
    return NextResponse.json({ error: "Service role key is not configured" }, { status: 500 });
  }

  const userResult = await adminClient
    .from("users")
    .select("status")
    .eq("id", auth.userId)
    .single();

  if (userResult.error || !userResult.data) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const currentStatus = userResult.data.status;
  try {
    const existing = await findActiveAssignment(adminClient, auth.userId);
    if (existing) {
      return NextResponse.json({ assignment: existing });
    }
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "割当状況の取得に失敗しました" },
      { status: 500 }
    );
  }

  if (!BUYER_ELIGIBLE_STATUSES.includes(currentStatus)) {
    return NextResponse.json({ error: "現在割当は必要ありません" }, { status: 403 });
  }

  let target: { id: string } | null = null;
  try {
    target = await pickNextTarget(adminClient, auth.userId);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "割当候補の取得に失敗しました" },
      { status: 500 }
    );
  }

  if (!target) {
    return NextResponse.json({ error: "割当可能な欲しいものリストがありません" }, { status: 404 });
  }

  try {
    const created = await createAssignment(adminClient, auth.userId, target.id);
    if (!created) {
      return NextResponse.json({ error: "割当を作成できませんでした" }, { status: 500 });
    }
    return NextResponse.json({ assignment: created });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "割当作成に失敗しました" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if ("error" in auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const adminClient = getAdminClient();
  if (!adminClient) {
    return NextResponse.json({ error: "Service role key is not configured" }, { status: 500 });
  }

  let body: { assignmentId?: string; purchaseId?: string; status?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  if (!body.assignmentId) {
    return NextResponse.json({ error: "assignmentId is required" }, { status: 400 });
  }

  const assignmentResult = await adminClient
    .from("wishlist_assignments")
    .select("id, buyer_id, status")
    .eq("id", body.assignmentId)
    .single();

  if (assignmentResult.error || !assignmentResult.data) {
    return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
  }

  if (assignmentResult.data.buyer_id !== auth.userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (assignmentResult.data.status !== "pending") {
    return NextResponse.json({ error: "この割当は更新済みです" }, { status: 400 });
  }

  if (body.status && body.status !== "submitted") {
    return NextResponse.json({ error: "status must be 'submitted'" }, { status: 400 });
  }

  const updates: Record<string, unknown> = {
    status: "submitted",
    submitted_at: new Date().toISOString(),
  };

  if (body.purchaseId) {
    updates.purchase_id = body.purchaseId;
  }

  const { error } = await adminClient
    .from("wishlist_assignments")
    .update(updates)
    .eq("id", body.assignmentId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
