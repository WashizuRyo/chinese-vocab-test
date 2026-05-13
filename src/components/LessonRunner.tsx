"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { AnswerReveal } from "@/components/AnswerReveal";
import { HandwritingCanvas, type HandwritingCanvasHandle } from "@/components/HandwritingCanvas";
import { ProgressBar } from "@/components/ProgressBar";
import { ResultSummary } from "@/components/ResultSummary";
import { WordPlayer } from "@/components/WordPlayer";
import { number } from "@/data/lessons/number";
import { primeSpeechEngine, speakChinese } from "@/lib/speech";
import type { Lesson, Word, WordResult } from "@/lib/types";

interface TestSettings {
  count: number;
  shuffleOn: boolean;
  numberQuestionsOn: boolean;
}

type LessonRunnerState =
  | { status: "mode" }
  | { status: "setup"; settings: TestSettings }
  | { status: "learn" }
  | { status: "learnComplete" }
  | {
      status: "test";
      results: WordResult[];
      index: number;
    }
  | {
      status: "answer";
      results: WordResult[];
      index: number;
      hanziImage: string | null;
      pinyinImage: string | null;
    }
  | {
      status: "result";
      results: WordResult[];
    };

function shuffle<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const item = out[i];
    const swap = out[j];
    if (item === undefined || swap === undefined) continue;
    out[i] = swap;
    out[j] = item;
  }
  return out;
}

function buildQuestions(
  words: Word[],
  count: number,
  shuffleOn: boolean,
  numberQuestionsOn: boolean,
) {
  const totalCount = Math.min(count, words.length);
  const numberCount = numberQuestionsOn ? Math.min(2, totalCount) : 0;
  const wordCount = totalCount - numberCount;
  const regularQuestions = (shuffleOn ? shuffle(words) : words).slice(0, wordCount);
  const numberQuestions = shuffle(number.words).slice(0, numberCount);

  return [...regularQuestions, ...numberQuestions];
}

