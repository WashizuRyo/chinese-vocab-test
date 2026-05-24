"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { CanvasBlock } from "@/components/CanvasBlock";
import type { HandwritingCanvasHandle } from "@/components/HandwritingCanvas";
import { ProgressBar } from "@/components/ProgressBar";
import { TestRunner } from "@/components/TestRunner";
import { WordPlayer } from "@/components/WordPlayer";
import { number } from "@/data/lessons/number";
import { createQuiz, shuffle } from "@/lib/quiz";
import { playCorrectSound } from "@/lib/sound";
import type { Lesson, Question, QuizResult, Word } from "@/lib/types";
import { wordAudio } from "@/lib/wordAudio";

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
  | { status: "test"; initialWords?: Word[] }
  | {
      status: "quiz";
      lessonWords: Word[];
      numberWords: Word[];
      questions: Question[];
      results: QuizResult[];
      index: number;
      selectedAnswer: string | null;
    }
  | {
      status: "quizResult";
      lessonWords: Word[];
      numberWords: Word[];
      results: QuizResult[];
    };

function wordKey(word: Word): string {
  return `${word.hanzi}\u0000${word.pinyin}`;
}

function uniqueWords(words: Word[]): Word[] {
  const seen = new Set<string>();
  const unique: Word[] = [];

  for (const word of words) {
    const key = wordKey(word);
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(word);
  }

  return unique;
}

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

  const startQuizWithSettings = (
    words: Word[],
    settings: TestSettings,
    includeNumberQuestions = settings.numberQuestionsOn,
  ) => {
    const quizLessonWords = (settings.shuffleOn ? shuffle(words) : words).slice(0, settings.count);
    const quizNumberWords = includeNumberQuestions ? shuffle(number.words).slice(0, 2) : [];
    const nextQuiz = createQuiz({
      lessonWords: quizLessonWords,
      numberWords: quizNumberWords,
      settings: {
        wordCount: quizLessonWords.length,
        shuffleOn: false,
      },
    });
    startQuizWithQuestions({
      lessonWords: quizLessonWords,
      numberWords: quizNumberWords,
      questions: nextQuiz.questions,
    });
  };

  const startQuizWithQuestions = ({
    lessonWords,
    numberWords,
    questions,
  }: {
    lessonWords: Word[];
    numberWords: Word[];
    questions: Question[];
  }) => {
    setState({
      status: "quiz",
      lessonWords,
      numberWords,
      questions,
      results: [],
      index: 0,
      selectedAnswer: null,
    });
    const firstQuestion = questions[0];
    if (firstQuestion) wordAudio.play(firstQuestion.word);
  };

  const handleStartQuiz = () => {
    if (state.status !== "setup") return;
    startQuizWithSettings(lesson.words, state.settings);
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
    setState({ status: "setup", settings: initialSettings });
  };

  const handleQuizSelect = (option: string) => {
    if (state.status !== "quiz" || state.selectedAnswer !== null) return;
    const question = state.questions[state.index];
    if (!question) return;
    const result: QuizResult = {
      question,
      selectedAnswer: option,
      correct: option === question.answer,
    };
    if (result.correct) playCorrectSound();
    setState({
      ...state,
      selectedAnswer: option,
      results: [...state.results, result],
    });
  };

  const handleQuizNext = () => {
    if (state.status !== "quiz" || state.selectedAnswer === null) return;
    if (state.index + 1 >= state.questions.length) {
      setState({
        status: "quizResult",
        lessonWords: state.lessonWords,
        numberWords: state.numberWords,
        results: state.results,
      });
      return;
    }

    const nextQuestion = state.questions[state.index + 1];
    setState({
      ...state,
      index: state.index + 1,
      selectedAnswer: null,
    });
    if (nextQuestion) wordAudio.play(nextQuestion.word);
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

    case "setup":
      return (
        <SetupView
          lesson={lesson}
          settings={state.settings}
          onChangeSettings={handleChangeSettings}
          onStart={handleStartQuiz}
          onBack={() => setState({ status: "mode" })}
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

    case "quiz": {
      const currentQuestion = state.questions[state.index];
      return (
        <main className="flex flex-1 w-full flex-col px-4 pt-6 pb-28">
          <button
            type="button"
            onClick={() => setState({ status: "mode" })}
            className="mb-8 w-fit text-base text-zinc-500"
          >
            ← モード選択
          </button>
          <ProgressBar current={state.index + 1} total={state.questions.length} />
          {currentQuestion ? (
            <QuizView
              question={currentQuestion}
              selectedAnswer={state.selectedAnswer}
              onSelect={handleQuizSelect}
              onNext={handleQuizNext}
              isLast={state.index + 1 >= state.questions.length}
            />
          ) : null}
        </main>
      );
    }

    case "quizResult":
      return (
        <QuizResultSummary
          results={state.results}
          lessonTitle={lesson.title}
          onRetry={() =>
            startQuizWithQuestions({
              lessonWords: state.lessonWords,
              numberWords: state.numberWords,
              questions: createQuiz({
                lessonWords: state.lessonWords,
                numberWords: state.numberWords,
                settings: {
                  wordCount: state.lessonWords.length,
                  shuffleOn: false,
                },
              }).questions,
            })
          }
          onRetryWrongOnly={() => {
            const wrongWords = uniqueWords(
              state.results
                .filter((result) => !result.correct)
                .map((result) => result.question.word),
            );
            const wrongLessonWords = wrongWords.filter((word) => state.lessonWords.includes(word));
            const wrongNumberWords = wrongWords.filter((word) => state.numberWords.includes(word));
            if (wrongWords.length === 0) return;
            startQuizWithQuestions({
              lessonWords: wrongLessonWords,
              numberWords: wrongNumberWords,
              questions: createQuiz({
                lessonWords: wrongLessonWords,
                numberWords: wrongNumberWords,
                settings: {
                  wordCount: wrongLessonWords.length,
                  shuffleOn: false,
                },
              }).questions,
            });
          }}
          onStartTest={() => {
            const initialWords = [...state.lessonWords, ...state.numberWords];
            setState({
              status: "test",
              initialWords,
            });
            const firstWord = initialWords[0];
            if (firstWord) wordAudio.play(firstWord);
          }}
          onBackToMode={() => setState({ status: "mode" })}
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
  const selectedWordCount = Math.min(count, max);

  return (
    <main className="flex flex-1 w-full flex-col px-4 pt-6 pb-10">
      <div className="mb-4 flex items-center justify-between">
        <button type="button" onClick={onBack} className="text-base text-zinc-500">
          ← モード選択
        </button>
      </div>

      <h1 className="text-2xl font-bold text-zinc-900">{lesson.title}</h1>
      <p className="mt-1 text-sm text-zinc-500">クイズ設定</p>

      <section className="mt-6 rounded-2xl border border-zinc-200 bg-white p-4">
        <label htmlFor="count" className="text-sm font-medium text-zinc-700">
          単語数 <span className="text-zinc-400">(1 - {max})</span>
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
            {selectedWordCount}
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
        className="mt-8 h-14 w-full rounded-2xl bg-zinc-900 text-base font-semibold text-white shadow-sm active:opacity-90"
      >
        クイズを始める
      </button>
    </main>
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

function QuizView({
  question,
  selectedAnswer,
  onSelect,
  onNext,
  isLast,
}: {
  question: Question;
  selectedAnswer: string | null;
  onSelect: (option: string) => void;
  onNext: () => void;
  isLast: boolean;
}) {
  const answered = selectedAnswer !== null;
  const isCorrect = selectedAnswer === question.answer;
  const title = question.kind === "hanzi" ? "漢字を選ぶ" : "ピンインを選ぶ";

  const optionClassName = (option: string) => {
    if (!answered) {
      return "border-zinc-200 bg-white text-zinc-900 active:bg-zinc-50";
    }
    if (option === question.answer) {
      return "border-emerald-600 bg-emerald-50 text-emerald-800";
    }
    if (option === selectedAnswer) {
      return "border-rose-600 bg-rose-50 text-rose-800";
    }
    return "border-zinc-200 bg-zinc-50 text-zinc-400";
  };

  return (
    <div className="mt-4 flex flex-col gap-4">
      <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
        <div className="text-xs font-medium uppercase tracking-wide text-zinc-500">クイズ</div>
        <h1 className="mt-1 text-xl font-bold text-zinc-900">{title}</h1>
        <div className="mt-4 flex justify-center">
          <WordPlayer word={question.word} />
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3">
        {question.choices.map((option) => (
          <button
            key={option}
            type="button"
            aria-label={`選択肢: ${option}`}
            onClick={() => onSelect(option)}
            disabled={answered}
            className={`flex min-h-24 items-center justify-center rounded-2xl border-2 px-3 py-3 text-center text-2xl leading-snug font-semibold break-words transition-colors ${optionClassName(
              option,
            )}`}
          >
            {option}
          </button>
        ))}
      </section>

      {answered ? (
        <section
          className={`rounded-2xl border p-4 ${
            isCorrect ? "border-emerald-200 bg-emerald-50" : "border-rose-200 bg-rose-50"
          }`}
        >
          <div
            className={`text-sm font-semibold ${isCorrect ? "text-emerald-800" : "text-rose-800"}`}
          >
            {isCorrect ? "正解" : "不正解"}
          </div>
          <div className="mt-2 grid grid-cols-[5rem_1fr] gap-x-2 gap-y-1 text-sm">
            <div className="text-zinc-500">正解</div>
            <div className="font-semibold text-zinc-900">{question.answer}</div>
            <div className="text-zinc-500">意味</div>
            <div className="text-zinc-800">{question.word.japanese}</div>
          </div>
        </section>
      ) : null}

      <button
        type="button"
        onClick={onNext}
        disabled={!answered}
        className="mt-2 h-14 w-full rounded-2xl bg-zinc-900 text-base font-semibold text-white shadow-sm transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
      >
        {isLast ? "結果を見る" : "次へ"}
      </button>
    </div>
  );
}

function QuizResultSummary({
  results,
  lessonTitle,
  onRetry,
  onRetryWrongOnly,
  onStartTest,
  onBackToMode,
}: {
  results: QuizResult[];
  lessonTitle: string;
  onRetry: () => void;
  onRetryWrongOnly: () => void;
  onStartTest: () => void;
  onBackToMode: () => void;
}) {
  const total = results.length;
  const correct = results.filter((result) => result.correct).length;
  const hanziResults = results.filter((result) => result.question.kind === "hanzi");
  const pinyinResults = results.filter((result) => result.question.kind === "pinyin");
  const hanziCorrect = hanziResults.filter((result) => result.correct).length;
  const pinyinCorrect = pinyinResults.filter((result) => result.correct).length;
  const wrongWords = uniqueWords(
    results.filter((result) => !result.correct).map((result) => result.question.word),
  );

  return (
    <main className="flex flex-1 w-full flex-col px-4 pt-6 pb-28">
      <header className="mb-4">
        <div className="text-xs font-medium uppercase tracking-wide text-zinc-500">クイズ結果</div>
        <h1 className="mt-1 text-2xl font-bold text-zinc-900">{lessonTitle}</h1>
      </header>

      <section className="grid grid-cols-3 gap-2">
        <QuizScoreTile label="総合" correct={correct} total={total} accent="zinc" />
        <QuizScoreTile
          label="漢字"
          correct={hanziCorrect}
          total={hanziResults.length}
          accent="emerald"
        />
        <QuizScoreTile
          label="ピンイン"
          correct={pinyinCorrect}
          total={pinyinResults.length}
          accent="sky"
        />
      </section>

      <section className="mt-6">
        <h2 className="text-sm font-semibold text-zinc-700">間違えた単語 ({wrongWords.length})</h2>
        {wrongWords.length === 0 ? (
          <p className="mt-2 text-sm text-zinc-500">全問正解です。</p>
        ) : (
          <ul className="mt-2 flex flex-col gap-2">
            {wrongWords.map((word) => (
              <li key={wordKey(word)} className="rounded-xl border border-zinc-200 bg-white p-3">
                <div className="font-serif text-2xl text-zinc-900">{word.hanzi}</div>
                <div className="mt-0.5 text-sm text-zinc-700">{word.pinyin}</div>
                <div className="text-xs text-zinc-500">{word.japanese}</div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-6 flex flex-col gap-2">
        {wrongWords.length > 0 ? (
          <button
            type="button"
            onClick={onRetryWrongOnly}
            className="h-12 w-full rounded-2xl bg-zinc-900 text-sm font-semibold text-white shadow-sm"
          >
            間違えたものだけもう一度 ({wrongWords.length})
          </button>
        ) : null}
        <button
          type="button"
          onClick={onRetry}
          className="h-12 w-full rounded-2xl border border-zinc-300 bg-white text-sm font-semibold text-zinc-900"
        >
          同じ範囲でもう一度
        </button>
        <button
          type="button"
          onClick={onStartTest}
          className="h-12 w-full rounded-2xl border border-zinc-300 bg-white text-sm font-semibold text-zinc-900"
        >
          本番形式テストへ進む
        </button>
        <button
          type="button"
          onClick={onBackToMode}
          className="h-12 w-full rounded-2xl text-sm font-semibold text-zinc-600"
        >
          モード選択
        </button>
      </section>
    </main>
  );
}

function QuizScoreTile({
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
    zinc: "text-zinc-900",
  }[accent];

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-3 text-center">
      <div className="text-xs font-medium text-zinc-500">{label}</div>
      <div className={`mt-1 text-2xl font-bold ${accentClass}`}>
        {correct}
        <span className="text-sm text-zinc-400"> / {total}</span>
      </div>
    </div>
  );
}
