"use client";

import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type Result = "bronze" | "silver" | "gold" | "red" | "poison";

type Apple = {
  id: string;
  result: Result | null;
  revealAt: string;
};

const cardMap: Record<Result, string> = {
  bronze: "/images/cards/bronze_apple_card_v2.png",
  silver: "/images/cards/silver_apple_card_final.png",
  gold: "/images/cards/gold_apple_card_v2.png",
  red: "/images/cards/red_apple_card_premium.png",
  poison: "/images/cards/poison_apple_card_final.png",
};

const fakeCards: Result[] = ["bronze", "silver", "gold", "red", "poison"];

function getFilterFromRemaining(remaining: number | null, fakeActive: boolean, fakePlayed: boolean) {
  if (fakeActive) return "blur(2px) grayscale(0)";
  if (remaining === null) return "blur(16px) grayscale(100%)";
  if (remaining <= 0) return "blur(0) grayscale(0)";
  const minutes = remaining / 1000 / 60;
  if (minutes > 50) return "blur(16px) grayscale(100%)";
  if (minutes > 40) return "blur(12px) grayscale(100%)";
  if (minutes > 30) return "blur(8px) grayscale(100%)";
  if (minutes > 20) return "blur(4px) grayscale(100%)";
  if (minutes > 10) return "blur(4px) grayscale(50%)";
  // 10分以下はフェイク後に再び深いぼかしに戻し、最後の数分で徐々に解像度を上げる
  if (!fakePlayed) {
    return "blur(16px) grayscale(100%)";
  }
  if (minutes > 5) return "blur(10px) grayscale(80%)";
  if (minutes > 2) return "blur(6px) grayscale(40%)";
  return "blur(2px) grayscale(10%)";
}

