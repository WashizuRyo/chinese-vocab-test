"use client";

import Link from "next/link";
import { useState } from "react";
import { LearnRunner } from "@/components/learn-runner";
import { QuizRunner } from "@/components/quiz-runner";
import { TestRunner } from "@/components/test-runner";
import type { Lesson, Word } from "@/lib/types";
import { wordAudio } from "@/lib/word-audio";

type LessonRunnerState =
  | { status: "mode" }
  | { status: "learn" }
  | { status: "test"; initialWords?: Word[] }
  | { status: "quiz" };

export function LessonRunner({ lesson }: { lesson: Lesson }) {
  const [state, setState] = useState<LessonRunnerState>({
    status: "mode",
  });

  const handleStartLearning = () => {
    setState({ status: "learn" });
    const firstWord = lesson.words[0];
    if (firstWord) wordAudio.play(firstWord);
  };

  const handleOpenTestSetup = () => {
    setState({ status: "test" });
  };

  const handleOpenQuizSetup = () => {
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
        <LearnRunner
          lesson={lesson}
          onBackToMode={() => setState({ status: "mode" })}
          onStartQuiz={handleOpenQuizSetup}
          onStartTest={handleOpenTestSetup}
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
              <span lang="zh-CN" className="font-serif text-5xl leading-tight text-zinc-950">
                你
              </span>
            </span>
            <span className="flex flex-col items-center">
              <span className="text-xs leading-relaxed text-zinc-500">hǎo</span>
              <span lang="zh-CN" className="font-serif text-5xl leading-tight text-zinc-950">
                好
              </span>
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
