"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { CanvasBlock } from "@/components/CanvasBlock";
import type { HandwritingCanvasHandle } from "@/components/HandwritingCanvas";
import { ProgressBar } from "@/components/ProgressBar";
import { QuizRunner } from "@/components/QuizRunner";
import { TestRunner } from "@/components/TestRunner";
import { WordPlayer } from "@/components/WordPlayer";
import type { Lesson, Word } from "@/lib/types";
import { wordKey } from "@/lib/word";
import { wordAudio } from "@/lib/wordAudio";

type LessonRunnerState =
  | { status: "mode" }
  | { status: "learn" }
  | { status: "learnComplete" }
  | { status: "test"; initialWords?: Word[] }
  | { status: "quiz" };

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

export function LessonRunner({ lesson }: { lesson: Lesson }) {
  const [state, setState] = useState<LessonRunnerState>({
    status: "mode",
  });

  const hanziCanvasRef = useRef<HandwritingCanvasHandle>(null);
  const pinyinCanvasRef = useRef<HandwritingCanvasHandle>(null);

  const clearCanvases = () => {
    hanziCanvasRef.current?.clear();
    pinyinCanvasRef.current?.clear();
  };

  const handleStartLearning = () => {
    clearCanvases();
    setState({ status: "learn" });
    const firstWord = lesson.words[0];
    if (firstWord) wordAudio.play(firstWord);
  };

  const handleOpenTestSetup = () => {
    clearCanvases();
    setState({ status: "test" });
  };

  const handleOpenQuizSetup = () => {
    clearCanvases();
    setState({ status: "quiz" });
  };

  switch (state.status) {
    case "mode":
      return (
        <ModeSelectView
          lesson={lesson}
          onStartLearning={handleStartLearning}
          onOpenQuizSetup={handleOpenQuizSetup}
          onOpenTestSetup={handleOpenTestSetup}
        />
      );

    case "learn":
      return (
        <LearningView
          lessonTitle={lesson.title}
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
          onQuiz={handleOpenQuizSetup}
          onTest={handleOpenTestSetup}
          onRestartLearning={handleStartLearning}
        />
      );

    case "test":
      return (
        <TestRunner
          lesson={lesson}
          initialWords={state.initialWords}
          onBackToMode={() => setState({ status: "mode" })}
        />
      );

    case "quiz":
      return (
        <QuizRunner
          lesson={lesson}
          onBackToMode={() => setState({ status: "mode" })}
          onStartTest={(initialWords) => {
            setState({
              status: "test",
              initialWords,
            });
            const firstWord = initialWords[0];
            if (firstWord) wordAudio.play(firstWord);
          }}
        />
      );

    default: {
      const _exhaustiveCheck: never = state;
      throw new Error(`Unhandled lesson runner state: ${JSON.stringify(_exhaustiveCheck)}`);
    }
  }
}

function ModeSelectView({
  lesson,
  onStartLearning,
  onOpenQuizSetup,
  onOpenTestSetup,
}: {
  lesson: Lesson;
  onStartLearning: () => void;
  onOpenQuizSetup: () => void;
  onOpenTestSetup: () => void;
}) {
  return (
    <main className="flex flex-1 w-full flex-col px-4 pt-6 pb-10">
      <div className="mb-4 flex items-center justify-between">
        <Link href="/" className="text-base text-zinc-500" aria-label="トップへ">
          ← トップ
        </Link>
      </div>

      <h1 className="text-2xl font-bold text-zinc-900">{lesson.title}</h1>

      <section className="mt-6 flex flex-col gap-3">
        <button
          type="button"
          onClick={onStartLearning}
          className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-5 text-left shadow-sm active:bg-zinc-50"
        >
          <span className="block text-lg font-semibold text-zinc-900">暗記</span>
          <span className="mt-1 block text-sm text-zinc-500">
            見て、聞いて、書きながら単語を覚える
          </span>
          <MemorizeModePreview />
        </button>
        <button
          type="button"
          onClick={onOpenQuizSetup}
          className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-5 text-left shadow-sm active:bg-zinc-50"
        >
          <span className="block text-lg font-semibold text-zinc-900">クイズ</span>
          <span className="mt-1 block text-sm text-zinc-500">
            発音を聞いて、漢字とピンインを4択で確認する
          </span>
          <QuizModePreview />
        </button>
        <button
          type="button"
          onClick={onOpenTestSetup}
          className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-5 text-left shadow-sm active:bg-zinc-50"
        >
          <span className="block text-lg font-semibold text-zinc-900">テスト</span>
          <span className="mt-1 block text-sm text-zinc-500">
            発音を聞いて、漢字とピンインを書く
          </span>
        </button>
      </section>
    </main>
  );
}

