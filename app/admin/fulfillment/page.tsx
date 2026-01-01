"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type QueueItem = {
  id: string;
  status: string;
  wishlists?: {
    primary_item_name: string | null;
    item_price_jpy: number | null;
    primary_item_url: string | null;
  } | null;
};

export default function AdminFulfillmentPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [queue, setQueue] = useState<QueueItem[]>([]);

  const getToken = useCallback(async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.access_token) {
      setError("管理者としてログインしてください");
      return null;
    }
    return session.access_token;
  }, []);

  const fetchQueue = useCallback(async () => {
    const token = await getToken();
    if (!token) {
      setQueue([]);
      return;
    }
    setLoading(true);
    setError(null);
    setMessage(null);
    const res = await fetch("/api/admin/fulfillments", {
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
    setQueue(data.queue ?? []);
    setLoading(false);
  }, [getToken]);

  const markFulfilled = useCallback(
    async (userId: string) => {
      const token = await getToken();
      if (!token) return;
      setLoading(true);
      setError(null);
      setMessage(null);
      const res = await fetch("/api/admin/fulfillments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ userId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "処理に失敗しました");
        setLoading(false);
        return;
      }
      setMessage("完了としてマークしました");
      await fetchQueue();
    },
    [fetchQueue, getToken]
  );

  useEffect(() => {
    const id = setTimeout(() => {
      void fetchQueue();
    }, 0);
    return () => clearTimeout(id);
  }, [fetchQueue]);

  return (
    <div className="min-h-screen bg-[#F5F5F5] px-4 py-12 text-[#5C4033]">
      <div className="mx-auto w-full max-w-5xl rounded-2xl bg-white p-8 shadow-lg">
        <h1 className="font-heading mb-6 text-2xl">管理者: プレゼント完了管理</h1>

        <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center">
          <button
            onClick={fetchQueue}
            disabled={loading}
            className="md:w-48 w-full rounded-full bg-[#FFC0CB] px-5 py-2 text-sm font-semibold text-[#5C4033] shadow-md transition hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "読込中..." : "待機ユーザーを更新"}
          </button>
        </div>

        {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
        {message && <p className="mb-4 text-sm text-green-700">{message}</p>}

        <div className="space-y-4">
          {queue.length === 0 && !loading && <p className="text-sm text-[#5C4033]/70">待機中のユーザーはいません。</p>}

          {queue.map((user) => (
            <div key={user.id} className="rounded-xl border border-[#FFC0CB]/60 bg-[#FFFDD0]/40 p-4 shadow-sm">
              <div className="text-sm text-[#5C4033]/90 space-y-1">
                <div className="font-semibold">User ID: {user.id}</div>
                <div>ステータス: {user.status}</div>
                {user.wishlists?.primary_item_name && (
                  <div>
                    希望商品: {user.wishlists.primary_item_name}
                    {user.wishlists.item_price_jpy && ` (${user.wishlists.item_price_jpy.toLocaleString()}円)`}
                  </div>
                )}
                {user.wishlists?.primary_item_url && (
                  <a
                    className="text-[#a34a5d] underline"
                    href={user.wishlists.primary_item_url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    商品ページを開く
                  </a>
                )}
              </div>

              <button
                onClick={() => markFulfilled(user.id)}
                disabled={loading}
                className="mt-4 rounded-full bg-[#98FF98] px-4 py-2 text-sm font-semibold text-[#5C4033] shadow-sm transition hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
              >
                受取完了としてマーク
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
