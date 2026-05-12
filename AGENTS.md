# Project Overview

スマホ向けの中国語単語学習アプリです。大学の中国語授業で使う単語を、課ごとに「見る・聞く・書く」で練習し、最後にテストで確認します。

テストでは中国語音声を聞いて、漢字とピンインを手書きで答えます。回答後に正解を表示し、ユーザーが自分で ○ / × を付ける自己採点式です。

## Tech Stack

- Next.js 16 App Router
- React 19
- TypeScript
- Tailwind CSS v4
- pnpm
- Biome for linting and formatting
- Vitest + Testing Library for tests
- Web Speech API for Chinese pronunciation playback (`zh-CN`)
- Canvas API for handwriting input
- Cookie-based password protection via `APP_PASSWORD`

<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->
