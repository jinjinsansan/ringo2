"use client";

import { useEffect, useMemo, useState } from "react";
import { useAdminSecret } from "@/hooks/useAdminSecret";

type ReferralEntry = {
  rank: number;
  id: string;
  email: string | null;
  referralCount: number;
  createdAt: string;
  status: string;
};

type ReferralResponse = {
  totalReferrals: number;
  averageReferrals: number;
  ranking: ReferralEntry[];
  generatedAt: string;
};

const STATUS_LABELS: Record<string, string> = {
  AWAITING_TOS_AGREEMENT: "規約未同意",
  AWAITING_GUIDE_CHECK: "ガイド未確認",
  READY_TO_PURCHASE: "購入待ち",
  AWAITING_APPROVAL: "承認待ち",
  READY_TO_REGISTER_WISHLIST: "リスト登録待ち",
  READY_TO_DRAW: "抽選待ち",
  REVEALING: "演出中",
  WAITING_FOR_FULFILLMENT: "購入待ち",
  CYCLE_COMPLETE: "次サイクル可",
};

export default function AdminReferralPage() {
  const { secret, setSecret } = useAdminSecret();
  const [data, setData] = useState<ReferralResponse | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    if (!secret) {
      setError("Admin Secretを入力してください");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/referrals", {
        headers: { "x-admin-secret": secret },
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body.error ?? "取得に失敗しました");
        setData(null);
      } else {
        setData(body as ReferralResponse);
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

  const filteredRanking = useMemo(() => {
    if (!data) return [];
    const term = search.trim().toLowerCase();
    if (!term) return data.ranking;
    return data.ranking.filter((entry) => {
      return [entry.email ?? "", entry.id].some((token) => token.toLowerCase().includes(term));
    });
  }, [data, search]);

  return (
    <div className="min-h-screen bg-[#FDF7FA] px-4 py-16 text-[#5C4033]">
      <div className="mx-auto w-full max-w-4xl space-y-6">
        <header className="rounded-3xl bg-white/80 px-6 py-8 shadow-lg border border-white">
          <h1 className="font-heading text-3xl font-bold text-[#FF5C8D]">友達紹介ランキング</h1>
          <p className="text-sm text-[#5C4033]/70 mt-1">紹介状況をサマリとランキングで確認できます。</p>
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
          {data && <p className="mt-3 text-xs text-[#5C4033]/60">最終更新: {new Date(data.generatedAt).toLocaleString()}</p>}
        </header>

        {data && (
          <>
            <section className="grid gap-4 md:grid-cols-2">
              <article className="rounded-3xl border border-white bg-white/90 p-6 shadow-md">
                <p className="text-xs font-bold text-[#FF8FA3] uppercase tracking-[0.3em]">Total Referrals</p>
                <p className="mt-2 text-3xl font-heading">{data.totalReferrals}</p>
                <p className="text-xs text-[#5C4033]/60">累計紹介人数</p>
              </article>
              <article className="rounded-3xl border border-white bg-white/90 p-6 shadow-md">
                <p className="text-xs font-bold text-[#6366f1] uppercase tracking-[0.3em]">Avg / User</p>
                <p className="mt-2 text-3xl font-heading">{data.averageReferrals.toFixed(2)}</p>
                <p className="text-xs text-[#5C4033]/60">ユーザー平均紹介人数</p>
              </article>
            </section>

            <section className="rounded-3xl border border-white bg-white/90 p-6 shadow-md">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <h2 className="font-heading text-xl text-[#5C4033]">ランキング</h2>
                <input
                  type="text"
                  placeholder="メール or IDで検索"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full md:w-64 rounded-2xl border border-[#FFD1DC] bg-white/70 px-4 py-2 text-sm outline-none focus:border-[#FF8FA3] focus:ring-4 focus:ring-[#FF8FA3]/20"
                />
              </div>
              <div className="mt-4 overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead>
                    <tr className="text-xs uppercase tracking-widest text-[#5C4033]/60">
                      <th className="py-3 pr-4">順位</th>
                      <th className="py-3 pr-4">メール</th>
                      <th className="py-3 pr-4">紹介人数</th>
                      <th className="py-3 pr-4">登録日時</th>
                      <th className="py-3">ステータス</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRanking.map((entry) => (
                      <tr key={entry.id} className="border-t border-[#FFE4EC]">
                        <td className="py-3 pr-4 font-heading text-lg text-[#FF5C8D]">#{entry.rank}</td>
                        <td className="py-3 pr-4 font-medium">{entry.email ?? "(メール不明)"}</td>
                        <td className="py-3 pr-4 font-semibold">{entry.referralCount}</td>
                        <td className="py-3 pr-4">{new Date(entry.createdAt).toLocaleDateString()}</td>
                        <td className="py-3">
                          <span className="rounded-full bg-[#FFF1F4] px-3 py-1 text-xs font-semibold text-[#FF5C8D]">
                            {STATUS_LABELS[entry.status] ?? entry.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {filteredRanking.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-6 text-center text-[#5C4033]/60">
                          該当するユーザーはいません。
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
