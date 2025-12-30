"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FlowGuard } from "@/components/FlowGuard";
import { useUser } from "@/context/UserContext";
import { supabase } from "@/lib/supabaseClient";

export default function GuidePage() {
  const { refresh } = useUser();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleCheck = async () => {
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
      .update({ guide_checked: true, status: "READY_TO_PURCHASE" })
      .eq("id", session.user.id);

    if (error) {
      setError(error.message ?? "更新に失敗しました");
      setLoading(false);
      return;
    }

    await refresh();
    router.push("/");
  };

  const guideSteps = [
    {
      title: "1. 誰かの欲しいものを購入",
      description: "Amazonの欲しいものリストから、他のユーザーのギフトを購入します。",
      icon: "🎁",
      color: "bg-[#FFD1DC]",
    },
    {
      title: "2. スクショを提出",
      description: "購入した証明となるスクリーンショットをアップロードして提出します。",
      icon: "📸",
      color: "bg-[#FFFDD0]",
    },
    {
      title: "3. りんごを引く",
      description: "承認されると、りんごを引くチャンス！1時間後に結果がわかります。",
      icon: "🍎",
      color: "bg-[#FF8FA3]",
    },
    {
      title: "4. 欲しいものを待つ",
      description: "次はあなたの番。自分の欲しいものリストを登録して待ちましょう。",
      icon: "💖",
      color: "bg-[#E0F2F1]",
    },
  ];

  return (
    <FlowGuard requiredStatus="AWAITING_GUIDE_CHECK" fallback="/">
      <div className="min-h-screen bg-[#F5F5F5] px-4 py-12 text-[#5C4033] relative overflow-hidden">
        {/* Decorative Background */}
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-[#FFD1DC] rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-float" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-[#FFFDD0] rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-float" style={{ animationDelay: "2s" }} />

        <div className="mx-auto w-full max-w-4xl relative z-10">
          <div className="glass-card rounded-[32px] p-8 md:p-12 shadow-xl border border-white/60">
            <div className="text-center mb-10">
              <span className="text-4xl mb-4 block">📖</span>
              <h1 className="font-heading text-3xl md:text-4xl font-bold text-[#5D4037]">りんご会♪の使い方</h1>
              <p className="mt-4 text-[#5D4037]/70">
                幸せのサイクルに参加するための4つのステップ。<br />
                簡単なので、すぐに始められますよ♪
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6 mb-10">
              {guideSteps.map((step, index) => (
                <div 
                  key={index} 
                  className="bg-white/80 rounded-2xl p-6 shadow-sm border border-[#FFD1DC] hover:shadow-md transition-shadow relative overflow-hidden group"
                >
                  <div className={`absolute top-0 right-0 w-24 h-24 rounded-bl-full ${step.color} opacity-20 group-hover:scale-110 transition-transform`} />
                  <div className="relative z-10 flex gap-4">
                    <div className={`w-12 h-12 shrink-0 rounded-full ${step.color} flex items-center justify-center text-2xl shadow-inner`}>
                      {step.icon}
                    </div>
                    <div>
                      <h3 className="font-bold text-lg text-[#5D4037] mb-2">{step.title}</h3>
                      <p className="text-sm text-[#5D4037]/80 leading-relaxed">
                        {step.description}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {error && (
              <div className="mb-6 p-4 bg-[#FFEBEE] text-red-700 border border-red-200 rounded-xl text-sm font-bold text-center animate-fade-up">
                {error}
              </div>
            )}

            <div className="text-center">
              <p className="mb-6 text-sm font-bold text-[#FF8FA3]">
                使い方は理解できましたか？
              </p>
              <button
                onClick={handleCheck}
                disabled={loading}
                className="btn-primary w-full md:w-auto md:min-w-[300px] px-8 py-4 rounded-full font-bold text-lg shadow-lg hover:shadow-xl disabled:opacity-70 disabled:cursor-not-allowed transform active:scale-95 transition-all"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    はじめる準備中...
                  </span>
                ) : (
                  "理解しました！はじめる"
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </FlowGuard>
  );
}
