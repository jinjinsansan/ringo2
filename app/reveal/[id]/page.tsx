"use client";

import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useUser } from "@/context/UserContext";

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

const baseProbabilities: Record<Result, number> = {
  poison: 50,
  bronze: 35,
  silver: 10,
  gold: 4.9,
  red: 0.1,
};

const resultMeta: Record<Result, { label: string; color: string }> = {
  poison: { label: "毒りんご", color: "#4CAF50" },
  bronze: { label: "ブロンズりんご", color: "#CD7F32" },
  silver: { label: "シルバーりんご", color: "#C0C0C0" },
  gold: { label: "ゴールドりんご", color: "#F5C518" },
  red: { label: "赤りんご", color: "#E53935" },
};

function AppleIcon({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 32 32" className="h-9 w-9 drop-shadow" role="img" aria-hidden="true">
      <path
        d="M16 4c-1.42 0-2.66.94-3.12 2.34-.19.59-.27 1.24-.27 1.9-4.41.32-7.61 3.96-7.61 8.56C5 22.74 8.82 27 13.76 27h4.48C23.18 27 27 22.74 27 16.8c0-4.6-3.2-8.24-7.61-8.56-.06-.66-.15-1.31-.34-1.9C18.66 4.94 17.42 4 16 4z"
        fill={color}
      />
      <path d="M19.5 3.2c.3 1.52 1.7 2.72 3.36 2.72h2.18" stroke="#3A3A3A" strokeWidth="1.2" strokeLinecap="round" fill="none" />
      <path d="M18.5 2.5c0 1.3 1.05 2.35 2.35 2.35h2.15" stroke="#2F855A" strokeWidth="1.3" strokeLinecap="round" fill="none" />
    </svg>
  );
}

