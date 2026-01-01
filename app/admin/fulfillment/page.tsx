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

type FulfillmentEvent = {
  id: string;
  status: "completed" | "rejected";
  createdAt: string;
  purchaseId: string;
  purchaseCreatedAt: string | null;
  screenshotUrl: string | null;
  buyerNotes: string | null;
  buyer: {
    id: string;
    email: string | null;
  } | null;
  recipient: {
    id: string;
    email: string | null;
    status: string;
    wishlistUrl: string | null;
    wishlist?: {
      primary_item_name: string | null;
      primary_item_url: string | null;
      item_price_jpy: number | null;
    } | null;
  } | null;
};

export default function AdminFulfillmentPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [events, setEvents] = useState<FulfillmentEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [eventsError, setEventsError] = useState<string | null>(null);

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

  const fetchEvents = useCallback(async () => {
    const token = await getToken();
    if (!token) {
      setEvents([]);
      return;
    }
    setEventsLoading(true);
    setEventsError(null);
    const res = await fetch("/api/admin/fulfillment-events?limit=50", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const data = await res.json();
    if (!res.ok) {
      setEventsError(data.error ?? "取得に失敗しました");
      setEventsLoading(false);
      return;
    }
    setEvents(data.events ?? []);
    setEventsLoading(false);
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
      void fetchEvents();
    }, 0);
    return () => clearTimeout(id);
  }, [fetchEvents, fetchQueue]);

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
          <button
            onClick={fetchEvents}
            disabled={eventsLoading}
            className="md:w-48 w-full rounded-full border border-[#FFC0CB] px-5 py-2 text-sm font-semibold text-[#5C4033] shadow-sm transition hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
          >
            {eventsLoading ? "ログ更新中..." : "自動完了ログを更新"}
          </button>
        </div>

        {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
        {message && <p className="mb-4 text-sm text-green-700">{message}</p>}
        {eventsError && <p className="mb-4 text-sm text-red-600">{eventsError}</p>}

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

        <section className="mt-8 rounded-2xl border border-[#FFD1DC] bg-white/80 p-6 shadow-md">
          <div className="flex items-center justify-between gap-4 mb-4">
            <div>
              <h2 className="font-heading text-xl text-[#5C4033]">自動完了ログ</h2>
              <p className="text-sm text-[#5C4033]/70">購入承認と同時に記録される購入者⇔受取者のペア履歴です。</p>
            </div>
            <span className="text-xs text-[#5C4033]/60">最新 {events.length} 件</span>
          </div>

          {events.length === 0 && !eventsLoading ? (
            <p className="text-sm text-[#5C4033]/60">まだ記録がありません。</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="text-xs uppercase tracking-widest text-[#5C4033]/60">
                    <th className="py-2 pr-4">日時</th>
                    <th className="py-2 pr-4">購入者</th>
                    <th className="py-2 pr-4">受取者</th>
                    <th className="py-2 pr-4">ステータス</th>
                    <th className="py-2">証跡</th>
                  </tr>
                </thead>
                <tbody>
                  {events.map((event) => (
                    <tr key={event.id} className="border-t border-[#FFE4EC]">
                      <td className="py-3 pr-4 align-top">
                        <div className="font-semibold text-[#5C4033]">{new Date(event.createdAt).toLocaleString()}</div>
                        {event.purchaseCreatedAt && (
                          <div className="text-[11px] text-[#5C4033]/60">提出: {new Date(event.purchaseCreatedAt).toLocaleString()}</div>
                        )}
                        <div className="text-[11px] text-[#5C4033]/60">Purchase ID: {event.purchaseId}</div>
                      </td>
                      <td className="py-3 pr-4 align-top">
                        {event.buyer ? (
                          <div>
                            <div className="font-semibold">{event.buyer.email ?? "(メール不明)"}</div>
                            <div className="text-[11px] text-[#5C4033]/60">ID: {event.buyer.id}</div>
                          </div>
                        ) : (
                          <span className="text-[#5C4033]/60">不明</span>
                        )}
                      </td>
                      <td className="py-3 pr-4 align-top">
                        {event.recipient ? (
                          <div className="space-y-1">
                            <div className="font-semibold">{event.recipient.email ?? "(メール不明)"}</div>
                            <div className="text-[11px] text-[#5C4033]/60">ID: {event.recipient.id}</div>
                            <div className="text-[11px] text-[#5C4033]/60">Status: {event.recipient.status}</div>
                            {event.recipient.wishlist?.primary_item_name && (
                              <div className="text-[11px] text-[#5C4033]">
                                {event.recipient.wishlist.primary_item_name}
                                {typeof event.recipient.wishlist.item_price_jpy === "number" && ` (${event.recipient.wishlist.item_price_jpy.toLocaleString()}円)`}
                              </div>
                            )}
                            {event.recipient.wishlistUrl && (
                              <a
                                href={event.recipient.wishlistUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[11px] text-[#a34a5d] underline"
                              >
                                リストを開く
                              </a>
                            )}
                          </div>
                        ) : (
                          <span className="text-[#5C4033]/60">割当情報なし</span>
                        )}
                      </td>
                      <td className="py-3 pr-4 align-top">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            event.status === "completed" ? "bg-[#E0FFE0] text-[#1f7a1f]" : "bg-[#FFE4E1] text-[#a94442]"
                          }`}
                        >
                          {event.status === "completed" ? "完了" : "却下"}
                        </span>
                      </td>
                      <td className="py-3 align-top">
                        <div className="flex flex-col gap-2">
                          {event.screenshotUrl && (
                            <a
                              className="text-[#a34a5d] underline text-xs"
                              href={event.screenshotUrl}
                              target="_blank"
                              rel="noreferrer"
                            >
                              スクショを開く
                            </a>
                          )}
                          {event.buyerNotes && (
                            <p className="text-[11px] text-[#5C4033]/80">備考: {event.buyerNotes}</p>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
