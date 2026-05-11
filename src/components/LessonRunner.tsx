"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { AnswerReveal } from "@/components/AnswerReveal";
import { HandwritingCanvas, type HandwritingCanvasHandle } from "@/components/HandwritingCanvas";
import { ProgressBar } from "@/components/ProgressBar";
import { ResultSummary } from "@/components/ResultSummary";
import { WordPlayer } from "@/components/WordPlayer";
import { getSpeechAvailability, primeSpeechEngine, type SpeechAvailability } from "@/lib/speech";
import { saveLessonScore } from "@/lib/storage";
import type { Lesson, Word, WordResult } from "@/lib/types";

type Phase = "mode" | "setup" | "learn" | "learnComplete" | "test" | "answer" | "result";

type Props = {
  lesson: Lesson;
};

const numberWords: Word[] = [
  { hanzi: "一", pinyin: "yī", japanese: "1" },
  { hanzi: "二", pinyin: "èr", japanese: "2" },
  { hanzi: "三", pinyin: "sān", japanese: "3" },
  { hanzi: "四", pinyin: "sì", japanese: "4" },
  { hanzi: "五", pinyin: "wǔ", japanese: "5" },
  { hanzi: "六", pinyin: "liù", japanese: "6" },
  { hanzi: "七", pinyin: "qī", japanese: "7" },
  { hanzi: "八", pinyin: "bā", japanese: "8" },
  { hanzi: "九", pinyin: "jiǔ", japanese: "9" },
  { hanzi: "十", pinyin: "shí", japanese: "10" },
  { hanzi: "十一", pinyin: "shíyī", japanese: "11" },
  { hanzi: "十二", pinyin: "shí'èr", japanese: "12" },
  { hanzi: "十三", pinyin: "shísān", japanese: "13" },
  { hanzi: "十四", pinyin: "shísì", japanese: "14" },
  { hanzi: "十五", pinyin: "shíwǔ", japanese: "15" },
  { hanzi: "十六", pinyin: "shíliù", japanese: "16" },
  { hanzi: "十七", pinyin: "shíqī", japanese: "17" },
  { hanzi: "十八", pinyin: "shíbā", japanese: "18" },
  { hanzi: "十九", pinyin: "shíjiǔ", japanese: "19" },
  { hanzi: "二十", pinyin: "èrshí", japanese: "20" },
  { hanzi: "二十一", pinyin: "èrshíyī", japanese: "21" },
  { hanzi: "二十二", pinyin: "èrshí'èr", japanese: "22" },
  { hanzi: "二十三", pinyin: "èrshísān", japanese: "23" },
  { hanzi: "二十四", pinyin: "èrshísì", japanese: "24" },
  { hanzi: "二十五", pinyin: "èrshíwǔ", japanese: "25" },
  { hanzi: "二十六", pinyin: "èrshíliù", japanese: "26" },
  { hanzi: "二十七", pinyin: "èrshíqī", japanese: "27" },
  { hanzi: "二十八", pinyin: "èrshíbā", japanese: "28" },
  { hanzi: "二十九", pinyin: "èrshíjiǔ", japanese: "29" },
  { hanzi: "三十", pinyin: "sānshí", japanese: "30" },
  { hanzi: "三十一", pinyin: "sānshíyī", japanese: "31" },
  { hanzi: "三十二", pinyin: "sānshí'èr", japanese: "32" },
  { hanzi: "三十三", pinyin: "sānshísān", japanese: "33" },
  { hanzi: "三十四", pinyin: "sānshísì", japanese: "34" },
  { hanzi: "三十五", pinyin: "sānshíwǔ", japanese: "35" },
  { hanzi: "三十六", pinyin: "sānshíliù", japanese: "36" },
  { hanzi: "三十七", pinyin: "sānshíqī", japanese: "37" },
  { hanzi: "三十八", pinyin: "sānshíbā", japanese: "38" },
  { hanzi: "三十九", pinyin: "sānshíjiǔ", japanese: "39" },
  { hanzi: "四十", pinyin: "sìshí", japanese: "40" },
];

function shuffle<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
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
  const numberQuestions = shuffle(numberWords).slice(0, numberCount);

  return [...regularQuestions, ...numberQuestions];
}

