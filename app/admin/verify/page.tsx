"use client";

import { useEffect, useState } from "react";

type Purchase = {
  id: string;
  user_id: string;
  screenshot_url: string | null;
  status: string;
  created_at: string;
  notes: string | null;
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
  const [secret, setSecret] = useState("");
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const fetchPurchases = async () => {
    setLoading(true);
    setError("");
    setMessage("");
    const res = await fetch("/api/admin/purchases", {
      headers: {
        "x-admin-secret": secret,
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
  };

  const handleAction = async (purchaseId: string, userId: string, action: "approve" | "reject") => {
    setLoading(true);
    setError("");
    setMessage("");
    const res = await fetch("/api/admin/purchases", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-admin-secret": secret,
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
  };

  useEffect(() => {
    // no auto fetch until secret is entered
  }, []);

  return (
    <div className="min-h-screen bg-[#F5F5F5] px-4 py-12 text-[#5C4033]">
      <div className="mx-auto w-full max-w-4xl rounded-2xl bg-white p-8 shadow-lg">
        <h1 className="font-heading mb-6 text-2xl">管理者承認</h1>

        <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center">
          <input
            type="password"
            placeholder="Admin Secret"
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            className="w-full md:w-64 rounded-lg border border-[#FFC0CB]/60 bg-white px-3 py-2 text-sm outline-none transition focus:border-[#FFC0CB] focus:ring-2 focus:ring-[#FFC0CB]/50"
          />
          <button
            onClick={fetchPurchases}
            disabled={!secret || loading}
            className="md:w-40 w-full rounded-full bg-[#FFC0CB] px-5 py-2 text-sm font-semibold text-[#5C4033] shadow-md transition hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "読込中..." : "承認待ちを取得"}
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
                <div>User ID: {p.user_id}</div>
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
