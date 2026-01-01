import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, getAdminClient } from "@/lib/serverSupabase";

export async function GET(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if ("error" in auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const adminClient = getAdminClient();
  if (!adminClient) {
    return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 });
  }

  const url = new URL(req.url);
  const limit = Math.max(1, Math.min(100, Number(url.searchParams.get("limit")) || 20));
  const cursor = url.searchParams.get("cursor");

  let query = adminClient
    .from("notifications")
    .select("id, title, body, category, metadata, created_at, read_at")
    .eq("user_id", auth.userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (cursor) {
    query = query.lt("created_at", cursor);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { count: unreadCount } = await adminClient
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", auth.userId)
    .is("read_at", null);

  const nextCursor = data && data.length === limit ? data[data.length - 1].created_at : null;

  return NextResponse.json({
    notifications: data ?? [],
    unreadCount: unreadCount ?? 0,
    nextCursor,
  });
}