export function LessonRunner({ lesson }: { lesson: Lesson }) {
  const [state, setState] = useState<LessonRunnerState>({
    status: "mode",
  });

  const hanziCanvasRef = useRef<HandwritingCanvasHandle>(null);
  const pinyinCanvasRef = useRef<HandwritingCanvasHandle>(null);
  const initialSettings = {
    count: lesson.words.length,
    shuffleOn: false,
    numberQuestionsOn: false,
  };

  const handleChangeSettings = (settings: Partial<TestSettings>) => {
    setState((prev) => {
      if (prev.status !== "setup") return prev;
      return {
        ...prev,
        settings: {
          ...prev.settings,
          ...settings,
        },
      };
    });
  };

  const clearCanvases = () => {
    hanziCanvasRef.current?.clear();
    pinyinCanvasRef.current?.clear();
  };

  const startWithSettings = (
    words: Word[],
    settings: TestSettings,
    includeNumberQuestions = settings.numberQuestionsOn,
  ) => {
    const subset = buildQuestions(
      words,
      settings.count,
      settings.shuffleOn,
      includeNumberQuestions,
    );
    startWithWords(subset);
  };

  const startWithWords = (words: Word[]) => {
    const initialResults: WordResult[] = words.map((w) => ({
      word: w,
      hanziCorrect: false,
      pinyinCorrect: false,
    }));
    primeSpeechEngine();
    setState({
      status: "test",
      results: initialResults,
      index: 0,
    });
    const firstWord = words[0];
    if (firstWord) speakChinese(firstWord.hanzi);
  };

  const handleStart = () => {
    if (state.status !== "setup") return;
    startWithSettings(lesson.words, state.settings);
  };

  const handleStartLearning = () => {
    clearCanvases();
    primeSpeechEngine();
    setState({ status: "learn" });
    const firstWord = lesson.words[0];
    if (firstWord) speakChinese(firstWord.hanzi);
  };

  const handleOpenTestSetup = () => {
    clearCanvases();
    setState({ status: "setup", settings: initialSettings });
  };

  const handleSubmit = () => {
    if (state.status !== "test") return;
    const h = hanziCanvasRef.current?.getDataURL() ?? null;
    const p = pinyinCanvasRef.current?.getDataURL() ?? null;
    setState({
      status: "answer",
      results: state.results,
      index: state.index,
      hanziImage: h,
      pinyinImage: p,
    });
  };

  const handleJudge = (field: "hanzi" | "pinyin", correct: boolean) => {
    setState((prev) => {
      if (prev.status !== "answer") return prev;
      const next = [...prev.results];
      const cur = next[prev.index];
      if (!cur) return prev;
      next[prev.index] = {
        ...cur,
        hanziCorrect: field === "hanzi" ? correct : cur.hanziCorrect,
        pinyinCorrect: field === "pinyin" ? correct : cur.pinyinCorrect,
      };
      return {
        ...prev,
        results: next,
      };
    });
  };

  const handleNext = () => {
    if (state.status !== "answer") return;
    if (state.index + 1 >= state.results.length) {
      setState({
        status: "result",
        results: state.results,
      });
      return;
    }
    const nextResult = state.results[state.index + 1];
    clearCanvases();
    setState({
      status: "test",
      results: state.results,
      index: state.index + 1,
    });
    if (nextResult) speakChinese(nextResult.word.hanzi);
  };

  switch (state.status) {
    case "mode":
      return (
        <ModeSelectView
          lesson={lesson}
          onStartLearning={handleStartLearning}
          onOpenTestSetup={handleOpenTestSetup}
        />
      );

    case "setup":
      return (
        <SetupView
          lesson={lesson}
          settings={state.settings}
          onChangeSettings={handleChangeSettings}
          onStart={handleStart}
          onBack={() => setState({ status: "mode" })}
        />
      );

    case "learn":
      return (
        <LearningView
          words={lesson.words}
          hanziCanvasRef={hanziCanvasRef}
          pinyinCanvasRef={pinyinCanvasRef}
          onBackToMode={() => setState({ status: "mode" })}
          onComplete={() => setState({ status: "learnComplete" })}
        />
      );

    case "learnComplete":
      return (
        <LearningCompleteView
          lesson={lesson}
          onTest={handleOpenTestSetup}
          onRestartLearning={handleStartLearning}
        />
      );

    case "result":
      return (
        <ResultSummary
          results={state.results}
          lessonTitle={lesson.title}
          onRetry={() => startWithWords(state.results.map((r) => r.word))}
          onRetryWrongOnly={() => {
            const wrongWords = state.results
              .filter((r) => r.hanziCorrect !== true || r.pinyinCorrect !== true)
              .map((r) => r.word);
            if (wrongWords.length === 0) return;
            startWithWords(wrongWords);
          }}
        />
      );

    case "test": {
      const currentResult = state.results[state.index];
      return (
        <main className="flex flex-1 w-full flex-col px-4 pt-4 pb-28">
          <ProgressBar current={state.index + 1} total={state.results.length} />

          {currentResult ? (
            <TestView
              word={currentResult.word}
              onSubmit={handleSubmit}
              hanziCanvasRef={hanziCanvasRef}
              pinyinCanvasRef={pinyinCanvasRef}
            />
          ) : null}
        </main>
      );
    }

    case "answer": {
      const currentResult = state.results[state.index];
      return (
        <main className="flex flex-1 w-full flex-col px-4 pt-4 pb-28">
          <ProgressBar current={state.index + 1} total={state.results.length} />

          {currentResult ? (
            <div className="mt-4">
              <AnswerReveal
                word={currentResult.word}
                hanziImage={state.hanziImage}
                pinyinImage={state.pinyinImage}
                hanziCorrect={currentResult.hanziCorrect}
                pinyinCorrect={currentResult.pinyinCorrect}
                onJudgeHanzi={(c) => handleJudge("hanzi", c)}
                onJudgePinyin={(c) => handleJudge("pinyin", c)}
                onNext={handleNext}
                isLast={state.index + 1 >= state.results.length}
              />
            </div>
          ) : null}
        </main>
      );
    }

    default: {
      const _exhaustiveCheck: never = state;
      throw new Error(`Unhandled lesson runner state: ${JSON.stringify(_exhaustiveCheck)}`);
    }
  }
}

