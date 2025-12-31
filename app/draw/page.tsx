"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FlowGuard } from "@/components/FlowGuard";
import { supabase } from "@/lib/supabaseClient";

export default function DrawPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleDraw = async () => {
    setLoading(true);
    setMessage("");

    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session?.user) {
      setLoading(false);
      setMessage("ログインが必要です");
      return;
    }

    const drawRes = await fetch("/api/draw", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    });

    if (!drawRes.ok) {
      const data = await drawRes.json().catch(() => ({ error: "抽選に失敗しました" }));
      setLoading(false);
      setMessage(data.error || "抽選に失敗しました");
      return;
    }

    const data = await drawRes.json();
    setLoading(false);
    router.push(`/reveal/${data.appleId}`);
  };

  return (
    <FlowGuard requiredStatus="READY_TO_DRAW" fallback="/">
      <div className="min-h-screen flex items-center justify-center py-12 px-4 relative overflow-hidden">
        {/* Background Decor */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.8),transparent_100%)] z-0" />
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-[#FF8FA3] rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-float" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-[#FFFDD0] rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-float" style={{ animationDelay: "2s" }} />

        <div className="glass-card w-full max-w-xl p-10 md:p-14 rounded-[40px] shadow-2xl relative z-10 animate-fade-up border-2 border-white text-center">
          <div className="mb-8">
            <div className="text-6xl mb-4 animate-bounce">🍎</div>
            <h1 className="font-heading text-3xl md:text-4xl font-bold text-[#5D4037]">運命のりんごを引く</h1>
            <p className="mt-4 text-[#5D4037]/70 leading-relaxed">
              ドキドキの瞬間です。<br />
              ボタンを押すと抽選が始まります。<br />
              <span className="text-xs text-[#5D4037]/50">※結果は1時間後にわかります</span>
            </p>
          </div>

          <button
            onClick={handleDraw}
            disabled={loading}
            className="btn-primary w-full py-5 rounded-full font-bold text-xl shadow-xl hover:shadow-2xl disabled:opacity-70 disabled:cursor-not-allowed transform active:scale-95 transition-all relative overflow-hidden group"
          >
            <span className="relative z-10">
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  抽選中...
                </span>
              ) : (
                "りんごを引く！"
              )}
            </span>
            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
          </button>
          
          {message && (
             <div className="mt-6 p-4 bg-[#FFEBEE] text-red-700 border border-red-200 rounded-xl text-sm font-bold animate-fade-up">
               {message}
             </div>
          )}
        </div>
      </div>
    </FlowGuard>
  );
}
