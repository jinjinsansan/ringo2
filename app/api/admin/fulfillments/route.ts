import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, getAdminClient } from "@/lib/serverSupabase";
import { isAdminBypassEmail } from "@/lib/adminBypass";

export async function GET(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if ("error" in auth || !isAdminBypassEmail(auth.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const adminClient = getAdminClient();
  if (!adminClient) {
    return NextResponse.json({ error: "Service role key is not configured" }, { status: 500 });
  }

  const { data, error } = await adminClient
    .from("users")
    .select("id, status, wishlists(primary_item_name, item_price_jpy, primary_item_url)")
    .eq("status", "WAITING_FOR_FULFILLMENT")
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ queue: data ?? [] });
}

export async function POST(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if ("error" in auth || !isAdminBypassEmail(auth.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const adminClient = getAdminClient();
  if (!adminClient) {
    return NextResponse.json({ error: "Service role key is not configured" }, { status: 500 });
  }

  let body: { userId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  if (!body.userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }

  const { error } = await adminClient
    .from("users")
    .update({ status: "CYCLE_COMPLETE", can_use_ticket: true })
    .eq("id", body.userId)
    .eq("status", "WAITING_FOR_FULFILLMENT");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
