"use client";

import { useState } from "react";
import { BackLabel } from "@/components/back-label";
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
        <button type="button" onClick={onBack} className="text-base text-muted-foreground">
          <BackLabel>モード選択</BackLabel>
        </button>
      </div>

      <h1 className="text-2xl font-bold text-foreground">{lesson.title}</h1>
      <p className="mt-1 text-sm text-muted-foreground">クイズ設定</p>

      <WordSelection
        words={lesson.words}
        selectedWords={selectedWords}
        onChange={(nextWords) => onChangeSettings({ selectedWords: nextWords })}
      />

      <section className="mt-3 rounded-2xl border border-border bg-card p-4">
        <label className="flex items-center justify-between">
          <span className="text-sm font-medium text-card-foreground">出題順をシャッフル</span>
          <input
            type="checkbox"
            checked={shuffleOn}
            onChange={(e) => onChangeSettings({ shuffleOn: e.target.checked })}
            className="h-5 w-5"
          />
        </label>
      </section>

      <section className="mt-3 rounded-2xl border border-border bg-card p-4">
        <label className="flex items-start justify-between gap-4">
          <span>
            <span className="block text-sm font-medium text-card-foreground">最後に数字を追加</span>
            <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
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
        className="mt-8 h-14 w-full rounded-2xl bg-primary text-base font-semibold text-primary-foreground shadow-sm active:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
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
        className="mb-8 w-fit text-base text-muted-foreground"
      >
        <BackLabel>モード選択</BackLabel>
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
      return "border-border bg-card text-foreground active:bg-muted";
    }
    if (option === question.answer) {
      return "border-emerald-600 bg-emerald-50 text-emerald-800";
    }
    if (option === selectedAnswer) {
      return "border-rose-600 bg-rose-50 text-rose-800";
    }
    return "border-border bg-muted text-muted-foreground";
  };

  return (
    <div className="mt-4 flex flex-col gap-4">
      <section className="rounded-2xl border border-border bg-card p-4 shadow-sm">
        <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          クイズ
        </div>
        <h1 className="mt-1 text-xl font-bold text-foreground">{title}</h1>
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
            lang={question.kind === "hanzi" ? "zh-CN" : undefined}
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
            <div className="text-muted-foreground">正解</div>
            <div
              lang={question.kind === "hanzi" ? "zh-CN" : undefined}
              className="font-semibold text-foreground"
            >
              {question.answer}
            </div>
            <div className="text-muted-foreground">意味</div>
            <div className="text-card-foreground">{question.word.japanese}</div>
          </div>
        </section>
      ) : null}

      <button
        type="button"
        onClick={onNext}
        disabled={!answered}
        className="mt-2 h-14 w-full rounded-2xl bg-primary text-base font-semibold text-primary-foreground shadow-sm transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
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
        <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          クイズ結果
        </div>
        <h1 className="mt-1 text-2xl font-bold text-foreground">{lessonTitle}</h1>
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
        <h2 className="text-sm font-semibold text-card-foreground">
          間違えた単語 ({wrongWords.length})
        </h2>
        {wrongWords.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">全問正解です。</p>
        ) : (
          <ul className="mt-2 flex flex-col gap-2">
            {wrongWords.map((word) => (
              <li key={wordKey(word)} className="rounded-xl border border-border bg-card p-3">
                <div lang="zh-CN" className="font-serif text-2xl text-foreground">
                  {word.hanzi}
                </div>
                <div className="mt-0.5 text-sm text-card-foreground">{word.pinyin}</div>
                <div className="text-xs text-muted-foreground">{word.japanese}</div>
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
            className="h-12 w-full rounded-2xl bg-primary text-sm font-semibold text-primary-foreground shadow-sm"
          >
            間違えたものだけもう一度 ({wrongWords.length})
          </button>
        ) : null}
        <button
          type="button"
          onClick={onRetry}
          className="h-12 w-full rounded-2xl border border-border bg-card text-sm font-semibold text-foreground"
        >
          同じ範囲でもう一度
        </button>
        <button
          type="button"
          onClick={onStartTest}
          className="h-12 w-full rounded-2xl border border-border bg-card text-sm font-semibold text-foreground"
        >
          本番形式テストへ進む
        </button>
        <button
          type="button"
          onClick={onBackToMode}
          className="h-12 w-full rounded-2xl text-sm font-semibold text-muted-foreground"
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
    zinc: "text-foreground",
  }[accent];

  return (
    <div className="rounded-2xl border border-border bg-card p-3 text-center">
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      <div className={`mt-1 text-2xl font-bold ${accentClass}`}>
        {correct}
        <span className="text-sm text-muted-foreground"> / {total}</span>
      </div>
    </div>
  );
}
