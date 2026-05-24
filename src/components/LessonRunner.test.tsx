import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";
import { LessonRunner } from "@/components/LessonRunner";
import type { Lesson } from "@/lib/types";

vi.mock("@/lib/sound", () => ({
  playCorrectSound: vi.fn(),
}));

const ResizeObserverMock = vi.fn(
  class {
    disconnect = vi.fn();
    observe = vi.fn();
    unobserve = vi.fn();
  },
);

const canvasContextMock = {
  beginPath() {},
  clearRect() {},
  drawImage() {},
  fillRect() {},
  lineTo() {},
  moveTo() {},
  restore() {},
  save() {},
  setLineDash() {},
  setTransform() {},
  stroke() {},
  strokeRect() {},
} as unknown as CanvasRenderingContext2D;

vi.stubGlobal("ResizeObserver", ResizeObserverMock);
vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(canvasContextMock);
vi.spyOn(HTMLCanvasElement.prototype, "toDataURL").mockReturnValue("data:image/png;base64,test");

const playAudio = vi.fn();

class AudioMock {
  play = playAudio;
  pause = vi.fn();
}

vi.stubGlobal("Audio", AudioMock);

const lesson: Lesson = {
  id: "transition-test",
  title: "状態遷移課",
  words: [
    { hanzi: "你", pinyin: "nǐ", japanese: "あなた", audioSrc: "/audio/words/你-nǐ.mp3" },
    { hanzi: "我", pinyin: "wǒ", japanese: "私", audioSrc: "/audio/words/我-wǒ.mp3" },
  ],
};

const quizLesson: Lesson = {
  id: "quiz-test",
  title: "クイズ課",
  words: [
    { hanzi: "你", pinyin: "nǐ", japanese: "あなた", audioSrc: "/audio/words/你-nǐ.mp3" },
    { hanzi: "我", pinyin: "wǒ", japanese: "私", audioSrc: "/audio/words/我-wǒ.mp3" },
    { hanzi: "是", pinyin: "shì", japanese: "〜です", audioSrc: "/audio/words/是-shì.mp3" },
    { hanzi: "吗", pinyin: "ma", japanese: "か", audioSrc: "/audio/words/吗-ma.mp3" },
  ],
};

function completeLearning() {
  fireEvent.click(screen.getByRole("button", { name: /暗記/ }));
  expect(screen.getByText("nǐ")).toBeVisible();
  expect(screen.getByText("あなた")).toBeVisible();

  fireEvent.click(screen.getByRole("button", { name: "次へ" }));
  expect(screen.getByText("wǒ")).toBeVisible();
  expect(screen.getByText("私")).toBeVisible();

  fireEvent.click(screen.getByRole("button", { name: "完了" }));
  expect(screen.getByText("暗記完了")).toBeVisible();
}

function withDeterministicShuffle(run: () => void) {
  const randomSpy = vi.spyOn(Math, "random").mockReturnValue(0);
  try {
    run();
  } finally {
    randomSpy.mockRestore();
  }
}

function startQuiz() {
  fireEvent.click(screen.getByRole("button", { name: /クイズ/ }));
  expect(screen.getByText("クイズ設定")).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: "クイズを始める" }));
}

function quizOptions() {
  return screen.getAllByLabelText(/^選択肢:/);
}

function answerQuestion(optionIndex: number) {
  const option = quizOptions()[optionIndex];
  if (!option) throw new Error(`Expected quiz option ${optionIndex} to exist`);
  fireEvent.click(option);
}

function answerAllQuestions(optionIndex: number, totalQuestions: number) {
  for (let i = 0; i < totalQuestions; i++) {
    answerQuestion(optionIndex);
    fireEvent.click(
      screen.getByRole("button", {
        name: i + 1 === totalQuestions ? "結果を見る" : "次へ",
      }),
    );
  }
}

