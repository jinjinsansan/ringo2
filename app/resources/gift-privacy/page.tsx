import Link from "next/link";

const approaches = [
  {
    title: "ギフト設定をオフにして完全匿名",
    bullets: [
      "公開されたほしい物リストから商品をカートへ入れ、ギフト設定のチェックを外す",
      "配送先には「ギフト用に登録された住所」を選択すると相手の住所へ届く",
      "この手順なら配送ラベルに送付主情報が載らず、支払い方法を問わず匿名を維持できる",
    ],
  },
  {
    title: "メッセージ付きで贈る場合(ギフト設定オン)",
    bullets: [
      "Amazonアカウント名を事前にニックネームへ変更",
      "請求先住所を新規作成し、氏名欄をニックネームにすることでラベルにも本名が出ない",
      "ギフトメッセージやラッピングを付けたい場合のみこの手順を使う",
    ],
  },
  {
    title: "注文エラーの主な原因",
    bullets: [
      "マーケットプレイス発送の商品は、相手が住所共有を許可していないと注文できない",
      "リスト作成者がお届け先住所を設定していないと配送先が出てこない",
      "出荷元・販売元がAmazonの商品を選ぶとトラブルが起きにくい",
    ],
  },
];

const tips = [
  "クレジットカードでも納品書は同梱されないため、支払い方法で身バレする心配はほぼありません。心配な場合は事前にギフトカード残高へチャージして利用しましょう。",
  "ギフト設定をオンにする場合は、メッセージ欄に個人情報を書かない／スクショを残さないなど、SNS拡散時のリスクにも注意してください。",
  "配送ラベルの「贈り主」欄はAmazonアカウント名がそのまま印字されるため、ニックネーム変更を忘れないようにしましょう。",
];

export default function GiftPrivacyPage() {
  return (
    <div className="min-h-screen bg-[#F8FFF9] py-16 px-4 text-[#304040]">
      <div className="mx-auto w-full max-w-4xl space-y-10">
        <header className="text-center space-y-4">
          <p className="font-heading text-sm uppercase tracking-[0.4em] text-[#65B09A]">Safety Guide</p>
          <h1 className="text-3xl md:text-4xl font-heading font-bold">ほしい物リストのプレゼントを匿名で送る方法</h1>
          <p className="text-sm text-[#304040]/70">
            マイナビニュース「Amazonで『ほしい物リスト』の商品を送る方法 - 匿名でプレゼント可能」を基に、
            送る側の注意点をまとめました。購入前に確認してスムーズに支援しましょう。
          </p>
        </header>

        <section className="space-y-6">
          {approaches.map((section) => (
            <div key={section.title} className="rounded-3xl border border-white bg-white/95 p-6 shadow-sm">
              <h2 className="font-heading text-xl text-[#304040] mb-3">{section.title}</h2>
              <ul className="list-disc space-y-2 pl-5 text-sm text-[#304040]/80">
                {section.bullets.map((bullet) => (
                  <li key={bullet}>{bullet}</li>
                ))}
              </ul>
            </div>
          ))}
        </section>

        <section className="rounded-3xl border border-[#D2F1E4] bg-white/90 p-6 shadow-sm space-y-3">
          <h2 className="font-heading text-xl text-[#304040]">覚えておきたいコツ</h2>
          <ul className="list-disc pl-5 space-y-2 text-sm text-[#304040]/80">
            {tips.map((tip) => (
              <li key={tip}>{tip}</li>
            ))}
          </ul>
        </section>

        <footer className="text-xs text-[#304040]/70 space-y-2">
          <p>
            参考: <Link href="https://news.mynavi.jp/article/20230930-2781642/" className="text-[#0F8B8D] underline" target="_blank" rel="noreferrer">
              マイナビニュース「Amazonで『ほしい物リスト』の商品を送る方法 - 匿名でプレゼント可能」(2023/09/29)
            </Link>
          </p>
          <p>※マイナビニュースの内容を要約し、りんご会の購入ルールに沿って再構成しています。</p>
        </footer>
      </div>
    </div>
  );
}
