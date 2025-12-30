"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { FlowGuard } from "@/components/FlowGuard";
import { supabase } from "@/lib/supabaseClient";
import { useUser } from "@/context/UserContext";

type FormState = {
  wishlistUrl: string;
  primaryItemName: string;
  primaryItemUrl: string;
  budgetMin: string;
  budgetMax: string;
  note: string;
};

type RequestState = "idle" | "loading" | "success" | "error";

const initialForm: FormState = {
  wishlistUrl: "",
  primaryItemName: "",
  primaryItemUrl: "",
  budgetMin: "",
  budgetMax: "",
  note: "",
};

export default function WishlistRegisterPage() {
  const router = useRouter();
  const { refresh } = useUser();
  const [form, setForm] = useState<FormState>(initialForm);
  const [initialLoading, setInitialLoading] = useState(true);
  const [state, setState] = useState<RequestState>("idle");
  const [message, setMessage] = useState("ランキングで良く売れるのは、3,000〜5,000円の実用品です。リンク先と金額感を明記しておくと親切です。 ");
  const [errorDetail, setErrorDetail] = useState<string | null>(null);

  const budgetLabel = useMemo(() => {
    if (!form.budgetMin && !form.budgetMax) return "指定なし";
    const min = form.budgetMin ? `${Number(form.budgetMin).toLocaleString()}円` : "―";
    const max = form.budgetMax ? `${Number(form.budgetMax).toLocaleString()}円` : "―";
    return `${min} 〜 ${max}`;
  }, [form.budgetMin, form.budgetMax]);

  useEffect(() => {
    const fetchExisting = async () => {
      setInitialLoading(true);
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        setErrorDetail("ログインが必要です");
        setInitialLoading(false);
        return;
      }

      const res = await fetch("/api/wishlist", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        setForm((prev) => ({
          ...prev,
          wishlistUrl: data.wishlistUrl ?? "",
          primaryItemName: data.wishlist?.primary_item_name ?? "",
          primaryItemUrl: data.wishlist?.primary_item_url ?? "",
          budgetMin: data.wishlist?.budget_min != null ? String(data.wishlist.budget_min) : "",
          budgetMax: data.wishlist?.budget_max != null ? String(data.wishlist.budget_max) : "",
          note: data.wishlist?.note ?? "",
        }));
        setMessage("登録済みの情報を更新することもできます。");
      } else if (res.status !== 404) {
        const data = await res.json().catch(() => ({ error: "" }));
        setErrorDetail(data.error || "取得に失敗しました");
      }

      setInitialLoading(false);
    };

    fetchExisting();
  }, []);

  const updateForm = (field: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const parseBudget = (value: string) => {
    if (!value) return null;
    const num = Number(value);
    if (Number.isNaN(num) || num < 0) return null;
    return num;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setState("loading");
    setErrorDetail(null);

    if (!form.wishlistUrl.trim()) {
      setState("error");
      setErrorDetail("Amazon欲しいものリストのURLを入力してください");
      return;
    }

    if (!form.primaryItemName.trim()) {
      setState("error");
      setErrorDetail("まず購入してほしい商品の名前を入力してください");
      return;
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      setState("error");
      setErrorDetail("ログインが必要です");
      return;
    }

    const payload = {
      wishlistUrl: form.wishlistUrl.trim(),
      primaryItemName: form.primaryItemName.trim(),
      primaryItemUrl: form.primaryItemUrl.trim() || undefined,
      budgetMin: parseBudget(form.budgetMin),
      budgetMax: parseBudget(form.budgetMax),
      note: form.note.trim() || undefined,
    };

    const res = await fetch("/api/wishlist", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({ error: "保存に失敗しました" }));
      setState("error");
      setErrorDetail(data.error || "保存に失敗しました");
      return;
    }

    setState("success");
    setMessage("保存しました！次はいよいよ抽選ステップへ進めます。");
    await refresh();
    router.push("/draw");
  };

  return (
    <FlowGuard
      requiredStatus={[
        "READY_TO_REGISTER_WISHLIST",
        "READY_TO_DRAW",
        "REVEALING",
        "WAITING_FOR_FULFILLMENT",
        "CYCLE_COMPLETE",
      ]}
      fallback="/my-page"
    >
      <div className="min-h-screen flex items-center justify-center py-12 px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,209,220,0.6),transparent_55%)] pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom,rgba(255,253,208,0.6),transparent_55%)] pointer-events-none" />

        <div className="glass-card relative z-10 w-full max-w-3xl p-8 md:p-12 rounded-[36px] border-2 border-white shadow-2xl animate-fade-up">
          <div className="text-center mb-8">
            <p className="text-4xl mb-4">🛍️</p>
            <h1 className="font-heading text-2xl md:text-3xl font-bold text-[#5D4037]">
              あなたの欲しいものリストを登録
            </h1>
            <p className="text-[#5D4037]/70 text-sm leading-relaxed mt-3">
              あなたにプレゼントを贈るメンバーへ向けて、
              <br className="hidden md:block" />
              「これを買ってほしい！」という商品とリストURLを共有しましょう。
            </p>
          </div>

          {initialLoading ? (
            <div className="py-16 text-center text-[#5D4037]/70">読み込み中...</div>
          ) : (
            <form className="space-y-6" onSubmit={handleSubmit}>
              <section className="rounded-3xl border border-white bg-white/60 p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className="text-2xl">📎</div>
                  <div>
                    <p className="text-sm font-bold text-[#FF8FA3] uppercase tracking-widest">STEP 1</p>
                    <p className="font-heading text-lg text-[#5D4037]">Amazon欲しいものリストURL</p>
                  </div>
                </div>
                <input
                  type="url"
                  value={form.wishlistUrl}
                  onChange={(e) => updateForm("wishlistUrl", e.target.value)}
                  placeholder="https://www.amazon.co.jp/hz/wishlist/..."
                  className="w-full rounded-2xl border-2 border-[#FFD1DC] bg-white/70 px-4 py-3 text-[#5D4037] placeholder-[#5D4037]/40 outline-none focus:border-[#FF8FA3] focus:ring-4 focus:ring-[#FF8FA3]/20"
                />
                <p className="text-xs text-[#5D4037]/60 mt-3">
                  リストは<strong>「リンクを知っていれば閲覧可」</strong>に設定しておきましょう。
                </p>
              </section>

              <section className="rounded-3xl border border-white bg-white/60 p-6 shadow-sm space-y-4">
                <div className="flex items-center gap-3">
                  <div className="text-2xl">🎁</div>
                  <div>
                    <p className="text-sm font-bold text-[#FF8FA3] uppercase tracking-widest">STEP 2</p>
                    <p className="font-heading text-lg text-[#5D4037]">優先して買ってほしい商品</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-[#5D4037] ml-1">商品名</label>
                  <input
                    type="text"
                    value={form.primaryItemName}
                    onChange={(e) => updateForm("primaryItemName", e.target.value)}
                    placeholder="例: りんご柄のティーポット"
                    className="w-full rounded-2xl border-2 border-[#FFD1DC] bg-white/70 px-4 py-3 text-[#5D4037] placeholder-[#5D4037]/40 outline-none focus:border-[#FF8FA3] focus:ring-4 focus:ring-[#FF8FA3]/20"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-[#5D4037] ml-1 flex items-center justify-between">
                    商品のURL（任意）
                    <span className="text-xs text-[#5D4037]/50">あるとメンバーが助かります</span>
                  </label>
                  <input
                    type="url"
                    value={form.primaryItemUrl}
                    onChange={(e) => updateForm("primaryItemUrl", e.target.value)}
                    placeholder="https://www.amazon.co.jp/..."
                    className="w-full rounded-2xl border-2 border-[#FFD1DC] bg-white/70 px-4 py-3 text-[#5D4037] placeholder-[#5D4037]/40 outline-none focus:border-[#FF8FA3] focus:ring-4 focus:ring-[#FF8FA3]/20"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-bold text-[#5D4037] ml-1">希望価格帯（下限）</label>
                    <input
                      type="number"
                      inputMode="numeric"
                      value={form.budgetMin}
                      onChange={(e) => updateForm("budgetMin", e.target.value)}
                      placeholder="3000"
                      className="w-full rounded-2xl border-2 border-[#FFD1DC] bg-white/70 px-4 py-3 text-[#5D4037] placeholder-[#5D4037]/40 outline-none focus:border-[#FF8FA3] focus:ring-4 focus:ring-[#FF8FA3]/20"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-bold text-[#5D4037] ml-1">希望価格帯（上限）</label>
                    <input
                      type="number"
                      inputMode="numeric"
                      value={form.budgetMax}
                      onChange={(e) => updateForm("budgetMax", e.target.value)}
                      placeholder="5000"
                      className="w-full rounded-2xl border-2 border-[#FFD1DC] bg-white/70 px-4 py-3 text-[#5D4037] placeholder-[#5D4037]/40 outline-none focus:border-[#FF8FA3] focus:ring-4 focus:ring-[#FF8FA3]/20"
                    />
                  </div>
                </div>

                <div className="text-xs text-[#5D4037]/60 bg-[#FFF5F7] border border-[#FFD1DC] rounded-2xl px-4 py-3">
                  目安: <strong>{budgetLabel}</strong>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-[#5D4037] ml-1">補足メッセージ（任意）</label>
                  <textarea
                    value={form.note}
                    onChange={(e) => updateForm("note", e.target.value)}
                    rows={4}
                    placeholder="例: キッチンをピンクで揃えているので、同じ雰囲気のものだと嬉しいです！"
                    className="w-full rounded-2xl border-2 border-[#FFD1DC] bg-white/70 px-4 py-3 text-[#5D4037] placeholder-[#5D4037]/40 outline-none focus:border-[#FF8FA3] focus:ring-4 focus:ring-[#FF8FA3]/20 resize-none"
                  />
                </div>
              </section>

              {errorDetail && (
                <div className="rounded-2xl border border-red-200 bg-red-50/80 px-4 py-3 text-sm text-red-700">
                  {errorDetail}
                </div>
              )}

              {state === "success" && (
                <div className="rounded-2xl border border-green-200 bg-green-50/80 px-4 py-3 text-sm text-green-700">
                  {message}
                </div>
              )}

              <button
                type="submit"
                disabled={state === "loading"}
                className="btn-primary w-full py-4 rounded-full font-bold text-lg shadow-lg hover:shadow-xl disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {state === "loading" ? "保存中..." : "リストを保存して抽選へ進む"}
              </button>
            </form>
          )}
        </div>
      </div>
    </FlowGuard>
  );
}
