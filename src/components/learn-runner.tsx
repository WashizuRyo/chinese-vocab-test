"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { BackLabel } from "@/components/back-label";
import { HandwritingCanvas, type HandwritingCanvasHandle } from "@/components/handwriting-canvas";
import { ProgressBar } from "@/components/progress-bar";
import { WordCard } from "@/components/word-card";
import type { Lesson, Word } from "@/lib/types";
import { wordAudio } from "@/lib/word-audio";

type LearnRunnerState =
  | { status: "learn"; index: number }
  | { status: "list"; returnIndex: number }
  | { status: "complete" };

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

  const restartLearning = () => {
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
          onBackToMode={onBackToMode}
          onShowList={() => setState({ status: "list", returnIndex: state.index })}
          onPrev={() => {
            const previousWord = lesson.words[state.index - 1];
            if (!previousWord) return;
            setState({ status: "learn", index: state.index - 1 });
            wordAudio.play(previousWord);
          }}
          onNext={() => {
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
  onBackToMode,
  onShowList,
  onPrev,
  onNext,
}: {
  word: Word;
  current: number;
  total: number;
  onBackToMode: () => void;
  onShowList: () => void;
  onPrev: () => void;
  onNext: () => void;
}) {
  const hanziCanvasRef = useRef<HandwritingCanvasHandle>(null);

  return (
    <main className="flex flex-1 w-full flex-col px-4 pt-6 pb-28">
      <div className="mb-8 flex items-center justify-between">
        <button type="button" onClick={onBackToMode} className="text-base text-muted-foreground">
          <BackLabel>モード選択</BackLabel>
        </button>
        <button type="button" onClick={onShowList} className="text-base text-muted-foreground">
          単語一覧
        </button>
      </div>

      <ProgressBar current={current} total={total} />

      <section className="mt-4">
        <WordCard word={word} />
      </section>

      <section className="mt-4 flex flex-col gap-4">
        <HandwritingCanvas
          key={`${word.hanzi}-${word.pinyin}-practice`}
          label="手書き練習"
          ref={hanziCanvasRef}
        />
      </section>

      <div className="fixed inset-x-0 bottom-0 border-t border-border bg-card/95 px-4 pt-3 pb-[max(env(safe-area-inset-bottom),0.75rem)] backdrop-blur">
        <div className="mx-auto flex max-w-screen-sm gap-2">
          <button
            type="button"
            onClick={onPrev}
            disabled={current === 1}
            className="h-14 w-24 rounded-2xl border border-border bg-card text-sm font-semibold text-foreground disabled:cursor-not-allowed disabled:opacity-30"
          >
            前へ
          </button>
          <button
            type="button"
            onClick={onNext}
            className="h-14 flex-1 rounded-2xl bg-primary text-base font-semibold text-primary-foreground shadow-sm active:opacity-90"
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
        <button type="button" onClick={onBackToMode} className="text-base text-muted-foreground">
          <BackLabel>モード選択</BackLabel>
        </button>
        <button
          type="button"
          onClick={onBackToLearning}
          className="text-base text-muted-foreground"
        >
          単語カード
        </button>
      </div>

      <header>
        <h1 className="text-2xl font-bold text-foreground">{lessonTitle}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{words.length} 単語</p>
      </header>

      <section className="mt-4 flex flex-col gap-3">
        {words.map((word) => (
          <WordCard key={`${word.hanzi}-${word.pinyin}`} word={word} />
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
        <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          暗記完了
        </div>
        <h1 className="mt-1 text-2xl font-bold text-foreground">{lesson.title}</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {lesson.words.length} 単語を一周しました。続けてテストで確認できます。
        </p>
      </header>

      <section className="flex flex-col gap-2">
        <button
          type="button"
          onClick={onQuiz}
          className="h-14 w-full rounded-2xl bg-primary text-base font-semibold text-primary-foreground shadow-sm active:opacity-90"
        >
          クイズする
        </button>
        <button
          type="button"
          onClick={onTest}
          className="h-12 w-full rounded-2xl border border-border bg-card text-sm font-semibold text-foreground"
        >
          この課をテストする
        </button>
        <button
          type="button"
          onClick={onRestartLearning}
          className="h-12 w-full rounded-2xl border border-border bg-card text-sm font-semibold text-foreground"
        >
          もう一周する
        </button>
        <Link
          href="/"
          className="flex h-12 w-full items-center justify-center rounded-2xl text-sm font-semibold text-muted-foreground"
        >
          トップへ戻る
        </Link>
      </section>
    </main>
  );
}
