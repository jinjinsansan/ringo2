"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FlowGuard } from "@/components/FlowGuard";
import { supabase } from "@/lib/supabaseClient";

type Result = "bronze" | "silver" | "gold" | "red" | "poison";

const weights: { result: Result; weight: number }[] = [
  { result: "poison", weight: 50 },
  { result: "bronze", weight: 35 },
  { result: "silver", weight: 10 },
  { result: "gold", weight: 4.9 },
  { result: "red", weight: 0.1 },
];

function pickResult(): Result {
  const total = weights.reduce((sum, w) => sum + w.weight, 0);
  const r = Math.random() * total;
  let acc = 0;
  for (const w of weights) {
    acc += w.weight;
    if (r <= acc) return w.result;
  }
  return "poison";
}

export default function DrawPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleDraw = async () => {
    setLoading(true);
    setMessage("");

    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session?.user) {
      setLoading(false);
      setMessage("ログインが必要です");
      return;
    }

    const result = pickResult();
    const revealAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from("apples")
      .insert({
        user_id: session.user.id,
        result,
        reveal_at: revealAt,
      })
      .select("id")
      .single();

    if (error || !data) {
      setLoading(false);
      setMessage(error?.message ?? "抽選に失敗しました");
      return;
    }

    const { error: statusError } = await supabase
      .from("users")
      .update({ status: "REVEALING" })
      .eq("id", session.user.id);

    if (statusError) {
      setLoading(false);
      setMessage(statusError.message ?? "ステータス更新に失敗しました");
      return;
    }

    setLoading(false);
    router.push(`/reveal/${data.id}`);
  };

  return (
    <FlowGuard requiredStatus="READY_TO_DRAW" fallback="/">
      <div className="min-h-screen bg-[#F5F5F5] px-4 py-12 text-[#5C4033]">
        <div className="mx-auto w-full max-w-xl rounded-2xl bg-white p-8 shadow-lg text-center">
          <h1 className="font-heading mb-4 text-2xl">りんごを引く</h1>
          <p className="mb-6 text-sm leading-relaxed text-[#5C4033]/80">
            ボタンを押すと抽選が始まり、1時間後に結果が確定します。
          </p>
          <button
            onClick={handleDraw}
            disabled={loading}
            className="w-full rounded-full bg-[#FFC0CB] px-6 py-3 text-sm font-semibold text-[#5C4033] shadow-md transition hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "抽選中..." : "りんごを引く"}
          </button>
          {message && <p className="mt-4 text-sm text-red-600">{message}</p>}
        </div>
      </div>
    </FlowGuard>
  );
}
