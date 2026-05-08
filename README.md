# 中国語 単語テスト

スマホに最適化した、大学の中国語単語テスト対策アプリ。

中国語の発音が再生されるので、それを聞いて **漢字** と **ピンイン** を手書きで答えます。
1 問ごとに正解が表示され、自分の答えを見比べて ○ / × で自己採点します。

## 技術スタック

- Next.js 16 (App Router) + TypeScript
- Tailwind CSS v4
- Biome (lint + format)
- Web Speech API (中国語の発音再生、`zh-CN`)
- Canvas API (手書き入力)
- pnpm
- Vercel (デプロイ先)

## 開発

```bash
pnpm install
pnpm dev          # 開発サーバ http://localhost:3000
pnpm build        # 本番ビルド
pnpm lint         # Biome check
pnpm format       # Biome format
pnpm check        # Biome check + 自動修正
```

## 新しい課を追加する手順

1. `src/data/lessons/lessonNN.ts` を作成（既存ファイルをコピーするのが楽）

   ```ts
   import type { Lesson } from "@/lib/types";

   export const lesson03: Lesson = {
     id: "lesson03",
     title: "第3課",
     words: [
       { hanzi: "新しい単語", pinyin: "xīn de dāncí", japanese: "新しい単語" },
       // ...
     ],
   };
   ```

2. `src/data/lessons/index.ts` の `lessons` 配列に追加。
3. `git push` すれば Vercel が自動でビルド & デプロイします。

## ブラウザ対応

中国語の音声合成 (`zh-CN`) に対応しているブラウザが必要です。
iOS Safari / macOS Safari / Chrome / Edge は対応しています。
非対応の場合は画面上部に警告メッセージが表示されます。

## デプロイ (Vercel)

GitHub にこのリポジトリを push 後、Vercel の "Import Project" で取り込むだけです。
追加の環境変数や設定は不要です。
