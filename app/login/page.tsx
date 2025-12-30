"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type Status = "idle" | "loading" | "success" | "error";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setStatus("loading");
    setMessage("");

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setStatus("error");
      setMessage(error.message ?? "ログインに失敗しました");
      return;
    }

    setStatus("success");
    setMessage("ログインしました。マイページへお進みください。");
    setPassword("");

    // マイページへ遷移
    router.push("/my-page");
  };

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-[#FFD1DC] rounded-full mix-blend-multiply filter blur-3xl opacity-40 animate-float" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-[#FFFDD0] rounded-full mix-blend-multiply filter blur-3xl opacity-40 animate-float" style={{ animationDelay: "2s" }} />

      <div className="glass-card w-full max-w-md p-10 rounded-[32px] shadow-2xl relative z-10 animate-fade-up">
        <div className="text-center mb-8">
          <span className="text-4xl mb-2 block">🍎</span>
          <h1 className="font-heading text-3xl font-bold text-[#5D4037]">おかえりなさい</h1>
          <p className="text-[#5D4037]/60 mt-2 text-sm">
            ログインして、幸せのサイクルに戻りましょう
          </p>
        </div>

        <form className="space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <label className="block text-sm font-bold text-[#5D4037] ml-1" htmlFor="email">
              メールアドレス
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-2xl border-2 border-[#FFD1DC] bg-white/50 px-4 py-3 text-[#5D4037] placeholder-[#5D4037]/30 outline-none transition-all focus:border-[#FF8FA3] focus:bg-white focus:ring-4 focus:ring-[#FF8FA3]/20"
              placeholder="apple@example.com"
            />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-bold text-[#5D4037] ml-1" htmlFor="password">
              パスワード
            </label>
            <input
              id="password"
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-2xl border-2 border-[#FFD1DC] bg-white/50 px-4 py-3 text-[#5D4037] placeholder-[#5D4037]/30 outline-none transition-all focus:border-[#FF8FA3] focus:bg-white focus:ring-4 focus:ring-[#FF8FA3]/20"
              placeholder="••••••••"
            />
          </div>

          {message && (
            <div
              className={`p-4 rounded-xl text-sm font-bold text-center animate-fade-up ${
                status === "success" 
                  ? "bg-[#E8F5E9] text-green-700 border border-green-200" 
                  : "bg-[#FFEBEE] text-red-700 border border-red-200"
              }`}
            >
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={status === "loading"}
            className="btn-primary w-full py-4 rounded-full font-bold text-lg shadow-lg hover:shadow-xl disabled:opacity-70 disabled:cursor-not-allowed transform active:scale-95 transition-all"
          >
            {status === "loading" ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                ログイン中...
              </span>
            ) : (
              "ログイン"
            )}
          </button>
        </form>
        
        <div className="mt-8 text-center">
          <p className="text-sm text-[#5D4037]/60">
            まだアカウントをお持ちでない方は
          </p>
          <a href="/signup" className="inline-block mt-2 text-[#FF8FA3] font-bold hover:text-[#FF6B8B] hover:underline transition-all">
            無料で新規登録する
          </a>
        </div>
      </div>
    </div>
  );
}
