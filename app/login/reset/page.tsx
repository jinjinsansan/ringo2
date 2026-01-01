"use client";

import { useState } from "react";

type Status = "idle" | "loading" | "success" | "error";

export default function PasswordResetPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setStatus("loading");
    setMessage("");

    try {
      const res = await fetch("/api/auth/password-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStatus("error");
        setMessage(body.error ?? "送信に失敗しました");
        return;
      }
      setStatus("success");
      setMessage("パスワード再設定リンクを送信しました。メールをご確認ください。");
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "送信に失敗しました");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 relative overflow-hidden">
      <div className="absolute top-[-15%] right-[-10%] w-[520px] h-[520px] bg-[#FFE4EC] rounded-full mix-blend-multiply filter blur-3xl opacity-30" />
      <div className="absolute bottom-[-15%] left-[-10%] w-[520px] h-[520px] bg-[#FFF5CC] rounded-full mix-blend-multiply filter blur-3xl opacity-30" />
      <div className="glass-card w-full max-w-md p-10 rounded-[32px] shadow-2xl relative z-10">
        <div className="text-center mb-8">
          <span className="text-4xl mb-2 block">🔒</span>
          <h1 className="font-heading text-3xl font-bold text-[#5D4037]">パスワード再設定</h1>
          <p className="text-[#5D4037]/60 mt-2 text-sm">登録メールアドレスに再設定リンクをお送りします。</p>
        </div>
        <form className="space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <label htmlFor="email" className="block text-sm font-bold text-[#5D4037] ml-1">
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
          {message && (
            <div
              className={`p-4 rounded-xl text-sm font-bold text-center ${
                status === "success"
                  ? "bg-[#E8F5E9] text-green-700 border border-green-200"
                  : status === "error"
                  ? "bg-[#FFEBEE] text-red-700 border border-red-200"
                  : "bg-[#FFF5F7] text-[#5D4037] border border-[#FFD1DC]"
              }`}
            >
              {message}
            </div>
          )}
          <button
            type="submit"
            disabled={status === "loading"}
            className="btn-primary w-full py-4 rounded-full font-bold text-lg shadow-lg hover:shadow-xl disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {status === "loading" ? "送信中..." : "再設定リンクを送信"}
          </button>
          <div className="text-center text-sm text-[#5D4037]/60">
            <a href="/login" className="text-[#FF8FA3] font-bold hover:underline">
              ログイン画面に戻る
            </a>
          </div>
        </form>
      </div>
    </div>
  );
}
