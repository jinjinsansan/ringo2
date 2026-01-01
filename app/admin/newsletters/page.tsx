"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type NewsletterHistory = {
  id: string;
  title: string;
  preview_text: string | null;
  body: string;
  sent_at: string;
  recipient_count: number;
  sent_by_email: string | null;
};

type SendResult = {
  userId: string;
  notificationId: string;
  email?: {
    to: string | string[];
    messageId?: string | null;
  };
};

export default function AdminNewslettersPage() {
  const [title, setTitle] = useState("");
  const [previewText, setPreviewText] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [sendResults, setSendResults] = useState<SendResult[]>([]);
  const [history, setHistory] = useState<NewsletterHistory[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);

  const fetchHistory = useCallback(async () => {
    setHistoryLoading(true);
    setHistoryError(null);
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.access_token) {
      setHistoryLoading(false);
      setHistoryError("管理者としてログインしてください");
      return;
    }

    try {
      const res = await fetch("/api/admin/newsletters", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const body = await res.json().catch(() => ({ error: "履歴の取得に失敗しました" }));
      if (!res.ok) {
        setHistoryError(body.error ?? "履歴の取得に失敗しました");
        return;
      }
      setHistory(body.newsletters ?? []);
    } catch (error) {
      setHistoryError(error instanceof Error ? error.message : "履歴の取得に失敗しました");
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchHistory();
  }, [fetchHistory]);

  const handleSend = useCallback(async () => {
    setStatusMessage(null);
    if (!title || !body) {
      setStatusMessage("タイトルと本文を入力してください");
      return;
    }

    setSending(true);
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.access_token) {
      setSending(false);
      setStatusMessage("管理者としてログインしてください");
      return;
    }

    try {
      const res = await fetch("/api/admin/newsletters", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ title, previewText, body }),
      });
      const responseBody = await res.json().catch(() => ({ error: "送信に失敗しました" }));
      if (!res.ok) {
        setStatusMessage(responseBody.error ?? "送信に失敗しました");
        setSendResults([]);
      } else {
        setStatusMessage(`送信しました (対象 ${responseBody.recipients ?? 0} 名)`);
        setTitle("");
        setPreviewText("");
        setBody("");
        setSendResults(responseBody.sendResults ?? []);
        await fetchHistory();
      }
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "送信に失敗しました");
      setSendResults([]);
    } finally {
      setSending(false);
    }
  }, [title, previewText, body, fetchHistory]);

  return (
    <div className="min-h-screen bg-[#FDF7FA] px-4 py-16 text-[#5C4033]">
      <div className="mx-auto w-full max-w-4xl space-y-8">
        <header className="rounded-3xl bg-white/90 border border-white p-6 shadow-md">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#FF8FA3]">Newsletter</p>
          <h1 className="mt-2 font-heading text-3xl text-[#5C4033]">メルマガ配信センター</h1>
          <p className="text-sm text-[#5C4033]/70 mt-2">全ユーザーに一斉メールを送ると同時に、マイページのお知らせにも保存されます。</p>
        </header>

        <section className="rounded-3xl border border-[#FFE4EC] bg-white/90 p-6 shadow-md space-y-4">
          <div>
            <label className="text-xs font-bold text-[#FF8FA3] uppercase tracking-[0.3em]">タイトル</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-2 w-full rounded-2xl border border-[#FFD1DC] bg-white/70 px-4 py-3 text-sm outline-none focus:border-[#FF8FA3] focus:ring-4 focus:ring-[#FF8FA3]/20"
              placeholder="例: 2月のアップデートのお知らせ"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-[#FF8FA3] uppercase tracking-[0.3em]">プレビュー本文 (任意)</label>
            <input
              type="text"
              value={previewText}
              onChange={(e) => setPreviewText(e.target.value)}
              className="mt-2 w-full rounded-2xl border border-[#FFD1DC] bg-white/70 px-4 py-3 text-sm outline-none focus:border-[#FF8FA3] focus:ring-4 focus:ring-[#FF8FA3]/20"
              placeholder="受信トレイに表示される短い説明"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-[#FF8FA3] uppercase tracking-[0.3em]">本文 (HTML 可)</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="mt-2 h-56 w-full rounded-2xl border border-[#FFD1DC] bg-white/70 px-4 py-3 text-sm outline-none focus:border-[#FF8FA3] focus:ring-4 focus:ring-[#FF8FA3]/20"
              placeholder="<p>本文を入力してください</p>"
            />
            <p className="mt-2 text-xs text-[#5C4033]/60">HTML を直接入力できます。シンプルな段落とリンクのみを推奨します。</p>
          </div>
          {statusMessage && (
            <div className="rounded-2xl border border-[#FFD1DC] bg-[#FFF5F7] px-4 py-3 text-sm text-[#5C4033]">
              {statusMessage}
            </div>
          )}
          {sendResults.length > 0 && (
            <div className="rounded-2xl border border-[#FFD1DC] bg-white/80 px-4 py-3 text-xs text-[#5C4033] space-y-2">
              <p className="font-semibold text-[#FF5C8D]">直近の送信ログ</p>
              <p className="text-[#5C4033]/70">
                Resend ダッシュボードで message ID を検索すると配信状況を確認できます。
              </p>
              <div className="max-h-48 overflow-y-auto space-y-2">
                {sendResults.map((result) => {
                  const to = Array.isArray(result.email?.to) ? result.email?.to.join(", ") : result.email?.to ?? "--";
                  return (
                    <div key={result.notificationId} className="rounded-2xl border border-[#FFE4EC] bg-white/70 px-3 py-2">
                      <p className="font-semibold text-[#5C4033]">{to}</p>
                      <p className="text-[11px] text-[#5C4033]/60">
                        message ID: {result.email?.messageId ?? "送信処理中"}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          <button
            onClick={() => void handleSend()}
            disabled={sending}
            className="rounded-full bg-[#FF8FA3] px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:shadow-lg disabled:opacity-60"
          >
            {sending ? "送信中..." : "全員に送信"}
          </button>
        </section>

        <section className="rounded-3xl border border-white bg-white/90 p-6 shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-[#FF8FA3] uppercase tracking-[0.3em]">History</p>
              <h2 className="font-heading text-2xl text-[#5C4033]">配信履歴</h2>
            </div>
            <button
              onClick={() => void fetchHistory()}
              className="rounded-full border border-[#FFD1DC] px-4 py-2 text-xs font-bold text-[#5C4033]/80"
            >
              再読み込み
            </button>
          </div>
          {historyLoading ? (
            <p className="mt-4 text-sm text-[#5C4033]/70">読み込み中...</p>
          ) : historyError ? (
            <p className="mt-4 rounded-2xl border border-red-100 bg-red-50/70 p-3 text-sm text-red-700">{historyError}</p>
          ) : history.length === 0 ? (
            <p className="mt-4 text-sm text-[#5C4033]/60">まだ配信履歴がありません。</p>
          ) : (
            <div className="mt-6 space-y-4">
              {history.map((item) => (
                <div key={item.id} className="rounded-2xl border border-[#FFD1DC] bg-white/80 p-4">
                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <p className="font-heading text-lg text-[#5C4033]">{item.title}</p>
                    <p className="text-xs text-[#5C4033]/50">
                      {new Date(item.sent_at).toLocaleString("ja-JP", { hour12: false })}
                    </p>
                  </div>
                  <p className="mt-1 text-xs text-[#5C4033]/60">送信数: {item.recipient_count} / 送信者: {item.sent_by_email ?? "不明"}</p>
                  {item.preview_text && <p className="mt-2 text-sm text-[#5C4033]">{item.preview_text}</p>}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
