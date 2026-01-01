import Link from "next/link";

const checklist = [
  {
    title: "リスト設定を開く",
    points: [
      "Amazonアプリ/サイトの「あなたのリスト」から対象リストを開く",
      "右上メニュー→リストの設定を選び、公開前に内容を確認する",
    ],
  },
  {
    title: "受取人・住所をニックネーム化",
    points: [
      "受取人の名前を公開しても良いニックネームに変更",
      "お届け先住所は新規作成し、建物名欄に本来の宛名（○○様方など）を記載",
      "「配送先住所を販売者と共有する」はオフのままにして、出品者や購入者へ本名が渡らないようにする",
    ],
  },
  {
    title: "共有設定はリンク限定に",
    points: [
      "公開/非公開は「リンクをシェア」に設定し、URLを知る人だけが閲覧できる状態にする",
      "「+招待」→リンクのコピーでシェアすると他のリストまで一括公開されにくい",
    ],
  },
  {
    title: "公開後の見え方と注意",
    points: [
      "受取人名はニックネームが表示されるため、本名のままだと保存された際にバレる",
      "購入者には都道府県まで表示され、配送伝票番号から近隣エリアを推測される可能性がある",
      "マーケットプレイス商品を受け取る場合は販売者に個人情報が渡るケースがあるため注意",
    ],
  },
];

const faq = [
  {
    q: "ほしい物リストを匿名公開してもAmazonアカウント名は変えるべき？",
    a: "受取人をニックネームにしておけば、アカウント名は公開されません。必要が無ければ変更不要です。",
  },
  {
    q: "サプライズ設定や公開設定はどうする？",
    a: "サプライズ設定がオンだと誰かが購入してもリストに残り、重複購入を防げます。公開/非公開は「リンクをシェア」にしておくと余計なリストが露出しません。",
  },
  {
    q: "住所が完全にバレないようにするには？",
    a: "都道府県までは必ず表示されるため、どうしても避けたい場合はAmazon配送の商品のみを選んでもらうようお願いしましょう。",
  },
];

export default function WishlistPrivacyPage() {
  return (
    <div className="min-h-screen bg-[#FFF7FA] py-16 px-4 text-[#5D4037]">
      <div className="mx-auto w-full max-w-4xl space-y-10">
        <header className="text-center space-y-4">
          <p className="font-heading text-sm uppercase tracking-[0.4em] text-[#FF8FA3]">Safety Guide</p>
          <h1 className="text-3xl md:text-4xl font-heading font-bold">Amazonほしい物リストを匿名で公開するチェックリスト</h1>
          <p className="text-sm text-[#5D4037]/70">
            マイナビニュース「Amazonの『ほしい物リスト』を匿名で公開する方法 - 住所もバレない？」で紹介されている手順を参考に、
            りんご会向けに要点を整理しました。公開前の最終確認にご活用ください。
          </p>
        </header>

        <section className="space-y-6">
          {checklist.map((item) => (
            <div key={item.title} className="rounded-3xl border border-white bg-white/90 p-6 shadow-sm">
              <h2 className="font-heading text-xl text-[#5D4037] mb-3">{item.title}</h2>
              <ul className="list-disc space-y-2 pl-5 text-sm text-[#5D4037]/80">
                {item.points.map((point) => (
                  <li key={point}>{point}</li>
                ))}
              </ul>
            </div>
          ))}
        </section>

        <section className="rounded-3xl border border-[#FFE2EA] bg-white/90 p-6 shadow-sm space-y-4">
          <h2 className="font-heading text-xl text-[#5D4037]">よくある質問</h2>
          {faq.map((item) => (
            <div key={item.q}>
              <p className="text-sm font-semibold text-[#FF5C8D]">Q. {item.q}</p>
              <p className="text-sm text-[#5D4037]/80 mt-1">A. {item.a}</p>
            </div>
          ))}
        </section>

        <footer className="text-xs text-[#5D4037]/70 space-y-2">
          <p>
            参考: <Link href="https://news.mynavi.jp/article/20230920-2775392/" className="text-[#a34a5d] underline" target="_blank" rel="noreferrer">
              マイナビニュース「Amazonの『ほしい物リスト』を匿名で公開する方法 - 住所もバレない？」(2023/09/29)
            </Link>
          </p>
          <p>※本ページは記事内容を要約し、りんご会での運用ルールに合わせて再構成したものです。</p>
        </footer>
      </div>
    </div>
  );
}
