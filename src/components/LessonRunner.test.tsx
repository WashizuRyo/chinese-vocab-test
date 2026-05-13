import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";
import { LessonRunner } from "@/components/LessonRunner";
import type { Lesson } from "@/lib/types";

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

const lesson: Lesson = {
  id: "transition-test",
  title: "状態遷移課",
  words: [
    { hanzi: "你", pinyin: "nǐ", japanese: "あなた" },
    { hanzi: "我", pinyin: "wǒ", japanese: "私" },
  ],
};

function completeLearning() {
  fireEvent.click(screen.getByRole("button", { name: /暗記する/ }));
  expect(screen.getByText("nǐ")).toBeVisible();
  expect(screen.getByText("あなた")).toBeVisible();

  fireEvent.click(screen.getByRole("button", { name: "次へ" }));
  expect(screen.getByText("wǒ")).toBeVisible();
  expect(screen.getByText("私")).toBeVisible();

  fireEvent.click(screen.getByRole("button", { name: "完了" }));
  expect(screen.getByText("暗記完了")).toBeVisible();
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

  describe("状態遷移", () => {
    describe("モード選択画面から", () => {
      test("暗記中画面へ遷移できること", () => {
        render(<LessonRunner lesson={lesson} />);

        fireEvent.click(screen.getByRole("button", { name: /暗記する/ }));

        expect(screen.getByText("nǐ")).toBeVisible();
        expect(screen.getByText("あなた")).toBeVisible();
      });

      test("テスト設定画面へ遷移できること", () => {
        render(<LessonRunner lesson={lesson} />);

        fireEvent.click(screen.getByRole("button", { name: /テストする/ }));

        expect(screen.getByText("出題設定")).toBeVisible();
      });
    });

    describe("暗記中画面から", () => {
      test("モード選択へ戻れること", () => {
        render(<LessonRunner lesson={lesson} />);

        fireEvent.click(screen.getByRole("button", { name: /暗記する/ }));
        fireEvent.click(screen.getByRole("button", { name: "← モード選択" }));

        expect(screen.getByText("覚えてから、テストで確認できます")).toBeVisible();
      });

      test("暗記完了画面へ遷移できること", () => {
        render(<LessonRunner lesson={lesson} />);

        fireEvent.click(screen.getByRole("button", { name: /暗記する/ }));
        fireEvent.click(screen.getByRole("button", { name: "次へ" }));
        fireEvent.click(screen.getByRole("button", { name: "完了" }));

        expect(screen.getByText("暗記完了")).toBeVisible();
      });
    });

    describe("暗記完了画面から", () => {
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
    });

    describe("テスト設定画面から", () => {
      test("モード選択へ戻れること", () => {
        render(<LessonRunner lesson={lesson} />);

        fireEvent.click(screen.getByRole("button", { name: /テストする/ }));
        expect(screen.getByText("出題設定")).toBeVisible();

        fireEvent.click(screen.getByRole("button", { name: "← モード選択" }));

        expect(screen.getByText("覚えてから、テストで確認できます")).toBeVisible();
      });

      test("テストを開始できること", () => {
        render(<LessonRunner lesson={lesson} />);

        fireEvent.click(screen.getByRole("button", { name: /テストする/ }));
        fireEvent.click(screen.getByRole("button", { name: "スタート" }));

        expect(screen.getByText("1 / 2")).toBeVisible();
        expect(screen.getByRole("button", { name: "答え合わせ" })).toBeVisible();
      });
    });

    describe("テスト画面から", () => {
      test("答え合わせ画面へ遷移できること", () => {
        render(<LessonRunner lesson={lesson} />);

        fireEvent.click(screen.getByRole("button", { name: /テストする/ }));
        fireEvent.click(screen.getByRole("button", { name: "スタート" }));
        fireEvent.click(screen.getByRole("button", { name: "答え合わせ" }));

        expect(screen.getByRole("button", { name: "次へ" })).toBeVisible();
      });
    });

    describe("答え合わせ画面から", () => {
      test("判定を選ぶことで次の問題へ進めること", () => {
        render(<LessonRunner lesson={lesson} />);

        fireEvent.click(screen.getByRole("button", { name: /テストする/ }));
        fireEvent.click(screen.getByRole("button", { name: "スタート" }));

        answerCurrentQuestion({ hanziCorrect: true, pinyinCorrect: false });
        fireEvent.click(screen.getByRole("button", { name: "次へ" }));

        expect(screen.getByText("2 / 2")).toBeVisible();
        expect(screen.getByRole("button", { name: "答え合わせ" })).toBeVisible();
      });

      test("最終問題で結果を表示できること", () => {
        render(<LessonRunner lesson={lesson} />);

        fireEvent.click(screen.getByRole("button", { name: /テストする/ }));
        fireEvent.click(screen.getByRole("button", { name: "スタート" }));

        answerCurrentQuestion({ hanziCorrect: true, pinyinCorrect: false });
        fireEvent.click(screen.getByRole("button", { name: "次へ" }));
        answerCurrentQuestion({ hanziCorrect: true, pinyinCorrect: true });
        fireEvent.click(screen.getByRole("button", { name: "結果を見る" }));

        expect(screen.getByText("結果")).toBeVisible();
        expect(screen.getByRole("button", { name: "もう一度（同じ範囲）" })).toBeVisible();
      });
    });

    describe("結果画面から", () => {
      test("同じ範囲で再テストできること", () => {
        render(<LessonRunner lesson={lesson} />);

        fireEvent.click(screen.getByRole("button", { name: /テストする/ }));
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

        fireEvent.click(screen.getByRole("button", { name: /テストする/ }));
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
});
