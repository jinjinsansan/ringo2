import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, getAdminClient } from "@/lib/serverSupabase";
import { isAdminBypassEmail } from "@/lib/adminBypass";
import { listAllAuthUsers } from "@/lib/adminUsers";
import { buildNewsletterEmail } from "@/lib/emailTemplates";
import { dispatchNotifications } from "@/lib/notifications";
import { stripHtmlToPlainText } from "@/lib/text";

export async function GET(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if ("error" in auth || !isAdminBypassEmail(auth.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const adminClient = getAdminClient();
  if (!adminClient) {
    return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 });
  }

  const { data, error } = await adminClient
    .from("newsletters")
    .select("id, title, preview_text, body, sent_at, recipient_count, sent_by_email")
    .order("sent_at", { ascending: false })
    .limit(50);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ newsletters: data ?? [] });
}

export async function POST(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if ("error" in auth || !isAdminBypassEmail(auth.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const adminClient = getAdminClient();
  if (!adminClient) {
    return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 });
  }

  const { title, body, previewText } = await req.json();
  if (!title || !body) {
    return NextResponse.json({ error: "タイトルと本文を入力してください" }, { status: 400 });
  }

  const { data: inserted, error: insertError } = await adminClient
    .from("newsletters")
    .insert({
      title,
      body,
      preview_text: previewText ?? null,
      sent_by: auth.userId,
      sent_by_email: auth.email ?? null,
    })
    .select("id")
    .single();

  if (insertError || !inserted) {
    return NextResponse.json({ error: insertError?.message ?? "配信を作成できませんでした" }, { status: 500 });
  }

  const authUsers = await listAllAuthUsers(adminClient);
  const recipients = authUsers.filter((user) => user.email);
  const template = buildNewsletterEmail({ title, htmlBody: body, previewText });
  const plainBody = stripHtmlToPlainText(body);
  const notificationBody = [previewText?.trim(), plainBody].filter(Boolean).join("\n\n") || "新しいお知らせが届いています。";

  const sendResults = await dispatchNotifications(
    adminClient,
    recipients.map((user) => ({
      userId: user.id,
      title,
      body: notificationBody,
      category: "newsletter",
      metadata: { newsletterId: inserted.id, newsletterHtml: body, previewText: previewText ?? null },
      email: {
        to: user.email as string,
        subject: template.subject,
        html: template.html,
        text: template.text,
      },
    }))
  );

  await adminClient
    .from("newsletters")
    .update({ recipient_count: recipients.length, sent_at: new Date().toISOString() })
    .eq("id", inserted.id);

  return NextResponse.json({ ok: true, newsletterId: inserted.id, recipients: recipients.length, sendResults });
}
