"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { AnswerReveal } from "@/components/AnswerReveal";
import { HandwritingCanvas, type HandwritingCanvasHandle } from "@/components/HandwritingCanvas";
import { ProgressBar } from "@/components/ProgressBar";
import { ResultSummary } from "@/components/ResultSummary";
import { WordPlayer } from "@/components/WordPlayer";
import { lessons } from "@/data/lessons";
import { number } from "@/data/lessons/number";
import { buildPinyinToneChoices } from "@/lib/pinyinChoices";
import { playCorrectSound } from "@/lib/sound";
import { primeSpeechEngine, speakChinese } from "@/lib/speech";
import type { ChoiceQuestion, ChoiceResult, Lesson, Word, WordResult } from "@/lib/types";

interface TestSettings {
  count: number;
  shuffleOn: boolean;
  numberQuestionsOn: boolean;
}

type SetupMode = "choice" | "test";

type LessonRunnerState =
  | { status: "mode" }
  | { status: "setup"; mode: SetupMode; settings: TestSettings }
  | { status: "learn" }
  | { status: "learnComplete" }
  | {
      status: "choice";
      words: Word[];
      questions: ChoiceQuestion[];
      results: ChoiceResult[];
      index: number;
      selectedChoice: string | null;
    }
  | {
      status: "choiceResult";
      words: Word[];
      results: ChoiceResult[];
    }
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

function buildFallbackWords(target: Word, sources: Word[][]): Word[] {
  const targetKey = wordKey(target);
  return uniqueWords(sources.flat()).filter((word) => wordKey(word) !== targetKey);
}

function buildHanziChoices(target: Word, selectedWords: Word[], lessonWords: Word[]): string[] {
  const fallbackWords = buildFallbackWords(target, [
    selectedWords,
    lessonWords,
    lessons.flatMap((lesson) => lesson.words),
  ]);
  return [target.hanzi, ...fallbackWords.map((word) => word.hanzi)]
    .filter((value, index, values) => values.indexOf(value) === index)
    .slice(0, 4);
}

function buildPinyinChoices(target: Word, selectedWords: Word[], lessonWords: Word[]): string[] {
  const fallbackPinyins = buildFallbackWords(target, [
    selectedWords,
    lessonWords,
    lessons.flatMap((lesson) => lesson.words),
  ]).map((word) => word.pinyin);
  return buildPinyinToneChoices(target.pinyin, fallbackPinyins, 4);
}

