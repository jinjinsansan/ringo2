"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useUser } from "@/context/UserContext";
import { supabase } from "@/lib/supabaseClient";

const statusLabel: Record<string, string> = {
  AWAITING_TOS_AGREEMENT: "利用規約の同意が必要です",
  AWAITING_GUIDE_CHECK: "使い方ガイドの確認が必要です",
  READY_TO_PURCHASE: "購入ステップへ進めます",
  AWAITING_APPROVAL: "購入承認待ちです",
  READY_TO_REGISTER_WISHLIST: "欲しいものリスト登録が必要です",
  READY_TO_DRAW: "りんごを引けます！",
  REVEALING: "運命の結果待ちです...",
  WAITING_FOR_FULFILLMENT: "あなたの欲しいものが買われるのを待っています",
  CYCLE_COMPLETE: "サイクル完了！次へ進めます",
};

const STATUS_STEPS: { value: string; label: string }[] = [
  { value: "AWAITING_TOS_AGREEMENT", label: "規約同意" },
  { value: "AWAITING_GUIDE_CHECK", label: "ガイド確認" },
  { value: "READY_TO_PURCHASE", label: "購入ステップ" },
  { value: "AWAITING_APPROVAL", label: "承認待ち" },
  { value: "READY_TO_REGISTER_WISHLIST", label: "リスト登録" },
  { value: "READY_TO_DRAW", label: "りんご抽選" },
  { value: "REVEALING", label: "結果演出" },
  { value: "WAITING_FOR_FULFILLMENT", label: "購入待ち" },
  { value: "CYCLE_COMPLETE", label: "サイクル完了" },
];

const cta: Record<string, string> = {
  AWAITING_TOS_AGREEMENT: "規約に同意する",
  AWAITING_GUIDE_CHECK: "使い方を見る",
  READY_TO_PURCHASE: "誰かの欲しいものリストを購入する",
  AWAITING_APPROVAL: "欲しいものリストを登録する",
  READY_TO_REGISTER_WISHLIST: "欲しいものリストを登録する",
  READY_TO_DRAW: "りんごを引く",
  REVEALING: "結果を確認する",
  CYCLE_COMPLETE: "次のサイクルへ",
};

const links: Record<string, string | null> = {
  AWAITING_TOS_AGREEMENT: "/tos",
  AWAITING_GUIDE_CHECK: "/guide",
  READY_TO_PURCHASE: "/purchase/submit",
  AWAITING_APPROVAL: "/wishlist/register",
  READY_TO_REGISTER_WISHLIST: "/wishlist/register",
  READY_TO_DRAW: "/draw",
  REVEALING: null,
  WAITING_FOR_FULFILLMENT: null,
  CYCLE_COMPLETE: "/purchase/submit",
};

const statusIcon: Record<string, string> = {
  AWAITING_TOS_AGREEMENT: "📜",
  AWAITING_GUIDE_CHECK: "📖",
  READY_TO_PURCHASE: "🎁",
  AWAITING_APPROVAL: "⏳",
  READY_TO_REGISTER_WISHLIST: "📝",
  READY_TO_DRAW: "🍎",
  REVEALING: "✨",
  WAITING_FOR_FULFILLMENT: "💖",
  CYCLE_COMPLETE: "🎉",
};

type AppleResult = "bronze" | "silver" | "gold" | "red" | "poison";

const resultIconMap: Record<AppleResult, string> = {
  bronze: "🥉",
  silver: "🥈",
  gold: "🥇",
  red: "🍎",
  poison: "☠️",
};

const resultLabelMap: Record<AppleResult, string> = {
  bronze: "ブロンズ",
  silver: "シルバー",
  gold: "ゴールド",
  red: "赤りんご",
  poison: "毒りんご",
};

