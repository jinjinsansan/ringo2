import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/serverSupabase";
import { buildSignupEmail } from "@/lib/emailTemplates";
import { sendEmailViaResend } from "@/lib/resendClient";

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://ringokai.app";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: "メールアドレスとパスワードを入力してください" }, { status: 400 });
    }

    const adminClient = getAdminClient();
    if (!adminClient) {
      return NextResponse.json({ error: "Server is not configured" }, { status: 500 });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const redirectTo = `${appUrl}/login`;
    const { data, error } = await adminClient.auth.admin.generateLink({
      type: "signup",
      email: normalizedEmail,
      password,
      options: {
        redirectTo,
      },
    });

    if (error || !data?.properties?.action_link) {
      return NextResponse.json({ error: error?.message ?? "リンクの発行に失敗しました" }, { status: 400 });
    }

    const userId = data.user?.id;
    if (userId) {
      await adminClient.from("users").upsert({ id: userId });
    }

    const emailTemplate = buildSignupEmail(data.properties.action_link);
    await sendEmailViaResend({
      to: normalizedEmail,
      subject: emailTemplate.subject,
      html: emailTemplate.html,
      text: emailTemplate.text,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Signup API error", error);
    return NextResponse.json({ error: "サーバーエラーが発生しました" }, { status: 500 });
  }
}
