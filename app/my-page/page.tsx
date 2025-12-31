"use client";

import { useEffect, useMemo, useState } from "react";
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

export default function MyPage() {
  const { user, loading, refresh } = useUser();
  const router = useRouter();
  const [latestAppleId, setLatestAppleId] = useState<string | null>(null);
  const [usingTicket, setUsingTicket] = useState(false);
  const [ticketMessage, setTicketMessage] = useState<string | null>(null);

  const currentStatus = user?.status ?? "";
  const label = useMemo(() => statusLabel[currentStatus] ?? "状態を取得できません", [currentStatus]);
  const actionText = useMemo(() => cta[currentStatus] ?? "", [currentStatus]);
  const baseLink = useMemo(() => links[currentStatus] ?? null, [currentStatus]);
  const icon = useMemo(() => statusIcon[currentStatus] ?? "❓", [currentStatus]);
  const canManageWishlist = useMemo(() => {
    const allowed = new Set([
      "AWAITING_APPROVAL",
      "READY_TO_REGISTER_WISHLIST",
      "READY_TO_DRAW",
      "REVEALING",
      "WAITING_FOR_FULFILLMENT",
      "CYCLE_COMPLETE",
    ]);
    return allowed.has(currentStatus);
  }, [currentStatus]);

  const revealLink = useMemo(() => {
    if (currentStatus === "REVEALING" && latestAppleId) {
      return `/reveal/${latestAppleId}`;
    }
    return baseLink;
  }, [currentStatus, latestAppleId, baseLink]);

  const hasTicketOption = useMemo(() => {
    if (!user) return false;
    if (currentStatus !== "CYCLE_COMPLETE") return false;
    if (!user.can_use_ticket) return false;
    return (user.total_exemption_tickets ?? 0) > 0;
  }, [currentStatus, user]);

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
    <div className="min-h-screen flex items-center justify-center py-12 px-4 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_10%_10%,rgba(255,209,220,0.5),transparent_50%)] pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-full h-full bg-[radial-gradient(circle_at_90%_90%,rgba(255,253,208,0.5),transparent_50%)] pointer-events-none" />

      <div className="glass-card w-full max-w-lg p-8 md:p-10 rounded-[40px] shadow-2xl relative z-10 animate-fade-up border-2 border-white">
        <div className="text-center mb-8">
          <h1 className="font-heading text-2xl font-bold text-[#5D4037] mb-1">マイページ</h1>
          <p className="text-[#FF8FA3] font-bold text-sm">Welcome back!</p>
        </div>

        <div className="bg-white/60 rounded-3xl p-8 mb-8 border border-[#FFD1DC] shadow-sm text-center relative overflow-hidden">
           <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-[#FFD1DC] via-[#FF8FA3] to-[#FFD1DC]" />
           
           <div className="text-6xl mb-4 animate-float">{icon}</div>
           
           <div className="space-y-2">
             <div className="text-xs font-bold text-[#FF8FA3] tracking-widest uppercase">Current Status</div>
             <div className="text-lg font-bold text-[#5D4037]">{label}</div>
           </div>

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

        {/* Dashboard Stats (Placeholder for future features) */}
        <div className="grid grid-cols-2 gap-4 mb-8">
           <div className="bg-white/40 p-4 rounded-2xl text-center border border-white">
              <div className="text-2xl mb-1">🎫</div>
              <div className="text-xs text-[#5D4037]/60 font-bold">免除チケット</div>
              <div className="text-lg font-heading font-bold text-[#FF8FA3]">{user.total_exemption_tickets}枚</div>
           </div>
           <div className="bg-white/40 p-4 rounded-2xl text-center border border-white">
              <div className="text-2xl mb-1">💝</div>
              <div className="text-xs text-[#5D4037]/60 font-bold">獲得りんご</div>
              <div className="text-lg font-heading font-bold text-[#FF8FA3]">0個</div>
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

        <button
          onClick={refresh}
          className="w-full py-3 rounded-full border-2 border-[#FFD1DC] text-[#FF8FA3] font-bold text-sm hover:bg-[#FFF5F7] transition-colors flex items-center justify-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
          </svg>
          ステータスを更新
        </button>
      </div>
    </div>
  );
}
