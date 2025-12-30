# りんご会♪ イラスト使用ガイド

## 1. 概要

このディレクトリには、「りんご会♪」Webアプリケーションで使用する**6枚のイラスト**が含まれています。すべてのイラストはテキストなし（日本語テキストは実装時にHTMLで追加）で、高解像度のPNG形式です。

---

## 2. ディレクトリ構成

```
ringo_kai_assets_v2/
├── ASSETS_GUIDE.md (このファイル)
├── character/
│   └── ringo_kai_main_character.png (TOPページキャラクター)
└── cards/
    ├── bronze_apple_card_v2.png (ブロンズりんご)
    ├── silver_apple_card_final.png (シルバーりんご)
    ├── gold_apple_card_v2.png (ゴールドりんご)
    ├── red_apple_card_premium.png (赤りんご)
    └── poison_apple_card_final.png (毒りんご)
```

---

## 3. イラスト一覧と使用場所

### 3.1. TOPページキャラクター

| ファイル名 | 使用場所 | 説明 |
|---|---|---|
| `character/ringo_kai_main_character.png` | TOPページ（ヒーローセクション） | りんごちゃんのメインキャラクター。背景画像として画面いっぱいに表示。 |

**実装例 (Next.js + Tailwind CSS)**:

```jsx
<div className="relative h-screen w-full">
  <Image
    src="/images/character/ringo_kai_main_character.png"
    alt="りんごちゃん"
    fill
    className="object-cover opacity-80"
  />
  <div className="absolute inset-0 flex flex-col items-center justify-center">
    <h1 className="text-5xl font-bold text-white">りんご会♪</h1>
    <p className="text-xl text-white">欲しいものを交換し合う、新しいコミュニティ</p>
  </div>
</div>
```

### 3.2. 完成版りんごカード（5枚）

これらのカードは、**抽選結果の表示**と**1時間演出のベース画像**として使用します。

| ファイル名 | りんごの種類 | 免除回数 | 使用場所 |
|---|---|---|---|
| `cards/bronze_apple_card_v2.png` | ブロンズりんご | 0回 | 結果表示ページ |
| `cards/silver_apple_card_final.png` | シルバーりんご | 2回 | 結果表示ページ |
| `cards/gold_apple_card_v2.png` | ゴールドりんご | 3回 | 結果表示ページ |
| `cards/red_apple_card_premium.png` | 赤りんご | 10回 | 結果表示ページ |
| `cards/poison_apple_card_final.png` | 毒りんご | ハズレ | 結果表示ページ |

**実装例 (1時間演出システム)**:

```jsx
import { useState, useEffect } from 'react';

export default function RevealPage({ appleId }) {
  const [filterStyle, setFilterStyle] = useState('blur(16px) grayscale(100%)');
  const [cardImage, setCardImage] = useState('/images/cards/bronze_apple_card_v2.png'); // 仮の画像

  useEffect(() => {
    // 10分ごとにフィルタを変更
    const intervals = [
      { time: 0, filter: 'blur(16px) grayscale(100%)' },
      { time: 10 * 60 * 1000, filter: 'blur(12px) grayscale(100%)' },
      { time: 20 * 60 * 1000, filter: 'blur(8px) grayscale(100%)' },
      { time: 30 * 60 * 1000, filter: 'blur(4px) grayscale(100%)' },
      { time: 40 * 60 * 1000, filter: 'blur(4px) grayscale(50%)' },
      { time: 50 * 60 * 1000, filter: 'blur(0) grayscale(0%)' }, // フェイク演出開始
      { time: 60 * 60 * 1000, filter: 'blur(0) grayscale(0%)' }, // 結果確定
    ];

    intervals.forEach(({ time, filter }) => {
      setTimeout(() => setFilterStyle(filter), time);
    });

    // 50分目のフェイク演出
    setTimeout(() => {
      const cards = [
        '/images/cards/bronze_apple_card_v2.png',
        '/images/cards/silver_apple_card_final.png',
        '/images/cards/gold_apple_card_v2.png',
        '/images/cards/red_apple_card_premium.png',
        '/images/cards/poison_apple_card_final.png',
      ];
      const interval = setInterval(() => {
        setCardImage(cards[Math.floor(Math.random() * cards.length)]);
      }, 200); // 0.2秒ごとにランダム切り替え

      setTimeout(() => {
        clearInterval(interval);
        setFilterStyle('blur(16px) grayscale(100%)'); // 再びぼかし
      }, 10000); // 10秒間フェイク演出
    }, 50 * 60 * 1000);

    // 60分後に最終結果を取得
    setTimeout(async () => {
      const response = await fetch(`/api/apples/${appleId}`);
      const data = await response.json();
      setCardImage(`/images/cards/${data.result}_apple_card.png`);
      setFilterStyle('blur(0) grayscale(0%)');
    }, 60 * 60 * 1000);
  }, [appleId]);

  return (
    <div className="flex items-center justify-center h-screen">
      <img
        src={cardImage}
        alt="りんご"
        className="w-96 h-auto transition-all duration-1000"
        style={{ filter: filterStyle }}
      />
    </div>
  );
}
```

---

## 4. Next.jsプロジェクトへの配置方法

1. このディレクトリ全体を、Next.jsプロジェクトの `public/images/` ディレクトリにコピーします。

```bash
cp -r ringo_kai_assets_v2/* /path/to/your/nextjs-project/public/images/
```

2. 配置後のディレクトリ構成:

```
your-nextjs-project/
└── public/
    └── images/
        ├── character/
        │   └── ringo_kai_main_character.png
        └── cards/
            ├── bronze_apple_card_v2.png
            ├── silver_apple_card_final.png
            ├── gold_apple_card_v2.png
            ├── red_apple_card_premium.png
            └── poison_apple_card_final.png
```

3. コード内で画像を参照する際は、`/images/`から始まるパスを使用します。

```jsx
<img src="/images/cards/gold_apple_card_v2.png" alt="ゴールドりんご" />
```

---

## 5. 重要な注意事項

- **段階的公開アニメーション用イラストは削除されました**: 1時間演出は、CSSフィルタを使用して実現します。
- **チャットボットアイコンは削除されました**: チャットボット機能は不要になりました。
- **すべてのイラストはテキストなし**: 日本語のテキスト（「購入免除◯回」など）は、HTMLで実装時に追加してください。

---

以上で、イラスト使用ガイドは完了です。これらのイラストを使って、素晴らしい「りんご会♪」を作り上げてください！