export function LessonRunner({ lesson }: Props) {
  const [phase, setPhase] = useState<Phase>("mode");
  const [count, setCount] = useState(Math.min(10, lesson.words.length));
  const [shuffleOn, setShuffleOn] = useState(true);
  const [numberQuestionsOn, setNumberQuestionsOn] = useState(false);
  const [questions, setQuestions] = useState<Word[]>([]);
  const [index, setIndex] = useState(0);
  const [learnIndex, setLearnIndex] = useState(0);
  const [results, setResults] = useState<WordResult[]>([]);
  const [hanziImage, setHanziImage] = useState<string | null>(null);
  const [pinyinImage, setPinyinImage] = useState<string | null>(null);
  const [speechStatus, setSpeechStatus] = useState<SpeechAvailability | null>(null);

  const hanziCanvasRef = useRef<HandwritingCanvasHandle>(null);
  const pinyinCanvasRef = useRef<HandwritingCanvasHandle>(null);

  useEffect(() => {
    void getSpeechAvailability().then(setSpeechStatus);
  }, []);

  const startWith = useCallback(
    (words: Word[], includeNumberQuestions = numberQuestionsOn) => {
      const subset = buildQuestions(words, count, shuffleOn, includeNumberQuestions);
      const initialResults: WordResult[] = subset.map((w) => ({
        word: w,
        hanziCorrect: null,
        pinyinCorrect: null,
      }));
      primeSpeechEngine();
      setQuestions(subset);
      setResults(initialResults);
      setIndex(0);
      setHanziImage(null);
      setPinyinImage(null);
      setPhase("test");
    },
    [count, shuffleOn, numberQuestionsOn],
  );

  const handleStart = () => {
    startWith(lesson.words);
  };

  const handleStartLearning = () => {
    setLearnIndex(0);
    hanziCanvasRef.current?.clear();
    pinyinCanvasRef.current?.clear();
    primeSpeechEngine();
    setPhase("learn");
  };

  const handleOpenTestSetup = () => {
    hanziCanvasRef.current?.clear();
    pinyinCanvasRef.current?.clear();
    setPhase("setup");
  };

  const handleSubmit = () => {
    const h = hanziCanvasRef.current?.getDataURL() ?? null;
    const p = pinyinCanvasRef.current?.getDataURL() ?? null;
    setHanziImage(h);
    setPinyinImage(p);
    setPhase("answer");
  };

  const handleJudge = (field: "hanzi" | "pinyin", correct: boolean) => {
    setResults((prev) => {
      const next = [...prev];
      const cur = next[index];
      next[index] = {
        ...cur,
        hanziCorrect: field === "hanzi" ? correct : cur.hanziCorrect,
        pinyinCorrect: field === "pinyin" ? correct : cur.pinyinCorrect,
      };
      return next;
    });
  };

  const handleNext = () => {
    if (index + 1 >= questions.length) {
      setPhase("result");
      return;
    }
    hanziCanvasRef.current?.clear();
    pinyinCanvasRef.current?.clear();
    setHanziImage(null);
    setPinyinImage(null);
    setIndex((i) => i + 1);
    setPhase("test");
  };

  useEffect(() => {
    if (phase !== "result") return;
    const total = results.length;
    if (total === 0) return;
    const hanziCorrect = results.filter((r) => r.hanziCorrect === true).length;
    const pinyinCorrect = results.filter((r) => r.pinyinCorrect === true).length;
    saveLessonScore(lesson.id, {
      hanziCorrect,
      pinyinCorrect,
      total,
      takenAt: new Date().toISOString(),
    });
  }, [phase, results, lesson.id]);

  const currentWord = questions[index];
  const currentResult = results[index];
  const currentLearnWord = lesson.words[learnIndex];

  if (phase === "mode") {
    return (
      <ModeSelectView
        lesson={lesson}
        onStartLearning={handleStartLearning}
        onOpenTestSetup={handleOpenTestSetup}
        speechStatus={speechStatus}
      />
    );
  }

  if (phase === "setup") {
    return (
      <SetupView
        lesson={lesson}
        count={count}
        setCount={setCount}
        shuffleOn={shuffleOn}
        setShuffleOn={setShuffleOn}
        numberQuestionsOn={numberQuestionsOn}
        setNumberQuestionsOn={setNumberQuestionsOn}
        onStart={handleStart}
        onBack={() => setPhase("mode")}
        speechStatus={speechStatus}
      />
    );
  }

  if (phase === "learn" && currentLearnWord) {
    return (
      <LearningView
        word={currentLearnWord}
        current={learnIndex + 1}
        total={lesson.words.length}
        autoPlay={speechStatus === "available"}
        hanziCanvasRef={hanziCanvasRef}
        pinyinCanvasRef={pinyinCanvasRef}
        onBackToMode={() => setPhase("mode")}
        onPrev={() => {
          if (learnIndex === 0) return;
          hanziCanvasRef.current?.clear();
          pinyinCanvasRef.current?.clear();
          setLearnIndex((i) => i - 1);
        }}
        onNext={() => {
          hanziCanvasRef.current?.clear();
          pinyinCanvasRef.current?.clear();
          if (learnIndex + 1 >= lesson.words.length) {
            setPhase("learnComplete");
            return;
          }
          setLearnIndex((i) => i + 1);
        }}
      />
    );
  }

  if (phase === "learnComplete") {
    return (
      <LearningCompleteView
        lesson={lesson}
        onTest={handleOpenTestSetup}
        onRestartLearning={handleStartLearning}
      />
    );
  }

  if (phase === "result") {
    return (
      <ResultSummary
        results={results}
        lessonTitle={lesson.title}
        onRetry={() => startWith(lesson.words)}
        onRetryWrongOnly={() => {
          const wrongWords = results
            .filter((r) => r.hanziCorrect !== true || r.pinyinCorrect !== true)
            .map((r) => r.word);
          if (wrongWords.length === 0) return;
          startWith(wrongWords, false);
        }}
      />
    );
  }

  return (
    <main className="flex flex-1 w-full flex-col px-4 pt-4 pb-28">
      <ProgressBar current={index + 1} total={questions.length} />
      {speechStatus === "unsupported" || speechStatus === "no-zh-voice" ? (
        <div className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
          このブラウザは中国語の音声合成に対応していません。Safari / Chrome をお試しください。
        </div>
      ) : null}

      {phase === "test" && currentWord ? (
        <TestView
          word={currentWord}
          autoPlay={speechStatus === "available"}
          onSubmit={handleSubmit}
          hanziCanvasRef={hanziCanvasRef}
          pinyinCanvasRef={pinyinCanvasRef}
        />
      ) : null}

      {phase === "answer" && currentWord && currentResult ? (
        <div className="mt-4">
          <AnswerReveal
            word={currentWord}
            hanziImage={hanziImage}
            pinyinImage={pinyinImage}
            hanziCorrect={currentResult.hanziCorrect}
            pinyinCorrect={currentResult.pinyinCorrect}
            onJudgeHanzi={(c) => handleJudge("hanzi", c)}
            onJudgePinyin={(c) => handleJudge("pinyin", c)}
            onNext={handleNext}
            isLast={index + 1 >= questions.length}
          />
        </div>
      ) : null}
    </main>
  );
}

