"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { CanvasBlock } from "@/components/CanvasBlock";
import type { HandwritingCanvasHandle } from "@/components/HandwritingCanvas";
import { ProgressBar } from "@/components/ProgressBar";
import { WordPlayer } from "@/components/WordPlayer";
import type { Lesson, Word } from "@/lib/types";
import { wordKey } from "@/lib/word";
import { wordAudio } from "@/lib/wordAudio";

type LearnRunnerState =
  | { status: "learn"; index: number }
  | { status: "list"; returnIndex: number }
  | { status: "complete" };

function getStudyHanziClassName(hanzi: string): string {
  const length = Array.from(hanzi).length;
  if (length <= 2) return "text-5xl";
  if (length <= 4) return "text-4xl";
  return "text-3xl";
}

function RubyHanzi({ word }: { word: Word }) {
  const chars = Array.from(word.hanzi);
  const pinyinParts = word.pinyin.trim().split(/\s+/).filter(Boolean);
  const hanziClassName = getStudyHanziClassName(word.hanzi);
  const rubyParts = chars.map((char, index) => ({
    char,
    key: `${chars.slice(0, index + 1).join("")}-${pinyinParts[index] ?? ""}`,
    pinyin: pinyinParts[index],
  }));

  if (pinyinParts.length === chars.length) {
    return (
      <div className="flex min-w-0 flex-wrap items-end gap-x-1 gap-y-2">
        {rubyParts.map((part) => (
          <span key={part.key} className="flex flex-col items-center">
            <span className="text-sm leading-relaxed text-zinc-500">{part.pinyin}</span>
            <span className={`font-serif ${hanziClassName} leading-tight text-zinc-900`}>
              {part.char}
            </span>
          </span>
        ))}
      </div>
    );
  }

  return (
    <div className="min-w-0">
      <div className="break-words text-sm leading-relaxed text-zinc-500">{word.pinyin}</div>
      <div className={`break-words font-serif ${hanziClassName} leading-tight text-zinc-900`}>
        {word.hanzi}
      </div>
    </div>
  );
}

export function LearnRunner({
  lesson,
  onBackToMode,
  onStartQuiz,
  onStartTest,
}: {
  lesson: Lesson;
  onBackToMode: () => void;
  onStartQuiz: () => void;
  onStartTest: () => void;
}) {
  const [state, setState] = useState<LearnRunnerState>({ status: "learn", index: 0 });
  const hanziCanvasRef = useRef<HandwritingCanvasHandle>(null);
  const pinyinCanvasRef = useRef<HandwritingCanvasHandle>(null);

  const clearCanvases = () => {
    hanziCanvasRef.current?.clear();
    pinyinCanvasRef.current?.clear();
  };

  const restartLearning = () => {
    clearCanvases();
    setState({ status: "learn", index: 0 });
    const firstWord = lesson.words[0];
    if (firstWord) wordAudio.play(firstWord);
  };

  switch (state.status) {
    case "learn": {
      const word = lesson.words[state.index];
      if (!word) return null;

      return (
        <LearnView
          word={word}
          current={state.index + 1}
          total={lesson.words.length}
          hanziCanvasRef={hanziCanvasRef}
          onBackToMode={onBackToMode}
          onShowList={() => setState({ status: "list", returnIndex: state.index })}
          onPrev={() => {
            const previousWord = lesson.words[state.index - 1];
            if (!previousWord) return;
            clearCanvases();
            setState({ status: "learn", index: state.index - 1 });
            wordAudio.play(previousWord);
          }}
          onNext={() => {
            clearCanvases();
            const nextWord = lesson.words[state.index + 1];
            if (!nextWord) {
              setState({ status: "complete" });
              return;
            }
            setState({ status: "learn", index: state.index + 1 });
            wordAudio.play(nextWord);
          }}
        />
      );
    }

    case "list":
      return (
        <LearnListView
          lessonTitle={lesson.title}
          words={lesson.words}
          onBackToMode={onBackToMode}
          onBackToLearning={() => setState({ status: "learn", index: state.returnIndex })}
        />
      );

    case "complete":
      return (
        <LearnCompleteView
          lesson={lesson}
          onQuiz={onStartQuiz}
          onTest={onStartTest}
          onRestartLearning={restartLearning}
        />
      );

    default: {
      const _exhaustiveCheck: never = state;
      throw new Error(`Unhandled learning runner state: ${JSON.stringify(_exhaustiveCheck)}`);
    }
  }
}

