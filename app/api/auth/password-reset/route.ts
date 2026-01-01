import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/serverSupabase";
import { buildPasswordResetEmail } from "@/lib/emailTemplates";
import { sendEmailViaResend } from "@/lib/resendClient";

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://ringokai.app";

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    const normalized = typeof email === "string" ? email.trim().toLowerCase() : "";

    if (!normalized) {
      return NextResponse.json({ error: "メールアドレスを入力してください" }, { status: 400 });
    }

    const adminClient = getAdminClient();
    if (!adminClient) {
      return NextResponse.json({ error: "Server is not configured" }, { status: 500 });
    }

    const { data, error } = await adminClient.auth.admin.generateLink({
      type: "recovery",
      email: normalized,
      options: {
        redirectTo: `${appUrl}/login`,
      },
    });

    if (error || !data?.properties?.action_link) {
      // 不要な情報漏洩を避けるため、成功レスポンスを返す
      return NextResponse.json({ ok: true });
    }

    const template = buildPasswordResetEmail(data.properties.action_link);
    await sendEmailViaResend({
      to: normalized,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Password reset API error", error);
    return NextResponse.json({ error: "サーバーエラーが発生しました" }, { status: 500 });
  }
}
