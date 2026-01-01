"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Purchase = {
  id: string;
  user_id: string;
  screenshot_url: string | null;
  status: string;
  created_at: string;
  notes: string | null;
  buyerAuth?: {
    email: string | null;
  } | null;
  assignment?: {
    id: string;
    status: string;
    targetUser?: {
      id: string;
      email: string | null;
      status: string;
      wishlist_url: string | null;
      wishlist?: {
        item_price_jpy: number | null;
        primary_item_name: string | null;
        primary_item_url: string | null;
      } | null;
    } | null;
  } | null;
  users?: {
    status: string;
    wishlist_url?: string | null;
    wishlists?: {
      item_price_jpy: number | null;
      primary_item_name: string | null;
      primary_item_url?: string | null;
    } | null;
  } | null;
};

export default function AdminVerifyPage() {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const withAuth = useCallback(async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.access_token) {
      setError("管理者としてログインしてください");
      return null;
    }
    return session.access_token;
  }, []);

  const fetchPurchases = useCallback(async () => {
    const token = await withAuth();
    if (!token) {
      setPurchases([]);
      return;
    }
    setLoading(true);
    setError("");
    setMessage("");
    const res = await fetch("/api/admin/purchases", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "取得に失敗しました");
      setLoading(false);
      return;
    }
    setPurchases(data.purchases ?? []);
    setLoading(false);
  }, [withAuth]);

  const handleAction = useCallback(
    async (purchaseId: string, userId: string, action: "approve" | "reject") => {
      const token = await withAuth();
      if (!token) return;
      setLoading(true);
      setError("");
      setMessage("");
      const res = await fetch("/api/admin/purchases", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ purchaseId, userId, action }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "処理に失敗しました");
        setLoading(false);
        return;
      }
      setMessage("処理しました");
      await fetchPurchases();
    },
    [fetchPurchases, withAuth]
  );

  useEffect(() => {
    const id = setTimeout(() => {
      void fetchPurchases();
    }, 0);
    return () => clearTimeout(id);
  }, [fetchPurchases]);

  return (
    <div className="min-h-screen bg-[#F5F5F5] px-4 py-12 text-[#5C4033]">
      <div className="mx-auto w-full max-w-4xl rounded-2xl bg-white p-8 shadow-lg">
        <div className="mb-6 space-y-2">
          <h1 className="font-heading text-2xl">管理者承認</h1>
          <p className="text-sm text-[#5C4033]/70">
            承認すると購入者は次ステップへ進み、同時に割当先ユーザーが自動的に「受取完了」扱いになり CYCLE_COMPLETE へ更新されます。
          </p>
        </div>

        <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center">
          <button
            onClick={fetchPurchases}
            disabled={loading}
            className="md:w-40 w-full rounded-full bg-[#FFC0CB] px-5 py-2 text-sm font-semibold text-[#5C4033] shadow-md transition hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "読込中..." : "承認待ちを更新"}
          </button>
        </div>

        {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
        {message && <p className="mb-4 text-sm text-green-700">{message}</p>}

        <div className="space-y-4">
          {purchases.length === 0 && !loading && (
            <p className="text-sm text-[#5C4033]/80">承認待ちはありません。</p>
          )}

          {purchases.map((p) => (
            <div
              key={p.id}
              className="rounded-xl border border-[#FFC0CB]/60 bg-[#FFFDD0]/40 p-4 shadow-sm"
            >
              <div className="flex flex-col gap-2 text-sm text-[#5C4033]/90">
                <div className="font-semibold">Purchase ID: {p.id}</div>
                <div>
                  購入者 ID: {p.user_id}
                  {p.buyerAuth?.email && <span className="ml-2 text-xs text-[#5C4033]/70">({p.buyerAuth.email})</span>}
                </div>
                <div>ステータス: {p.status}</div>
                {p.users?.status && <div>ユーザー現在ステータス: {p.users.status}</div>}
                {p.users?.wishlists?.primary_item_name && (
                  <div>
                    希望商品: {p.users.wishlists.primary_item_name}
                    {typeof p.users.wishlists.item_price_jpy === "number" && (
                      <> ({p.users.wishlists.item_price_jpy.toLocaleString()}円)</>
                    )}
                  </div>
                )}
                {p.users?.wishlists?.primary_item_url && (
                  <a
                    className="text-[#a34a5d] underline"
                    href={p.users.wishlists.primary_item_url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    商品ページを開く
                  </a>
                )}
                {p.users?.wishlist_url && (
                  <a
                    className="text-[#a34a5d] underline"
                    href={p.users.wishlist_url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    欲しいものリスト全体を見る
                  </a>
                )}
                {p.screenshot_url && (
                  <a
                    className="text-[#a34a5d] underline"
                    href={p.screenshot_url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    スクショURLを開く
                  </a>
                )}
                {p.notes && <div>メモ: {p.notes}</div>}
                <div>提出日時: {new Date(p.created_at).toLocaleString()}</div>
              </div>

              {p.assignment && (
                <div className="mt-4 rounded-xl bg-white/70 border border-[#FFC0CB]/60 p-3 text-sm text-[#5C4033] space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold text-[#FF5C8D]">対象ユーザー</p>
                    <span className="text-xs text-[#5C4033]/60">Assignment: {p.assignment.id}</span>
                  </div>
                  {p.assignment.targetUser ? (
                    <>
                      <div>
                        ID: {p.assignment.targetUser.id}
                        {p.assignment.targetUser.email && (
                          <span className="ml-2 text-xs text-[#5C4033]/70">({p.assignment.targetUser.email})</span>
                        )}
                      </div>
                      <div>現在ステータス: {p.assignment.targetUser.status}</div>
                      {p.assignment.targetUser.wishlist_url && (
                        <a
                          className="text-[#a34a5d] underline"
                          href={p.assignment.targetUser.wishlist_url}
                          target="_blank"
                          rel="noreferrer"
                        >
                          欲しいものリストを開く
                        </a>
                      )}
                      {p.assignment.targetUser.wishlist?.primary_item_name && (
                        <div>
                          リクエスト: {p.assignment.targetUser.wishlist.primary_item_name}
                          {typeof p.assignment.targetUser.wishlist.item_price_jpy === "number" && (
                            <> ({p.assignment.targetUser.wishlist.item_price_jpy.toLocaleString()}円)</>
                          )}
                        </div>
                      )}
                      {p.assignment.targetUser.wishlist?.primary_item_url && (
                        <a
                          className="text-[#a34a5d] underline"
                          href={p.assignment.targetUser.wishlist.primary_item_url}
                          target="_blank"
                          rel="noreferrer"
                        >
                          商品ページを開く
                        </a>
                      )}
                    </>
                  ) : (
                    <p className="text-[#5C4033]/70">割当先の詳細を取得できませんでした。</p>
                  )}
                </div>
              )}

              <div className="mt-3 flex flex-wrap gap-3">
                <button
                  onClick={() => handleAction(p.id, p.user_id, "approve")}
                  disabled={loading}
                  className="rounded-full bg-[#98FF98] px-4 py-2 text-sm font-semibold text-[#5C4033] shadow-sm transition hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
                >
                  承認
                </button>
                <button
                  onClick={() => handleAction(p.id, p.user_id, "reject")}
                  disabled={loading}
                  className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-[#5C4033] shadow-sm ring-1 ring-[#FFC0CB] transition hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
                >
                  却下
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
