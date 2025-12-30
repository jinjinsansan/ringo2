"use client";

import { useRouter } from "next/navigation";

export default function PrivacyPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-[#FFF5F7] px-4 py-12 text-[#5D4037]">
      <div className="mx-auto w-full max-w-3xl rounded-[32px] bg-white/80 p-8 md:p-12 shadow-xl border border-white backdrop-blur-sm animate-fade-up">
        
        <div className="text-center mb-10">
          <span className="text-4xl mb-4 block">🔒</span>
          <h1 className="font-heading text-3xl md:text-4xl font-bold text-[#5D4037]">プライバシーポリシー</h1>
          <p className="mt-4 text-[#5D4037]/70">
            あなたの個人情報は、大切に守ります。<br />
            安心してご利用いただくための、私たちのお約束です。
          </p>
        </div>

        <div className="space-y-8 text-sm leading-relaxed text-[#5D4037]/90">
          <section className="bg-white/60 p-6 rounded-2xl border border-[#FFD1DC]">
            <h2 className="font-heading text-lg font-bold text-[#FF8FA3] mb-3 flex items-center gap-2">
              <span className="text-xl">1.</span>
              収集する情報について
            </h2>
            <p>
              当サービスでは、以下の情報を収集することがあります。
            </p>
            <ul className="list-disc pl-5 mt-2 space-y-1 text-[#5D4037]/80">
              <li>メールアドレス（ログイン・連絡用）</li>
              <li>Amazon欲しいものリストのURL</li>
              <li>購入証明としてのスクリーンショット画像</li>
              <li>サービスの利用履歴</li>
            </ul>
          </section>

          <section className="bg-white/60 p-6 rounded-2xl border border-[#FFD1DC]">
            <h2 className="font-heading text-lg font-bold text-[#FF8FA3] mb-3 flex items-center gap-2">
              <span className="text-xl">2.</span>
              情報の利用目的
            </h2>
            <p>
              収集した情報は、以下の目的でのみ利用します。
            </p>
            <ul className="list-disc pl-5 mt-2 space-y-1 text-[#5D4037]/80">
              <li>サービスの提供および運営のため</li>
              <li>ユーザーサポートのため</li>
              <li>不正利用防止のため</li>
              <li>サービス改善のための分析のため</li>
            </ul>
          </section>

          <section className="bg-white/60 p-6 rounded-2xl border border-[#FFD1DC]">
            <h2 className="font-heading text-lg font-bold text-[#FF8FA3] mb-3 flex items-center gap-2">
              <span className="text-xl">3.</span>
              第三者への提供について
            </h2>
            <p>
              法令に基づく場合を除き、ユーザーの同意なく個人情報を第三者に提供することはありません。
              ただし、Amazon欲しいものリストの機能を通じて公開される情報は、Amazonのプライバシーポリシーに従います。
            </p>
          </section>

          <section className="bg-white/60 p-6 rounded-2xl border border-[#FFD1DC]">
            <h2 className="font-heading text-lg font-bold text-[#FF8FA3] mb-3 flex items-center gap-2">
              <span className="text-xl">4.</span>
              セキュリティについて
            </h2>
            <p>
              ユーザーの個人情報は、適切なセキュリティ対策を講じて管理します。
              認証にはSupabase Authを使用し、安全な通信（SSL/TLS）を行っています。
            </p>
          </section>
        </div>

        <div className="mt-12 text-center">
          <button
            onClick={() => router.back()}
            className="px-8 py-3 rounded-full border-2 border-[#FFD1DC] text-[#FF8FA3] font-bold hover:bg-[#FFF5F7] transition-all"
          >
            前のページに戻る
          </button>
        </div>
      </div>
    </div>
  );
}