type OverviewData = {
  referral: {
    code: string | null;
    count: number;
    friends: { id: string; status: string; joinedAt: string; wishlistUrl: string | null }[];
  };
  appleHistory: { id: string; result: AppleResult | null; reveal_at: string | null; created_at: string }[];
  purchaseHistory: { id: string; status: string; created_at: string; screenshot_url: string | null; notes: string | null }[];
  giftHistory: {
    id: string;
    status: string;
    created_at: string;
    target_user_id: string;
    wish: { primary_item_name: string | null; primary_item_url: string | null; item_price_jpy: number | null } | null;
  }[];
  stats: {
    totalWins: number;
    totalPurchases: number;
  };
};

export default function MyPage() {
  const { user, loading, refresh } = useUser();
  const router = useRouter();
  const [latestAppleId, setLatestAppleId] = useState<string | null>(null);
  const [usingTicket, setUsingTicket] = useState(false);
  const [ticketMessage, setTicketMessage] = useState<string | null>(null);
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [overviewStatus, setOverviewStatus] = useState<"idle" | "loading" | "error">("loading");
  const [overviewError, setOverviewError] = useState<string | null>(null);
  const [referralCopied, setReferralCopied] = useState(false);

  const currentStatus = user?.status ?? "";
  const label = useMemo(() => statusLabel[currentStatus] ?? "状態を取得できません", [currentStatus]);
  const actionText = useMemo(() => cta[currentStatus] ?? "", [currentStatus]);
  const baseLink = useMemo(() => links[currentStatus] ?? null, [currentStatus]);
  const icon = useMemo(() => statusIcon[currentStatus] ?? "❓", [currentStatus]);
  const canManageWishlist = useMemo(() => {
    const allowed = new Set(["AWAITING_APPROVAL", "READY_TO_REGISTER_WISHLIST", "READY_TO_DRAW"]);
    return allowed.has(currentStatus);
  }, [currentStatus]);

  const revealLink = useMemo(() => {
    if (currentStatus === "REVEALING" && latestAppleId) {
      return `/reveal/${latestAppleId}`;
    }
    return baseLink;
  }, [currentStatus, latestAppleId, baseLink]);

  const currentStepIndex = useMemo(() => {
    const index = STATUS_STEPS.findIndex((step) => step.value === currentStatus);
    if (index === -1) {
      return STATUS_STEPS.length - 1;
    }
    return index;
  }, [currentStatus]);

  const nextStepLabel = useMemo(() => {
    const nextStep = STATUS_STEPS[currentStepIndex + 1];
    if (!nextStep) return null;
    return statusLabel[nextStep.value] ?? `${nextStep.label}へ進みます`;
  }, [currentStepIndex]);

  const loadOverview = useCallback(async () => {
    setOverviewStatus("loading");
    setOverviewError(null);
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.access_token) {
      setOverviewStatus("error");
      setOverviewError("ログインが必要です");
      return;
    }

    const res = await fetch("/api/profile/overview", {
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    });

    const data = await res.json().catch(() => ({ error: "情報の取得に失敗しました" }));
    if (!res.ok) {
      setOverviewStatus("error");
      setOverviewError(data.error || "情報の取得に失敗しました");
      return;
    }

    setOverview(data as OverviewData);
    setOverviewStatus("idle");
  }, []);

  const hasTicketOption = useMemo(() => {
    if (!user) return false;
    if (currentStatus !== "CYCLE_COMPLETE") return false;
    if (!user.can_use_ticket) return false;
    return (user.total_exemption_tickets ?? 0) > 0;
  }, [currentStatus, user]);

  useEffect(() => {
    queueMicrotask(() => {
      void loadOverview();
    });
  }, [loadOverview]);

  useEffect(() => {
    if (currentStatus !== "REVEALING") {
      queueMicrotask(() => setLatestAppleId(null));
      return;
    }

    let active = true;
    (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user) {
        return;
      }

      const { data } = await supabase
        .from("apples")
        .select("id, reveal_at")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (active) {
        setLatestAppleId(data?.id ?? null);
      }
    })();

    return () => {
      active = false;
    };
  }, [currentStatus]);

  const handleUseTicket = async () => {
    setTicketMessage(null);
    setUsingTicket(true);
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      setTicketMessage("ログインが必要です");
      setUsingTicket(false);
      return;
    }

    const res = await fetch("/api/tickets/use", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    });

    const data = await res.json().catch(() => ({ error: "チケットの使用に失敗しました" }));
    if (!res.ok) {
      setTicketMessage(data.error || "チケットの使用に失敗しました");
      setUsingTicket(false);
      return;
    }

    await refresh();
    setUsingTicket(false);
    router.push("/draw");
  };

  const handleFullRefresh = useCallback(async () => {
    await Promise.all([refresh(), loadOverview()]);
  }, [refresh, loadOverview]);

  const [referralEnsuring, setReferralEnsuring] = useState(false);
  const [referralEnsureError, setReferralEnsureError] = useState<string | null>(null);
  const referralEnsureRequestedRef = useRef(false);

  const ensureReferralCode = useCallback(async () => {
    setReferralEnsureError(null);
    setReferralEnsuring(true);
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.access_token) {
      setReferralEnsuring(false);
      setReferralEnsureError("ログインが必要です");
      return false;
    }

    const res = await fetch("/api/referrals/ensure", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    });

    const body = await res.json().catch(() => ({ error: "紹介リンクの発行に失敗しました" }));
    if (!res.ok) {
      setReferralEnsuring(false);
      setReferralEnsureError(body.error ?? "紹介リンクの発行に失敗しました");
      return false;
    }

    await handleFullRefresh();
    setReferralEnsuring(false);
    return true;
  }, [handleFullRefresh]);

  const referralLink = useMemo(() => {
    const code = overview?.referral.code ?? user?.referral_code ?? null;
    if (!code) return null;
    const base = process.env.NEXT_PUBLIC_APP_URL ?? (typeof window !== "undefined" ? window.location.origin : "https://ringokai.app");
    return `${base.replace(/\/$/, "")}/signup?ref=${code}`;
  }, [overview, user]);

  useEffect(() => {
    if (loading || referralLink || referralEnsuring || referralEnsureRequestedRef.current) return;
    referralEnsureRequestedRef.current = true;
    const id = setTimeout(() => {
      void ensureReferralCode();
    }, 0);
    return () => clearTimeout(id);
  }, [loading, referralLink, referralEnsuring, ensureReferralCode]);

  const handleCopyReferral = useCallback(async () => {
    if (!referralLink) return;
    try {
      await navigator.clipboard.writeText(referralLink);
      setReferralCopied(true);
      setTimeout(() => setReferralCopied(false), 2000);
    } catch {
      setReferralCopied(false);
    }
  }, [referralLink]);

  const formatDate = useCallback((value: string) => {
    try {
      return new Date(value).toLocaleString("ja-JP", { hour12: false });
    } catch {
      return value;
    }
  }, []);

  const referralFriends = overview?.referral.friends ?? [];
  const appleHistory = overview?.appleHistory ?? [];
  const purchaseHistory = overview?.purchaseHistory ?? [];
  const giftHistory = overview?.giftHistory ?? [];

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F5F5F5] text-[#5C4033]">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin text-4xl">🍎</div>
          <p className="font-bold text-[#FF8FA3]">読み込み中...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F5F5F5] text-[#5C4033] px-4">
        <div className="glass-card p-8 rounded-3xl text-center max-w-md w-full">
          <p className="mb-4">ユーザー情報が取得できません。<br />ログインを確認してください。</p>
          <button 
            onClick={() => router.push("/login")}
            className="btn-primary px-6 py-2 rounded-full font-bold"
          >
            ログイン画面へ
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#FFF8FB]">
      {/* Background Decor */}
      <div className="pointer-events-none absolute top-0 left-0 h-full w-full bg-[radial-gradient(circle_at_10%_10%,rgba(255,209,220,0.45),transparent_50%)]" />
      <div className="pointer-events-none absolute bottom-0 right-0 h-full w-full bg-[radial-gradient(circle_at_90%_90%,rgba(255,253,208,0.4),transparent_50%)]" />

      <div className="relative z-10 mx-auto w-full max-w-6xl py-16 px-4 md:px-8 lg:px-12">
        <div className="glass-card w-full rounded-[40px] border-2 border-white/80 p-6 md:p-10 lg:p-12 shadow-2xl">
        <div className="text-center mb-8">
          <h1 className="font-heading text-2xl font-bold text-[#5D4037] mb-1">マイページ</h1>
          <p className="text-[#FF8FA3] font-bold text-sm">Welcome back!</p>
        </div>

        <div className="bg-white/60 rounded-3xl p-8 mb-8 border border-[#FFD1DC] shadow-sm text-center relative overflow-hidden">
           <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-[#FFD1DC] via-[#FF8FA3] to-[#FFD1DC]" />

           <div className="mb-6 flex flex-wrap items-center justify-center gap-2">
             {STATUS_STEPS.map((step, index) => {
               const isCurrent = index === currentStepIndex;
               const isCompleted = index < currentStepIndex;
               return (
                 <div
                   key={step.value}
                   className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                     isCurrent
                       ? "bg-[#FF8FA3] text-white"
                       : isCompleted
                         ? "bg-[#FFE4EC] text-[#FF5C8D]"
                         : "bg-[#F1F1F1] text-[#9E8B8F]"
                   }`}
                 >
                   {step.label}
                 </div>
               );
             })}
           </div>
           
           <div className="text-6xl mb-4 animate-float">{icon}</div>
           
           <div className="space-y-2">
             <div className="text-xs font-bold text-[#FF8FA3] tracking-widest uppercase">Current Status</div>
             <div className="text-lg font-bold text-[#5D4037]">{label}</div>
           </div>

           {nextStepLabel && (
             <p className="mt-3 text-xs text-[#5D4037]/70">次のステップ: {nextStepLabel}</p>
           )}

           {revealLink && actionText && (
             <button
               onClick={() => router.push(revealLink)}
               disabled={currentStatus === "REVEALING" && !latestAppleId}
               className={`btn-primary mt-6 w-full py-3 rounded-full font-bold shadow-lg hover:shadow-xl transition-all ${currentStatus === "REVEALING" && !latestAppleId ? "opacity-60 cursor-not-allowed" : ""}`}
             >
               {currentStatus === "REVEALING" && !latestAppleId ? "結果ページを準備中..." : (
                 <>
                   {actionText} <span className="ml-1">→</span>
                 </>
               )}
             </button>
           )}
           
           {!revealLink && actionText && (
             <div className="mt-6 py-3 px-4 bg-[#F5F5F5] rounded-full text-sm font-bold text-[#5D4037]/60">
               {actionText}
             </div>
           )}

           {currentStatus === "WAITING_FOR_FULFILLMENT" && (
             <p className="mt-6 rounded-3xl border border-[#FFD1DC] bg-white/80 px-4 py-3 text-sm font-semibold text-[#5D4037]/90">
               誰かに購入されるまで次のターンには進めません。購入完了のお知らせが届くまで少しお待ちください。
             </p>
           )}
        </div>

        {hasTicketOption && user && (
          <div className="mb-8 rounded-3xl border border-[#FFCCF0] bg-[#FFF5FB] p-6 shadow-sm">
            <p className="text-base font-heading text-[#5D1E4B]">購入免除チケットを使ってりんごを引けます！</p>
            <p className="mt-2 text-sm text-[#5D1E4B]/70">
              今回のサイクルで一度だけ、誰かの欲しいものを購入せずに抽選ステップへ進めます。
            </p>
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-2xl bg-white/80 border border-white px-4 py-3">
                <p className="text-xs text-[#A45A73] font-bold">シルバー</p>
                <p className="text-lg font-heading text-[#5D1E4B]">{user.exemption_tickets_silver}枚</p>
              </div>
              <div className="rounded-2xl bg-white/80 border border-white px-4 py-3">
                <p className="text-xs text-[#A45A73] font-bold">ゴールド</p>
                <p className="text-lg font-heading text-[#5D1E4B]">{user.exemption_tickets_gold}枚</p>
              </div>
              <div className="rounded-2xl bg-white/80 border border-white px-4 py-3">
                <p className="text-xs text-[#A45A73] font-bold">赤りんご</p>
                <p className="text-lg font-heading text-[#5D1E4B]">{user.exemption_tickets_red}枚</p>
              </div>
              <div className="rounded-2xl bg-white/80 border border-white px-4 py-3">
                <p className="text-xs text-[#A45A73] font-bold">合計</p>
                <p className="text-lg font-heading text-[#5D1E4B]">{user.total_exemption_tickets}枚</p>
              </div>
            </div>

            {ticketMessage && <p className="mt-3 text-sm text-red-600">{ticketMessage}</p>}

            <button
              onClick={handleUseTicket}
              disabled={usingTicket}
              className="btn-primary mt-4 w-full py-3 rounded-full font-bold shadow-lg hover:shadow-xl transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {usingTicket ? "チケットを使用中..." : "チケットを使ってりんごを引く"}
            </button>
          </div>
        )}

        {overviewError && (
          <div className="mb-8 rounded-3xl border border-red-100 bg-red-50/70 p-4 text-sm text-red-700">
            {overviewError}
          </div>
        )}

        {currentStatus === "AWAITING_APPROVAL" && (
          <div className="mb-8 rounded-3xl border border-green-100 bg-green-50/60 p-6 text-left text-sm text-[#2E5939] shadow-sm">
            <p className="text-base font-heading text-[#2E5939]">承認待ちの間に欲しいものリストを準備しましょう</p>
            <p className="mt-2 leading-relaxed">
              スクリーンショットは送信済みです。運営の承認が完了したらすぐ抽選に進めるよう、
              今のうちに「欲しいものリスト登録」を済ませておくとスムーズです。
            </p>
            <button
              onClick={() => router.push("/wishlist/register")}
              className="mt-4 inline-flex items-center justify-center rounded-full border border-[#2E5939]/20 bg-white/80 px-5 py-2 text-xs font-bold text-[#2E5939] hover:bg-white"
            >
              欲しいものリストを登録する →
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white/40 p-4 rounded-2xl text-center border border-white">
            <div className="text-2xl mb-1">🎫</div>
            <div className="text-xs text-[#5D4037]/60 font-bold">免除チケット</div>
            <div className="text-lg font-heading font-bold text-[#FF8FA3]">{user.total_exemption_tickets}枚</div>
          </div>
          <div className="bg-white/40 p-4 rounded-2xl text-center border border-white">
            <div className="text-2xl mb-1">🍏</div>
            <div className="text-xs text-[#5D4037]/60 font-bold">獲得りんご</div>
            <div className="text-lg font-heading font-bold text-[#FF8FA3]">
              {overviewStatus === "loading" ? "--" : `${overview?.stats.totalWins ?? 0}個`}
            </div>
          </div>
          <div className="bg-white/40 p-4 rounded-2xl text-center border border-white">
            <div className="text-2xl mb-1">🎀</div>
            <div className="text-xs text-[#5D4037]/60 font-bold">購入実績</div>
            <div className="text-lg font-heading font-bold text-[#FF8FA3]">
              {overviewStatus === "loading" ? "--" : `${overview?.stats.totalPurchases ?? 0}件`}
            </div>
          </div>
        </div>

        <div className="mb-8 rounded-3xl border border-white bg-white/70 p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-bold text-[#FF8FA3] uppercase tracking-widest">WISHLIST</p>
              <p className="text-lg font-heading text-[#5D4037] mt-1">あなたの欲しいもの</p>
              <p className="text-xs text-[#5D4037]/60 mt-1">
                登録済みのリストは、いつでもここから確認できます。
              </p>
              {!canManageWishlist && user.wishlist_url && (
                <p className="mt-2 rounded-2xl bg-white/60 px-3 py-2 text-xs text-[#B45364] border border-[#FFD1DC]">
                  現在はマッチング処理中のため編集できません。次のサイクル準備段階までお待ちください。
                </p>
              )}
              {currentStatus === "AWAITING_APPROVAL" && !user.wishlist_url && (
                <p className="mt-2 rounded-2xl bg-white/70 px-3 py-2 text-xs text-[#2E5939]/80 border border-green-100">
                  承認が完了する前に、希望商品のURLと価格を登録しておくと次の抽選がスムーズです。
                </p>
              )}
            </div>
            {canManageWishlist && (
              <button
                onClick={() => router.push("/wishlist/register")}
                className="rounded-full border border-[#FFC0CB] px-4 py-2 text-xs font-bold text-[#FF8FA3] hover:bg-[#FFF5F7]"
              >
                {user.wishlist_url ? "編集する" : "登録する"}
              </button>
            )}
          </div>

          <div className="mt-4 rounded-2xl bg-[#FFF5F7] border border-[#FFD1DC] px-4 py-3 text-sm text-[#5D4037] break-all">
            {user.wishlist_url ? (
              <a
                href={user.wishlist_url}
                target="_blank"
                rel="noreferrer"
                className="text-[#a34a5d] underline"
              >
                {user.wishlist_url}
              </a>
            ) : (
              <span>
                まだ欲しいものリストが登録されていません。
                {currentStatus === "AWAITING_APPROVAL" && " 今のうちに登録しておきましょう。"}
              </span>
            )}
          </div>
        </div>

        <div className="grid gap-4 mb-8 md:grid-cols-2">
          <div className="rounded-3xl border border-[#FFE2EA] bg-white/80 p-5 shadow-sm">
            <p className="text-xs font-bold text-[#FF8FA3] uppercase tracking-[0.3em]">For Creators</p>
            <h3 className="font-heading text-lg text-[#5D4037] mt-1">匿名でほしい物リストを公開する</h3>
            <p className="text-xs text-[#5D4037]/70 mt-2">
              受取人名や住所の設定ミスを防ぎ、安全にAmazonの欲しい物リストを共有する手順をまとめました。
            </p>
            <Link
              href="/resources/wishlist-privacy"
              className="mt-4 inline-flex items-center gap-2 rounded-full border border-[#FF8FA3]/30 px-4 py-2 text-xs font-bold text-[#FF8FA3] hover:bg-[#FFF5F7]"
            >
              ガイドを読む →
            </Link>
          </div>
          <div className="rounded-3xl border border-[#D2F1E4] bg-white/80 p-5 shadow-sm">
            <p className="text-xs font-bold text-[#38A169] uppercase tracking-[0.3em]">For Helpers</p>
            <h3 className="font-heading text-lg text-[#2E5939] mt-1">匿名でプレゼントを贈る</h3>
            <p className="text-xs text-[#2E5939]/70 mt-2">
              ギフト設定のオン／オフ別に送る側の注意点を整理。スクショ提出前にチェックしておきましょう。
            </p>
            <Link
              href="/resources/gift-privacy"
              className="mt-4 inline-flex items-center gap-2 rounded-full border border-[#38A169]/30 px-4 py-2 text-xs font-bold text-[#2E5939] hover:bg-[#E8FFF4]"
            >
              ガイドを読む →
            </Link>
          </div>
        </div>

        <div className="mb-8 rounded-3xl border border-[#FFE2EA] bg-white/80 p-6 shadow-sm">
          <div className="flex flex-col gap-4">
            <div>
              <p className="text-xs font-bold text-[#FF8FA3] uppercase tracking-[0.4em]">Friend Referral</p>
              <p className="text-lg font-heading text-[#5D4037] mt-1">友達紹介で確率をブースト</p>
              <p className="text-xs text-[#5D4037]/60 mt-1">リンクを共有して仲間を招待すると、あなたの抽選確率が上がります。</p>
            </div>

            {overviewStatus === "loading" ? (
              <p className="text-sm text-[#5D4037]/60">紹介情報を読み込み中...</p>
            ) : (
              <>
                <div className="rounded-2xl border border-white bg-white/70 p-4">
                  <p className="text-xs font-semibold text-[#A45A73]">あなたの紹介リンク</p>
                  <p className="mt-2 break-all font-mono text-sm text-[#FF5C8D]">
                    {referralLink ?? "発行準備中です"}
                  </p>
                  {referralEnsureError && <p className="mt-2 text-xs text-red-600">{referralEnsureError}</p>}
                  {referralLink ? (
                    <button
                      onClick={handleCopyReferral}
                      className="mt-3 w-full rounded-full border border-[#FFC0CB] bg-white/90 py-2 text-sm font-semibold text-[#5D4033] shadow-sm transition hover:bg-white"
                    >
                      {referralCopied ? "コピーしました！" : "リンクをコピー"}
                    </button>
                  ) : (
                    <button
                      onClick={() => void ensureReferralCode()}
                      disabled={referralEnsuring}
                      className="mt-3 w-full rounded-full border border-[#FFC0CB] bg-white/90 py-2 text-sm font-semibold text-[#5D4033] shadow-sm transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {referralEnsuring ? "発行中..." : "リンクを発行する"}
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-2xl bg-white/70 border border-white px-4 py-3">
                    <p className="text-xs font-semibold text-[#A45A73]">紹介済み人数</p>
                    <p className="text-lg font-heading text-[#5D1E4B]">{overview?.referral.count ?? 0}人</p>
                  </div>
                  <div className="rounded-2xl bg-white/70 border border-white px-4 py-3">
                    <p className="text-xs font-semibold text-[#A45A73]">現在の友達</p>
                    <p className="text-lg font-heading text-[#5D1E4B]">{referralFriends.length}人</p>
                  </div>
                </div>

                <div>
                  <p className="text-xs font-semibold text-[#A45A73] uppercase tracking-[0.3em]">Friends</p>
                  {referralFriends.length === 0 ? (
                    <p className="mt-2 text-sm text-[#5D4037]/60">まだ招待された友達はいません。リンクを共有してみましょう！</p>
                  ) : (
                    <ul className="mt-3 space-y-2 text-sm text-[#5D4037]">
                      {referralFriends.map((friend) => (
                        <li key={friend.id} className="rounded-2xl border border-[#FFE2EA] bg-white/90 px-4 py-3">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold">{friend.id.slice(0, 8)}</span>
                            <span className="text-xs text-[#FF5C8D]">{statusLabel[friend.status] ?? friend.status}</span>
                          </div>
                          <p className="text-[11px] text-[#5D4037]/60">{formatDate(friend.joinedAt)}</p>
                          {friend.wishlistUrl && (
                            <a
                              href={friend.wishlistUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs text-[#a34a5d] underline"
                            >
                              欲しいものリストを見る
                            </a>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        <div className="grid gap-6 mb-8 md:grid-cols-2">
          <div className="rounded-3xl border border-white bg-white/80 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-xs font-bold text-[#FF8FA3] uppercase tracking-[0.4em]">Apple History</p>
                <p className="text-lg font-heading text-[#5D4037] mt-1">りんご履歴</p>
              </div>
            </div>
            {overviewStatus === "loading" ? (
              <p className="text-sm text-[#5D4037]/60">履歴を読み込み中...</p>
            ) : appleHistory.length === 0 ? (
              <p className="text-sm text-[#5D4037]/60">まだりんごを引いていません。</p>
            ) : (
              <ul className="space-y-3">
                {appleHistory.map((apple) => (
                  <li key={apple.id} className="rounded-2xl border border-[#FFE2EA] bg-white/90 px-4 py-3 flex items-center gap-3">
                    <span className="text-2xl">{apple.result ? resultIconMap[apple.result] : "✨"}</span>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-[#5D4037]">
                        {apple.result ? `${resultLabelMap[apple.result]} Apple` : "結果待ち"}
                      </p>
                      <p className="text-xs text-[#5D4037]/60">{formatDate(apple.created_at)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-3xl border border-white bg-white/80 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-xs font-bold text-[#FF8FA3] uppercase tracking-[0.4em]">Purchase History</p>
                <p className="text-lg font-heading text-[#5D4037] mt-1">スクショ提出履歴</p>
              </div>
            </div>
            {overviewStatus === "loading" ? (
              <p className="text-sm text-[#5D4037]/60">履歴を読み込み中...</p>
            ) : purchaseHistory.length === 0 ? (
              <p className="text-sm text-[#5D4037]/60">まだスクリーンショットを提出していません。</p>
            ) : (
              <ul className="space-y-3">
                {purchaseHistory.map((purchase) => (
                  <li key={purchase.id} className="rounded-2xl border border-[#FFE2EA] bg-white/90 px-4 py-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-[#5D4037]">{purchase.status}</p>
                      <p className="text-xs text-[#5D4037]/50">{formatDate(purchase.created_at)}</p>
                    </div>
                    {purchase.notes && <p className="text-xs text-[#5D4037]/70 mt-1">{purchase.notes}</p>}
                    {purchase.screenshot_url && (
                      <p className="text-xs text-[#5D4037]/50 mt-1 break-all">スクショ: {purchase.screenshot_url}</p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="mb-8 rounded-3xl border border-white bg-white/80 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs font-bold text-[#FF8FA3] uppercase tracking-[0.4em]">Gift History</p>
              <p className="text-lg font-heading text-[#5D4037] mt-1">購入したプレゼント</p>
            </div>
          </div>
          {overviewStatus === "loading" ? (
            <p className="text-sm text-[#5D4037]/60">履歴を読み込み中...</p>
          ) : giftHistory.length === 0 ? (
            <p className="text-sm text-[#5D4037]/60">まだ誰かの欲しいものを購入していません。</p>
          ) : (
            <ul className="space-y-3">
              {giftHistory.map((gift) => (
                <li key={gift.id} className="rounded-2xl border border-[#FFE2EA] bg-white/90 px-4 py-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-[#5D4037]">{gift.wish?.primary_item_name ?? "アイテム名未登録"}</p>
                    <span className="text-xs text-[#FF5C8D]">{gift.status}</span>
                  </div>
                  <p className="text-xs text-[#5D4037]/60">{formatDate(gift.created_at)}</p>
                  {gift.wish?.item_price_jpy && (
                    <p className="text-xs text-[#5D4037]/60">{gift.wish.item_price_jpy.toLocaleString()}円</p>
                  )}
                  {gift.wish?.primary_item_url && (
                    <a
                      href={gift.wish.primary_item_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-[#a34a5d] underline"
                    >
                      商品ページを開く
                    </a>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        <button
          onClick={handleFullRefresh}
          className="w-full py-3 rounded-full border-2 border-[#FFD1DC] text-[#FF8FA3] font-bold text-sm hover:bg-[#FFF5F7] transition-colors flex items-center justify-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
          </svg>
          ステータスを更新
        </button>
        </div>
      </div>
    </div>
  );
}
