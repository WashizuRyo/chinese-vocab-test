"use client";

import Link from "next/link";
import { WordCard } from "@/components/word-card";
import type { WordResult } from "@/lib/types";

interface Props {
  results: WordResult[];
  lessonTitle: string;
  onRetry: () => void;
  onRetryWrongOnly: () => void;
  onBackToMode: () => void;
}

export function ResultSummary({
  results,
  lessonTitle,
  onRetry,
  onRetryWrongOnly,
  onBackToMode,
}: Props) {
  const total = results.length;
  const hanziCorrect = results.filter((r) => r.hanziCorrect === true).length;
  const pinyinCorrect = results.filter((r) => r.pinyinCorrect === true).length;
  const bothCorrect = results.filter(
    (r) => r.hanziCorrect === true && r.pinyinCorrect === true,
  ).length;

  const wrongResults = results.filter((r) => r.hanziCorrect !== true || r.pinyinCorrect !== true);

  return (
    <main className="flex flex-1 w-full flex-col px-4 pt-6 pb-28">
      <header className="mb-4">
        <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          結果
        </div>
        <h1 className="mt-1 text-2xl font-bold text-foreground">{lessonTitle}</h1>
      </header>

      <section className="grid grid-cols-3 gap-2">
        <ScoreTile label="漢字" correct={hanziCorrect} total={total} accent="correct" />
        <ScoreTile label="ピンイン" correct={pinyinCorrect} total={total} accent="sky" />
        <ScoreTile label="両方正解" correct={bothCorrect} total={total} accent="zinc" />
      </section>

      <section className="mt-6">
        <h2 className="text-sm font-semibold text-card-foreground">
          間違えた単語 ({wrongResults.length})
        </h2>
        {wrongResults.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">全問正解！おめでとう。</p>
        ) : (
          <ul className="mt-2 flex flex-col gap-2">
            {wrongResults.map((r) => (
              <li key={`${r.word.hanzi}-${r.word.pinyin}`}>
                <WordCard
                  word={r.word}
                  footer={
                    <dl className="flex flex-wrap items-center gap-x-6 gap-y-2">
                      <ResultStatus label="漢字" correct={r.hanziCorrect === true} />
                      <ResultStatus label="ピンイン" correct={r.pinyinCorrect === true} />
                    </dl>
                  }
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-6 flex flex-col gap-2">
        {wrongResults.length > 0 ? (
          <button
            type="button"
            onClick={onRetryWrongOnly}
            className="h-12 w-full rounded-2xl bg-primary text-sm font-semibold text-primary-foreground shadow-sm"
          >
            間違えたものだけ復習 ({wrongResults.length})
          </button>
        ) : null}
        <button
          type="button"
          onClick={onRetry}
          className="h-12 w-full rounded-2xl border border-border bg-card text-sm font-semibold text-foreground"
        >
          もう一度（同じ範囲）
        </button>
        <button
          type="button"
          onClick={onBackToMode}
          className="h-12 w-full rounded-2xl border border-border bg-card text-sm font-semibold text-foreground"
        >
          モード選択に戻る
        </button>
        <Link
          href="/"
          className="flex h-12 w-full items-center justify-center rounded-2xl text-sm font-semibold text-muted-foreground"
        >
          トップへ
        </Link>
      </section>
    </main>
  );
}

function ScoreTile({
  label,
  correct,
  total,
  accent,
}: {
  label: string;
  correct: number;
  total: number;
  accent: "correct" | "sky" | "zinc";
}) {
  const accentClass = {
    correct: "text-correct",
    sky: "text-sky-600",
    zinc: "text-foreground",
  }[accent];
  return (
    <div className="rounded-2xl border border-border bg-card p-3 text-center">
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      <div className={`mt-1 text-2xl font-bold ${accentClass}`}>
        {correct}
        <span className="text-sm text-muted-foreground"> / {total}</span>
      </div>
    </div>
  );
}

function ResultStatus({ label, correct }: { label: string; correct: boolean }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <dt className="font-medium text-muted-foreground">{label}</dt>
      <dd className={`text-lg font-bold ${correct ? "text-correct" : "text-incorrect"}`}>
        <span aria-hidden="true">{correct ? "○" : "×"}</span>
        <span className="sr-only">{correct ? "正解" : "不正解"}</span>
      </dd>
    </div>
  );
}
