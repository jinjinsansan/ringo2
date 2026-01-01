import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/serverSupabase";
import { fetchAuthUsers } from "@/lib/adminUsers";
import { buildDrawResultEmail, buildWishlistFulfilledEmail } from "@/lib/emailTemplates";
import { dispatchNotifications, type NotificationPayload } from "@/lib/notifications";

const cronSecret = process.env.CRON_SECRET;
const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://ringokai.app";

const RESULT_LABEL_MAP: Record<string, string> = {
  poison: "毒りんご",
  bronze: "ブロンズりんご",
  silver: "シルバーりんご",
  gold: "ゴールドりんご",
  red: "赤りんご",
};

function isAuthorized(req: NextRequest) {
  if (!cronSecret) return false;
  const header = req.headers.get("x-cron-secret");
  if (header && header === cronSecret) return true;
  const url = new URL(req.url);
  const querySecret = url.searchParams.get("secret");
  return querySecret === cronSecret;
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const adminClient = getAdminClient();
  if (!adminClient) {
    return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 });
  }

  const nowIso = new Date().toISOString();

  // Pending draw-result notifications
  const { data: apples } = await adminClient
    .from("apples")
    .select("id, user_id, result, reveal_at, result_email_sent_at")
    .not("result", "is", null)
    .is("result_email_sent_at", null)
    .lte("reveal_at", nowIso)
    .limit(50);

  const appleUserIds = apples?.map((apple) => apple.user_id).filter(Boolean) ?? [];

  // Pending wishlist fulfillment notifications
  const { data: assignments } = await adminClient
    .from("wishlist_assignments")
    .select("id, target_user_id, status, recipient_notified_at")
    .eq("status", "completed")
    .is("recipient_notified_at", null)
    .limit(50);

  const targetUserIds = assignments?.map((row) => row.target_user_id).filter(Boolean) ?? [];
  const userIds = Array.from(new Set([...appleUserIds, ...targetUserIds])) as string[];
  const authMap = await fetchAuthUsers(adminClient, userIds);

  const notificationPayloads: NotificationPayload[] = [];
  const applesToMark: string[] = [];
  const assignmentsToMark: string[] = [];

  if (apples?.length) {
    for (const apple of apples) {
      if (!apple.user_id || !apple.result) continue;
      const email = authMap.get(apple.user_id)?.email ?? null;
      const revealUrl = `${appUrl}/reveal/${apple.id}`;
      const template = buildDrawResultEmail({
        resultLabel: RESULT_LABEL_MAP[apple.result] ?? apple.result,
        revealUrl,
      });
      notificationPayloads.push({
        userId: apple.user_id,
        title: "抽選結果が出ました",
        body: `今回の結果は ${RESULT_LABEL_MAP[apple.result] ?? apple.result} でした。詳細は結果ページでご確認ください。`,
        category: "draw_result",
        metadata: { appleId: apple.id, result: apple.result },
        email: email
          ? {
              to: email,
              subject: template.subject,
              html: template.html,
              text: template.text,
            }
          : null,
      });
      applesToMark.push(apple.id);
    }
  }

  if (assignments?.length) {
    const wishlistMap = new Map<string, string | null>();
    if (targetUserIds.length > 0) {
      const { data: wishlists } = await adminClient
        .from("wishlists")
        .select("user_id, primary_item_name")
        .in("user_id", targetUserIds);
      for (const row of wishlists ?? []) {
        if (row.user_id) {
          wishlistMap.set(row.user_id, row.primary_item_name ?? null);
        }
      }
    }

    for (const assignment of assignments) {
      if (!assignment.target_user_id) continue;
      const email = authMap.get(assignment.target_user_id)?.email ?? null;
      const template = buildWishlistFulfilledEmail({
        wishlistName: wishlistMap.get(assignment.target_user_id),
        myPageUrl: `${appUrl}/my-page`,
      });
      notificationPayloads.push({
        userId: assignment.target_user_id,
        title: "あなたの欲しいものが購入されました",
        body: "発送情報はマイページでご確認ください。",
        category: "wishlist_fulfilled",
        metadata: { assignmentId: assignment.id },
        email: email
          ? {
              to: email,
              subject: template.subject,
              html: template.html,
              text: template.text,
            }
          : null,
      });
      assignmentsToMark.push(assignment.id);
    }
  }

  if (notificationPayloads.length) {
    try {
      await dispatchNotifications(adminClient, notificationPayloads);
    } catch (error) {
      console.error("Failed to dispatch notifications", error);
      return NextResponse.json({ error: "Failed to dispatch notifications" }, { status: 500 });
    }
  }

  if (applesToMark.length) {
    await adminClient
      .from("apples")
      .update({ result_email_sent_at: nowIso })
      .in("id", applesToMark);
  }

  if (assignmentsToMark.length) {
    await adminClient
      .from("wishlist_assignments")
      .update({ recipient_notified_at: nowIso })
      .in("id", assignmentsToMark);
  }

  return NextResponse.json({
    applesProcessed: apples?.length ?? 0,
    assignmentsProcessed: assignments?.length ?? 0,
  });
}