function getBoostedProbabilities(referralCount: number | null | undefined) {
  const count = typeof referralCount === "number" && referralCount > 0 ? referralCount : 0;
  if (!count) return baseProbabilities;
  const reduction = Math.min(20, count * 1.5);
  const redistributed = reduction;
  const boosted: Record<Result, number> = {
    poison: Math.max(15, baseProbabilities.poison - reduction),
    bronze: baseProbabilities.bronze + redistributed * 0.5,
    silver: baseProbabilities.silver + redistributed * 0.25,
    gold: baseProbabilities.gold + redistributed * 0.2,
    red: baseProbabilities.red + redistributed * 0.05,
  };
  return boosted;
}

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
  const { user } = useUser();
  const [apple, setApple] = useState<Apple | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [remaining, setRemaining] = useState<number | null>(null);
  const [fakeActive, setFakeActive] = useState(false);
  const [fakePlayed, setFakePlayed] = useState(false);
  const [fakeCard, setFakeCard] = useState<Result>("bronze");
  const [copied, setCopied] = useState(false);
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
    if (apple?.result && fakeActive) {
      const id = setTimeout(() => {
        setFakeActive(false);
        setFakePlayed(true);
      }, 0);
      return () => clearTimeout(id);
    }
  }, [apple, fakeActive]);

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

  const filter = apple?.result ? "blur(0) grayscale(0)" : getFilterFromRemaining(remaining, fakeActive, fakePlayed);
  const cardSrc = fakeActive
    ? cardMap[fakeCard]
    : apple?.result
        ? cardMap[apple.result]
        : "/images/cards/bronze_apple_card_v2.png";

  const referralCount = user?.referral_count ?? 0;
  const referralBoost = useMemo(() => getBoostedProbabilities(referralCount), [referralCount]);
  const probabilityEntries = useMemo(() => Object.entries(referralBoost) as [Result, number][], [referralBoost]);
  const referralCode = useMemo(() => user?.referral_code ?? user?.id?.slice(0, 8) ?? null, [user]);
  const referralUrl = referralCode ? `${process.env.NEXT_PUBLIC_APP_URL ?? "https://ringokai.app"}/signup?ref=${referralCode}` : null;
  const nextBonusIn = useMemo(() => {
    const remainder = referralCount % 3;
    return remainder === 0 ? 3 : 3 - remainder;
  }, [referralCount]);

  const handleCopyReferral = useCallback(async () => {
    if (!referralUrl) return;
    try {
      await navigator.clipboard.writeText(referralUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(false);
    }
  }, [referralUrl]);

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-gradient-to-b from-[#FFF0F5] via-[#FFE5EC] to-[#FFF8F0] py-16 px-4">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-10 top-10 h-72 w-72 rounded-full bg-pink-200/40 blur-3xl" />
        <div className="absolute right-0 bottom-0 h-96 w-96 rounded-full bg-amber-200/40 blur-[140px]" />
        <div className="absolute left-1/4 top-1/3 h-10 w-10 rounded-full bg-white/60 animate-pulse" />
      </div>

      <div className="relative z-10 mx-auto flex w-full max-w-5xl flex-col gap-10">
        <div className="glass-card rounded-[32px] border border-white/70 bg-white/70 p-8 shadow-2xl backdrop-blur-xl">
          <div className="flex flex-col gap-6 text-center">
            <div>
              <p className="font-heading text-sm uppercase tracking-[0.4em] text-[#FF8FA3]">Reveal Ceremony</p>
              <h1 className="font-heading text-4xl font-bold text-[#5D4037]">抽選結果</h1>
              {!loading && !message && (
                <p className="mt-2 text-base font-semibold text-[#FF6B8B]">
                  {isRevealed ? "ドキドキの結果が届きました！" : "結果を紡ぐセレモニーが静かに進んでいます..."}
                </p>
              )}
            </div>

            {loading && (
              <div className="flex flex-col items-center gap-3 py-16">
                <div className="animate-spin text-4xl">⏳</div>
                <p className="text-sm font-semibold text-[#5D4037]">データを読み込んでいます...</p>
              </div>
            )}

            {message && (
              <div className="rounded-2xl border border-red-200 bg-[#FFEBEE] px-4 py-3 text-sm font-semibold text-red-700">
                {message}
              </div>
            )}

            {apple && (
              <div className="flex flex-col items-center gap-6">
                <div className="flex flex-col items-center gap-3">
                  <div className="flex items-center gap-3 rounded-full border border-white/70 bg-white/70 px-6 py-2 shadow">
                    <span className="text-xs font-bold tracking-[0.3em] text-[#B2797B]">REVEAL IN</span>
                    <span className={`font-mono text-3xl font-bold ${isRevealed ? "text-[#FF5C8D]" : "text-[#5D4037]"}`}>
                      {isRevealed ? "00:00" : countdown}
                    </span>
                  </div>
                  {!isRevealed && (
                    <p className="text-xs text-[#5D4037]/70">タイマーがゼロになると自動で結果を取得します。</p>
                  )}
                </div>

                <div className="relative flex h-[420px] w-full max-w-[360px] items-center justify-center overflow-hidden rounded-[28px] border border-white/80 bg-gradient-to-b from-white/90 to-white/70 shadow-[0_20px_80px_rgba(255,143,163,0.25)]">
                  <div className="absolute inset-x-8 top-6 rounded-full bg-[#FFF4F7] py-2 text-center text-xs font-semibold text-[#FF7CA5] shadow">
                    {isRevealed ? "Reveal Complete" : fakeActive ? "Final Shuffle" : "Crystalizing"}
                  </div>
                  <Image
                    src={cardSrc}
                    alt="apple card"
                    fill
                    className="object-contain p-6 transition-all duration-1000"
                    style={{ filter }}
                    sizes="(max-width: 768px) 100vw, 360px"
                    priority
                  />
                  <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.3),transparent_60%)]" />
                </div>

                {apple?.result ? (
                  <div className="w-full rounded-3xl border border-[#FFE2EA] bg-white/80 p-6 text-center shadow">
                    <p className="text-sm font-semibold text-[#B2797B]">RESULT</p>
                    <p className="mt-2 text-4xl font-heading capitalize text-[#FF5C8D]">{apple.result} Apple</p>
                    <p className="mt-2 text-sm text-[#5D4037]/70">
                      {apple.result === "poison"
                        ? "次の挑戦で巻き返しましょう！紹介ボーナスで確率アップできます。"
                        : "おめでとうございます！この後はマイページで詳細を確認してください。"}
                    </p>
                    <button
                      onClick={() => router.push("/my-page")}
                      className="btn-primary mt-6 w-full rounded-full py-3 text-base font-bold shadow-xl"
                    >
                      マイページへ戻る
                    </button>
                  </div>
                ) : (
                  <p className="text-sm text-[#5D4037]/60">
                    {isRevealed
                      ? "結果データを取得しています... 少々お待ちください。"
                      : fakeActive
                        ? "ラストスパート！眩いカードが高速で入れ替わっています。"
                        : "柔らかなフィルタの向こうでカードの輪郭がじわじわ浮かび上がっています。"}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {apple && (
          <div className="grid gap-8 lg:grid-cols-2">
            <div className="rounded-3xl border border-white/70 bg-white/80 p-6 shadow-xl">
              <div className="flex flex-col gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#FF8FA3]">Your Odds</p>
                  <h2 className="font-heading text-2xl text-[#5D4037]">現在の確率テーブル</h2>
                  <p className="text-sm text-[#5D4037]/70">
                    {referralCount > 0
                      ? `紹介人数 ${referralCount} 人によるボーナス適用中！`
                      : "紹介ボーナスは未適用です。リンクを共有して確率を上げましょう。"}
                  </p>
                </div>

                <div className="grid gap-3">
                  {probabilityEntries.map(([resultKey, value]) => (
                    <div
                      key={resultKey}
                      className="flex items-center justify-between rounded-2xl border border-[#FFE2EA] bg-white/90 px-4 py-3 shadow-sm"
                    >
                      <div className="flex items-center gap-3">
                        <AppleIcon color={resultMeta[resultKey].color} />
                        <span className="text-sm font-semibold text-[#5D4037]">{resultMeta[resultKey].label}</span>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-heading text-[#FF5C8D]">{value.toFixed(value < 1 ? 2 : 1)}%</p>
                        <p className="text-[10px] uppercase tracking-[0.2em] text-[#B2797B]">
                          base {baseProbabilities[resultKey].toFixed(baseProbabilities[resultKey] < 1 ? 2 : 1)}%
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                <p className="text-xs text-[#5D4037]/60">
                  紹介1人ごとに毒りんご率が1.5%減少し、他のりんごに再配分されます（最大20%まで）。
                </p>
              </div>
            </div>

            <div className="rounded-3xl border border-white/70 bg-gradient-to-b from-white/90 to-white/70 p-6 shadow-xl">
              <div className="flex flex-col gap-5">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#FF8FA3]">Invite & Boost</p>
                  <h2 className="font-heading text-2xl text-[#5D4037]">友達紹介で確率アップ</h2>
                  <p className="text-sm text-[#5D4037]/70">
                    リンクを共有すると、次回の抽選で毒りんごの確率が下がり、シルバー/ゴールド/赤りんごの出現率が上昇します。
                  </p>
                </div>

                <div className="rounded-2xl border border-dashed border-[#FFC6D9] bg-white/80 p-4">
                  <p className="text-xs font-semibold text-[#B2797B]">あなたの紹介リンク</p>
                  <p className="mt-2 break-all text-sm font-mono text-[#FF5C8D]">
                    {referralUrl ?? "ログインするとリンクが表示されます"}
                  </p>
                  <button
                    onClick={handleCopyReferral}
                    disabled={!referralUrl}
                    className="mt-3 w-full rounded-full border border-[#FFC0CB] bg-white/90 py-2 text-sm font-semibold text-[#5D4037] shadow-sm transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {copied ? "コピーしました！" : "リンクをコピー"}
                  </button>
                </div>

                <div className="grid gap-3 rounded-2xl border border-[#FFE2EA] bg-white/70 p-4 text-sm text-[#5D4037]">
                  <div className="flex items-center justify-between">
                    <span>現在の紹介人数</span>
                    <span className="font-heading text-xl text-[#FF5C8D]">{referralCount}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>次の確率UPまで</span>
                    <span className="font-heading text-xl text-[#5D4037]">{nextBonusIn} 人</span>
                  </div>
                  <p className="text-xs text-[#5D4037]/60">
                    3人紹介するごとに上位りんごが当たる確率が上昇します。
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
