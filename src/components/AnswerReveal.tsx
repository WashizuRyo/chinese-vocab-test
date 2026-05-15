"use client";

import type { OcrFieldResult, OcrGradeState, Word } from "@/lib/types";

interface Props {
  word: Word;
  hanziImage: string | null;
  pinyinImage: string | null;
  hanziOcrImage: string | null;
  pinyinOcrImage: string | null;
  ocr: OcrGradeState;
  onNext: () => void;
  isLast: boolean;
}

function ResultBadge({ correct }: { correct: boolean }) {
  return (
    <span
      className={`rounded-full px-3 py-1 text-sm font-bold ${
        correct ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
      }`}
    >
      {correct ? "○" : "×"}
    </span>
  );
}

function OcrResult({ result }: { result: OcrFieldResult }) {
  return (
    <div className="mt-3 rounded-xl border border-zinc-200 bg-zinc-50 p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="text-xs font-medium text-zinc-500">OCR結果</div>
        <ResultBadge correct={result.correct} />
      </div>
      <div className="mt-2 grid grid-cols-[4.5rem_1fr] gap-x-2 gap-y-1 text-sm">
        <div className="text-zinc-500">読み取り</div>
        <div className="break-words font-medium text-zinc-900">
          {result.rawText || "読み取れませんでした"}
        </div>
        <div className="text-zinc-500">正規化</div>
        <div className="break-words text-zinc-700">{result.normalizedText || "なし"}</div>
      </div>
    </div>
  );
}

function OcrDebugImage({ label, src }: { label: string; src: string | null }) {
  if (process.env.NODE_ENV === "production" || !src) return null;

  return (
    <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3">
      <div className="mb-1 text-xs font-medium text-amber-800">{label} OCR送信用画像</div>
      {/* biome-ignore lint/performance/noImgElement: data URL debug image */}
      <img
        src={src}
        alt={`${label}のOCR送信用画像`}
        className="w-full rounded-lg border border-amber-200 bg-white"
      />
    </div>
  );
}

export function AnswerReveal({
  word,
  hanziImage,
  pinyinImage,
  hanziOcrImage,
  pinyinOcrImage,
  ocr,
  onNext,
  isLast,
}: Props) {
  const isLoading = ocr.status === "loading";

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
        <div className="text-xs font-medium uppercase tracking-wide text-zinc-500">日本語訳</div>
        <div className="mt-1 text-base text-zinc-800">{word.japanese}</div>
      </div>

      {isLoading ? (
        <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sm font-medium text-sky-800">
          OCR解析中...
        </div>
      ) : null}

      {ocr.status === "error" ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
          <div className="text-sm font-semibold text-rose-800">OCR失敗</div>
          <div className="mt-1 text-sm leading-relaxed text-rose-700">{ocr.message}</div>
        </div>
      ) : null}

      <div className="rounded-2xl border border-zinc-200 bg-white p-4">
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <div className="text-xs font-medium uppercase tracking-wide text-zinc-500">漢字</div>
            <div className="mt-1 font-serif text-5xl text-zinc-900">{word.hanzi}</div>
          </div>
          {ocr.status === "success" ? <ResultBadge correct={ocr.hanzi.correct} /> : null}
        </div>
        {ocr.status === "success" ? <OcrResult result={ocr.hanzi} /> : null}
        {hanziImage ? (
          <div className="mt-3">
            <div className="mb-1 text-xs text-zinc-500">あなたの解答</div>
            {/* biome-ignore lint/performance/noImgElement: data URL canvas snapshot */}
            <img
              src={hanziImage}
              alt="あなたが書いた漢字"
              className="w-full rounded-lg border border-zinc-200"
            />
          </div>
        ) : null}
        <OcrDebugImage label="漢字" src={hanziOcrImage} />
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-4">
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <div className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              ピンイン
            </div>
            <div className="mt-1 text-2xl tracking-wide text-zinc-900">{word.pinyin}</div>
          </div>
          {ocr.status === "success" ? <ResultBadge correct={ocr.pinyin.correct} /> : null}
        </div>
        {ocr.status === "success" ? <OcrResult result={ocr.pinyin} /> : null}
        {pinyinImage ? (
          <div className="mt-3">
            <div className="mb-1 text-xs text-zinc-500">あなたの解答</div>
            {/* biome-ignore lint/performance/noImgElement: data URL canvas snapshot */}
            <img
              src={pinyinImage}
              alt="あなたが書いたピンイン"
              className="w-full rounded-lg border border-zinc-200"
            />
          </div>
        ) : null}
        <OcrDebugImage label="ピンイン" src={pinyinOcrImage} />
      </div>

      <button
        type="button"
        onClick={onNext}
        disabled={isLoading}
        className="mt-2 h-14 w-full rounded-2xl bg-zinc-900 text-base font-semibold text-white shadow-sm transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
      >
        {isLoading ? "OCR解析中" : isLast ? "結果を見る" : "次へ"}
      </button>
    </div>
  );
}