function ModeSelectView({
  lesson,
  onStartLearning,
  onOpenTestSetup,
}: {
  lesson: Lesson;
  onStartLearning: () => void;
  onOpenTestSetup: () => void;
}) {
  return (
    <main className="flex flex-1 w-full flex-col px-4 pt-6 pb-10">
      <div className="mb-4 flex items-center justify-between">
        <Link href="/" className="text-sm text-zinc-500" aria-label="トップへ">
          ← トップ
        </Link>
        <div className="text-xs text-zinc-400">{lesson.words.length} 単語</div>
      </div>

      <h1 className="text-2xl font-bold text-zinc-900">{lesson.title}</h1>
      <p className="mt-1 text-sm text-zinc-500">覚えてから、テストで確認できます</p>

      <section className="mt-6 flex flex-col gap-3">
        <button
          type="button"
          onClick={onStartLearning}
          className="w-full rounded-2xl border border-zinc-900 bg-zinc-900 px-4 py-5 text-left text-white shadow-sm active:opacity-90"
        >
          <span className="block text-lg font-semibold">暗記する</span>
          <span className="mt-1 block text-sm text-zinc-300">
            見て、聞いて、書きながら単語を覚える
          </span>
        </button>
        <button
          type="button"
          onClick={onOpenTestSetup}
          className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-5 text-left shadow-sm active:bg-zinc-50"
        >
          <span className="block text-lg font-semibold text-zinc-900">テストする</span>
          <span className="mt-1 block text-sm text-zinc-500">
            発音を聞いて、漢字とピンインを書く
          </span>
        </button>
      </section>
    </main>
  );
}

