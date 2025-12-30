"use client";

import { useState } from "react";
import { FlowGuard } from "@/components/FlowGuard";
import { supabase } from "@/lib/supabaseClient";
import { useUser } from "@/context/UserContext";

export default function PurchaseSubmitPage() {
  const { refresh } = useUser();
  const [screenshotUrl, setScreenshotUrl] = useState("");
  const [note, setNote] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setStatus("loading");
    setMessage("");

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
    const { error: insertError } = await supabase.from("purchases").insert({
      user_id: userId,
      screenshot_url: screenshotUrl || null,
      notes: note || null,
      status: "submitted",
    });

    if (insertError) {
      setStatus("error");
      setMessage(insertError.message ?? "提出に失敗しました");
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
  };

  return (
    <FlowGuard requiredStatus="READY_TO_PURCHASE" fallback="/">
      <div className="min-h-screen flex items-center justify-center py-12 px-4 relative overflow-hidden">
        {/* Background Decor */}
        <div className="absolute top-20 left-10 w-32 h-32 bg-[#FFD1DC] rounded-full mix-blend-multiply filter blur-xl opacity-60 animate-float" />
        <div className="absolute bottom-20 right-10 w-40 h-40 bg-[#FFFDD0] rounded-full mix-blend-multiply filter blur-xl opacity-60 animate-float" style={{ animationDelay: "1.5s" }} />

        <div className="glass-card w-full max-w-2xl p-8 md:p-12 rounded-[32px] shadow-2xl relative z-10 animate-fade-up border-2 border-white">
          <div className="text-center mb-8">
            <span className="text-4xl mb-4 block">📸</span>
            <h1 className="font-heading text-2xl md:text-3xl font-bold text-[#5D4037]">スクリーンショット提出</h1>
            <p className="text-[#5D4037]/70 mt-3 text-sm leading-relaxed">
              購入が完了したら、証拠画像をアップロードしましょう。<br />
              運営が確認した後、りんごを引くことができます！
            </p>
          </div>

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
              disabled={status === "loading"}
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
