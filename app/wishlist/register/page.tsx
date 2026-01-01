"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FlowGuard } from "@/components/FlowGuard";
import { supabase } from "@/lib/supabaseClient";
import { useUser } from "@/context/UserContext";

type FormState = {
  wishlistUrl: string;
  primaryItemName: string;
  primaryItemUrl: string;
  itemPrice: string;
  note: string;
};

type RequestState = "idle" | "loading" | "success" | "error";

const initialForm: FormState = {
  wishlistUrl: "",
  primaryItemName: "",
  primaryItemUrl: "",
  itemPrice: "",
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
          itemPrice: data.wishlist?.item_price_jpy != null ? String(data.wishlist.item_price_jpy) : "",
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

    const priceNumber = Number(form.itemPrice);
    if (!form.itemPrice.trim() || Number.isNaN(priceNumber)) {
      setState("error");
      setErrorDetail("商品の価格を入力してください");
      return;
    }

    if (priceNumber < 3000 || priceNumber > 4000) {
      setState("error");
      setErrorDetail("価格は3,000〜4,000円の間で入力してください");
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
      itemPrice: priceNumber,
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

    const data = await res.json().catch(() => ({ status: null }));
    const nextStatus = data?.status ?? null;

    setState("success");
    setMessage(
      nextStatus === "READY_TO_DRAW"
        ? "保存しました！次はいよいよ抽選ステップへ進めます。"
        : "保存しました！現在購入証明のスクリーンショットを管理者が確認しています。承認完了後に抽選ステップへ進めます。"
    );
    await refresh();

    if (nextStatus === "READY_TO_DRAW") {
      router.push("/draw");
    }
  };

  return (
    <FlowGuard
      requiredStatus={[
        "AWAITING_APPROVAL",
        "READY_TO_REGISTER_WISHLIST",
        "READY_TO_DRAW",
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
              <div className="rounded-3xl border border-[#FFE2EA] bg-[#FFF5F7] p-5 shadow-sm">
                <p className="text-xs font-bold text-[#FF8FA3] uppercase tracking-[0.3em]">Privacy Tips</p>
                <p className="mt-2 text-sm text-[#5D4037]/80">
                  Amazonの設定を誤ると本名や住所が公開リンクから見えてしまうことがあります。登録前に、匿名化の手順をまとめた
                  ガイドを必ず確認してください。
                </p>
                <Link
                  href="/resources/wishlist-privacy"
                  className="mt-3 inline-flex items-center gap-2 rounded-full border border-[#FF8FA3]/30 px-4 py-2 text-xs font-bold text-[#FF8FA3] hover:bg-white"
                >
                  匿名公開ガイドを見る →
                </Link>
              </div>

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
                    <p className="font-heading text-lg text-[#5D4037]">あなたの欲しいものを詳しく</p>
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
                  <label className="text-sm font-bold text-[#5D4037] ml-1">商品の価格（必須 / 3,000〜4,000円）</label>
                  <input
                    type="number"
                    inputMode="numeric"
                    value={form.itemPrice}
                    onChange={(e) => updateForm("itemPrice", e.target.value)}
                    placeholder="例: 3500"
                    className="w-full rounded-2xl border-2 border-[#FFD1DC] bg-white/70 px-4 py-3 text-[#5D4037] placeholder-[#5D4037]/40 outline-none focus:border-[#FF8FA3] focus:ring-4 focus:ring-[#FF8FA3]/20"
                  />
                  <p className="text-xs text-[#5D4037]/60">
                    3,000円未満 / 4,000円超の商品は登録できません。Amazonの価格を確認してから入力してください。
                  </p>
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
