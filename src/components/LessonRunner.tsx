"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { AnswerReveal } from "@/components/AnswerReveal";
import { HandwritingCanvas, type HandwritingCanvasHandle } from "@/components/HandwritingCanvas";
import { ProgressBar } from "@/components/ProgressBar";
import { ResultSummary } from "@/components/ResultSummary";
import { WordPlayer } from "@/components/WordPlayer";
import { getSpeechAvailability, primeSpeechEngine, type SpeechAvailability } from "@/lib/speech";
import { saveLessonScore } from "@/lib/storage";
import type { Lesson, Word, WordResult } from "@/lib/types";

type Phase = "setup" | "test" | "answer" | "result";

type Props = {
  lesson: Lesson;
};

function shuffle<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function LessonRunner({ lesson }: Props) {
  const [phase, setPhase] = useState<Phase>("setup");
  const [count, setCount] = useState(Math.min(10, lesson.words.length));
  const [shuffleOn, setShuffleOn] = useState(true);
  const [questions, setQuestions] = useState<Word[]>([]);
  const [index, setIndex] = useState(0);
  const [results, setResults] = useState<WordResult[]>([]);
  const [hanziImage, setHanziImage] = useState<string | null>(null);
  const [pinyinImage, setPinyinImage] = useState<string | null>(null);
  const [speechStatus, setSpeechStatus] = useState<SpeechAvailability | null>(null);

  const hanziCanvasRef = useRef<HandwritingCanvasHandle>(null);
  const pinyinCanvasRef = useRef<HandwritingCanvasHandle>(null);

  useEffect(() => {
    void getSpeechAvailability().then(setSpeechStatus);
  }, []);

  const startWith = useCallback(
    (words: Word[]) => {
      const subset = (shuffleOn ? shuffle(words) : words).slice(0, Math.min(count, words.length));
      const initialResults: WordResult[] = subset.map((w) => ({
        word: w,
        hanziCorrect: null,
        pinyinCorrect: null,
      }));
      primeSpeechEngine();
      setQuestions(subset);
      setResults(initialResults);
      setIndex(0);
      setHanziImage(null);
      setPinyinImage(null);
      setPhase("test");
    },
    [count, shuffleOn],
  );

  const handleStart = () => {
    startWith(lesson.words);
  };

  const handleSubmit = () => {
    const h = hanziCanvasRef.current?.getDataURL() ?? null;
    const p = pinyinCanvasRef.current?.getDataURL() ?? null;
    setHanziImage(h);
    setPinyinImage(p);
    setPhase("answer");
  };

  const handleJudge = (field: "hanzi" | "pinyin", correct: boolean) => {
    setResults((prev) => {
      const next = [...prev];
      const cur = next[index];
      next[index] = {
        ...cur,
        hanziCorrect: field === "hanzi" ? correct : cur.hanziCorrect,
        pinyinCorrect: field === "pinyin" ? correct : cur.pinyinCorrect,
      };
      return next;
    });
  };

  const handleNext = () => {
    if (index + 1 >= questions.length) {
      setPhase("result");
      return;
    }
    hanziCanvasRef.current?.clear();
    pinyinCanvasRef.current?.clear();
    setHanziImage(null);
    setPinyinImage(null);
    setIndex((i) => i + 1);
    setPhase("test");
  };

  useEffect(() => {
    if (phase !== "result") return;
    const total = results.length;
    if (total === 0) return;
    const hanziCorrect = results.filter((r) => r.hanziCorrect === true).length;
    const pinyinCorrect = results.filter((r) => r.pinyinCorrect === true).length;
    saveLessonScore(lesson.id, {
      hanziCorrect,
      pinyinCorrect,
      total,
      takenAt: new Date().toISOString(),
    });
  }, [phase, results, lesson.id]);

  const currentWord = questions[index];
  const currentResult = results[index];

  if (phase === "setup") {
    return (
      <SetupView
        lesson={lesson}
        count={count}
        setCount={setCount}
        shuffleOn={shuffleOn}
        setShuffleOn={setShuffleOn}
        onStart={handleStart}
        speechStatus={speechStatus}
      />
    );
  }

  if (phase === "result") {
    return (
      <ResultSummary
        results={results}
        lessonTitle={lesson.title}
        onRetry={() => startWith(lesson.words)}
        onRetryWrongOnly={() => {
          const wrongWords = results
            .filter((r) => r.hanziCorrect !== true || r.pinyinCorrect !== true)
            .map((r) => r.word);
          if (wrongWords.length === 0) return;
          startWith(wrongWords);
        }}
      />
    );
  }

  return (
    <main className="flex flex-1 w-full flex-col px-4 pt-4 pb-28">
      <ProgressBar current={index + 1} total={questions.length} />
      {speechStatus === "unsupported" || speechStatus === "no-zh-voice" ? (
        <div className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
          このブラウザは中国語の音声合成に対応していません。Safari / Chrome をお試しください。
        </div>
      ) : null}

      {phase === "test" && currentWord ? (
        <TestView
          word={currentWord}
          autoPlay={speechStatus === "available"}
          onSubmit={handleSubmit}
          hanziCanvasRef={hanziCanvasRef}
          pinyinCanvasRef={pinyinCanvasRef}
        />
      ) : null}

      {phase === "answer" && currentWord && currentResult ? (
        <div className="mt-4">
          <AnswerReveal
            word={currentWord}
            hanziImage={hanziImage}
            pinyinImage={pinyinImage}
            hanziCorrect={currentResult.hanziCorrect}
            pinyinCorrect={currentResult.pinyinCorrect}
            onJudgeHanzi={(c) => handleJudge("hanzi", c)}
            onJudgePinyin={(c) => handleJudge("pinyin", c)}
            onNext={handleNext}
            isLast={index + 1 >= questions.length}
          />
        </div>
      ) : null}
    </main>
  );
}

