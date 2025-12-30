"use client";

import Image from "next/image";
import { useState } from "react";

const navLinks = [
  { label: "利用規約", href: "#tos" },
  { label: "プライバシーポリシー", href: "#privacy" },
  { label: "使い方", href: "#guide" },
  { label: "お問い合わせ", href: "#contact" },
];

const steps = [
  {
    title: "購入する",
    description: "誰かの欲しいものを購入",
    icon: "🛒",
  },
  {
    title: "りんごを引く",
    description: "運命のりんごを引く",
    icon: "🍎",
  },
  {
    title: "買ってもらう",
    description: "あなたの欲しいものが誰かの元へ",
    icon: "🎁",
  },
];

const faqItems = [
  {
    question: "本当に無料ですか？",
    answer: "アカウント作成や参加は無料です。購入は相互のプレゼント交換に必要な商品代のみです。",
  },
  {
    question: "どんな商品が対象ですか？",
    answer: "Amazonの欲しいものリストに登録できる商品が対象です。利用規約に反する商品は対象外です。",
  },
  {
    question: "個人情報は安全ですか？",
    answer: "Supabase Authで認証し、必要最小限の情報のみを扱います。詳細はプライバシーポリシーをご確認ください。",
  },
];

export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-[#F5F5F5] text-[#5C4033]">
      <header className="sticky top-0 z-40 bg-[#FFFDD0]/80 backdrop-blur-md shadow-sm">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4 md:px-8">
          <div className="flex items-center gap-3">
            <span className="font-heading text-xl md:text-2xl">りんご会♪</span>
            <span className="rounded-full bg-[#FFC0CB] px-3 py-1 text-xs font-semibold text-[#5C4033] shadow-sm">
              New
            </span>
          </div>

          <nav className="hidden items-center gap-6 text-sm font-medium md:flex">
            {navLinks.map((item) => (
              <a key={item.label} href={item.href} className="transition hover:text-[#a34a5d]">
                {item.label}
              </a>
            ))}
            <div className="ml-6 flex items-center gap-3">
              <a
                className="rounded-full border border-[#FFC0CB] px-4 py-2 text-sm font-semibold text-[#5C4033] transition hover:bg-[#FFC0CB]/80"
                href="#login"
              >
                ログイン
              </a>
              <a
                className="rounded-full bg-[#FFC0CB] px-5 py-2 text-sm font-semibold text-[#5C4033] shadow-md transition hover:shadow-lg"
                href="#signup"
              >
                無料で新規登録
              </a>
            </div>
          </nav>

          <button
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-md md:hidden"
            aria-label="メニュー"
            onClick={() => setMenuOpen((prev) => !prev)}
          >
            <span className="relative block h-5 w-6">
              <span
                className={`absolute block h-0.5 w-full bg-[#5C4033] transition ${
                  menuOpen ? "top-2.5 rotate-45" : "top-1"
                }`}
              />
              <span
                className={`absolute block h-0.5 w-full bg-[#5C4033] transition ${
                  menuOpen ? "opacity-0" : "top-2.5"
                }`}
              />
              <span
                className={`absolute block h-0.5 w-full bg-[#5C4033] transition ${
                  menuOpen ? "top-2.5 -rotate-45" : "top-4"
                }`}
              />
            </span>
          </button>
        </div>

        {menuOpen && (
          <div className="fixed inset-0 z-30 md:hidden">
            <div
              className="absolute inset-0 bg-black/40"
              onClick={() => setMenuOpen(false)}
            />
            <div className="absolute right-0 top-0 h-full w-72 bg-white p-6 shadow-xl">
              <div className="mb-6 flex items-center justify-between">
                <span className="font-heading text-lg">メニュー</span>
                <button
                  className="text-sm text-[#5C4033] underline"
                  onClick={() => setMenuOpen(false)}
                >
                  閉じる
                </button>
              </div>
              <div className="flex flex-col gap-4 text-sm font-medium text-[#5C4033]">
                {navLinks.map((item) => (
                  <a key={item.label} href={item.href} onClick={() => setMenuOpen(false)}>
                    {item.label}
                  </a>
                ))}
                <a className="mt-2 rounded-full border border-[#FFC0CB] px-4 py-2 text-center font-semibold" href="#login">
                  ログイン
                </a>
                <a className="rounded-full bg-[#FFC0CB] px-4 py-2 text-center font-semibold text-[#5C4033] shadow-sm" href="#signup">
                  無料で新規登録
                </a>
              </div>
            </div>
          </div>
        )}
      </header>

      <main>
        <section className="relative overflow-hidden">
          <div className="absolute inset-0">
            <Image
              src="/images/character/ringo_kai_main_character.png"
              alt="りんごちゃん"
              fill
              priority
              className="object-cover opacity-60"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-[#FFFDD0]/80 via-[#F5F5F5]/85 to-[#F5F5F5]" />
          </div>

          <div className="relative mx-auto flex min-h-[80vh] w-full max-w-6xl flex-col gap-10 px-4 pb-16 pt-14 md:grid md:grid-cols-2 md:items-center md:gap-14 md:px-8 md:py-20">
            <div className="animate-fade-up">
              <p className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/80 px-4 py-2 text-xs font-semibold text-[#a34a5d] shadow-sm">
                新しい交換コミュニティ
              </p>
              <h1 className="font-heading text-3xl leading-tight md:text-4xl lg:text-5xl">
                欲しいものを交換し合う、
                <br />新しいコミュニティ
              </h1>
              <p className="mt-4 text-base leading-relaxed md:text-lg">
                誰かの欲しいものを買ってあげると、あなたの欲しいものも誰かに届くチャンスがもらえる。ゲーム感覚で始められるギフト交換コミュニティです。
              </p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
                <a
                  href="#signup"
                  className="inline-flex items-center justify-center rounded-full bg-[#FFC0CB] px-6 py-3 text-sm font-semibold text-[#5C4033] shadow-md transition hover:shadow-lg"
                >
                  無料で新規登録
                </a>
                <a
                  href="#login"
                  className="inline-flex items-center justify-center rounded-full border border-[#FFC0CB] bg-white/80 px-6 py-3 text-sm font-semibold text-[#5C4033] transition hover:bg-[#FFC0CB]/30"
                >
                  ログイン
                </a>
              </div>
            </div>

            <div className="glass-card relative overflow-hidden rounded-3xl border border-white/60 p-6 shadow-lg animate-fade-up">
              <div className="absolute -left-8 -top-10 h-32 w-32 rounded-full bg-[#FFC0CB]/40 blur-3xl" />
              <div className="absolute -bottom-16 -right-10 h-40 w-40 rounded-full bg-[#98FF98]/30 blur-3xl" />
              <div className="relative flex flex-col gap-4">
                <p className="text-sm font-semibold text-[#5C4033]/80">りんご会♪とは？</p>
                <h2 className="font-heading text-2xl leading-relaxed">
                  りんご会♪は、Amazonの欲しいものリストを通じて、他のユーザーとプレゼントを交換し合う、ゲーム感覚のコミュニティです。
                </h2>
                <p className="text-sm leading-relaxed text-[#5C4033]/80">
                  誰かの欲しいものを買ってあげると、あなたも誰かに欲しいものを買ってもらえるチャンスがもらえます。
                </p>
                <div className="flex flex-wrap gap-2 text-xs font-semibold text-[#5C4033]">
                  <span className="rounded-full bg-white px-3 py-1 shadow-sm">安全な交換フロー</span>
                  <span className="rounded-full bg-white px-3 py-1 shadow-sm">ゲーム感覚で楽しい</span>
                  <span className="rounded-full bg-white px-3 py-1 shadow-sm">女性向けデザイン</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="guide" className="bg-white py-16">
          <div className="mx-auto max-w-6xl px-4 md:px-8">
            <div className="mb-10 flex flex-col gap-3 text-center md:text-left">
              <p className="text-sm font-semibold text-[#a34a5d]">HOW TO</p>
              <h2 className="font-heading text-3xl md:text-4xl">かんたん3ステップで始めよう</h2>
              <p className="text-base text-[#5C4033]/80">
                登録からプレゼント交換まで、直感的なステップで迷わず進めます。
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              {steps.map((step) => (
                <div
                  key={step.title}
                  className="glass-card relative flex h-full flex-col gap-3 rounded-2xl border border-[#FFC0CB]/40 p-6 shadow-md"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#FFC0CB]/70 text-xl shadow-sm">
                    {step.icon}
                  </div>
                  <h3 className="font-heading text-xl">{step.title}</h3>
                  <p className="text-sm text-[#5C4033]/80">{step.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-[#FFFDD0]/70 py-16">
          <div className="mx-auto max-w-6xl px-4 md:px-8">
            <div className="mb-8 text-center md:text-left">
              <p className="text-sm font-semibold text-[#a34a5d]">FAQ</p>
              <h2 className="font-heading text-3xl md:text-4xl">よくある質問</h2>
            </div>
            <div className="space-y-4">
              {faqItems.map((item, index) => {
                const open = activeFaq === index;
                return (
                  <div key={item.question} className="glass-card rounded-2xl border border-[#FFC0CB]/40 p-4 shadow-sm">
                    <button
                      className="flex w-full items-center justify-between text-left text-base font-semibold"
                      onClick={() => setActiveFaq(open ? null : index)}
                    >
                      {item.question}
                      <span className="text-lg">{open ? "−" : "+"}</span>
                    </button>
                    <div
                      className={`grid overflow-hidden transition-all duration-300 ${
                        open ? "grid-rows-[1fr] pt-3 opacity-100" : "grid-rows-[0fr] opacity-0"
                      }`}
                    >
                      <p className="text-sm leading-relaxed text-[#5C4033]/80">{item.answer}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <footer className="bg-white py-10">
          <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 md:flex-row md:items-center md:justify-between md:px-8">
            <div className="flex items-center gap-3">
              <span className="font-heading text-xl">りんご会♪</span>
              <span className="text-xs text-[#5C4033]/70">欲しいものを交換するコミュニティ</span>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-sm text-[#5C4033]/80">
              <a href="#tos" className="hover:text-[#a34a5d]">
                利用規約
              </a>
              <a href="#privacy" className="hover:text-[#a34a5d]">
                プライバシーポリシー
              </a>
              <a href="#contact" className="hover:text-[#a34a5d]">
                お問い合わせ
              </a>
            </div>
            <p className="text-xs text-[#5C4033]/60">© 2024 りんご会♪</p>
          </div>
        </footer>
      </main>
    </div>
  );
}
