"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FlowGuard } from "@/components/FlowGuard";
import { useUser } from "@/context/UserContext";
import { supabase } from "@/lib/supabaseClient";

export default function GuidePage() {
  const { refresh } = useUser();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleCheck = async () => {
    setLoading(true);
    setError("");
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session?.user) {
      setError("ログインが必要です");
      setLoading(false);
      return;
    }

    const { error } = await supabase
      .from("users")
      .update({ guide_checked: true, status: "READY_TO_PURCHASE" })
      .eq("id", session.user.id);

    if (error) {
      setError(error.message ?? "更新に失敗しました");
      setLoading(false);
      return;
    }

    await refresh();
    router.push("/");
  };

  return (
    <FlowGuard requiredStatus="AWAITING_GUIDE_CHECK" fallback="/">
      <div className="min-h-screen bg-[#F5F5F5] px-4 py-12 text-[#5C4033]">
        <div className="mx-auto w-full max-w-2xl rounded-2xl bg-white p-8 shadow-lg">
          <h1 className="font-heading mb-4 text-2xl">りんご会♪の使い方</h1>
          <ol className="list-decimal space-y-2 pl-5 text-sm leading-relaxed text-[#5C4033]/90">
            <li>誰かの欲しいものを購入してスクショを提出</li>
            <li>承認されたら自分の欲しいものリストを登録</li>
            <li>りんごを引いて結果を待つ（1時間演出）</li>
          </ol>

          {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

          <button
            onClick={handleCheck}
            disabled={loading}
            className="mt-6 w-full rounded-full bg-[#FFC0CB] px-6 py-3 text-sm font-semibold text-[#5C4033] shadow-md transition hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "送信中..." : "読みました"}
          </button>
        </div>
      </div>
    </FlowGuard>
  );
}
