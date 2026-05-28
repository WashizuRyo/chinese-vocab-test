"use client";

import type { Word } from "@/lib/types";

interface Props {
  word: Word;
  hanziImage: string;
  pinyinImage: string;
  hanziCorrect: boolean;
  pinyinCorrect: boolean;
  onJudgeHanzi: (correct: boolean) => void;
  onJudgePinyin: (correct: boolean) => void;
  onNext: () => void;
  isLast: boolean;
}

function JudgeButtons({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex gap-2">
      <button
        type="button"
        onClick={() => onChange(true)}
        className={`flex h-11 w-16 items-center justify-center rounded-full border-2 text-xl font-bold transition-colors ${
          value === true
            ? "border-emerald-600 bg-emerald-600 text-white"
            : "border-zinc-300 bg-white text-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-500"
        }`}
        aria-label="正解"
      >
        ○
      </button>
      <button
        type="button"
        onClick={() => onChange(false)}
        className={`flex h-11 w-16 items-center justify-center rounded-full border-2 text-xl font-bold transition-colors ${
          value === false
            ? "border-rose-600 bg-rose-600 text-white"
            : "border-zinc-300 bg-white text-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-500"
        }`}
        aria-label="不正解"
      >
        ×
      </button>
    </div>
  );
}

export function AnswerReveal({
  word,
  hanziImage,
  pinyinImage,
  hanziCorrect,
  pinyinCorrect,
  onJudgeHanzi,
  onJudgePinyin,
  onNext,
  isLast,
}: Props) {
  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          日本語訳
        </div>
        <div className="mt-1 text-base text-zinc-800 dark:text-zinc-200">{word.japanese}</div>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <div className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              漢字
            </div>
            <div className="mt-1 font-serif text-5xl text-zinc-900 dark:text-zinc-100">
              {word.hanzi}
            </div>
          </div>
          <JudgeButtons value={hanziCorrect} onChange={onJudgeHanzi} />
        </div>
        <div>
          <div className="mb-1 text-xs text-zinc-500 dark:text-zinc-400">あなたの解答</div>
          {/* biome-ignore lint/performance/noImgElement: data URL canvas snapshot */}
          <img
            src={hanziImage}
            alt="あなたが書いた漢字"
            className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700"
          />
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <div className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              ピンイン
            </div>
            <div className="mt-1 text-2xl tracking-wide text-zinc-900 dark:text-zinc-100">
              {word.pinyin}
            </div>
          </div>
          <JudgeButtons value={pinyinCorrect} onChange={onJudgePinyin} />
        </div>
        <div>
          <div className="mb-1 text-xs text-zinc-500 dark:text-zinc-400">あなたの解答</div>
          {/* biome-ignore lint/performance/noImgElement: data URL canvas snapshot */}
          <img
            src={pinyinImage}
            alt="あなたが書いたピンイン"
            className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700"
          />
        </div>
      </div>

      <button
        type="button"
        onClick={onNext}
        className="mt-2 h-14 w-full rounded-2xl bg-zinc-900 text-base font-semibold text-white shadow-sm transition-opacity dark:bg-zinc-100 dark:text-zinc-950"
      >
        {isLast ? "結果を見る" : "次へ"}
      </button>
    </div>
  );
}
