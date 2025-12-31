"use client";

import { useEffect, useMemo, useState } from "react";
import { useAdminSecret } from "@/hooks/useAdminSecret";

type WeightMap = {
  poison: number;
  bronze: number;
  silver: number;
  gold: number;
  red: number;
};

type DashboardResponse = {
  kpis: {
    totalUsers: number;
    activeUsers24h: number;
    pendingScreenshots: number;
    currentRtp: number;
    weights: WeightMap;
  };
  statusSummary: Record<string, number>;
  users: {
    id: string;
    email: string | null;
    status: string;
    createdAt: string;
    lastLoginAt: string | null;
  }[];
  generatedAt: string;
};

const STATUS_LABELS: Record<string, string> = {
  AWAITING_TOS_AGREEMENT: "規約同意待ち",
  AWAITING_GUIDE_CHECK: "使い方確認待ち",
  READY_TO_PURCHASE: "購入準備完了",
  AWAITING_APPROVAL: "購入承認待ち",
  READY_TO_REGISTER_WISHLIST: "リスト登録待ち",
  READY_TO_DRAW: "抽選待ち",
  REVEALING: "結果演出中",
  WAITING_FOR_FULFILLMENT: "購入待ち",
  CYCLE_COMPLETE: "サイクル完了",
};

export default function AdminDashboardPage() {
  const { secret, setSecret } = useAdminSecret();
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const [search, setSearch] = useState("");

  const fetchData = async () => {
    if (!secret) {
      setError("Admin Secretを入力してください");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/dashboard", {
        headers: {
          "x-admin-secret": secret,
        },
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body.error ?? "取得に失敗しました");
        setData(null);
      } else {
        setData(body as DashboardResponse);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "通信に失敗しました");
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (secret) {
      fetchData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredUsers = useMemo(() => {
    if (!data) return [];
    return data.users.filter((user) => {
      const matchStatus = selectedStatus === "ALL" || user.status === selectedStatus;
      const term = search.trim().toLowerCase();
      const matchSearch = term
        ? [user.email ?? "", user.id].some((token) => token.toLowerCase().includes(term))
        : true;
      return matchStatus && matchSearch;
    });
  }, [data, selectedStatus, search]);

  return (
    <div className="min-h-screen bg-[#FDF7FA] px-4 py-16 text-[#5C4033]">
      <div className="mx-auto w-full max-w-6xl space-y-8">
        <header className="rounded-3xl bg-white/80 px-6 py-8 shadow-lg border border-white">
          <h1 className="font-heading text-3xl font-bold text-[#FF5C8D]">管理者ダッシュボード</h1>
          <p className="text-sm text-[#5C4033]/70 mt-1">主要KPIとユーザーフローの状況を確認できます。</p>
          <div className="mt-6 flex flex-col gap-3 md:flex-row md:items-center">
            <input
              type="password"
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              placeholder="Admin Secret"
              className="w-full md:w-64 rounded-2xl border border-[#FFC0CB] bg-white/70 px-4 py-2 text-sm outline-none focus:border-[#FF8FA3] focus:ring-4 focus:ring-[#FF8FA3]/20"
            />
            <button
              onClick={fetchData}
              disabled={!secret || loading}
              className="w-full md:w-auto rounded-full bg-[#FF8FA3] px-6 py-2 text-sm font-semibold text-white shadow-md transition hover:shadow-lg disabled:opacity-60"
            >
              {loading ? "読み込み中..." : "最新情報を取得"}
            </button>
          </div>
          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
          {data && (
            <p className="mt-3 text-xs text-[#5C4033]/60">最終更新: {new Date(data.generatedAt).toLocaleString()}</p>
          )}
        </header>

        {data && (
          <>
            <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <article className="rounded-3xl border border-white bg-white/90 p-6 shadow-md">
                <p className="text-xs font-bold text-[#FF8FA3] uppercase tracking-[0.3em]">Users</p>
                <p className="mt-2 text-3xl font-heading">{data.kpis.totalUsers}</p>
                <p className="text-xs text-[#5C4033]/60">総ユーザー数</p>
              </article>
              <article className="rounded-3xl border border-white bg-white/90 p-6 shadow-md">
                <p className="text-xs font-bold text-[#84cc16] uppercase tracking-[0.3em]">Active 24h</p>
                <p className="mt-2 text-3xl font-heading">{data.kpis.activeUsers24h}</p>
                <p className="text-xs text-[#5C4033]/60">直近24時間のログイン</p>
              </article>
              <article className="rounded-3xl border border-white bg-white/90 p-6 shadow-md">
                <p className="text-xs font-bold text-[#f97316] uppercase tracking-[0.3em]">Pending</p>
                <p className="mt-2 text-3xl font-heading">{data.kpis.pendingScreenshots}</p>
                <p className="text-xs text-[#5C4033]/60">承認待ちスクショ</p>
              </article>
              <article className="rounded-3xl border border-white bg-white/90 p-6 shadow-md">
                <p className="text-xs font-bold text-[#6366f1] uppercase tracking-[0.3em]">RTP</p>
                <p className="mt-2 text-3xl font-heading">{data.kpis.currentRtp.toFixed(2)}%</p>
                <p className="text-xs text-[#5C4033]/60">現在の当選率(概算)</p>
              </article>
            </section>

            <section className="rounded-3xl border border-white bg-white/90 p-6 shadow-md">
              <h2 className="font-heading text-xl text-[#5C4033] mb-4">ステータス別ユーザー</h2>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => setSelectedStatus("ALL")}
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition ${selectedStatus === "ALL" ? "bg-[#FF8FA3] text-white" : "bg-white text-[#5C4033] border border-[#FFD1DC]"}`}
                >
                  すべて ({data.users.length})
                </button>
                {Object.entries(STATUS_LABELS).map(([status, label]) => (
                  <button
                    key={status}
                    onClick={() => setSelectedStatus(status)}
                    className={`rounded-full px-4 py-2 text-sm font-semibold transition ${selectedStatus === status ? "bg-[#FF8FA3] text-white" : "bg-white text-[#5C4033] border border-[#FFD1DC]"}`}
                  >
                    {label} ({data.statusSummary[status] ?? 0})
                  </button>
                ))}
              </div>
            </section>

            <section className="rounded-3xl border border-white bg-white/90 p-6 shadow-md">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <h2 className="font-heading text-xl text-[#5C4033]">ユーザー一覧</h2>
                <input
                  type="text"
                  placeholder="メール or ユーザーIDで検索"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full md:w-64 rounded-2xl border border-[#FFD1DC] bg-white/70 px-4 py-2 text-sm outline-none focus:border-[#FF8FA3] focus:ring-4 focus:ring-[#FF8FA3]/20"
                />
              </div>
              <div className="mt-4 overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead>
                    <tr className="text-xs uppercase tracking-widest text-[#5C4033]/60">
                      <th className="py-3 pr-4">メール</th>
                      <th className="py-3 pr-4">ステータス</th>
                      <th className="py-3 pr-4">登録日時</th>
                      <th className="py-3 pr-4">最終ログイン</th>
                      <th className="py-3">ユーザーID</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((user) => (
                      <tr key={user.id} className="border-t border-[#FFE4EC]">
                        <td className="py-3 pr-4 font-medium">{user.email ?? "(メール不明)"}</td>
                        <td className="py-3 pr-4">
                          <span className="rounded-full bg-[#FFF1F4] px-3 py-1 text-xs font-semibold text-[#FF5C8D]">
                            {STATUS_LABELS[user.status] ?? user.status}
                          </span>
                        </td>
                        <td className="py-3 pr-4">{new Date(user.createdAt).toLocaleString()}</td>
                        <td className="py-3 pr-4">{user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : "未ログイン"}</td>
                        <td className="py-3 font-mono text-xs">{user.id}</td>
                      </tr>
                    ))}
                    {filteredUsers.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-6 text-center text-[#5C4033]/60">
                          対象のユーザーが見つかりませんでした。
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
