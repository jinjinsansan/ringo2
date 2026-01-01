"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { FlowGuard } from "@/components/FlowGuard";
import { useUser } from "@/context/UserContext";
import { supabase } from "@/lib/supabaseClient";

const appleTypes = [
  {
    title: "ブロンズりんご",
    accent: "bg-gradient-to-br from-[#FDECEF] to-[#FFF5F7]",
    summary: "もっとも基本的なりんご。互いにプレゼントを送り合う物々交換が成立します。",
    flow: [
      "STEP1: あなたが別のメンバーの欲しいものリストから3,000〜4,000円の商品を購入",
      "STEP2: そのお礼としてコミュニティ内の誰かがあなたの欲しいものリストから商品を購入",
      "STEP3: 交換が完了したら次のサイクルに進み、また同じルールで抽選を受けます",
    ],
    exemptionLabel: "免除チケット 0枚 (純粋な物々交換)",
    iconSrc: "/images/cards/bronze_apple_card_v2.png",
  },
  {
    title: "シルバーりんご",
    accent: "bg-gradient-to-br from-[#EEF2FF] to-[#F7F9FF]",
    summary: "今回の交換を完了すると、購入免除チケットが2枚ストックされます。使いたいタイミングで消費すると1サイクル分の購入が免除されます。",
    flow: [
      "STEP1: ブロンズと同じく今回のサイクルを通常通り完了 (あなたも誰かのリストを購入)",
      "STEP2: 結果確定後にシルバーチケット2枚がマイページ > 免除チケットに加算される",
      "STEP3: 次回以降『チケットを使う』を押すと、1枚につき1サイクルあなたの購入が免除され、あなたのリストだけが購入される",
    ],
    exemptionLabel: "免除チケット 2枚 (1枚=1サイクル免除)",
    iconSrc: "/images/cards/silver_apple_card_final.png",
  },
  {
    title: "ゴールドりんご",
    accent: "bg-gradient-to-br from-[#FFF5D6] to-[#FFF3E0]",
    summary: "購入免除チケットが3枚まとめて付与され、最大3サイクル分を好きなタイミングでスキップできます。",
    flow: [
      "STEP1: 今回はブロンズ同様に通常交換を完了",
      "STEP2: ゴールドチケット3枚がマイページに付与される",
      "STEP3: 必要なサイクルで1枚ずつ使用すると、そのサイクルでは購入せずにギフトだけ受け取れる",
    ],
    exemptionLabel: "免除チケット 3枚",
    iconSrc: "/images/cards/gold_apple_card_v2.png",
  },
  {
    title: "赤りんご",
    accent: "bg-gradient-to-br from-[#FFE3E3] to-[#FFF2F2]",
    summary: "最大級のボーナス。購入免除チケットが5枚加算され、長期間ギフトを受け取れます。",
    flow: [
      "STEP1: 今回は通常交換を完了",
      "STEP2: 赤りんごチケット5枚が付与されストックされる",
      "STEP3: チケットを消費したサイクルでは購入免除であなたのリストだけが購入される",
    ],
    exemptionLabel: "免除チケット 5枚",
    iconSrc: "/images/cards/red_apple_card_premium.png",
  },
  {
    title: "毒りんご",
    accent: "bg-gradient-to-br from-[#FBE7FF] to-[#FFF0FF]",
    summary: "残念ながら今回はハズレ。最初のステップからやり直しになります。",
    flow: [
      "STEP1: あなたが別のメンバーの欲しいものリストから3,000〜4,000円の商品を購入",
      "STEP2: 今回はハズレなので振り出しに戻り、次の交換に再挑戦",
    ],
    exemptionLabel: "免除チケット 0枚",
    iconSrc: "/images/cards/poison_apple_card_final.png",
  },
];

const privacyLinks = [
  {
    title: "Amazonほしい物リストを匿名で公開する方法",
    description: "受取人名・住所をニックネーム化して安全に共有する手順をマイナビの記事で解説。",
    href: "https://news.mynavi.jp/article/20230920-2775392/",
    color: "from-[#FFE1ED] to-[#FFF5FA]",
  },
  {
    title: "匿名でプレゼントを贈る方法",
    description: "送り主の氏名を出さずにギフト設定する注意点をまとめたガイド。",
    href: "https://news.mynavi.jp/article/20230930-2781642/",
    color: "from-[#E4FFF2] to-[#F6FFF9]",
  },
];

