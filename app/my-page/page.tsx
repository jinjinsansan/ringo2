"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/context/UserContext";

const statusLabel: Record<string, string> = {
  AWAITING_TOS_AGREEMENT: "利用規約の同意が必要です",
  AWAITING_GUIDE_CHECK: "使い方ガイドの確認が必要です",
  READY_TO_PURCHASE: "購入ステップへ進めます",
  AWAITING_APPROVAL: "購入承認待ちです",
  READY_TO_REGISTER_WISHLIST: "欲しいものリスト登録が必要です",
  READY_TO_DRAW: "りんごを引けます",
  REVEALING: "結果待ちです",
  WAITING_FOR_FULFILLMENT: "あなたの欲しいものが買われるのを待っています",
  CYCLE_COMPLETE: "サイクル完了。次へ進めます",
};

const cta: Record<string, string> = {
  AWAITING_TOS_AGREEMENT: "規約に同意する",
  AWAITING_GUIDE_CHECK: "使い方を見る",
  READY_TO_PURCHASE: "スクショを提出する",
  READY_TO_REGISTER_WISHLIST: "リストを登録する (準備中)",
  READY_TO_DRAW: "りんごを引く",
  REVEALING: "結果を確認する",
  CYCLE_COMPLETE: "次のサイクルへ",
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
  const router = useRouter();

  const currentStatus = user?.status ?? "";
  const label = useMemo(() => statusLabel[currentStatus] ?? "状態を取得できません", [currentStatus]);
  const actionText = useMemo(() => cta[currentStatus] ?? "", [currentStatus]);
  const link = useMemo(() => links[currentStatus] ?? null, [currentStatus]);

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
          <div className="text-xs font-semibold text-[#a34a5d]">今のステップ</div>
          <div className="text-base font-semibold">{label}</div>
          {link && actionText && (
            <button
              onClick={() => router.push(link)}
              className="mt-3 inline-block rounded-full bg-[#FFC0CB] px-4 py-2 text-xs font-semibold text-[#5C4033] shadow-sm transition hover:shadow-md"
            >
              {actionText}
            </button>
          )}
          {!link && actionText && (
            <div className="mt-3 text-xs text-[#5C4033]/80">{actionText}</div>
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
