"use client";

import { useEffect, useMemo, useState } from "react";
import { useAdminSecret } from "@/hooks/useAdminSecret";

type WeightKey = "poison" | "bronze" | "silver" | "gold" | "red";

type RtpResponse = {
  weights: Record<WeightKey, number>;
  currentRtp: number;
  health: {
    status: "normal" | "warning" | "neutral";
    poisonCount: number;
    totalTicketRewards: number;
    ratio: number;
  };
};

const LABELS: Record<WeightKey, string> = {
  poison: "毒りんご",
  bronze: "ブロンズ",
  silver: "シルバー",
  gold: "ゴールド",
  red: "赤りんご",
};

export default function AdminRtpPage() {
  const { secret, setSecret } = useAdminSecret();
  const [data, setData] = useState<RtpResponse | null>(null);
  const [weights, setWeights] = useState<Record<WeightKey, string>>({ poison: "", bronze: "", silver: "", gold: "", red: "" });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const total = useMemo(() => {
    return (Object.values(weights) as string[]).reduce((sum, value) => sum + (Number(value) || 0), 0);
  }, [weights]);

  const fetchData = async () => {
    if (!secret) {
      setError("Admin Secretを入力してください");
      return;
    }
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/rtp", {
        headers: { "x-admin-secret": secret },
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body.error ?? "取得に失敗しました");
        setData(null);
        return;
      }
      setData(body as RtpResponse);
      const nextWeights: Record<WeightKey, string> = { poison: "", bronze: "", silver: "", gold: "", red: "" };
      (Object.keys(body.weights) as WeightKey[]).forEach((key) => {
        nextWeights[key] = String(body.weights[key]);
      });
      setWeights(nextWeights);
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

  const handleChange = (key: WeightKey, value: string) => {
    setWeights((prev) => ({ ...prev, [key]: value }));
  };

  const handleUpdate = async () => {
    if (!secret) {
      setError("Admin Secretを入力してください");
      return;
    }
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const payload = {
        weights: {
          poison: Number(weights.poison),
          bronze: Number(weights.bronze),
          silver: Number(weights.silver),
          gold: Number(weights.gold),
          red: Number(weights.red),
        },
      };
      const res = await fetch("/api/admin/rtp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-secret": secret,
        },
        body: JSON.stringify(payload),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body.error ?? "更新に失敗しました");
        return;
      }
      setData(body as RtpResponse);
      const nextWeights: Record<WeightKey, string> = { poison: "", bronze: "", silver: "", gold: "", red: "" };
      (Object.keys(body.weights) as WeightKey[]).forEach((key) => {
        nextWeights[key] = String(body.weights[key]);
      });
      setWeights(nextWeights);
      setMessage("確率を更新しました");
    } catch (err) {
      setError(err instanceof Error ? err.message : "通信に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  const totalValid = Math.abs(total - 100) < 0.01;

  return (
    <div className="min-h-screen bg-[#FDF7FA] px-4 py-16 text-[#5C4033]">
      <div className="mx-auto w-full max-w-4xl space-y-6">
        <header className="rounded-3xl bg-white/80 px-6 py-8 shadow-lg border border-white">
          <h1 className="font-heading text-3xl font-bold text-[#FF5C8D]">RTP / 確率設定</h1>
          <p className="text-sm text-[#5C4033]/70 mt-1">各りんごの出現確率をメンテナンスできます。</p>
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
              {loading ? "読み込み中..." : "現在の設定を取得"}
            </button>
          </div>
          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
          {message && <p className="mt-3 text-sm text-green-700">{message}</p>}
        </header>

        {data && (
          <>
            <section className="rounded-3xl border border-white bg-white/90 p-6 shadow-md space-y-1">
              <p className="text-sm text-[#5C4033]/70">推定RTP: <span className="font-semibold text-[#FF5C8D]">{data.currentRtp.toFixed(2)}%</span></p>
              <p className="text-sm text-[#5C4033]/70">
                健全性: {data.health.status === "warning" ? <span className="text-[#f97316] font-semibold">警告</span> : data.health.status === "neutral" ? "---" : <span className="text-[#22c55e] font-semibold">正常</span>}
              </p>
              <p className="text-xs text-[#5C4033]/50">
                発行チケット {data.health.totalTicketRewards} / 毒りんご {data.health.poisonCount} (比率 {data.health.poisonCount > 0 ? data.health.ratio.toFixed(2) : "---"})
              </p>
            </section>

            <section className="rounded-3xl border border-white bg-white/90 p-6 shadow-md">
              <div className="grid gap-4 md:grid-cols-2">
                {(Object.keys(LABELS) as WeightKey[]).map((key) => (
                  <div key={key} className="rounded-2xl border border-[#FFD1DC] bg-white/70 p-4">
                    <label className="text-sm font-semibold text-[#5C4033]">{LABELS[key]}</label>
                    <input
                      type="number"
                      step="0.1"
                      value={weights[key]}
                      onChange={(e) => handleChange(key, e.target.value)}
                      className="mt-2 w-full rounded-2xl border border-[#FF8FA3]/40 bg-white px-4 py-2 text-sm outline-none focus:border-[#FF8FA3] focus:ring-4 focus:ring-[#FF8FA3]/20"
                    />
                  </div>
                ))}
              </div>
              <p className={`mt-4 text-sm font-semibold ${totalValid ? "text-[#22c55e]" : "text-[#f97316]"}`}>
                合計: {total.toFixed(2)}%
              </p>
              <button
                onClick={handleUpdate}
                disabled={!secret || loading || !totalValid}
                className="mt-4 w-full rounded-full bg-[#FF5C8D] px-6 py-3 text-white font-semibold shadow-md transition hover:shadow-lg disabled:opacity-60"
              >
                {loading ? "更新中..." : "RTPを更新する"}
              </button>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