const troubleshooting = [
  "スクショ提出後に画面が進まない場合は、アップロード先のURLをコピーしてLINEで送ってください。",
  "抽選結果が表示されないときは、ブラウザを更新しても変わらなければ公式LINEでIDを共有してください。",
  "欲しいものリストは一度保存すると、誰かが購入してくれるまで編集できません。",
];

const LINE_URL = process.env.NEXT_PUBLIC_LINE_URL ?? "https://lin.ee/lhRkKd8";

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

            <section className="mb-12 rounded-3xl border border-white/70 bg-white/80 p-6 shadow-sm">
              <div className="flex flex-col gap-6">
                <div>
                  <p className="text-xs font-bold text-[#FF8FA3] uppercase tracking-[0.4em]">Apple Types</p>
                  <h2 className="font-heading text-2xl text-[#5D4037] mt-1">りんごの種類と効果</h2>
                  <p className="text-sm text-[#5D4037]/70 mt-2">
                    ブロンズは“物々交換”の基本。毒りんごが出るたびに上位りんごのチャンスがストックされ、シルバー・ゴールド・赤が順番に解放されます。
                  </p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  {appleTypes.map((apple) => (
                    <div key={apple.title} className={`rounded-3xl border border-white/60 p-4 shadow-inner ${apple.accent}`}>
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-heading text-lg text-[#5D4037]">{apple.title}</h3>
                        <div className="h-12 w-12 rounded-full bg-white/80 border border-white/80 flex items-center justify-center">
                          <Image src={apple.iconSrc} alt={apple.title} width={32} height={32} className="object-contain" />
                        </div>
                      </div>
                      <p className="text-xs font-semibold text-[#B45364]">{apple.exemptionLabel}</p>
                      <p className="text-sm text-[#5D4037]/80 mt-2 leading-relaxed">{apple.summary}</p>
                      <ul className="mt-3 space-y-2 text-xs text-[#5D4037]/70">
                        {apple.flow.map((line) => (
                          <li key={line} className="rounded-2xl bg-white/60 px-3 py-2 border border-white/70">
                            {line}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section className="mb-12 rounded-3xl border border-white/70 bg-white/80 p-6 shadow-sm">
              <div className="flex flex-col gap-6">
                <div>
                  <p className="text-xs font-bold text-[#38A169] uppercase tracking-[0.4em]">Privacy Guides</p>
                  <h2 className="font-heading text-2xl text-[#2E5939] mt-1">匿名設定はここをチェック</h2>
                  <p className="text-sm text-[#2E5939]/70 mt-2">
                    Amazonのルールを誤ると住所や本名が露出します。マイナビの記事で紹介されている安全手順を事前に確認しましょう。
                  </p>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  {privacyLinks.map((resource) => (
                    <a
                      key={resource.href}
                      href={resource.href}
                      target="_blank"
                      rel="noreferrer"
                      className={`rounded-3xl border border-white/60 bg-gradient-to-br ${resource.color} p-5 shadow transition hover:shadow-lg`}
                    >
                      <p className="text-xs font-bold text-[#5D4037]/70">Mynavi News</p>
                      <h3 className="font-heading text-lg text-[#5D4037] mt-2">{resource.title}</h3>
                      <p className="text-sm text-[#5D4037]/70 mt-2">{resource.description}</p>
                      <span className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-[#FF8FA3]">
                        記事を読む →
                      </span>
                    </a>
                  ))}
                </div>
              </div>
            </section>

            <section className="mb-12 rounded-3xl border border-white/70 bg-white/80 p-6 shadow-sm">
              <p className="text-xs font-bold text-[#5D4037]/70 uppercase tracking-[0.4em]">Support</p>
              <h2 className="font-heading text-2xl text-[#5D4037] mt-1">不具合かな？と思ったら</h2>
              <p className="text-sm text-[#5D4037]/70 mt-2">以下を試しても解消しない場合は公式LINEへご連絡ください。</p>
              <ul className="mt-4 space-y-3 text-sm text-[#5D4037]/80">
                {troubleshooting.map((tip) => (
                  <li key={tip} className="rounded-2xl border border-[#FFD1DC] bg-[#FFF5F7] px-4 py-3">
                    {tip}
                  </li>
                ))}
              </ul>
              <a
                href={LINE_URL}
                target="_blank"
                rel="noreferrer"
                className="mt-6 inline-flex items-center justify-center gap-2 rounded-full bg-[#06C755] px-6 py-3 text-white font-bold text-sm shadow-lg hover:brightness-105"
              >
                <span className="text-lg">💬</span> 公式LINEで相談する
              </a>
            </section>

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
