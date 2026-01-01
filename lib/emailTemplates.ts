const brandColor = "#FF8FA3";
const textColor = "#5C4033";

type BaseTemplateOptions = {
  title: string;
  body: string;
  ctaLabel?: string;
  ctaUrl?: string;
  footerNote?: string;
};

function baseHtmlTemplate({ title, body, ctaLabel, ctaUrl, footerNote }: BaseTemplateOptions) {
  const buttonHtml = ctaLabel && ctaUrl
    ? `<tr>
        <td align="center" style="padding:24px 0 0;">
          <a href="${ctaUrl}" style="display:inline-block;padding:12px 32px;border-radius:999px;background:${brandColor};color:#fff;font-weight:600;text-decoration:none;">
            ${ctaLabel}
          </a>
        </td>
      </tr>`
    : "";

  const footer = footerNote
    ? `<p style="color:#9E7E73;font-size:12px;margin:32px 0 0;text-align:center;">${footerNote}</p>`
    : "";

  return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title}</title>
</head>
<body style="background:#FFF7FA;margin:0;padding:32px 0;font-family:'Noto Sans JP',Arial,sans-serif;color:${textColor};">
  <table cellpadding="0" cellspacing="0" width="100%">
    <tr>
      <td align="center">
        <table cellpadding="0" cellspacing="0" width="560" style="background:#ffffff;border-radius:32px;padding:32px;box-shadow:0 15px 35px rgba(255,143,163,0.15);">
          <tr>
            <td align="center" style="padding-bottom:16px;">
              <span style="font-size:40px;display:block;">🍎</span>
              <h1 style="font-size:22px;margin:12px 0 4px;color:${textColor};">${title}</h1>
            </td>
          </tr>
          <tr>
            <td style="font-size:14px;line-height:1.8;color:${textColor};white-space:pre-line;">
              ${body}
            </td>
          </tr>
          ${buttonHtml}
          <tr>
            <td>${footer}</td>
          </tr>
        </table>
        <p style="font-size:12px;color:#9E7E73;margin-top:16px;">りんご会♪ / https://ringokai.app</p>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function baseTextTemplate({ title, body, ctaLabel, ctaUrl, footerNote }: BaseTemplateOptions) {
  let text = `${title}\n\n${body}\n`;
  if (ctaLabel && ctaUrl) {
    text += `\n${ctaLabel}: ${ctaUrl}\n`;
  }
  if (footerNote) {
    text += `\n${footerNote}`;
  }
  text += "\n\nりんご会♪";
  return text;
}

type TemplateResult = { subject: string; html: string; text: string };

export function buildSignupEmail(verificationUrl: string): TemplateResult {
  const title = "メールアドレスのご確認";
  const body = "りんご会♪への仮登録ありがとうございます。\n下のボタンからメールアドレスを確認すると、サービスを利用開始できます。\nリンクの有効期限は 24 時間です。";
  return {
    subject: "【りんご会♪】メールアドレス確認のお願い",
    html: baseHtmlTemplate({ title, body, ctaLabel: "メールアドレスを確認", ctaUrl: verificationUrl, footerNote: "このメールに心当たりがない場合は破棄してください。" }),
    text: baseTextTemplate({ title, body, ctaLabel: "メールアドレスを確認", ctaUrl: verificationUrl, footerNote: "本メールに心当たりがない場合は破棄してください。" }),
  };
}

export function buildPasswordResetEmail(resetUrl: string): TemplateResult {
  const title = "パスワード再設定のご案内";
  const body = "パスワード再設定のリクエストを受け付けました。\n以下のボタンから 60 分以内に新しいパスワードを設定してください。";
  return {
    subject: "【りんご会♪】パスワード再設定リンク",
    html: baseHtmlTemplate({ title, body, ctaLabel: "パスワードを再設定", ctaUrl: resetUrl, footerNote: "心当たりがない場合は本メールを破棄してください。" }),
    text: baseTextTemplate({ title, body, ctaLabel: "パスワードを再設定", ctaUrl: resetUrl, footerNote: "心当たりがない場合は本メールを破棄してください。" }),
  };
}

export function buildDrawResultEmail(params: { resultLabel: string; revealUrl: string }): TemplateResult {
  const title = "抽選結果が確定しました";
  const body = `演出が完了し、今回のりんごは「${params.resultLabel}」でした。\n下のボタンから結果画面を開き、次のステップへ進んでください。`;
  return {
    subject: `【りんご会♪】抽選結果: ${params.resultLabel}`,
    html: baseHtmlTemplate({ title, body, ctaLabel: "結果を確認する", ctaUrl: params.revealUrl }),
    text: baseTextTemplate({ title, body, ctaLabel: "結果を確認する", ctaUrl: params.revealUrl }),
  };
}

export function buildWishlistFulfilledEmail(params: { wishlistName?: string | null; myPageUrl: string }): TemplateResult {
  const title = "あなたの欲しいものが購入されました";
  const displayName = params.wishlistName ? `「${params.wishlistName}」` : "あなたのリスト";
  const body = `${displayName} が誰かによって購入されました。\n発送状況や次のステップはマイページから確認してください。`;
  return {
    subject: "【りんご会♪】プレゼントが購入されました",
    html: baseHtmlTemplate({ title, body, ctaLabel: "マイページで確認", ctaUrl: params.myPageUrl }),
    text: baseTextTemplate({ title, body, ctaLabel: "マイページで確認", ctaUrl: params.myPageUrl }),
  };
}

export function buildNewsletterEmail(params: { title: string; htmlBody: string; previewText?: string }): TemplateResult {
  const title = params.title;
  const base = baseHtmlTemplate({
    title,
    body: params.htmlBody,
    footerNote: "このメールはりんご会♪からのお知らせです。",
  });
  const text = `${params.title}\n\n${params.previewText ?? ""}`;
  return {
    subject: params.title,
    html: base,
    text,
  };
}

export function buildGenericNotificationEmail(params: { title: string; body: string; ctaLabel?: string; ctaUrl?: string }): TemplateResult {
  return {
    subject: params.title,
    html: baseHtmlTemplate({ title: params.title, body: params.body, ctaLabel: params.ctaLabel, ctaUrl: params.ctaUrl }),
    text: baseTextTemplate({ title: params.title, body: params.body, ctaLabel: params.ctaLabel, ctaUrl: params.ctaUrl }),
  };
}