function LearnView({
  word,
  current,
  total,
  hanziCanvasRef,
  onBackToMode,
  onShowList,
  onPrev,
  onNext,
}: {
  word: Word;
  current: number;
  total: number;
  hanziCanvasRef: React.RefObject<HandwritingCanvasHandle | null>;
  onBackToMode: () => void;
  onShowList: () => void;
  onPrev: () => void;
  onNext: () => void;
}) {
  return (
    <main className="disable-text-selection flex flex-1 w-full flex-col px-4 pt-6 pb-28">
      <div className="mb-8 flex items-center justify-between">
        <button type="button" onClick={onBackToMode} className="text-base text-zinc-500">
          ← モード選択
        </button>
        <button type="button" onClick={onShowList} className="text-base text-zinc-500">
          単語一覧
        </button>
      </div>

      <ProgressBar current={current} total={total} />

      <section className="mt-4 rounded-2xl border border-zinc-200 bg-white px-4 py-5 shadow-sm">
        <div className="flex items-end justify-between gap-4">
          <RubyHanzi word={word} />
          <WordPlayer word={word} />
        </div>
        <div className="mt-4 h-px bg-zinc-200" />
        <div className="mt-4 break-words text-base leading-relaxed text-zinc-800">
          {word.japanese}
        </div>
      </section>

      <section className="mt-4 flex flex-col gap-4">
        <CanvasBlock label="手書き練習" canvasRef={hanziCanvasRef} aspectRatio={0.48} />
      </section>

      <div className="disable-text-selection fixed inset-x-0 bottom-0 border-t border-zinc-200 bg-white/95 px-4 pt-3 pb-[max(env(safe-area-inset-bottom),0.75rem)] backdrop-blur">
        <div className="mx-auto flex max-w-screen-sm gap-2">
          <button
            type="button"
            onClick={onPrev}
            disabled={current === 1}
            className="h-14 w-24 rounded-2xl border border-zinc-300 bg-white text-sm font-semibold text-zinc-900 disabled:cursor-not-allowed disabled:opacity-30"
          >
            前へ
          </button>
          <button
            type="button"
            onClick={onNext}
            className="h-14 flex-1 rounded-2xl bg-zinc-900 text-base font-semibold text-white shadow-sm active:opacity-90"
          >
            {current === total ? "完了" : "次へ"}
          </button>
        </div>
      </div>
    </main>
  );
}

function LearnListView({
  lessonTitle,
  words,
  onBackToMode,
  onBackToLearning,
}: {
  lessonTitle: string;
  words: Word[];
  onBackToMode: () => void;
  onBackToLearning: () => void;
}) {
  return (
    <main className="flex flex-1 w-full flex-col px-4 pt-6 pb-10">
      <div className="mb-4 flex items-center justify-between gap-3">
        <button type="button" onClick={onBackToMode} className="text-base text-zinc-500">
          ← モード選択
        </button>
        <button type="button" onClick={onBackToLearning} className="text-base text-zinc-500">
          単語カード
        </button>
      </div>

      <header>
        <h1 className="text-2xl font-bold text-zinc-900">{lessonTitle}</h1>
        <p className="mt-1 text-sm text-zinc-500">{words.length} 単語</p>
      </header>

      <section className="mt-4 flex flex-col gap-3">
        {words.map((word) => (
          <article
            key={wordKey(word)}
            className="rounded-2xl border border-zinc-200 bg-white px-4 py-4 shadow-sm"
          >
            <div className="flex items-end justify-between gap-4">
              <RubyHanzi word={word} />
              <WordPlayer word={word} />
            </div>
            <div className="mt-3 h-px bg-zinc-200" />
            <div className="mt-3 break-words text-base leading-relaxed text-zinc-800">
              {word.japanese}
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}

function LearnCompleteView({
  lesson,
  onQuiz,
  onTest,
  onRestartLearning,
}: {
  lesson: Lesson;
  onQuiz: () => void;
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
          onClick={onQuiz}
          className="h-14 w-full rounded-2xl bg-zinc-900 text-base font-semibold text-white shadow-sm active:opacity-90"
        >
          クイズする
        </button>
        <button
          type="button"
          onClick={onTest}
          className="h-12 w-full rounded-2xl border border-zinc-300 bg-white text-sm font-semibold text-zinc-900"
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
