"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import Image from "next/image";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type Result = "bronze" | "silver" | "gold" | "red" | "poison";

type Apple = {
  id: string;
  result: Result;
  reveal_at: string;
};

const cardMap: Record<Result, string> = {
  bronze: "/images/cards/bronze_apple_card_v2.png",
  silver: "/images/cards/silver_apple_card_final.png",
  gold: "/images/cards/gold_apple_card_v2.png",
  red: "/images/cards/red_apple_card_premium.png",
  poison: "/images/cards/poison_apple_card_final.png",
};

function getFilter(revealAt: string) {
  const now = Date.now();
  const target = new Date(revealAt).getTime();
  const diff = target - now; // ms

  if (diff <= 0) return "blur(0) grayscale(0)";

  const minutes = diff / 1000 / 60;
  if (minutes > 50) return "blur(16px) grayscale(100%)";
  if (minutes > 40) return "blur(12px) grayscale(100%)";
  if (minutes > 30) return "blur(8px) grayscale(100%)";
  if (minutes > 20) return "blur(4px) grayscale(100%)";
  if (minutes > 10) return "blur(4px) grayscale(50%)";
  return "blur(0) grayscale(0)";
}

export default function RevealPage() {
  const params = useParams();
  const appleId = params?.id as string | undefined;
  const [apple, setApple] = useState<Apple | null>(null);
  const [filter, setFilter] = useState("blur(16px) grayscale(100%)");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const [remaining, setRemaining] = useState<number | null>(null);

  const countdown = useMemo(() => {
    if (remaining === null) return "--:--";
    const totalSec = Math.floor(remaining / 1000);
    const m = Math.floor(totalSec / 60)
      .toString()
      .padStart(2, "0");
    const s = (totalSec % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  }, [remaining]);

  const isRevealed = remaining !== null && remaining <= 0;

  const fetchApple = useCallback(async () => {
    if (!appleId) return;
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();
    if (sessionError || !session?.user) {
      setMessage("ログインが必要です");
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("apples")
      .select("id, result, reveal_at")
      .eq("id", appleId)
      .eq("user_id", session.user.id)
      .single();

    if (error || !data) {
      setMessage(error?.message ?? "データ取得に失敗しました");
      setLoading(false);
      return;
    }
    setApple(data as Apple);
    setLoading(false);
  }, [appleId]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!mounted) return;
      await fetchApple();
    })();
    return () => {
      mounted = false;
    };
  }, [appleId, fetchApple]);

  useEffect(() => {
    if (!apple) return;

    const updateTimers = () => {
      setRemaining(Math.max(0, new Date(apple.reveal_at).getTime() - Date.now()));
      setFilter(getFilter(apple.reveal_at));
    };

    updateTimers();
    const timer = setInterval(updateTimers, 10000);
    return () => clearInterval(timer);
  }, [apple]);

  useEffect(() => {
    if (!apple || !isRevealed) return;

    const finalize = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user) return;

      // 結果に応じてユーザーステータス更新
      const nextStatus = apple.result === "poison" ? "READY_TO_PURCHASE" : "WAITING_FOR_FULFILLMENT";
      await supabase.from("users").update({ status: nextStatus }).eq("id", session.user.id);
    };

    finalize();
  }, [apple, isRevealed]);

  const cardSrc = apple ? cardMap[apple.result] : "/images/cards/bronze_apple_card_v2.png";

  return (
    <div className="min-h-screen bg-[#F5F5F5] px-4 py-12 text-[#5C4033]">
      <div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-6 rounded-2xl bg-white p-8 shadow-lg">
        <h1 className="font-heading text-2xl">抽選結果</h1>

        {loading && <p className="text-sm text-[#5C4033]/80">読み込み中...</p>}
        {message && <p className="text-sm text-red-600">{message}</p>}

        {apple && (
          <>
            <div className="text-sm text-[#5C4033]/70">結果公開まで: {isRevealed ? "00:00" : countdown}</div>
            <div className="relative flex h-96 w-64 items-center justify-center overflow-hidden rounded-2xl bg-[#FFFDD0]/60 shadow-md">
              <Image
                src={cardSrc}
                alt="apple card"
                fill
                className="object-contain transition-all duration-700"
                style={{ filter }}
                sizes="256px"
                priority
              />
            </div>
            {isRevealed && (
              <div className="mt-2 text-center text-sm font-semibold text-[#5C4033]">
                結果: {apple.result}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
