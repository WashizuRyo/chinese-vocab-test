import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
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

const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);

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

function mockNextOcrResult({
  hanziCorrect,
  pinyinCorrect,
}: {
  hanziCorrect: boolean;
  pinyinCorrect: boolean;
}) {
  fetchMock.mockResolvedValueOnce(
    new Response(
      JSON.stringify({
        ok: true,
        provider: "google-vision",
        feature: "DOCUMENT_TEXT_DETECTION",
        hanzi: {
          rawText: hanziCorrect ? "你" : "不",
          normalizedText: hanziCorrect ? "你" : "不",
          expectedText: "你",
          correct: hanziCorrect,
        },
        pinyin: {
          rawText: pinyinCorrect ? "nǐ" : "ni",
          normalizedText: pinyinCorrect ? "nǐ" : "ni",
          expectedText: "nǐ",
          correct: pinyinCorrect,
        },
      }),
      { status: 200 },
    ),
  );
}

async function answerCurrentQuestion({
  hanziCorrect,
  pinyinCorrect,
}: {
  hanziCorrect: boolean;
  pinyinCorrect: boolean;
}) {
  mockNextOcrResult({ hanziCorrect, pinyinCorrect });
  fireEvent.click(screen.getByRole("button", { name: "答え合わせ" }));

  await waitFor(() => {
    expect(screen.queryByText("OCR解析中...")).not.toBeInTheDocument();
  });
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
      test("答え合わせ画面へ遷移できること", async () => {
        render(<LessonRunner lesson={lesson} />);

        fireEvent.click(screen.getByRole("button", { name: /テストする/ }));
        fireEvent.click(screen.getByRole("button", { name: "スタート" }));
        mockNextOcrResult({ hanziCorrect: true, pinyinCorrect: true });
        fireEvent.click(screen.getByRole("button", { name: "答え合わせ" }));

        expect(screen.getByText("OCR解析中...")).toBeVisible();
        await waitFor(() => {
          expect(screen.getByRole("button", { name: "次へ" })).toBeEnabled();
        });
        expect(screen.getAllByText("OCR結果")).toHaveLength(2);
      });
    });

    describe("答え合わせ画面から", () => {
      test("OCR判定後に次の問題へ進めること", async () => {
        render(<LessonRunner lesson={lesson} />);

        fireEvent.click(screen.getByRole("button", { name: /テストする/ }));
        fireEvent.click(screen.getByRole("button", { name: "スタート" }));

        await answerCurrentQuestion({ hanziCorrect: true, pinyinCorrect: false });
        fireEvent.click(screen.getByRole("button", { name: "次へ" }));

        expect(screen.getByText("2 / 2")).toBeVisible();
        expect(screen.getByRole("button", { name: "答え合わせ" })).toBeVisible();
      });

      test("最終問題で結果を表示できること", async () => {
        render(<LessonRunner lesson={lesson} />);

        fireEvent.click(screen.getByRole("button", { name: /テストする/ }));
        fireEvent.click(screen.getByRole("button", { name: "スタート" }));

        await answerCurrentQuestion({ hanziCorrect: true, pinyinCorrect: false });
        fireEvent.click(screen.getByRole("button", { name: "次へ" }));
        await answerCurrentQuestion({ hanziCorrect: true, pinyinCorrect: true });
        fireEvent.click(screen.getByRole("button", { name: "結果を見る" }));

        expect(screen.getByText("結果")).toBeVisible();
        expect(screen.getByRole("button", { name: "もう一度（同じ範囲）" })).toBeVisible();
      });
    });

    describe("結果画面から", () => {
      test("同じ範囲で再テストできること", async () => {
        render(<LessonRunner lesson={lesson} />);

        fireEvent.click(screen.getByRole("button", { name: /テストする/ }));
        fireEvent.click(screen.getByRole("button", { name: "スタート" }));

        await answerCurrentQuestion({ hanziCorrect: true, pinyinCorrect: false });
        fireEvent.click(screen.getByRole("button", { name: "次へ" }));
        await answerCurrentQuestion({ hanziCorrect: true, pinyinCorrect: true });
        fireEvent.click(screen.getByRole("button", { name: "結果を見る" }));

        fireEvent.click(screen.getByRole("button", { name: "もう一度（同じ範囲）" }));

        expect(screen.getByText("1 / 2")).toBeVisible();
        expect(screen.getByRole("button", { name: "答え合わせ" })).toBeVisible();
      });

      test("間違えたものだけで再テストできること", async () => {
        render(<LessonRunner lesson={lesson} />);

        fireEvent.click(screen.getByRole("button", { name: /テストする/ }));
        fireEvent.click(screen.getByRole("button", { name: "スタート" }));

        await answerCurrentQuestion({ hanziCorrect: true, pinyinCorrect: false });
        fireEvent.click(screen.getByRole("button", { name: "次へ" }));
        await answerCurrentQuestion({ hanziCorrect: true, pinyinCorrect: true });
        fireEvent.click(screen.getByRole("button", { name: "結果を見る" }));

        fireEvent.click(screen.getByRole("button", { name: "間違えたものだけ復習 (1)" }));

        expect(screen.getByText("1 / 1")).toBeVisible();
        expect(screen.getByRole("button", { name: "答え合わせ" })).toBeVisible();
      });
    });
  });
});
