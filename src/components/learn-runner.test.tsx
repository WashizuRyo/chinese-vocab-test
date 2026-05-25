import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";
import { LearnRunner } from "@/components/learn-runner";
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

const playAudio = vi.fn();

class AudioMock {
  play = playAudio;
  pause = vi.fn();
}

vi.stubGlobal("Audio", AudioMock);

const lesson: Lesson = {
  id: "learning-test",
  title: "暗記課",
  words: [
    { hanzi: "你", pinyin: "nǐ", japanese: "あなた", audioSrc: "/audio/words/你-nǐ.mp3" },
    { hanzi: "我", pinyin: "wǒ", japanese: "私", audioSrc: "/audio/words/我-wǒ.mp3" },
  ],
};

describe("LearnRunner", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  test("暗記中に次へ進むと次の単語を表示して中国語音声素材を再生すること", () => {
    render(
      <LearnRunner
        lesson={lesson}
        onBackToMode={vi.fn()}
        onStartQuiz={vi.fn()}
        onStartTest={vi.fn()}
      />,
    );

    expect(screen.getByText("nǐ")).toBeVisible();
    expect(screen.getByText("あなた")).toBeVisible();
    expect(playAudio).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "次へ" }));

    expect(screen.getByText("wǒ")).toBeVisible();
    expect(screen.getByText("私")).toBeVisible();
    expect(playAudio).toHaveBeenCalledOnce();
  });

  test("暗記中に前へ戻ると前の単語を表示して中国語音声素材を再生すること", () => {
    render(
      <LearnRunner
        lesson={lesson}
        onBackToMode={vi.fn()}
        onStartQuiz={vi.fn()}
        onStartTest={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "次へ" }));
    const playCountBeforeGoingBack = playAudio.mock.calls.length;

    fireEvent.click(screen.getByRole("button", { name: "前へ" }));

    expect(screen.getByText("nǐ")).toBeVisible();
    expect(screen.getByText("あなた")).toBeVisible();
    expect(playAudio).toHaveBeenCalledTimes(playCountBeforeGoingBack + 1);
  });

  test("暗記完了後にもう一周すると最初の単語を表示して中国語音声素材を再生すること", () => {
    render(
      <LearnRunner
        lesson={lesson}
        onBackToMode={vi.fn()}
        onStartQuiz={vi.fn()}
        onStartTest={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "次へ" }));
    fireEvent.click(screen.getByRole("button", { name: "完了" }));
    expect(screen.getByText("暗記完了")).toBeVisible();
    const playCountBeforeRestarting = playAudio.mock.calls.length;

    fireEvent.click(screen.getByRole("button", { name: "もう一周する" }));

    expect(screen.getByText("nǐ")).toBeVisible();
    expect(screen.getByText("あなた")).toBeVisible();
    expect(playAudio).toHaveBeenCalledTimes(playCountBeforeRestarting + 1);
  });
});
