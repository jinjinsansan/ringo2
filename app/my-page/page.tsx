"use client";

import { useMemo } from "react";
import { useUser } from "@/context/UserContext";

const nextActions: Record<string, string> = {
  AWAITING_TOS_AGREEMENT: "利用規約に同意してください。/tos へ",
  AWAITING_GUIDE_CHECK: "使い方ガイドを確認してください。/guide へ",
  READY_TO_PURCHASE: "誰かの欲しいものを購入し、スクショを提出してください。/purchase/submit へ",
  AWAITING_APPROVAL: "管理者の承認をお待ちください。",
  READY_TO_REGISTER_WISHLIST: "自分の欲しいものリストを登録してください（未実装）。",
  READY_TO_DRAW: "りんごを引けます。/draw へ",
  REVEALING: "結果公開までお待ちください。/reveal/{id} へ",
  WAITING_FOR_FULFILLMENT: "あなたの欲しいものが購入されるのを待っています。",
  CYCLE_COMPLETE: "サイクル完了。次のサイクルを開始できます。",
};

const links: Record<string, string | null> = {
  AWAITING_TOS_AGREEMENT: "/tos",
  AWAITING_GUIDE_CHECK: "/guide",
  READY_TO_PURCHASE: "/purchase/submit",
  READY_TO_REGISTER_WISHLIST: null,
  READY_TO_DRAW: "/draw",
  REVEALING: null,
  WAITING_FOR_FULFILLMENT: null,
  CYCLE_COMPLETE: "/purchase/submit",
  AWAITING_APPROVAL: null,
};

export default function MyPage() {
  const { user, loading, refresh } = useUser();

  const statusText = useMemo(() => {
    if (!user?.status) return "--";
    return user.status;
  }, [user?.status]);

  const next = user?.status ? nextActions[user.status] ?? "" : "";
  const link = user?.status ? links[user.status] ?? null : null;

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F5F5F5] text-[#5C4033]">
        読み込み中...
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F5F5F5] text-[#5C4033]">
        ユーザー情報が取得できません。ログインを確認してください。
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F5F5] px-4 py-12 text-[#5C4033]">
      <div className="mx-auto w-full max-w-2xl rounded-2xl bg-white p-8 shadow-lg">
        <h1 className="font-heading mb-4 text-2xl">マイページ</h1>
        <div className="space-y-2 text-sm text-[#5C4033]/90">
          <div className="font-semibold">現在のステータス: {statusText}</div>
          <div>次のアクション: {next}</div>
          {link && (
            <a
              href={link}
              className="inline-block rounded-full bg-[#FFC0CB] px-4 py-2 text-xs font-semibold text-[#5C4033] shadow-sm transition hover:shadow-md"
            >
              進む
            </a>
          )}
        </div>

        <button
          onClick={refresh}
          className="mt-6 w-full rounded-full border border-[#FFC0CB] px-4 py-2 text-sm font-semibold text-[#5C4033] transition hover:bg-[#FFC0CB]/30"
        >
          ステータスを再取得
        </button>
      </div>
    </div>
  );
}
