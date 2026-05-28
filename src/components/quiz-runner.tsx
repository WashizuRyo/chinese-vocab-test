"use client";

import { useState } from "react";
import { ProgressBar } from "@/components/progress-bar";
import { WordPlayer } from "@/components/word-player";
import { WordSelection } from "@/components/word-selection";
import { number } from "@/data/lessons/number";
import { createConfiguredWords } from "@/lib/create-configured-words";
import { createQuiz } from "@/lib/quiz";
import { playCorrectSound } from "@/lib/sound";
import type { Lesson, Question, QuizResult, Word } from "@/lib/types";
import { wordKey } from "@/lib/word";
import { wordAudio } from "@/lib/word-audio";

interface QuizSettings {
  shuffleOn: boolean;
  numberQuestionsOn: boolean;
  selectedWords: Word[];
}

type QuizRunnerState =
  | { status: "setup"; settings: QuizSettings }
  | {
      status: "question";
      lessonWords: Word[];
      numberWords: Word[];
      questions: Question[];
      results: QuizResult[];
      index: number;
    }
  | {
      status: "result";
      lessonWords: Word[];
      numberWords: Word[];
      results: QuizResult[];
    };

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

export function QuizRunner({
  lesson,
  onBackToMode,
  onStartTest,
}: {
  lesson: Lesson;
  onBackToMode: () => void;
  onStartTest: (initialWords: Word[]) => void;
}) {
  const initialSettings = {
    shuffleOn: false,
    numberQuestionsOn: false,
    selectedWords: lesson.words,
  };
  const [state, setState] = useState<QuizRunnerState>({
    status: "setup",
    settings: initialSettings,
  });

  const startWithQuestions = ({
    lessonWords,
    numberWords,
    questions,
  }: {
    lessonWords: Word[];
    numberWords: Word[];
    questions: Question[];
  }) => {
    setState({
      status: "question",
      lessonWords,
      numberWords,
      questions,
      results: [],
      index: 0,
    });
    const firstQuestion = questions[0];
    if (firstQuestion) wordAudio.play(firstQuestion.word);
  };

  const startWithSettings = (settings: QuizSettings) => {
    const selection = createConfiguredWords({
      selectedWords: settings.selectedWords,
      shuffleOn: settings.shuffleOn,
      numberQuestionsOn: settings.numberQuestionsOn,
    });
    const nextQuiz = createQuiz({
      lessonWords: selection.lessonWords,
      lessonChoiceSourceWords: lesson.words,
      numberWords: selection.numberWords,
      numberChoiceSourceWords: number.words,
    });
    startWithQuestions({
      lessonWords: selection.lessonWords,
      numberWords: selection.numberWords,
      questions: nextQuiz.questions,
    });
  };

  const handleChangeSettings = (settings: Partial<QuizSettings>) => {
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
    startWithSettings(state.settings);
  };

  const handleSelect = (option: string) => {
    if (state.status !== "question" || state.results[state.index]) return;
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
      results: [...state.results, result],
    });
  };

  const handleNext = () => {
    if (state.status !== "question" || !state.results[state.index]) return;
    if (state.index + 1 >= state.questions.length) {
      setState({
        status: "result",
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
    });
    if (nextQuestion) wordAudio.play(nextQuestion.word);
  };

  switch (state.status) {
    case "setup":
      return (
        <QuizSetupView
          lesson={lesson}
          settings={state.settings}
          onChangeSettings={handleChangeSettings}
          onStart={handleStart}
          onBack={onBackToMode}
        />
      );

    case "question": {
      const currentQuestion = state.questions[state.index];
      const currentResult = state.results[state.index];
      if (!currentQuestion) return null;

      return (
        <QuizQuestionView
          current={state.index + 1}
          total={state.questions.length}
          question={currentQuestion}
          selectedAnswer={currentResult?.selectedAnswer ?? null}
          onBackToMode={onBackToMode}
          onSelect={handleSelect}
          onNext={handleNext}
          isLast={state.index + 1 >= state.questions.length}
        />
      );
    }

    case "result":
      return (
        <QuizResultView
          results={state.results}
          lessonTitle={lesson.title}
          onRetry={() =>
            startWithQuestions({
              lessonWords: state.lessonWords,
              numberWords: state.numberWords,
              questions: createQuiz({
                lessonWords: state.lessonWords,
                lessonChoiceSourceWords: lesson.words,
                numberWords: state.numberWords,
                numberChoiceSourceWords: number.words,
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
            startWithQuestions({
              lessonWords: wrongLessonWords,
              numberWords: wrongNumberWords,
              questions: createQuiz({
                lessonWords: wrongLessonWords,
                lessonChoiceSourceWords: lesson.words,
                numberWords: wrongNumberWords,
                numberChoiceSourceWords: number.words,
              }).questions,
            });
          }}
          onStartTest={() => {
            const initialWords = [...state.lessonWords, ...state.numberWords];
            onStartTest(initialWords);
          }}
          onBackToMode={onBackToMode}
        />
      );

    default: {
      const _exhaustiveCheck: never = state;
      throw new Error(`Unhandled quiz runner state: ${JSON.stringify(_exhaustiveCheck)}`);
    }
  }
}

function QuizSetupView({
  lesson,
  settings,
  onChangeSettings,
  onStart,
  onBack,
}: {
  lesson: Lesson;
  settings: QuizSettings;
  onChangeSettings: (settings: Partial<QuizSettings>) => void;
  onStart: () => void;
  onBack: () => void;
}) {
  const { shuffleOn, numberQuestionsOn, selectedWords } = settings;
  const selectedWordCount = selectedWords.length;

  return (
    <main className="flex flex-1 w-full flex-col px-4 pt-6 pb-10">
      <div className="mb-4 flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="text-base text-zinc-500 dark:text-zinc-400"
        >
          ← モード選択
        </button>
      </div>

      <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{lesson.title}</h1>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">クイズ設定</p>

      <WordSelection
        words={lesson.words}
        selectedWords={selectedWords}
        onChange={(nextWords) => onChangeSettings({ selectedWords: nextWords })}
      />

      <section className="mt-3 rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <label className="flex items-center justify-between">
          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            出題順をシャッフル
          </span>
          <input
            type="checkbox"
            checked={shuffleOn}
            onChange={(e) => onChangeSettings({ shuffleOn: e.target.checked })}
            className="h-5 w-5"
          />
        </label>
      </section>

      <section className="mt-3 rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <label className="flex items-start justify-between gap-4">
          <span>
            <span className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              最後に数字を追加
            </span>
            <span className="mt-1 block text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
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
        className="mt-8 h-14 w-full rounded-2xl bg-zinc-900 text-base font-semibold text-white shadow-sm active:opacity-90 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-950"
      >
        クイズを始める
      </button>
    </main>
  );
}

function QuizQuestionView({
  current,
  total,
  question,
  selectedAnswer,
  onBackToMode,
  onSelect,
  onNext,
  isLast,
}: {
  current: number;
  total: number;
  question: Question;
  selectedAnswer: string | null;
  onBackToMode: () => void;
  onSelect: (option: string) => void;
  onNext: () => void;
  isLast: boolean;
}) {
  return (
    <main className="flex flex-1 w-full flex-col px-4 pt-6 pb-28">
      <button
        type="button"
        onClick={onBackToMode}
        className="mb-8 w-fit text-base text-zinc-500 dark:text-zinc-400"
      >
        ← モード選択
      </button>
      <ProgressBar current={current} total={total} />
      <QuizChoicesView
        question={question}
        selectedAnswer={selectedAnswer}
        onSelect={onSelect}
        onNext={onNext}
        isLast={isLast}
      />
    </main>
  );
}

function QuizChoicesView({
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
      return "border-zinc-200 bg-white text-zinc-900 active:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:active:bg-zinc-800";
    }
    if (option === question.answer) {
      return "border-emerald-600 bg-emerald-50 text-emerald-800 dark:border-emerald-500 dark:bg-emerald-950 dark:text-emerald-300";
    }
    if (option === selectedAnswer) {
      return "border-rose-600 bg-rose-50 text-rose-800 dark:border-rose-500 dark:bg-rose-950 dark:text-rose-300";
    }
    return "border-zinc-200 bg-zinc-50 text-zinc-400 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-600";
  };

  return (
    <div className="mt-4 flex flex-col gap-4">
      <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          クイズ
        </div>
        <h1 className="mt-1 text-xl font-bold text-zinc-900 dark:text-zinc-100">{title}</h1>
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
          } dark:border-zinc-800 ${isCorrect ? "dark:bg-emerald-950" : "dark:bg-rose-950"}`}
        >
          <div
            className={`text-sm font-semibold ${
              isCorrect
                ? "text-emerald-800 dark:text-emerald-300"
                : "text-rose-800 dark:text-rose-300"
            }`}
          >
            {isCorrect ? "正解" : "不正解"}
          </div>
          <div className="mt-2 grid grid-cols-[5rem_1fr] gap-x-2 gap-y-1 text-sm">
            <div className="text-zinc-500 dark:text-zinc-400">正解</div>
            <div className="font-semibold text-zinc-900 dark:text-zinc-100">{question.answer}</div>
            <div className="text-zinc-500 dark:text-zinc-400">意味</div>
            <div className="text-zinc-800 dark:text-zinc-200">{question.word.japanese}</div>
          </div>
        </section>
      ) : null}

      <button
        type="button"
        onClick={onNext}
        disabled={!answered}
        className="mt-2 h-14 w-full rounded-2xl bg-zinc-900 text-base font-semibold text-white shadow-sm transition-opacity disabled:cursor-not-allowed disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-950"
      >
        {isLast ? "結果を見る" : "次へ"}
      </button>
    </div>
  );
}

function QuizResultView({
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
        <h1 className="mt-1 text-2xl font-bold text-zinc-900 dark:text-zinc-100">{lessonTitle}</h1>
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
        <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
          間違えた単語 ({wrongWords.length})
        </h2>
        {wrongWords.length === 0 ? (
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">全問正解です。</p>
        ) : (
          <ul className="mt-2 flex flex-col gap-2">
            {wrongWords.map((word) => (
              <li
                key={wordKey(word)}
                className="rounded-xl border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900"
              >
                <div className="font-serif text-2xl text-zinc-900 dark:text-zinc-100">
                  {word.hanzi}
                </div>
                <div className="mt-0.5 text-sm text-zinc-700 dark:text-zinc-300">{word.pinyin}</div>
                <div className="text-xs text-zinc-500 dark:text-zinc-400">{word.japanese}</div>
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
            className="h-12 w-full rounded-2xl bg-zinc-900 text-sm font-semibold text-white shadow-sm dark:bg-zinc-100 dark:text-zinc-950"
          >
            間違えたものだけもう一度 ({wrongWords.length})
          </button>
        ) : null}
        <button
          type="button"
          onClick={onRetry}
          className="h-12 w-full rounded-2xl border border-zinc-300 bg-white text-sm font-semibold text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
        >
          同じ範囲でもう一度
        </button>
        <button
          type="button"
          onClick={onStartTest}
          className="h-12 w-full rounded-2xl border border-zinc-300 bg-white text-sm font-semibold text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
        >
          本番形式テストへ進む
        </button>
        <button
          type="button"
          onClick={onBackToMode}
          className="h-12 w-full rounded-2xl text-sm font-semibold text-zinc-600 dark:text-zinc-300"
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
    emerald: "text-emerald-600 dark:text-emerald-400",
    sky: "text-sky-600 dark:text-sky-400",
    zinc: "text-zinc-900 dark:text-zinc-100",
  }[accent];

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-3 text-center dark:border-zinc-800 dark:bg-zinc-900">
      <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400">{label}</div>
      <div className={`mt-1 text-2xl font-bold ${accentClass}`}>
        {correct}
        <span className="text-sm text-zinc-400 dark:text-zinc-500"> / {total}</span>
      </div>
    </div>
  );
}