function answerCurrentQuestion({
  hanziCorrect,
  pinyinCorrect,
}: {
  hanziCorrect: boolean;
  pinyinCorrect: boolean;
}) {
  fireEvent.click(screen.getByRole("button", { name: "答え合わせ" }));

  const hanziJudgeButtons = screen.getAllByRole("button", {
    name: hanziCorrect ? "正解" : "不正解",
  });
  const pinyinJudgeButtons = screen.getAllByRole("button", {
    name: pinyinCorrect ? "正解" : "不正解",
  });

  const hanziJudgeButton = hanziJudgeButtons[0];
  const pinyinJudgeButton = pinyinJudgeButtons[1];

  if (!hanziJudgeButton || !pinyinJudgeButton) {
    throw new Error("Expected judge buttons to exist");
  }

  fireEvent.click(hanziJudgeButton);
  fireEvent.click(pinyinJudgeButton);
}

describe("LessonRunner", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  describe("モード選択画面", () => {
    test("暗記中画面へ遷移できること", () => {
      render(<LessonRunner lesson={lesson} />);

      fireEvent.click(screen.getByRole("button", { name: /暗記/ }));

      expect(screen.getByText("nǐ")).toBeVisible();
      expect(screen.getByText("あなた")).toBeVisible();
    });

    test("暗記開始時に最初の単語の中国語音声素材を再生すること", () => {
      render(<LessonRunner lesson={lesson} />);

      fireEvent.click(screen.getByRole("button", { name: /暗記/ }));

      expect(playAudio).toHaveBeenCalledOnce();
    });

    test("テスト設定画面へ遷移できること", () => {
      render(<LessonRunner lesson={lesson} />);

      fireEvent.click(screen.getByRole("button", { name: /テスト/ }));

      expect(screen.getByText("出題設定")).toBeVisible();
    });

    test("クイズ設定画面へ遷移できること", () => {
      render(<LessonRunner lesson={quizLesson} />);

      fireEvent.click(screen.getByRole("button", { name: /クイズ/ }));

      expect(screen.getByText("クイズ設定")).toBeVisible();
      expect(screen.getByText("出題する単語")).toBeVisible();
    });

    test("クイズ設定で数字追加を選べること", () => {
      render(<LessonRunner lesson={quizLesson} />);

      fireEvent.click(screen.getByRole("button", { name: /クイズ/ }));
      fireEvent.click(screen.getByRole("checkbox", { name: /最後に数字を追加/ }));

      expect(screen.getByRole("checkbox", { name: /最後に数字を追加/ })).toBeChecked();
    });

    test("クイズ設定で出題する単語を選べること", () => {
      render(<LessonRunner lesson={quizLesson} />);

      fireEvent.click(screen.getByRole("button", { name: /クイズ/ }));
      fireEvent.click(screen.getByRole("checkbox", { name: "我" }));
      fireEvent.click(screen.getByRole("checkbox", { name: "是" }));
      fireEvent.click(screen.getByRole("checkbox", { name: "吗" }));
      fireEvent.click(screen.getByRole("button", { name: "クイズを始める" }));

      expect(screen.getByText("1 / 2")).toBeVisible();
    });
  });

  describe("暗記中画面", () => {
    test("次へを押すと次の単語の中国語音声素材を再生すること", () => {
      render(<LessonRunner lesson={lesson} />);

      fireEvent.click(screen.getByRole("button", { name: /暗記/ }));
      fireEvent.click(screen.getByRole("button", { name: "次へ" }));

      expect(playAudio).toHaveBeenCalledTimes(2);
    });

    test("前へを押すと前の単語の中国語音声素材を再生すること", () => {
      render(<LessonRunner lesson={lesson} />);

      fireEvent.click(screen.getByRole("button", { name: /暗記/ }));
      fireEvent.click(screen.getByRole("button", { name: "次へ" }));
      fireEvent.click(screen.getByRole("button", { name: "前へ" }));

      expect(playAudio).toHaveBeenCalledTimes(3);
    });

    test("モード選択へ戻れること", () => {
      render(<LessonRunner lesson={lesson} />);

      fireEvent.click(screen.getByRole("button", { name: /暗記/ }));
      fireEvent.click(screen.getByRole("button", { name: "← モード選択" }));

      expect(screen.getByRole("heading", { name: "状態遷移課" })).toBeVisible();
    });

    test("単語一覧を表示して暗記画面へ戻れること", () => {
      render(<LessonRunner lesson={lesson} />);

      fireEvent.click(screen.getByRole("button", { name: /暗記/ }));
      expect(screen.getByText("nǐ")).toBeVisible();
      expect(screen.getByText("あなた")).toBeVisible();

      fireEvent.click(screen.getByRole("button", { name: "単語一覧" }));

      expect(screen.getByRole("heading", { name: "状態遷移課" })).toBeVisible();
      expect(screen.getByText("2 単語")).toBeVisible();
      expect(screen.getByText("nǐ")).toBeVisible();
      expect(screen.getByText("あなた")).toBeVisible();
      expect(screen.getByText("wǒ")).toBeVisible();
      expect(screen.getByText("私")).toBeVisible();

      fireEvent.click(screen.getByRole("button", { name: "単語カード" }));

      expect(screen.getByText("nǐ")).toBeVisible();
      expect(screen.getByText("あなた")).toBeVisible();
      expect(screen.getByRole("button", { name: "単語一覧" })).toBeVisible();
    });

    test("単語一覧からモード選択へ戻れること", () => {
      render(<LessonRunner lesson={lesson} />);

      fireEvent.click(screen.getByRole("button", { name: /暗記/ }));
      fireEvent.click(screen.getByRole("button", { name: "単語一覧" }));
      fireEvent.click(screen.getByRole("button", { name: "← モード選択" }));

      expect(screen.getByRole("button", { name: /暗記/ })).toBeVisible();
      expect(screen.getByRole("button", { name: /クイズ/ })).toBeVisible();
      expect(screen.getByRole("button", { name: /テスト/ })).toBeVisible();
    });

    test("暗記完了画面へ遷移できること", () => {
      render(<LessonRunner lesson={lesson} />);

      fireEvent.click(screen.getByRole("button", { name: /暗記/ }));
      fireEvent.click(screen.getByRole("button", { name: "次へ" }));
      fireEvent.click(screen.getByRole("button", { name: "完了" }));

      expect(screen.getByText("暗記完了")).toBeVisible();
    });
  });

  describe("暗記完了画面", () => {
    test("もう一周へ遷移できること", () => {
      render(<LessonRunner lesson={lesson} />);

      completeLearning();
      fireEvent.click(screen.getByRole("button", { name: "もう一周する" }));

      expect(screen.getByText("nǐ")).toBeVisible();
      expect(screen.getByText("あなた")).toBeVisible();
    });

    test("テスト設定へ遷移できること", () => {
      render(<LessonRunner lesson={lesson} />);

      completeLearning();
      fireEvent.click(screen.getByRole("button", { name: "この課をテストする" }));

      expect(screen.getByText("出題設定")).toBeVisible();
    });

    test("クイズ設定へ遷移できること", () => {
      render(<LessonRunner lesson={lesson} />);

      completeLearning();
      fireEvent.click(screen.getByRole("button", { name: "クイズする" }));

      expect(screen.getByText("クイズ設定")).toBeVisible();
    });
  });

  describe("テスト設定画面", () => {
    test("モード選択へ戻れること", () => {
      render(<LessonRunner lesson={lesson} />);

      fireEvent.click(screen.getByRole("button", { name: /テスト/ }));
      expect(screen.getByText("出題設定")).toBeVisible();

      fireEvent.click(screen.getByRole("button", { name: "← モード選択" }));

      expect(screen.getByRole("heading", { name: "状態遷移課" })).toBeVisible();
    });

    test("テストを開始できること", () => {
      render(<LessonRunner lesson={lesson} />);

      fireEvent.click(screen.getByRole("button", { name: /テスト/ }));
      fireEvent.click(screen.getByRole("button", { name: "スタート" }));

      expect(screen.getByText("1 / 2")).toBeVisible();
      expect(screen.getByRole("button", { name: "答え合わせ" })).toBeVisible();
    });

    test("出題設定をテスト開始時の問題数に反映できること", () => {
      render(<LessonRunner lesson={lesson} />);

      fireEvent.click(screen.getByRole("button", { name: /テスト/ }));
      fireEvent.click(screen.getByRole("checkbox", { name: "我" }));
      fireEvent.click(screen.getByRole("checkbox", { name: /最後に数字を追加/ }));
      fireEvent.click(screen.getByRole("button", { name: "スタート" }));

      expect(screen.getByText("1 / 3")).toBeVisible();
      expect(screen.getByRole("button", { name: "答え合わせ" })).toBeVisible();
    });

    test("テスト設定で出題する単語を選べること", () => {
      render(<LessonRunner lesson={lesson} />);

      fireEvent.click(screen.getByRole("button", { name: /テスト/ }));
      fireEvent.click(screen.getByRole("checkbox", { name: "我" }));
      fireEvent.click(screen.getByRole("button", { name: "スタート" }));

      expect(screen.getByText("1 / 1")).toBeVisible();
      expect(screen.getByRole("button", { name: "答え合わせ" })).toBeVisible();
    });
  });

  describe("テスト画面", () => {
    test("答え合わせ画面へ遷移できること", () => {
      render(<LessonRunner lesson={lesson} />);

      fireEvent.click(screen.getByRole("button", { name: /テスト/ }));
      fireEvent.click(screen.getByRole("button", { name: "スタート" }));
      fireEvent.click(screen.getByRole("button", { name: "答え合わせ" }));

      expect(screen.getByRole("button", { name: "次へ" })).toBeVisible();
    });
  });

  describe("クイズ", () => {
    test("4択問題を開始できること", () => {
      withDeterministicShuffle(() => {
        render(<LessonRunner lesson={quizLesson} />);

        startQuiz();

        expect(screen.getByText("1 / 8")).toBeVisible();
        expect(screen.getAllByText("クイズ")).toHaveLength(1);
        expect(quizOptions()).toHaveLength(4);
      });
    });

    test("正解を選ぶと結果を表示して次へ進めること", () => {
      withDeterministicShuffle(() => {
        render(<LessonRunner lesson={quizLesson} />);

        startQuiz();
        answerQuestion(3);

        expect(screen.getAllByText("正解")[0]).toBeVisible();
        fireEvent.click(screen.getByRole("button", { name: "次へ" }));
        expect(screen.getByText("2 / 8")).toBeVisible();
      });
    });

    test("クイズ中にモード選択へ戻れること", () => {
      withDeterministicShuffle(() => {
        render(<LessonRunner lesson={quizLesson} />);

        startQuiz();
        fireEvent.click(screen.getByRole("button", { name: "← モード選択" }));

        expect(screen.getByRole("button", { name: /暗記/ })).toBeVisible();
        expect(screen.getByRole("button", { name: /クイズ/ })).toBeVisible();
        expect(screen.getByRole("button", { name: /テスト/ })).toBeVisible();
      });
    });

    test("最終問題後にクイズ結果を表示できること", () => {
      withDeterministicShuffle(() => {
        render(<LessonRunner lesson={quizLesson} />);

        startQuiz();
        answerAllQuestions(3, quizLesson.words.length * 2);

        expect(screen.getByText("クイズ結果")).toBeVisible();
        expect(screen.getByRole("button", { name: "同じ範囲でもう一度" })).toBeVisible();
      });
    });

    test("間違えたものだけクイズで再挑戦できること", () => {
      withDeterministicShuffle(() => {
        render(<LessonRunner lesson={quizLesson} />);

        startQuiz();
        answerAllQuestions(0, quizLesson.words.length * 2);
        fireEvent.click(screen.getByRole("button", { name: "間違えたものだけもう一度 (4)" }));

        expect(screen.getByText("1 / 8")).toBeVisible();
        expect(quizOptions()).toHaveLength(4);
      });
    });

    test("結果画面から本番形式テストへ進めること", () => {
      withDeterministicShuffle(() => {
        render(<LessonRunner lesson={quizLesson} />);

        startQuiz();
        answerAllQuestions(3, quizLesson.words.length * 2);
        const playCountBeforeStartingTest = playAudio.mock.calls.length;
        fireEvent.click(screen.getByRole("button", { name: "本番形式テストへ進む" }));

        expect(screen.getByText("1 / 4")).toBeVisible();
        expect(screen.getByRole("button", { name: "答え合わせ" })).toBeVisible();
        expect(playAudio).toHaveBeenCalledTimes(playCountBeforeStartingTest + 1);
      });
    });
  });

  describe("答え合わせ画面", () => {
    test("判定を選ぶことで次の問題へ進めること", () => {
      render(<LessonRunner lesson={lesson} />);

      fireEvent.click(screen.getByRole("button", { name: /テスト/ }));
      fireEvent.click(screen.getByRole("button", { name: "スタート" }));

      answerCurrentQuestion({ hanziCorrect: true, pinyinCorrect: false });
      fireEvent.click(screen.getByRole("button", { name: "次へ" }));

      expect(screen.getByText("2 / 2")).toBeVisible();
      expect(screen.getByRole("button", { name: "答え合わせ" })).toBeVisible();
    });

    test("最終問題で結果を表示できること", () => {
      render(<LessonRunner lesson={lesson} />);

      fireEvent.click(screen.getByRole("button", { name: /テスト/ }));
      fireEvent.click(screen.getByRole("button", { name: "スタート" }));

      answerCurrentQuestion({ hanziCorrect: true, pinyinCorrect: false });
      fireEvent.click(screen.getByRole("button", { name: "次へ" }));
      answerCurrentQuestion({ hanziCorrect: true, pinyinCorrect: true });
      fireEvent.click(screen.getByRole("button", { name: "結果を見る" }));

      expect(screen.getByText("結果")).toBeVisible();
      expect(screen.getByRole("button", { name: "もう一度（同じ範囲）" })).toBeVisible();
    });
  });

  describe("結果画面", () => {
    test("同じ範囲で再テストできること", () => {
      render(<LessonRunner lesson={lesson} />);

      fireEvent.click(screen.getByRole("button", { name: /テスト/ }));
      fireEvent.click(screen.getByRole("button", { name: "スタート" }));

      answerCurrentQuestion({ hanziCorrect: true, pinyinCorrect: false });
      fireEvent.click(screen.getByRole("button", { name: "次へ" }));
      answerCurrentQuestion({ hanziCorrect: true, pinyinCorrect: true });
      fireEvent.click(screen.getByRole("button", { name: "結果を見る" }));

      fireEvent.click(screen.getByRole("button", { name: "もう一度（同じ範囲）" }));

      expect(screen.getByText("1 / 2")).toBeVisible();
      expect(screen.getByRole("button", { name: "答え合わせ" })).toBeVisible();
    });

    test("間違えたものだけで再テストできること", () => {
      render(<LessonRunner lesson={lesson} />);

      fireEvent.click(screen.getByRole("button", { name: /テスト/ }));
      fireEvent.click(screen.getByRole("button", { name: "スタート" }));

      answerCurrentQuestion({ hanziCorrect: true, pinyinCorrect: false });
      fireEvent.click(screen.getByRole("button", { name: "次へ" }));
      answerCurrentQuestion({ hanziCorrect: true, pinyinCorrect: true });
      fireEvent.click(screen.getByRole("button", { name: "結果を見る" }));

      fireEvent.click(screen.getByRole("button", { name: "間違えたものだけ復習 (1)" }));

      expect(screen.getByText("1 / 1")).toBeVisible();
      expect(screen.getByRole("button", { name: "答え合わせ" })).toBeVisible();
    });
  });
});