function buildChoiceQuestions(selectedWords: Word[], lessonWords: Word[]): ChoiceQuestion[] {
  const questions = selectedWords.flatMap((word) => [
    {
      kind: "hanzi" as const,
      word,
      answer: word.hanzi,
      choices: shuffle(buildHanziChoices(word, selectedWords, lessonWords)),
    },
    {
      kind: "pinyin" as const,
      word,
      answer: word.pinyin,
      choices: shuffle(buildPinyinChoices(word, selectedWords, lessonWords)),
    },
  ]);

  return shuffle(questions);
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

  const startChoiceWithSettings = (
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
    startChoiceWithWords(subset);
  };

  const startWithWords = (words: Word[]) => {
    const initialResults: WordResult[] = words.map((w) => ({
      word: w,
      hanziCorrect: true,
      pinyinCorrect: true,
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

  const startChoiceWithWords = (words: Word[]) => {
    const questions = buildChoiceQuestions(words, lesson.words);
    primeSpeechEngine();
    setState({
      status: "choice",
      words,
      questions,
      results: [],
      index: 0,
      selectedChoice: null,
    });
    const firstQuestion = questions[0];
    if (firstQuestion) speakChinese(firstQuestion.word.hanzi);
  };

  const handleStart = () => {
    if (state.status !== "setup") return;
    if (state.mode === "choice") {
      startChoiceWithSettings(lesson.words, state.settings);
      return;
    }
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
    setState({ status: "setup", mode: "test", settings: initialSettings });
  };

  const handleOpenChoiceSetup = () => {
    clearCanvases();
    setState({ status: "setup", mode: "choice", settings: initialSettings });
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

  const handleChoiceSelect = (choice: string) => {
    if (state.status !== "choice" || state.selectedChoice !== null) return;
    const question = state.questions[state.index];
    if (!question) return;
    const result: ChoiceResult = {
      question,
      selectedChoice: choice,
      correct: choice === question.answer,
    };
    if (result.correct) playCorrectSound();
    setState({
      ...state,
      selectedChoice: choice,
      results: [...state.results, result],
    });
  };

  const handleChoiceNext = () => {
    if (state.status !== "choice" || state.selectedChoice === null) return;
    if (state.index + 1 >= state.questions.length) {
      setState({
        status: "choiceResult",
        words: state.words,
        results: state.results,
      });
      return;
    }

    const nextQuestion = state.questions[state.index + 1];
    setState({
      ...state,
      index: state.index + 1,
      selectedChoice: null,
    });
    if (nextQuestion) speakChinese(nextQuestion.word.hanzi);
  };

  switch (state.status) {
    case "mode":
      return (
        <ModeSelectView
          lesson={lesson}
          onStartLearning={handleStartLearning}
          onOpenChoiceSetup={handleOpenChoiceSetup}
          onOpenTestSetup={handleOpenTestSetup}
        />
      );

    case "setup":
      return (
        <SetupView
          lesson={lesson}
          mode={state.mode}
          settings={state.settings}
          onChangeSettings={handleChangeSettings}
          onStart={handleStart}
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
          onChoiceCheck={handleOpenChoiceSetup}
          onTest={handleOpenTestSetup}
          onRestartLearning={handleStartLearning}
        />
      );

    case "choice": {
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
            <ChoiceCheckView
              question={currentQuestion}
              selectedChoice={state.selectedChoice}
              onSelect={handleChoiceSelect}
              onNext={handleChoiceNext}
              isLast={state.index + 1 >= state.questions.length}
            />
          ) : null}
        </main>
      );
    }

    case "choiceResult":
      return (
        <ChoiceResultSummary
          results={state.results}
          lessonTitle={lesson.title}
          onRetry={() => startChoiceWithWords(state.words)}
          onRetryWrongOnly={() => {
            const wrongWords = uniqueWords(
              state.results
                .filter((result) => !result.correct)
                .map((result) => result.question.word),
            );
            if (wrongWords.length === 0) return;
            startChoiceWithWords(wrongWords);
          }}
          onStartTest={() => startWithWords(state.words)}
          onBackToMode={() => setState({ status: "mode" })}
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
        <main className="flex flex-1 w-full flex-col px-4 pt-6 pb-28">
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
        <main className="flex flex-1 w-full flex-col px-4 pt-6 pb-28">
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
  onOpenChoiceSetup,
  onOpenTestSetup,
}: {
  lesson: Lesson;
  onStartLearning: () => void;
  onOpenChoiceSetup: () => void;
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
          onClick={onOpenChoiceSetup}
          className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-5 text-left shadow-sm active:bg-zinc-50"
        >
          <span className="block text-lg font-semibold text-zinc-900">クイズ</span>
          <span className="mt-1 block text-sm text-zinc-500">
            発音を聞いて、漢字とピンインを4択で確認する
          </span>
          <ChoiceModePreview />
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

function ChoiceModePreview() {
  const choices = ["shí", "shī", "shǐ", "shì"];

  return (
    <span aria-hidden="true" className="mx-auto mt-4 block w-full max-w-sm">
      <span className="block rounded-xl bg-zinc-50 px-4 py-4">
        <span>
          <span className="block text-xl font-bold text-zinc-950">ピンインを選ぶ</span>
        </span>
        <span className="mt-3 grid grid-cols-2 gap-2">
          {choices.map((choice) => (
            <span
              key={choice}
              className="flex h-10 items-center justify-center rounded-lg border border-zinc-200 bg-white text-lg font-semibold text-zinc-950"
            >
              {choice}
            </span>
          ))}
        </span>
      </span>
    </span>
  );
}

function SetupView({
  lesson,
  mode,
  settings,
  onChangeSettings,
  onStart,
  onBack,
}: {
  lesson: Lesson;
  mode: SetupMode;
  settings: TestSettings;
  onChangeSettings: (settings: Partial<TestSettings>) => void;
  onStart: () => void;
  onBack: () => void;
}) {
  const max = lesson.words.length;
  const { count, shuffleOn, numberQuestionsOn } = settings;
  const modeLabel = mode === "choice" ? "クイズ設定" : "出題設定";
  const startLabel = mode === "choice" ? "クイズを始める" : "スタート";

  return (
    <main className="flex flex-1 w-full flex-col px-4 pt-6 pb-10">
      <div className="mb-4 flex items-center justify-between">
        <button type="button" onClick={onBack} className="text-base text-zinc-500">
          ← モード選択
        </button>
      </div>

      <h1 className="text-2xl font-bold text-zinc-900">{lesson.title}</h1>
      <p className="mt-1 text-sm text-zinc-500">{modeLabel}</p>

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
              オンにすると、最後の2問が1〜50の数字問題になります。
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
        {startLabel}
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
          <WordPlayer text={word.hanzi} />
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
              <WordPlayer text={word.hanzi} />
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
  onChoiceCheck,
  onTest,
  onRestartLearning,
}: {
  lesson: Lesson;
  onChoiceCheck: () => void;
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
          onClick={onChoiceCheck}
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

function ChoiceCheckView({
  question,
  selectedChoice,
  onSelect,
  onNext,
  isLast,
}: {
  question: ChoiceQuestion;
  selectedChoice: string | null;
  onSelect: (choice: string) => void;
  onNext: () => void;
  isLast: boolean;
}) {
  const answered = selectedChoice !== null;
  const isCorrect = selectedChoice === question.answer;
  const title = question.kind === "hanzi" ? "漢字を選ぶ" : "ピンインを選ぶ";

  const choiceClassName = (choice: string) => {
    if (!answered) {
      return "border-zinc-200 bg-white text-zinc-900 active:bg-zinc-50";
    }
    if (choice === question.answer) {
      return "border-emerald-600 bg-emerald-50 text-emerald-800";
    }
    if (choice === selectedChoice) {
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
          <WordPlayer text={question.word.hanzi} />
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3">
        {question.choices.map((choice) => (
          <button
            key={choice}
            type="button"
            aria-label={`選択肢: ${choice}`}
            onClick={() => onSelect(choice)}
            disabled={answered}
            className={`flex min-h-24 items-center justify-center rounded-2xl border-2 px-3 py-3 text-center text-2xl leading-snug font-semibold break-words transition-colors ${choiceClassName(
              choice,
            )}`}
          >
            {choice}
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

function ChoiceResultSummary({
  results,
  lessonTitle,
  onRetry,
  onRetryWrongOnly,
  onStartTest,
  onBackToMode,
}: {
  results: ChoiceResult[];
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
        <ChoiceScoreTile label="総合" correct={correct} total={total} accent="zinc" />
        <ChoiceScoreTile
          label="漢字"
          correct={hanziCorrect}
          total={hanziResults.length}
          accent="emerald"
        />
        <ChoiceScoreTile
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

function ChoiceScoreTile({
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

      <CanvasBlock label="漢字" canvasRef={hanziCanvasRef} aspectRatio={0.32} />

      <div className="mt-10">
        <CanvasBlock label="ピンイン" canvasRef={pinyinCanvasRef} aspectRatio={0.32} />
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
  aspectRatio,
}: {
  label: string;
  canvasRef: React.RefObject<HandwritingCanvasHandle | null>;
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
      <HandwritingCanvas ref={canvasRef} aspectRatio={aspectRatio} ariaLabel={`${label}の手書き`} />
    </div>
  );
}
