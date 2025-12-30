"use client";

import { useState } from "react";

type Status = "idle" | "loading" | "success" | "error";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setStatus("loading");
    setMessage("");

    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();

    if (!res.ok) {
      setStatus("error");
      setMessage(data.error ?? "登録に失敗しました");
      return;
    }

    setStatus("success");
    setMessage("登録しました。確認メールをご確認ください。");
    setEmail("");
    setPassword("");
  };

  return (
    <div className="min-h-screen bg-[#F5F5F5] px-4 py-12 text-[#5C4033]">
      <div className="mx-auto w-full max-w-md rounded-2xl bg-white p-8 shadow-lg">
        <h1 className="font-heading mb-6 text-2xl">新規登録</h1>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="mb-1 block text-sm font-semibold" htmlFor="email">
              メールアドレス
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-[#FFC0CB]/60 bg-white px-3 py-2 text-sm outline-none transition focus:border-[#FFC0CB] focus:ring-2 focus:ring-[#FFC0CB]/50"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold" htmlFor="password">
              パスワード
            </label>
            <input
              id="password"
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-[#FFC0CB]/60 bg-white px-3 py-2 text-sm outline-none transition focus:border-[#FFC0CB] focus:ring-2 focus:ring-[#FFC0CB]/50"
              placeholder="6文字以上"
            />
          </div>
          <button
            type="submit"
            disabled={status === "loading"}
            className="w-full rounded-full bg-[#FFC0CB] px-4 py-3 text-sm font-semibold text-[#5C4033] shadow-md transition hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60"
          >
            {status === "loading" ? "登録中..." : "無料で新規登録"}
          </button>
        </form>

        {message && (
          <p
            className={`mt-4 text-sm ${
              status === "success" ? "text-green-700" : "text-red-600"
            }`}
          >
            {message}
          </p>
        )}
      </div>
    </div>
  );
}
