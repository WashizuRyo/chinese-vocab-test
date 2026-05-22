import { afterEach, describe, expect, test, vi } from "vitest";
import { createHanziSpeech } from "@/lib/hanziSpeech";

class SpeechSynthesisUtteranceMock {
  lang = "";
  rate = 1;
  text: string;

  constructor(text: string) {
    this.text = text;
  }
}

function stubSpeechPlayback() {
  const cancel = vi.fn();
  const spokenUtterances: SpeechSynthesisUtteranceMock[] = [];
  const speak = vi.fn((utterance: SpeechSynthesisUtteranceMock) => {
    spokenUtterances.push(utterance);
  });
  vi.stubGlobal("SpeechSynthesisUtterance", SpeechSynthesisUtteranceMock);
  vi.stubGlobal("speechSynthesis", { cancel, speak });

  return { cancel, speak, spokenUtterances };
}

describe("HanziSpeech", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test("漢字を再生する前に再生中の音声を止める", () => {
    const { cancel } = stubSpeechPlayback();

    createHanziSpeech().speak("你");

    expect(cancel).toHaveBeenCalledOnce();
  });

  test("漢字を中国語音声として再生する", () => {
    const { speak, spokenUtterances } = stubSpeechPlayback();

    createHanziSpeech().speak("你");

    expect(speak).toHaveBeenCalledOnce();

    const utterance = spokenUtterances[0];
    if (!utterance) throw new Error("読み上げ内容が渡されていません");

    expect(utterance.text).toBe("你");
    expect(utterance.lang).toBe("zh-CN");
    expect(utterance.rate).toBe(0.85);
  });

  test("音声再生が使えない環境では何もしない", () => {
    vi.stubGlobal("SpeechSynthesisUtterance", undefined);
    vi.stubGlobal("speechSynthesis", undefined);

    expect(() => createHanziSpeech().speak("你")).not.toThrow();
    expect(() => createHanziSpeech().stop()).not.toThrow();
  });
});