function SetupView({
  lesson,
  count,
  setCount,
  shuffleOn,
  setShuffleOn,
  onStart,
  speechStatus,
}: {
  lesson: Lesson;
  count: number;
  setCount: (n: number) => void;
  shuffleOn: boolean;
  setShuffleOn: (b: boolean) => void;
  onStart: () => void;
  speechStatus: SpeechAvailability | null;
}) {
  const max = lesson.words.length;
  return (
    <main className="flex flex-1 w-full flex-col px-4 pt-6 pb-10">
      <div className="mb-4 flex items-center justify-between">
        <Link href="/" className="text-sm text-zinc-500" aria-label="トップへ">
          ← トップ
        </Link>
        <div className="text-xs text-zinc-400">{lesson.words.length} 単語</div>
      </div>

      <h1 className="text-2xl font-bold text-zinc-900">{lesson.title}</h1>
      <p className="mt-1 text-sm text-zinc-500">出題設定</p>

      <section className="mt-6 rounded-2xl border border-zinc-200 bg-white p-4">
        <label htmlFor="count" className="text-sm font-medium text-zinc-700">
          問題数 <span className="text-zinc-400">(1 - {max})</span>
        </label>
        <div className="mt-2 flex items-center gap-3">
          <input
            id="count"
            type="range"
            min={1}
            max={max}
            value={Math.min(count, max)}
            onChange={(e) => setCount(Number(e.target.value))}
            className="flex-1"
          />
          <span className="w-10 text-right text-base font-semibold tabular-nums">
            {Math.min(count, max)}
          </span>
        </div>
      </section>

      <section className="mt-3 rounded-2xl border border-zinc-200 bg-white p-4">
        <label className="flex items-center justify-between">
          <span className="text-sm font-medium text-zinc-700">出題順をシャッフル</span>
          <input
            type="checkbox"
            checked={shuffleOn}
            onChange={(e) => setShuffleOn(e.target.checked)}
            className="h-5 w-5"
          />
        </label>
      </section>

      {speechStatus === "unsupported" || speechStatus === "no-zh-voice" ? (
        <div className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
          このブラウザは中国語の音声合成に対応していません。Safari / Chrome をお試しください。
        </div>
      ) : null}

      <button
        type="button"
        onClick={onStart}
        className="mt-8 h-14 w-full rounded-2xl bg-zinc-900 text-base font-semibold text-white shadow-sm active:opacity-90"
      >
        スタート
      </button>
    </main>
  );
}

function TestView({
  word,
  autoPlay,
  onSubmit,
  hanziCanvasRef,
  pinyinCanvasRef,
}: {
  word: Word;
  autoPlay: boolean;
  onSubmit: () => void;
  hanziCanvasRef: React.RefObject<HandwritingCanvasHandle | null>;
  pinyinCanvasRef: React.RefObject<HandwritingCanvasHandle | null>;
}) {
  return (
    <div className="mt-4 flex flex-col gap-4">
      <div className="flex justify-center pt-1 pb-2">
        <WordPlayer text={word.hanzi} autoPlayOnChange={autoPlay} />
      </div>

      <CanvasBlock label="漢字" canvasRef={hanziCanvasRef} gridType="rice" aspectRatio={1} />

      <CanvasBlock
        label="ピンイン"
        canvasRef={pinyinCanvasRef}
        gridType="baseline"
        aspectRatio={0.32}
      />

      <div className="fixed inset-x-0 bottom-0 border-t border-zinc-200 bg-white/95 px-4 pt-3 pb-[max(env(safe-area-inset-bottom),0.75rem)] backdrop-blur">
        <button
          type="button"
          onClick={onSubmit}
          className="h-14 w-full rounded-2xl bg-zinc-900 text-base font-semibold text-white shadow-sm active:opacity-90"
        >
          答え合わせ
        </button>
      </div>
    </div>
  );
}

function CanvasBlock({
  label,
  canvasRef,
  gridType,
  aspectRatio,
}: {
  label: string;
  canvasRef: React.RefObject<HandwritingCanvasHandle | null>;
  gridType: "rice" | "baseline";
  aspectRatio: number;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">{label}</span>
        <button
          type="button"
          onClick={() => canvasRef.current?.clear()}
          className="rounded-full border border-zinc-200 px-3 py-1 text-xs text-zinc-600 active:bg-zinc-50"
        >
          クリア
        </button>
      </div>
      <HandwritingCanvas
        ref={canvasRef}
        gridType={gridType}
        aspectRatio={aspectRatio}
        ariaLabel={`${label}の手書き`}
      />
    </div>
  );
}
