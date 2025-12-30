"use client";

import { useCallback, useEffect, useState } from "react";
import { FlowGuard } from "@/components/FlowGuard";
import { supabase } from "@/lib/supabaseClient";
import { useUser } from "@/context/UserContext";

type Assignment = {
  id: string;
  status: string;
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
    } | null;
  };
};

export default function PurchaseSubmitPage() {
  const { refresh } = useUser();
  const formatBudget = (value?: number | null) =>
    typeof value === "number" ? value.toLocaleString() : "-";
  const [screenshotUrl, setScreenshotUrl] = useState("");
  const [note, setNote] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [assignmentState, setAssignmentState] = useState<"loading" | "ready" | "empty" | "error">("loading");
  const [assignmentError, setAssignmentError] = useState("");

  const fetchAssignment = useCallback(async () => {
    setAssignmentState("loading");
    setAssignmentError("");
    setAssignment(null);

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      setAssignmentState("error");
      setAssignmentError("ログインが必要です");
      return;
    }

    const res = await fetch("/api/assignments", {
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({ error: "割当を取得できませんでした" }));
      setAssignmentState(res.status === 404 ? "empty" : "error");
      setAssignmentError(data.error || "割当を取得できませんでした");
      return;
    }

    const data = await res.json();
    setAssignment(data.assignment as Assignment);
    setAssignmentState("ready");
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      void fetchAssignment();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchAssignment]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setStatus("loading");
    setMessage("");

    if (!assignment) {
      setStatus("error");
      setMessage("割当先が決定してから提出してください");
      return;
    }

    // auth セッション取得
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session?.user) {
      setStatus("error");
      setMessage("ログインが必要です");
      return;
    }

    const userId = session.user.id;

    // purchases へ挿入（status=submitted）
    const { data: insertedPurchase, error: insertError } = await supabase
      .from("purchases")
      .insert({
        user_id: userId,
        screenshot_url: screenshotUrl || null,
        notes: note || null,
        status: "submitted",
      })
      .select("id")
      .single();

    if (insertError || !insertedPurchase) {
      setStatus("error");
      setMessage(insertError?.message ?? "提出に失敗しました");
      return;
    }

    const assignmentUpdate = await fetch("/api/assignments", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ assignmentId: assignment.id, purchaseId: insertedPurchase.id, status: "submitted" }),
    });

    if (!assignmentUpdate.ok) {
      const data = await assignmentUpdate.json().catch(() => ({ error: "割当の更新に失敗しました" }));
      setStatus("error");
      setMessage(data.error || "割当の更新に失敗しました");
      return;
    }

    // ユーザーステータスを AWAITING_APPROVAL へ更新
    const { error: updateError } = await supabase
      .from("users")
      .update({ status: "AWAITING_APPROVAL" })
      .eq("id", userId);

    if (updateError) {
      setStatus("error");
      setMessage(updateError.message ?? "ステータス更新に失敗しました");
      return;
    }

    await refresh();
    setStatus("success");
    setMessage("提出しました。承認をお待ちください。");
    setScreenshotUrl("");
    setNote("");
    await fetchAssignment();
  };

  return (
    <FlowGuard requiredStatus="READY_TO_PURCHASE" fallback="/">
      <div className="min-h-screen flex items-center justify-center py-12 px-4 relative overflow-hidden">
        {/* Background Decor */}
        <div className="absolute top-20 left-10 w-32 h-32 bg-[#FFD1DC] rounded-full mix-blend-multiply filter blur-xl opacity-60 animate-float" />
        <div className="absolute bottom-20 right-10 w-40 h-40 bg-[#FFFDD0] rounded-full mix-blend-multiply filter blur-xl opacity-60 animate-float" style={{ animationDelay: "1.5s" }} />

        <div className="glass-card w-full max-w-2xl p-8 md:p-12 rounded-[32px] shadow-2xl relative z-10 animate-fade-up border-2 border-white space-y-8">
          <div className="text-center mb-8">
            <span className="text-4xl mb-4 block">📸</span>
            <h1 className="font-heading text-2xl md:text-3xl font-bold text-[#5D4037]">スクリーンショット提出</h1>
            <p className="text-[#5D4037]/70 mt-3 text-sm leading-relaxed">
              購入が完了したら、証拠画像をアップロードしましょう。<br />
              運営が確認した後、りんごを引くことができます！
            </p>
          </div>

          <section className="rounded-3xl border border-[#FFD1DC] bg-white/70 p-6 shadow-inner">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-bold text-[#FF8FA3] uppercase tracking-widest">ASSIGNMENT</p>
                {assignmentState === "ready" && assignment ? (
                  <>
                    <p className="font-heading text-xl text-[#5D4037] mt-2">
                      {assignment.target.maskedId} さんのリスト
                    </p>
                    <p className="text-sm text-[#5D4037]/70 mt-1">
                      この方の欲しいものリストから、指定の商品を購入してください。
                    </p>
                  </>
                ) : assignmentState === "loading" ? (
                  <p className="text-sm text-[#5D4037]/60 mt-2">割当を確認しています...</p>
                ) : assignmentState === "empty" ? (
                  <p className="text-sm text-[#5D4037]/60 mt-2">
                    現在割当可能なリストがありません。少し時間を置いて再度お試しください。
                  </p>
                ) : (
                  <p className="text-sm text-red-600 mt-2">{assignmentError || "割当を取得できませんでした"}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => void fetchAssignment()}
                className="whitespace-nowrap rounded-full border border-[#FFC0CB] px-4 py-2 text-sm font-semibold text-[#FF8FA3] hover:bg-[#FFF5F7] disabled:opacity-50"
                disabled={assignmentState === "loading"}
              >
                再取得
              </button>
            </div>

            {assignmentState === "ready" && assignment && (
              <div className="mt-5 space-y-4 text-sm text-[#5D4037]">
                <div className="bg-[#FFF5F7] border border-[#FFD1DC] rounded-2xl px-4 py-3">
                  <p className="font-bold text-[#5D4037]/80 text-xs">リストURL</p>
                  {assignment.target.wishlistUrl ? (
                    <a
                      href={assignment.target.wishlistUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[#a34a5d] underline break-all"
                    >
                      {assignment.target.wishlistUrl}
                    </a>
                  ) : (
                    <p className="text-[#5D4037]/70">URLが未登録です。管理者に連絡してください。</p>
                  )}
                </div>

                <div className="bg-white/80 border border-white rounded-2xl px-4 py-3">
                  <p className="font-bold text-[#5D4037]/80 text-xs">優先アイテム</p>
                  <p className="text-lg font-heading text-[#5D4037]">
                    {assignment.target.details?.primary_item_name ?? "未入力"}
                  </p>
                  {assignment.target.details?.primary_item_url && (
                    <a
                      href={assignment.target.details.primary_item_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[#a34a5d] underline text-xs"
                    >
                      商品ページを開く
                    </a>
                  )}
                </div>

                <div className="bg-white/80 border border-white rounded-2xl px-4 py-3 text-xs text-[#5D4037]/80">
                  <div className="flex flex-wrap gap-4">
                    <div>
                      <p className="font-bold uppercase text-[#FF8FA3] tracking-widest">Budget</p>
                  <p className="text-base text-[#5D4037] mt-1">
                    {assignment.target.details?.budget_min != null || assignment.target.details?.budget_max != null
                      ? `${formatBudget(assignment.target.details?.budget_min)} 〜 ${formatBudget(assignment.target.details?.budget_max)} 円`
                      : "指定なし"}
                  </p>
                    </div>
                    {assignment.target.details?.note && (
                      <div className="flex-1 min-w-[200px]">
                        <p className="font-bold uppercase text-[#FF8FA3] tracking-widest">Note</p>
                        <p className="text-[#5D4037] mt-1 whitespace-pre-wrap">
                          {assignment.target.details.note}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </section>

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label className="block text-sm font-bold text-[#5D4037] ml-1">
                スクショURL（仮実装）
                <span className="ml-2 text-xs font-normal text-[#FF8FA3] bg-[#FFF5F7] px-2 py-0.5 rounded-full border border-[#FFD1DC]">必須</span>
              </label>
              <input
                type="url"
                value={screenshotUrl}
                onChange={(e) => setScreenshotUrl(e.target.value)}
                placeholder="https://..."
                className="w-full rounded-2xl border-2 border-[#FFD1DC] bg-white/50 px-4 py-3 text-[#5D4037] placeholder-[#5D4037]/30 outline-none transition-all focus:border-[#FF8FA3] focus:bg-white focus:ring-4 focus:ring-[#FF8FA3]/20"
              />
              <p className="text-xs text-[#5D4037]/50 ml-1">
                ※ 将来的に画像アップロード機能を実装予定です。現在は画像のURLを入力してください。
              </p>
            </div>
            
            <div className="space-y-2">
              <label className="block text-sm font-bold text-[#5D4037] ml-1">
                一言メモ（任意）
              </label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                placeholder="例: 無事に購入できました！届くのが楽しみですね。"
                className="w-full rounded-2xl border-2 border-[#FFD1DC] bg-white/50 px-4 py-3 text-[#5D4037] placeholder-[#5D4037]/30 outline-none transition-all focus:border-[#FF8FA3] focus:bg-white focus:ring-4 focus:ring-[#FF8FA3]/20 resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={status === "loading" || assignmentState !== "ready"}
              className="btn-primary w-full py-4 rounded-full font-bold text-lg shadow-lg hover:shadow-xl disabled:opacity-70 disabled:cursor-not-allowed transform active:scale-95 transition-all"
            >
              {status === "loading" ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  送信中...
                </span>
              ) : (
                "提出して承認を待つ"
              )}
            </button>
          </form>

          {message && (
            <div
              className={`mt-6 p-4 rounded-xl text-sm font-bold text-center animate-fade-up ${
                status === "success" 
                  ? "bg-[#E8F5E9] text-green-700 border border-green-200" 
                  : "bg-[#FFEBEE] text-red-700 border border-red-200"
              }`}
            >
              {message}
            </div>
          )}
        </div>
      </div>
    </FlowGuard>
  );
}
