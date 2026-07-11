"use client";

import Link from "next/link";
import type { WordResult } from "@/lib/types";

interface Props {
  results: WordResult[];
  lessonTitle: string;
  onRetry: () => void;
  onRetryWrongOnly: () => void;
}

export function ResultSummary({ results, lessonTitle, onRetry, onRetryWrongOnly }: Props) {
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
        <ScoreTile label="漢字" correct={hanziCorrect} total={total} accent="emerald" />
        <ScoreTile label="ピンイン" correct={pinyinCorrect} total={total} accent="sky" />
        <ScoreTile label="両方正解" correct={bothCorrect} total={total} accent="zinc" />
      </section>

      <section className="mt-6">
        <h2 className="text-sm font-semibold text-surface-foreground">
          間違えた単語 ({wrongResults.length})
        </h2>
        {wrongResults.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">全問正解！おめでとう。</p>
        ) : (
          <ul className="mt-2 flex flex-col gap-2">
            {wrongResults.map((r) => (
              <li key={r.word.hanzi} className="rounded-xl border border-border bg-surface p-3">
                <div className="flex items-baseline justify-between gap-3">
                  <div lang="zh-CN" className="font-serif text-2xl text-foreground">
                    {r.word.hanzi}
                  </div>
                  <div className="flex gap-1.5 text-xs">
                    <Badge label="漢字" ok={r.hanziCorrect === true} />
                    <Badge label="ピンイン" ok={r.pinyinCorrect === true} />
                  </div>
                </div>
                <div className="mt-0.5 text-sm text-surface-foreground">{r.word.pinyin}</div>
                <div className="text-xs text-muted-foreground">{r.word.japanese}</div>
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
          className="h-12 w-full rounded-2xl border border-border bg-surface text-sm font-semibold text-foreground"
        >
          もう一度（同じ範囲）
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
  accent: "emerald" | "sky" | "zinc";
}) {
  const accentClass = {
    emerald: "text-emerald-600",
    sky: "text-sky-600",
    zinc: "text-foreground",
  }[accent];
  return (
    <div className="rounded-2xl border border-border bg-surface p-3 text-center">
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      <div className={`mt-1 text-2xl font-bold ${accentClass}`}>
        {correct}
        <span className="text-sm text-muted-foreground"> / {total}</span>
      </div>
    </div>
  );
}

function Badge({ label, ok }: { label: string; ok: boolean }) {
  return (
    <span
      className={`rounded-full px-2 py-0.5 ${
        ok ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
      }`}
    >
      {label} {ok ? "○" : "×"}
    </span>
  );
}