function SetupView({
  lesson,
  settings,
  onChangeSettings,
  onStart,
  onBack,
}: {
  lesson: Lesson;
  settings: TestSettings;
  onChangeSettings: (settings: Partial<TestSettings>) => void;
  onStart: () => void;
  onBack: () => void;
}) {
  const max = lesson.words.length;
  const { count, shuffleOn, numberQuestionsOn } = settings;

  return (
    <main className="flex flex-1 w-full flex-col px-4 pt-6 pb-10">
      <div className="mb-4 flex items-center justify-between">
        <button type="button" onClick={onBack} className="text-sm text-zinc-500">
          ← モード選択
        </button>
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
            onChange={(e) => onChangeSettings({ count: Number(e.target.value) })}
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
            onChange={(e) => onChangeSettings({ shuffleOn: e.target.checked })}
            className="h-5 w-5"
          />
        </label>
      </section>

      <section className="mt-3 rounded-2xl border border-zinc-200 bg-white p-4">
        <label className="flex items-start justify-between gap-4">
          <span>
            <span className="block text-sm font-medium text-zinc-700">最後に数字問題を出す</span>
            <span className="mt-1 block text-xs leading-relaxed text-zinc-500">
              オンにすると、最後の2問が1〜40の数字問題になります。
            </span>
          </span>
          <input
            type="checkbox"
            checked={numberQuestionsOn}
            onChange={(e) => onChangeSettings({ numberQuestionsOn: e.target.checked })}
            className="mt-0.5 h-5 w-5 shrink-0"
          />
        </label>
      </section>
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

function LearningView({
  words,
  hanziCanvasRef,
  pinyinCanvasRef,
  onBackToMode,
  onComplete,
}: {
  words: Word[];
  hanziCanvasRef: React.RefObject<HandwritingCanvasHandle | null>;
  pinyinCanvasRef: React.RefObject<HandwritingCanvasHandle | null>;
  onBackToMode: () => void;
  onComplete: () => void;
}) {
  const [index, setIndex] = useState(0);
  const word = words[index];
  const current = index + 1;
  const total = words.length;

  if (!word) return null;

  const clearCanvases = () => {
    hanziCanvasRef.current?.clear();
    pinyinCanvasRef.current?.clear();
  };

  const handlePrev = () => {
    const previousWord = words[index - 1];
    if (!previousWord) return;
    clearCanvases();
    setIndex((i) => i - 1);
    speakChinese(previousWord.hanzi);
  };

  const handleNext = () => {
    clearCanvases();
    const nextWord = words[index + 1];
    if (!nextWord) {
      onComplete();
      return;
    }
    setIndex((i) => i + 1);
    speakChinese(nextWord.hanzi);
  };

  return (
    <main className="flex flex-1 w-full flex-col px-4 pt-4 pb-28">
      <div className="mb-3 flex items-center justify-between">
        <button type="button" onClick={onBackToMode} className="text-sm text-zinc-500">
          ← モード選択
        </button>
        <div className="text-xs font-medium text-zinc-500">
          {current} / {total}
        </div>
      </div>

      <ProgressBar current={current} total={total} />

      <section className="mt-4 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="text-xs font-medium uppercase tracking-wide text-zinc-500">漢字</div>
            <div className="mt-2 break-words font-serif text-5xl leading-tight text-zinc-900">
              {word.hanzi}
            </div>
            <div className="mt-3 text-xs font-medium uppercase tracking-wide text-zinc-500">
              ピンイン
            </div>
            <div className="mt-1 break-words text-2xl leading-snug text-zinc-900">
              {word.pinyin}
            </div>
            <div className="mt-3 text-xs font-medium uppercase tracking-wide text-zinc-500">
              日本語訳
            </div>
            <div className="mt-1 text-base leading-relaxed text-zinc-700">{word.japanese}</div>
          </div>
          <div className="shrink-0">
            <WordPlayer text={word.hanzi} />
          </div>
        </div>
      </section>

      <section className="mt-4 flex flex-col gap-4">
        <CanvasBlock
          label="漢字を練習"
          canvasRef={hanziCanvasRef}
          gridType="rice"
          aspectRatio={1}
        />
        <CanvasBlock
          label="ピンインを練習"
          canvasRef={pinyinCanvasRef}
          gridType="baseline"
          aspectRatio={0.32}
        />
      </section>

      <div className="fixed inset-x-0 bottom-0 border-t border-zinc-200 bg-white/95 px-4 pt-3 pb-[max(env(safe-area-inset-bottom),0.75rem)] backdrop-blur">
        <div className="mx-auto flex max-w-screen-sm gap-2">
          <button
            type="button"
            onClick={handlePrev}
            disabled={current === 1}
            className="h-14 w-24 rounded-2xl border border-zinc-300 bg-white text-sm font-semibold text-zinc-900 disabled:cursor-not-allowed disabled:opacity-30"
          >
            前へ
          </button>
          <button
            type="button"
            onClick={handleNext}
            className="h-14 flex-1 rounded-2xl bg-zinc-900 text-base font-semibold text-white shadow-sm active:opacity-90"
          >
            {current === total ? "完了" : "次へ"}
          </button>
        </div>
      </div>
    </main>
  );
}

function LearningCompleteView({
  lesson,
  onTest,
  onRestartLearning,
}: {
  lesson: Lesson;
  onTest: () => void;
  onRestartLearning: () => void;
}) {
  return (
    <main className="flex flex-1 w-full flex-col px-4 pt-6 pb-10">
      <header className="mb-6">
        <div className="text-xs font-medium uppercase tracking-wide text-zinc-500">暗記完了</div>
        <h1 className="mt-1 text-2xl font-bold text-zinc-900">{lesson.title}</h1>
        <p className="mt-2 text-sm leading-relaxed text-zinc-500">
          {lesson.words.length} 単語を一周しました。続けてテストで確認できます。
        </p>
      </header>

      <section className="flex flex-col gap-2">
        <button
          type="button"
          onClick={onTest}
          className="h-14 w-full rounded-2xl bg-zinc-900 text-base font-semibold text-white shadow-sm active:opacity-90"
        >
          この課をテストする
        </button>
        <button
          type="button"
          onClick={onRestartLearning}
          className="h-12 w-full rounded-2xl border border-zinc-300 bg-white text-sm font-semibold text-zinc-900"
        >
          もう一周する
        </button>
        <Link
          href="/"
          className="flex h-12 w-full items-center justify-center rounded-2xl text-sm font-semibold text-zinc-600"
        >
          トップへ戻る
        </Link>
      </section>
    </main>
  );
}

function TestView({
  word,
  onSubmit,
  hanziCanvasRef,
  pinyinCanvasRef,
}: {
  word: Word;
  onSubmit: () => void;
  hanziCanvasRef: React.RefObject<HandwritingCanvasHandle | null>;
  pinyinCanvasRef: React.RefObject<HandwritingCanvasHandle | null>;
}) {
  return (
    <div className="handwriting-practice mt-4 flex flex-col gap-4">
      <div className="flex justify-center pt-1 pb-2">
        <WordPlayer text={word.hanzi} />
      </div>

      <CanvasBlock label="漢字" canvasRef={hanziCanvasRef} gridType="rice" aspectRatio={1} />

      <div className="mt-10">
        <CanvasBlock
          label="ピンイン"
          canvasRef={pinyinCanvasRef}
          gridType="baseline"
          aspectRatio={0.32}
        />
      </div>

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