function PreviewPlayIcon() {
  return (
    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-zinc-950 text-white shadow-sm">
      <span className="ml-1 h-0 w-0 border-y-[8px] border-y-transparent border-l-[13px] border-l-white" />
    </span>
  );
}

function MemorizeModePreview() {
  return (
    <span aria-hidden="true" className="mx-auto mt-4 block w-full max-w-sm">
      <span className="block rounded-xl bg-zinc-50 px-4 py-4">
        <span className="flex items-end justify-between gap-4">
          <span className="flex min-w-0 items-end gap-x-1">
            <span className="flex flex-col items-center">
              <span className="text-xs leading-relaxed text-zinc-500">nǐ</span>
              <span className="font-serif text-5xl leading-tight text-zinc-950">你</span>
            </span>
            <span className="flex flex-col items-center">
              <span className="text-xs leading-relaxed text-zinc-500">hǎo</span>
              <span className="font-serif text-5xl leading-tight text-zinc-950">好</span>
            </span>
          </span>
          <PreviewPlayIcon />
        </span>
        <span className="mt-3 block h-px bg-zinc-200" />
        <span className="mt-3 block text-base leading-relaxed text-zinc-800">こんにちは！</span>
      </span>
    </span>
  );
}

function QuizModePreview() {
  const choices = ["shí", "shī", "shǐ", "shì"];

  return (
    <span aria-hidden="true" className="mx-auto mt-4 block w-full max-w-sm">
      <span className="block rounded-xl bg-zinc-50 px-4 py-4">
        <span>
          <span className="block text-xl font-bold text-zinc-950">ピンインを選ぶ</span>
        </span>
        <span className="mt-3 grid grid-cols-2 gap-2">
          {choices.map((option) => (
            <span
              key={option}
              className="flex h-10 items-center justify-center rounded-lg border border-zinc-200 bg-white text-lg font-semibold text-zinc-950"
            >
              {option}
            </span>
          ))}
        </span>
      </span>
    </span>
  );
}

function LearningView({
  lessonTitle,
  words,
  hanziCanvasRef,
  pinyinCanvasRef,
  onBackToMode,
  onComplete,
}: {
  lessonTitle: string;
  words: Word[];
  hanziCanvasRef: React.RefObject<HandwritingCanvasHandle | null>;
  pinyinCanvasRef: React.RefObject<HandwritingCanvasHandle | null>;
  onBackToMode: () => void;
  onComplete: () => void;
}) {
  const [index, setIndex] = useState(0);
  const [showList, setShowList] = useState(false);
  const word = words[index];
  const current = index + 1;
  const total = words.length;

  if (!word) return null;

  if (showList) {
    return (
      <LearningListView
        lessonTitle={lessonTitle}
        words={words}
        onBackToMode={onBackToMode}
        onBackToLearning={() => setShowList(false)}
      />
    );
  }

  const clearCanvases = () => {
    hanziCanvasRef.current?.clear();
    pinyinCanvasRef.current?.clear();
  };

  const handlePrev = () => {
    const previousWord = words[index - 1];
    if (!previousWord) return;
    clearCanvases();
    setIndex((i) => i - 1);
    wordAudio.play(previousWord);
  };

  const handleNext = () => {
    clearCanvases();
    const nextWord = words[index + 1];
    if (!nextWord) {
      onComplete();
      return;
    }
    setIndex((i) => i + 1);
    wordAudio.play(nextWord);
  };

  return (
    <main className="flex flex-1 w-full flex-col px-4 pt-6 pb-28">
      <div className="mb-8 flex items-center justify-between">
        <button type="button" onClick={onBackToMode} className="text-base text-zinc-500">
          ← モード選択
        </button>
        <button type="button" onClick={() => setShowList(true)} className="text-base text-zinc-500">
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
        <CanvasBlock label="手書き練習" canvasRef={hanziCanvasRef} aspectRatio={0.32} />
      </section>

      <div className="handwriting-practice fixed inset-x-0 bottom-0 border-t border-zinc-200 bg-white/95 px-4 pt-3 pb-[max(env(safe-area-inset-bottom),0.75rem)] backdrop-blur">
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

function LearningListView({
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

function LearningCompleteView({
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
