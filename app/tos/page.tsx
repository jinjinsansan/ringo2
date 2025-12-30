"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FlowGuard } from "@/components/FlowGuard";
import { useUser } from "@/context/UserContext";
import { supabase } from "@/lib/supabaseClient";

export default function TOSPage() {
  const { refresh } = useUser();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleAgree = async () => {
    setLoading(true);
    setError("");
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session?.user) {
      setError("ログインが必要です");
      setLoading(false);
      return;
    }

    const { error } = await supabase
      .from("users")
      .update({ tos_agreed: true, status: "AWAITING_GUIDE_CHECK" })
      .eq("id", session.user.id);

    if (error) {
      setError(error.message ?? "更新に失敗しました");
      setLoading(false);
      return;
    }

    await refresh();
    router.push("/guide");
  };

  return (
    <FlowGuard requiredStatus="AWAITING_TOS_AGREEMENT" fallback="/">
      <div className="min-h-screen flex items-center justify-center py-12 px-4 relative overflow-hidden">
        {/* Background Decor */}
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,rgba(255,240,245,0.8),transparent_70%)] pointer-events-none" />

        <div className="glass-card w-full max-w-2xl p-8 md:p-12 rounded-[32px] shadow-2xl relative z-10 animate-fade-up border-2 border-[#fff0f5]">
          <div className="text-center mb-8">
            <span className="text-4xl mb-4 block">📜</span>
            <h1 className="font-heading text-3xl font-bold text-[#5D4037]">利用規約</h1>
            <p className="text-[#5D4037]/70 mt-3 text-sm leading-relaxed">
              りんご会♪を楽しく安全にご利用いただくために、<br className="hidden sm:block" />
              以下の内容をご確認の上、同意をお願いいたします。
            </p>
          </div>

          <div className="bg-white/60 rounded-2xl p-6 h-64 overflow-y-auto mb-8 border border-[#FFD1DC] shadow-inner custom-scrollbar">
            <div className="space-y-4 text-sm text-[#5D4037]/90 leading-7">
              <section>
                <h3 className="font-bold text-[#FF8FA3] mb-2">1. サービスの目的</h3>
                <p>
                  本サービスは、Amazonの欲しいものリストを通じて、ユーザー同士がプレゼント交換を楽しむコミュニティです。
                  相互の思いやりと信頼に基づいて運営されています。
                </p>
              </section>
              <section>
                <h3 className="font-bold text-[#FF8FA3] mb-2">2. 禁止事項</h3>
                <ul className="list-disc pl-5 space-y-1">
                  <li>法令や公序良俗に反する行為</li>
                  <li>他のユーザーへの誹謗中傷や迷惑行為</li>
                  <li>不正な手段でのプレゼント取得や詐欺行為</li>
                  <li>営業、宣伝、勧誘等を目的とした利用</li>
                  <li>運営が不適切と判断する行為</li>
                </ul>
              </section>
              <section>
                <h3 className="font-bold text-[#FF8FA3] mb-2">3. 免責事項</h3>
                <p>
                  ユーザー間のトラブルについて、運営は一切の責任を負いません。
                  プレゼントの発送や受け取りに関する問題は、当事者間で解決してください。
                </p>
              </section>
            </div>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-[#FFEBEE] text-red-700 border border-red-200 rounded-xl text-sm font-bold text-center animate-fade-up">
              {error}
            </div>
          )}

          <div className="flex flex-col gap-4">
            <div className="flex items-start gap-3 p-4 bg-[#FFF5F7] rounded-xl border border-[#FFD1DC]">
              <input type="checkbox" id="agree" className="mt-1 w-5 h-5 accent-[#FF8FA3] rounded cursor-pointer" />
              <label htmlFor="agree" className="text-sm text-[#5D4037] cursor-pointer font-medium">
                利用規約の内容を確認し、すべての条項に同意します。
              </label>
            </div>

            <button
              onClick={handleAgree}
              disabled={loading}
              className="btn-primary w-full py-4 rounded-full font-bold text-lg shadow-lg hover:shadow-xl disabled:opacity-70 disabled:cursor-not-allowed transform active:scale-95 transition-all mt-2"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  処理中...
                </span>
              ) : (
                "同意して進む"
              )}
            </button>
          </div>
        </div>
      </div>
    </FlowGuard>
  );
}
