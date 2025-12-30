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
      <div className="min-h-screen bg-[#F5F5F5] px-4 py-12 text-[#5C4033]">
        <div className="mx-auto w-full max-w-2xl rounded-2xl bg-white p-8 shadow-lg">
          <h1 className="font-heading mb-4 text-2xl">スクリーンショット提出</h1>
          <p className="mb-6 text-sm leading-relaxed text-[#5C4033]/80">
            購入完了のスクリーンショットをアップロード（仮でURL入力）し、承認を待ちましょう。
          </p>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="mb-1 block text-sm font-semibold">スクショURL（仮）</label>
              <input
                type="url"
                value={screenshotUrl}
                onChange={(e) => setScreenshotUrl(e.target.value)}
                placeholder="https://..."
                className="w-full rounded-lg border border-[#FFC0CB]/60 bg-white px-3 py-2 text-sm outline-none transition focus:border-[#FFC0CB] focus:ring-2 focus:ring-[#FFC0CB]/50"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold">メモ（任意）</label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                className="w-full rounded-lg border border-[#FFC0CB]/60 bg-white px-3 py-2 text-sm outline-none transition focus:border-[#FFC0CB] focus:ring-2 focus:ring-[#FFC0CB]/50"
              />
            </div>
            <button
              type="submit"
              disabled={status === "loading"}
              className="w-full rounded-full bg-[#FFC0CB] px-6 py-3 text-sm font-semibold text-[#5C4033] shadow-md transition hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60"
            >
              {status === "loading" ? "送信中..." : "提出する"}
            </button>
          </form>
          {message && (
            <p
              className={`mt-4 text-sm ${
                status === "success" ? "text-green-700" : "text-red-600"
              }`}
            >
              {message}
            </p>
          )}
        </div>
      </div>
    </FlowGuard>
  );
}
