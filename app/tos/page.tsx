"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FlowGuard } from "@/components/FlowGuard";
import { useUser } from "@/context/UserContext";

export default function TOSPage() {
  const { refresh } = useUser();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleAgree = async () => {
    setLoading(true);
    setError("");
    const res = await fetch("/api/user/status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "agree_tos" }),
    });

    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "更新に失敗しました");
      setLoading(false);
      return;
    }

    await refresh();
    router.push("/guide");
  };

  return (
    <FlowGuard requiredStatus="AWAITING_TOS_AGREEMENT" fallback="/">
      <div className="min-h-screen bg-[#F5F5F5] px-4 py-12 text-[#5C4033]">
        <div className="mx-auto w-full max-w-2xl rounded-2xl bg-white p-8 shadow-lg">
          <h1 className="font-heading mb-4 text-2xl">利用規約</h1>
          <p className="mb-6 text-sm leading-relaxed text-[#5C4033]/80">
            利用規約の内容に同意いただくことで「りんご会♪」の次のステップへ進めます。
          </p>
          <div className="space-y-2 rounded-xl bg-[#FFFDD0]/60 p-4 text-sm leading-relaxed text-[#5C4033]/90">
            <p>・本サービスはプレゼント交換を楽しむコミュニティです。</p>
            <p>・法令や公序良俗に反する利用は禁止します。</p>
            <p>・不正行為が判明した場合、利用停止となることがあります。</p>
          </div>

          {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

          <button
            onClick={handleAgree}
            disabled={loading}
            className="mt-6 w-full rounded-full bg-[#FFC0CB] px-6 py-3 text-sm font-semibold text-[#5C4033] shadow-md transition hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "送信中..." : "同意して進む"}
          </button>
        </div>
      </div>
    </FlowGuard>
  );
}
