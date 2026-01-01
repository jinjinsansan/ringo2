"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/context/UserContext";

const steps = [
  {
    title: "1. 購入する",
    description: "Amazonの欲しいものリストから、誰かのギフトを購入します。",
    icon: "🎁",
  },
  {
    title: "2. りんごを引く",
    description: "購入証明を送ると、運命のりんごを引くチャンス！",
    icon: "🍎",
  },
  {
    title: "3. 届く",
    description: "あなたの欲しいものが、次の誰かから届きます。",
    icon: "💖",
  },
];

const faqItems = [
  {
    question: "本当に無料ですか？",
    answer: "サービスの利用料は完全無料です。必要なのは、誰かへのプレゼント代だけ。",
  },
  {
    question: "どんな商品が対象ですか？",
    answer: "Amazonの欲しいものリストに登録された商品が対象です。安心して交換できます。",
  },
  {
    question: "個人情報は安全ですか？",
    answer: "住所や電話番号はAmazonの仕組みで保護されます。サイト上では最小限の情報のみ扱います。",
  },
];

export default function Home() {
  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  const router = useRouter();
  const { sessionEmail, loading } = useUser();
  const isLoggedIn = Boolean(sessionEmail);

  const heroCtaLabel = useMemo(() => (isLoggedIn ? "マイページに移動" : "今すぐ参加する（無料）"), [isLoggedIn]);
  const guideCtaLabel = useMemo(() => (isLoggedIn ? "マイページを開く" : "さっそく始める"), [isLoggedIn]);
  const footerCtaLabel = useMemo(() => (isLoggedIn ? "マイページを開く" : "今すぐ登録する"), [isLoggedIn]);

  const handlePrimaryCta = useCallback(() => {
    router.push(isLoggedIn ? "/my-page" : "/signup");
  }, [isLoggedIn, router]);

  useEffect(() => {
    if (!loading && isLoggedIn) {
      router.replace("/my-page");
    }
  }, [loading, isLoggedIn, router]);

  if (isLoggedIn && !loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-[#5D4037]">
        <p>マイページへ移動しています...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-[#5D4037]">
      <main>
        {/* Hero Section */}
        <section className="relative min-h-screen flex items-center justify-center pt-20 overflow-hidden">
          {/* Background Blobs */}
          <div className="absolute top-20 left-10 w-64 h-64 bg-[#FFD1DC] rounded-full mix-blend-multiply filter blur-3xl opacity-60 animate-float" />
          <div className="absolute top-40 right-10 w-72 h-72 bg-[#FF8FA3] rounded-full mix-blend-multiply filter blur-3xl opacity-40 animate-float" style={{ animationDelay: "2s" }} />
          <div className="absolute -bottom-20 left-1/3 w-96 h-96 bg-[#FFFDD0] rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-float" style={{ animationDelay: "4s" }} />

          <div className="container mx-auto px-6 relative z-10 grid md:grid-cols-2 gap-12 items-center">
            <div className="text-center md:text-left space-y-8 animate-fade-up">
              <div className="inline-block px-4 py-1.5 rounded-full bg-white/80 border border-[#FFD1DC] text-[#FF6B8B] text-sm font-bold shadow-sm">
                💖 新感覚！プレゼント交換コミュニティ
              </div>
              <h1 className="font-heading text-4xl md:text-6xl/tight font-bold text-[#5D4037]">
                <span className="text-[#FF8FA3]">幸せ</span>が巡る、
                <br />
                <span className="text-[#FF8FA3]">りんご</span>の魔法。
              </h1>
              <p className="text-lg text-[#5D4037]/80 leading-relaxed max-w-lg mx-auto md:mx-0">
                誰かの「欲しい」を叶えると、あなたの「欲しい」も誰かが叶えてくれる。
                優しさでつながる、新しいギフト交換の形です。
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start pt-4">
                <button
                  type="button"
                  onClick={handlePrimaryCta}
                  className="btn-primary px-8 py-4 rounded-full text-lg font-bold shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all"
                >
                  {heroCtaLabel}
                </button>
                <a
                  href="#guide"
                  className="px-8 py-4 rounded-full bg-white/80 border border-white text-[#5D4037] font-bold shadow-md hover:bg-white transition-all flex items-center justify-center gap-2"
                >
                  <span>🍎</span> 仕組みを見る
                </a>
              </div>
            </div>
            
            <div className="relative h-[400px] md:h-[600px] w-full flex items-center justify-center animate-fade-up" style={{ animationDelay: "0.2s" }}>
              <div className="relative w-[300px] h-[300px] md:w-[500px] md:h-[500px] animate-float">
                <Image
                  src="/images/character/ringo_kai_main_character.png"
                  alt="りんご会メインキャラクター"
                  fill
                  className="object-contain drop-shadow-2xl"
                  priority
                />
              </div>
            </div>
          </div>
        </section>

        {/* Concept Section */}
        <section className="py-24 bg-white/50 backdrop-blur-sm relative">
          <div className="container mx-auto px-6 max-w-5xl">
            <div className="text-center mb-16 space-y-4">
              <span className="text-[#FF8FA3] font-bold tracking-widest text-sm">CONCEPT</span>
              <h2 className="font-heading text-3xl md:text-4xl font-bold">
                「贈る」ことで、<br />「贈られる」物語が始まる。
              </h2>
              <div className="w-16 h-1 bg-[#FF8FA3] mx-auto rounded-full" />
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              <div className="glass-card p-8 rounded-3xl text-center space-y-4 hover:-translate-y-2 transition-transform duration-300">
                <div className="w-16 h-16 bg-[#FFF5F7] rounded-full flex items-center justify-center text-3xl mx-auto shadow-inner">
                  💝
                </div>
                <h3 className="font-heading text-xl font-bold">Give First</h3>
                <p className="text-sm leading-relaxed text-[#5D4037]/80">
                  まずは誰かの夢を叶えましょう。あなたの優しさが、コミュニティ全体の幸せの循環を生み出します。
                </p>
              </div>
              <div className="glass-card p-8 rounded-3xl text-center space-y-4 hover:-translate-y-2 transition-transform duration-300 md:-mt-8">
                <div className="w-16 h-16 bg-[#FFF5F7] rounded-full flex items-center justify-center text-3xl mx-auto shadow-inner">
                  🎲
                </div>
                <h3 className="font-heading text-xl font-bold">Game Feel</h3>
                <p className="text-sm leading-relaxed text-[#5D4037]/80">
                  購入すると「りんご」を引けます。金、銀、銅... 何が出るかは運次第。ワクワクする体験が待っています。
                </p>
              </div>
              <div className="glass-card p-8 rounded-3xl text-center space-y-4 hover:-translate-y-2 transition-transform duration-300">
                <div className="w-16 h-16 bg-[#FFF5F7] rounded-full flex items-center justify-center text-3xl mx-auto shadow-inner">
                  ✨
                </div>
                <h3 className="font-heading text-xl font-bold">Get Gift</h3>
                <p className="text-sm leading-relaxed text-[#5D4037]/80">
                  次はあなたの番。誰かがあなたの欲しいものリストから、素敵なプレゼントを贈ってくれます。
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Steps Section */}
        <section id="guide" className="py-24 relative overflow-hidden">
          <div className="container mx-auto px-6 max-w-6xl">
            <div className="grid md:grid-cols-2 gap-16 items-center">
              <div className="space-y-12">
                <div className="space-y-4">
                  <span className="text-[#FF8FA3] font-bold tracking-widest text-sm">HOW TO USE</span>
                  <h2 className="font-heading text-3xl md:text-4xl font-bold">
                    はじめ方は、<br />とってもシンプル。
                  </h2>
                  <p className="text-[#5D4037]/80">
                    難しい手続きはありません。Amazonの欲しいものリストがあれば、すぐに始められます。
                  </p>
                </div>

                <div className="space-y-8">
                  {steps.map((step, index) => (
                    <div key={index} className="flex gap-6 items-start">
                      <div className="w-12 h-12 shrink-0 rounded-2xl bg-[#FF8FA3] text-white flex items-center justify-center text-xl font-bold shadow-lg shadow-[#FF8FA3]/30">
                        {index + 1}
                      </div>
                      <div className="space-y-2">
                        <h3 className="font-heading text-xl font-bold">{step.title.split(". ")[1]}</h3>
                        <p className="text-sm text-[#5D4037]/80 leading-relaxed">
                          {step.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                
                <button
                  type="button"
                  onClick={handlePrimaryCta}
                  className="btn-primary inline-flex items-center gap-2 px-8 py-4 rounded-full font-bold shadow-xl"
                >
                  {guideCtaLabel} <span className="text-lg">→</span>
                </button>
              </div>
              
              <div className="relative">
                <div className="glass-card p-8 rounded-[40px] border-2 border-white/50 rotate-3 hover:rotate-0 transition-transform duration-500">
                   <div className="aspect-[4/3] bg-[#FFF5F7] rounded-2xl flex items-center justify-center overflow-hidden relative">
                      {/* Placeholder for screenshot/demo */}
                      <div className="text-center p-6">
                        <span className="text-4xl block mb-2">🎁</span>
                        <p className="font-heading font-bold text-[#FF8FA3]">Happy Ringo Cycle</p>
                      </div>
                   </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-24 bg-white/40">
          <div className="container mx-auto px-6 max-w-3xl">
            <div className="text-center mb-16 space-y-4">
              <span className="text-[#FF8FA3] font-bold tracking-widest text-sm">FAQ</span>
              <h2 className="font-heading text-3xl md:text-4xl font-bold">よくある質問</h2>
            </div>
            
            <div className="space-y-4">
              {faqItems.map((item, index) => (
                <div 
                  key={index} 
                  className="bg-white/80 rounded-2xl border border-white shadow-sm overflow-hidden transition-all duration-300 hover:shadow-md"
                >
                  <button
                    className="w-full px-8 py-6 flex items-center justify-between text-left font-bold text-[#5D4037]"
                    onClick={() => setActiveFaq(activeFaq === index ? null : index)}
                  >
                    <span>{item.question}</span>
                    <span className={`text-[#FF8FA3] text-2xl transition-transform duration-300 ${activeFaq === index ? "rotate-45" : ""}`}>
                      +
                    </span>
                  </button>
                  <div 
                    className={`px-8 transition-all duration-300 overflow-hidden ${activeFaq === index ? "pb-6 max-h-40 opacity-100" : "max-h-0 opacity-0"}`}
                  >
                    <p className="text-[#5D4037]/80 leading-relaxed text-sm">
                      {item.answer}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Footer */}
        <section className="py-24 relative overflow-hidden text-center">
          <div className="absolute inset-0 bg-gradient-to-t from-[#FF8FA3]/20 to-transparent" />
          <div className="container mx-auto px-6 relative z-10 space-y-8">
            <h2 className="font-heading text-3xl md:text-5xl font-bold leading-tight">
              さあ、幸せのサイクルを<br />はじめましょう
            </h2>
            <p className="text-[#5D4037]/70">
              登録は無料。あなたの優しさが、誰かの笑顔になります。
            </p>
            <button
              type="button"
              onClick={handlePrimaryCta}
              className="btn-primary inline-flex px-10 py-5 rounded-full text-xl font-bold shadow-xl hover:scale-105 transition-transform"
            >
              {footerCtaLabel}
            </button>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-white/80 border-t border-[#FFD1DC]/50 py-12">
        <div className="container mx-auto px-6 text-center space-y-8">
          <div className="font-heading text-2xl font-bold text-[#FF8FA3]">りんご会♪</div>
          <div className="flex flex-wrap justify-center gap-8 text-sm font-medium text-[#5D4037]/70">
            <a href="/tos" className="hover:text-[#FF8FA3] transition-colors">利用規約</a>
            <a href="/privacy" className="hover:text-[#FF8FA3] transition-colors">プライバシーポリシー</a>
            <a href="/guide" className="hover:text-[#FF8FA3] transition-colors">使い方</a>
            <a href="#contact" className="hover:text-[#FF8FA3] transition-colors">お問い合わせ</a>
          </div>
          <p className="text-xs text-[#5C4033]/40">
            © 2024 Ringo Kai. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
