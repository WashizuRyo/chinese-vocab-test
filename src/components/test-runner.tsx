"use client";

import { useRef, useState } from "react";
import { AnswerReveal } from "@/components/answer-reveal";
import { HandwritingCanvas, type HandwritingCanvasHandle } from "@/components/handwriting-canvas";
import { ProgressBar } from "@/components/progress-bar";
import { ResultSummary } from "@/components/result-summary";
import { WordPlayer } from "@/components/word-player";
import { WordSelection } from "@/components/word-selection";
import { createConfiguredWords } from "@/lib/create-configured-words";
import type { Lesson, Word, WordResult } from "@/lib/types";
import { wordAudio } from "@/lib/word-audio";

interface TestSettings {
  shuffleOn: boolean;
  numberQuestionsOn: boolean;
  selectedWords: Word[];
}

type TestRunnerState =
  | { status: "setup"; settings: TestSettings }
  | {
      status: "writing";
      results: WordResult[];
      index: number;
    }
  | {
      status: "answer";
      results: WordResult[];
      index: number;
      hanziImage: string;
      pinyinImage: string;
    }
  | {
      status: "result";
      results: WordResult[];
    };

function createInitialResults(words: Word[]): WordResult[] {
  return words.map((word) => ({
    word,
    hanziCorrect: true,
    pinyinCorrect: true,
  }));
}

export function TestRunner({
  lesson,
  initialWords,
  onBackToMode,
}: {
  lesson: Lesson;
  initialWords?: Word[];
  onBackToMode: () => void;
}) {
  const initialSettings = {
    shuffleOn: false,
    numberQuestionsOn: false,
    selectedWords: lesson.words,
  };
  const [state, setState] = useState<TestRunnerState>(() => {
    if (initialWords) {
      return {
        status: "writing",
        results: createInitialResults(initialWords),
        index: 0,
      };
    }
    return { status: "setup", settings: initialSettings };
  });

  const startWithWords = (words: Word[]) => {
    setState({
      status: "writing",
      results: createInitialResults(words),
      index: 0,
    });
    const firstWord = words[0];
    if (firstWord) wordAudio.play(firstWord);
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

  const handleStart = () => {
    if (state.status !== "setup") return;
    const selection = createConfiguredWords({
      selectedWords: state.settings.selectedWords,
      shuffleOn: state.settings.shuffleOn,
      numberQuestionsOn: state.settings.numberQuestionsOn,
    });
    startWithWords(selection.words);
  };

  const handleSubmit = ({
    hanziImage,
    pinyinImage,
  }: {
    hanziImage: string;
    pinyinImage: string;
  }) => {
    if (state.status !== "writing") return;

    setState({
      status: "answer",
      results: state.results,
      index: state.index,
      hanziImage,
      pinyinImage,
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
    setState({
      status: "writing",
      results: state.results,
      index: state.index + 1,
    });
    if (nextResult) wordAudio.play(nextResult.word);
  };

  switch (state.status) {
    case "setup":
      return (
        <TestSetupView
          lesson={lesson}
          settings={state.settings}
          onChangeSettings={handleChangeSettings}
          onStart={handleStart}
          onBack={onBackToMode}
        />
      );

    case "writing": {
      const currentResult = state.results[state.index];
      if (!currentResult) return null;

      return (
        <main className="flex flex-1 w-full flex-col px-4 pt-6 pb-28">
          <button
            type="button"
            onClick={onBackToMode}
            className="mb-8 w-fit text-base text-zinc-500"
          >
            ← モード選択
          </button>
          <ProgressBar current={state.index + 1} total={state.results.length} />
          <TestView word={currentResult.word} onSubmit={handleSubmit} />
        </main>
      );
    }

    case "answer": {
      const currentResult = state.results[state.index];
      if (!currentResult) return null;

      return (
        <main className="flex flex-1 w-full flex-col px-4 pt-6 pb-28">
          <button
            type="button"
            onClick={onBackToMode}
            className="mb-8 w-fit text-base text-zinc-500"
          >
            ← モード選択
          </button>
          <ProgressBar current={state.index + 1} total={state.results.length} />
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
        </main>
      );
    }

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

    default: {
      const _exhaustiveCheck: never = state;
      throw new Error(`Unhandled test runner state: ${JSON.stringify(_exhaustiveCheck)}`);
    }
  }
}

function TestSetupView({
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
  const { shuffleOn, numberQuestionsOn, selectedWords } = settings;
  const selectedWordCount = selectedWords.length;

  return (
    <main className="flex flex-1 w-full flex-col px-4 pt-6 pb-10">
      <div className="mb-4 flex items-center justify-between">
        <button type="button" onClick={onBack} className="text-base text-zinc-500">
          ← モード選択
        </button>
      </div>

      <h1 className="text-2xl font-bold text-zinc-900">{lesson.title}</h1>
      <p className="mt-1 text-sm text-zinc-500">出題設定</p>

      <WordSelection
        words={lesson.words}
        selectedWords={selectedWords}
        onChange={(nextWords) => onChangeSettings({ selectedWords: nextWords })}
      />

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
            <span className="block text-sm font-medium text-zinc-700">最後に数字を追加</span>
            <span className="mt-1 block text-xs leading-relaxed text-zinc-500">
              オンにすると、選んだ単語のあとに1〜50の数字を2語追加します。
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
        disabled={selectedWordCount === 0}
        className="mt-8 h-14 w-full rounded-2xl bg-zinc-900 text-base font-semibold text-white shadow-sm active:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
      >
        スタート
      </button>
    </main>
  );
}

function TestView({
  word,
  onSubmit,
}: {
  word: Word;
  onSubmit: (answer: { hanziImage: string; pinyinImage: string }) => void;
}) {
  const hanziCanvasRef = useRef<HandwritingCanvasHandle>(null);
  const pinyinCanvasRef = useRef<HandwritingCanvasHandle>(null);

  const handleSubmit = () => {
    const hanziImage = hanziCanvasRef.current?.getDataURL();
    const pinyinImage = pinyinCanvasRef.current?.getDataURL();
    if (!hanziImage || !pinyinImage) return;
    onSubmit({ hanziImage, pinyinImage });
  };

  return (
    <div className="mt-4 flex flex-col gap-4">
      <div className="flex justify-center pt-1 pb-2">
        <WordPlayer word={word} />
      </div>

      <HandwritingCanvas
        key={`${word.hanzi}-${word.pinyin}-hanzi`}
        label="漢字"
        ref={hanziCanvasRef}
      />

      <div className="mt-10">
        <HandwritingCanvas
          key={`${word.hanzi}-${word.pinyin}-pinyin`}
          label="ピンイン"
          ref={pinyinCanvasRef}
        />
      </div>

      <div className="fixed inset-x-0 bottom-0 border-t border-zinc-200 bg-white/95 px-4 pt-3 pb-[max(env(safe-area-inset-bottom),0.75rem)] backdrop-blur">
        <button
          type="button"
          onClick={handleSubmit}
          className="h-14 w-full rounded-2xl bg-zinc-900 text-base font-semibold text-white shadow-sm active:opacity-90"
        >
          答え合わせ
        </button>
      </div>
    </div>
  );
}