function ModeSelectView({
  lesson,
  onStartLearning,
  onOpenTestSetup,
  speechStatus,
}: {
  lesson: Lesson;
  onStartLearning: () => void;
  onOpenTestSetup: () => void;
  speechStatus: SpeechAvailability | null;
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

      {speechStatus === "unsupported" || speechStatus === "no-zh-voice" ? (
        <div className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
          このブラウザは中国語の音声合成に対応していません。Safari / Chrome をお試しください。
        </div>
      ) : null}
    </main>
  );
}

function SetupView({
  lesson,
  count,
  setCount,
  shuffleOn,
  setShuffleOn,
  numberQuestionsOn,
  setNumberQuestionsOn,
  onStart,
  onBack,
  speechStatus,
}: {
  lesson: Lesson;
  count: number;
  setCount: (n: number) => void;
  shuffleOn: boolean;
  setShuffleOn: (b: boolean) => void;
  numberQuestionsOn: boolean;
  setNumberQuestionsOn: (b: boolean) => void;
  onStart: () => void;
  onBack: () => void;
  speechStatus: SpeechAvailability | null;
}) {
  const max = lesson.words.length;
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
            onChange={(e) => setCount(Number(e.target.value))}
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
            onChange={(e) => setShuffleOn(e.target.checked)}
            className="h-5 w-5"
          />
        </label>
      </section>

      <section className="mt-3 rounded-2xl border border-zinc-200 bg-white p-4">
        <label className="flex items-center justify-between">
          <span className="text-sm font-medium text-zinc-700">最後に数字問題を出す</span>
          <input
            type="checkbox"
            checked={numberQuestionsOn}
            onChange={(e) => setNumberQuestionsOn(e.target.checked)}
            className="h-5 w-5"
          />
        </label>
      </section>

      {speechStatus === "unsupported" || speechStatus === "no-zh-voice" ? (
        <div className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
          このブラウザは中国語の音声合成に対応していません。Safari / Chrome をお試しください。
        </div>
      ) : null}

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
  word,
  current,
  total,
  autoPlay,
  hanziCanvasRef,
  pinyinCanvasRef,
  onBackToMode,
  onPrev,
  onNext,
}: {
  word: Word;
  current: number;
  total: number;
  autoPlay: boolean;
  hanziCanvasRef: React.RefObject<HandwritingCanvasHandle | null>;
  pinyinCanvasRef: React.RefObject<HandwritingCanvasHandle | null>;
  onBackToMode: () => void;
  onPrev: () => void;
  onNext: () => void;
}) {
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
            <WordPlayer text={word.hanzi} autoPlayOnChange={autoPlay} />
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
  autoPlay,
  onSubmit,
  hanziCanvasRef,
  pinyinCanvasRef,
}: {
  word: Word;
  autoPlay: boolean;
  onSubmit: () => void;
  hanziCanvasRef: React.RefObject<HandwritingCanvasHandle | null>;
  pinyinCanvasRef: React.RefObject<HandwritingCanvasHandle | null>;
}) {
  return (
    <div className="handwriting-practice mt-4 flex flex-col gap-4">
      <div className="flex justify-center pt-1 pb-2">
        <WordPlayer text={word.hanzi} autoPlayOnChange={autoPlay} />
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
