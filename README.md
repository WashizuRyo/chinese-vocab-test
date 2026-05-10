# 中国語 単語学習

スマホに最適化した、大学の中国語単語学習アプリ。

課ごとに単語を見て・聞いて・書いて覚えてから、テストで確認できます。
テストでは中国語の発音が再生されるので、それを聞いて **漢字** と **ピンイン** を手書きで答えます。
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

## あいことば（パスワード保護）

クラス内などに限定共有するため、パスワード認証を実装しています。

- 環境変数 `APP_PASSWORD` を設定すると、未認証ユーザーは `/login` にリダイレクトされます。
- 設定しない場合 (`APP_PASSWORD` 未設定 or 空) は認証スキップ（ローカル開発で便利）。
- ログイン成功時は cookie `app_auth` (httpOnly / secure / 60日) が発行されます。

ローカル開発:

```bash
cp .env.local.example .env.local
# .env.local を編集して APP_PASSWORD=xxxxx を設定
pnpm dev
```

Vercel 側では「Project → Settings → Environment Variables」で `APP_PASSWORD` を追加。

## ブラウザ対応

中国語の音声合成 (`zh-CN`) に対応しているブラウザが必要です。
iOS Safari / macOS Safari / Chrome / Edge は対応しています。
非対応の場合は画面上部に警告メッセージが表示されます。

## デプロイ (Vercel)

GitHub にこのリポジトリを push 後、Vercel の "Import Project" で取り込むだけです。
追加の環境変数や設定は不要です。