export default function RevealPage() {
  const params = useParams();
  const router = useRouter();
  const appleId = params?.id as string | undefined;
  const [apple, setApple] = useState<Apple | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [remaining, setRemaining] = useState<number | null>(null);
  const [fakeActive, setFakeActive] = useState(false);
  const [fakePlayed, setFakePlayed] = useState(false);
  const [fakeCard, setFakeCard] = useState<Result>("bronze");
  const isFetchingRef = useRef(false);
  const finalFetchTriggered = useRef(false);

  const countdown = useMemo(() => {
    if (remaining === null) return "--:--";
    const totalSec = Math.floor(remaining / 1000);
    const m = Math.floor(totalSec / 60)
      .toString()
      .padStart(2, "0");
    const s = (totalSec % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  }, [remaining]);

  const isRevealed = apple?.result ? true : remaining !== null && remaining <= 0;

  const fetchApple = useCallback(async () => {
    if (!appleId || isFetchingRef.current) return;
    isFetchingRef.current = true;
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();
    if (sessionError || !session?.access_token) {
      setMessage("ログインが必要です");
      setLoading(false);
      isFetchingRef.current = false;
      return;
    }

    const res = await fetch(`/api/apples/${appleId}`, {
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({ error: "情報の取得に失敗しました" }));
      setMessage(data.error || "情報の取得に失敗しました");
      setLoading(false);
      isFetchingRef.current = false;
      return;
    }

    const data = await res.json();
    setApple({
      id: data.apple.id,
      result: data.apple.result,
      revealAt: data.apple.revealAt,
    });
    const serverRemaining = new Date(data.apple.revealAt).getTime() - new Date(data.serverTime).getTime();
    setRemaining(Math.max(0, serverRemaining));
    setLoading(false);
    finalFetchTriggered.current = Boolean(data.apple.result);
    isFetchingRef.current = false;
  }, [appleId]);

  useEffect(() => {
    queueMicrotask(() => {
      fetchApple();
    });
  }, [fetchApple]);

  useEffect(() => {
    if (!apple) return;
    const update = () => {
      setRemaining(Math.max(0, new Date(apple.revealAt).getTime() - Date.now()));
    };
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [apple]);

  useEffect(() => {
    if (!apple || fakePlayed) return;
    if (remaining === null) return;
    const isFakePhase = remaining > 0 && remaining <= 10 * 60 * 1000;
    if (!isFakePhase) return;

    let interval: ReturnType<typeof setInterval> | null = null;
    let timeout: ReturnType<typeof setTimeout> | null = null;
    const raf = requestAnimationFrame(() => {
      setFakeActive(true);
      interval = setInterval(() => {
        const pick = fakeCards[Math.floor(Math.random() * fakeCards.length)];
        setFakeCard(pick);
      }, 120);
      timeout = setTimeout(() => {
        if (interval) clearInterval(interval);
        setFakeActive(false);
        setFakePlayed(true);
      }, 8000);
    });

    return () => {
      cancelAnimationFrame(raf);
      if (interval) clearInterval(interval);
      if (timeout) clearTimeout(timeout);
    };
  }, [remaining, fakePlayed, apple]);

  useEffect(() => {
    if (!apple) return;
    if (apple.result) return;
    if (remaining === null || remaining > 0) return;
    if (finalFetchTriggered.current) return;
    finalFetchTriggered.current = true;
    queueMicrotask(() => {
      fetchApple();
    });
  }, [remaining, apple, fetchApple]);

  const filter = getFilterFromRemaining(remaining, fakeActive, fakePlayed);
  const cardSrc = fakeActive
    ? cardMap[fakeCard]
    : apple?.result
        ? cardMap[apple.result]
        : "/images/cards/bronze_apple_card_v2.png";

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.8),transparent_100%)] z-0" />
      <div className="absolute top-20 left-1/3 w-96 h-96 bg-[#FFD1DC] rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-float" />
      <div className="absolute bottom-20 right-1/3 w-96 h-96 bg-[#FFFDD0] rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-float" style={{ animationDelay: "2s" }} />

      <div className="glass-card w-full max-w-3xl flex flex-col items-center gap-8 rounded-[40px] p-8 md:p-12 shadow-2xl relative z-10 animate-fade-up border-2 border-white">
        <div className="text-center">
          <h1 className="font-heading text-3xl font-bold text-[#5D4037] mb-2">抽選結果</h1>
          {!loading && !message && (
             <p className="text-[#FF8FA3] font-bold">
                {isRevealed ? "運命の瞬間です！" : "結果が出るまで、しばらくお待ちください..."}
             </p>
          )}
        </div>

        {loading && (
           <div className="flex flex-col items-center gap-2 py-20">
             <div className="animate-spin text-4xl">⏳</div>
             <p className="font-bold text-[#5D4037]">データを読み込んでいます...</p>
           </div>
        )}
        
        {message && (
           <div className="p-4 bg-[#FFEBEE] text-red-700 border border-red-200 rounded-xl font-bold">
             {message}
           </div>
        )}

        {apple && (
          <div className="flex flex-col items-center w-full">
            <div className="mb-6 bg-white/60 px-6 py-2 rounded-full shadow-sm border border-[#FFD1DC]">
              <span className="text-xs font-bold text-[#5D4037]/60 mr-2">REVEAL IN</span>
              <span className={`text-2xl font-mono font-bold ${isRevealed ? "text-[#FF8FA3]" : "text-[#5D4037]"}`}>
                {isRevealed ? "00:00" : countdown}
              </span>
            </div>

            <div className="relative flex h-[400px] w-full max-w-[300px] items-center justify-center overflow-hidden rounded-3xl bg-white shadow-xl border-4 border-white transform hover:scale-105 transition-transform duration-500">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,#FFFDD0,transparent)] opacity-50" />
              <Image
                src={cardSrc}
                alt="apple card"
                fill
                className="object-contain p-4 transition-all duration-1000"
                style={{ filter }}
                sizes="(max-width: 768px) 100vw, 300px"
                priority
              />
            </div>

            {apple?.result ? (
              <div className="mt-8 text-center animate-fade-up space-y-4 w-full">
                <div>
                  <p className="text-sm font-bold text-[#5D4037]/60">RESULT</p>
                  <p className="text-4xl font-heading font-bold text-[#FF8FA3] mt-1 capitalize">
                    {apple.result} Apple
                  </p>
                </div>

                <button
                  onClick={() => router.push("/my-page")}
                  className="btn-primary px-10 py-4 rounded-full font-bold text-lg shadow-xl hover:shadow-2xl transition-all"
                >
                  マイページへ戻る
                </button>
              </div>
            ) : (
              <p className="mt-8 text-sm text-[#5D4037]/60 animate-pulse text-center px-6">
                {isRevealed
                  ? "結果を取得しています... 少しだけお待ちください。"
                  : fakeActive
                    ? "ラストスパート！いろいろなりんごが目の前でシャッフルされています..."
                    : "じわじわと結果が見えてきます..."}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
