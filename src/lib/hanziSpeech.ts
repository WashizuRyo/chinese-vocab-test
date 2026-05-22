export interface HanziSpeech {
  speak(hanzi: string): void;
  stop(): void;
}

export function createHanziSpeech(): HanziSpeech {
  return {
    speak(hanzi) {
      if (!isSpeechSupported()) return;

      globalThis.speechSynthesis.cancel();
      const utterance = new globalThis.SpeechSynthesisUtterance(hanzi);
      utterance.lang = "zh-CN";
      utterance.rate = 0.85;
      globalThis.speechSynthesis.speak(utterance);
    },
    stop() {
      if (!isSpeechSupported()) return;

      globalThis.speechSynthesis.cancel();
    },
  };
}

function isSpeechSupported(): boolean {
  return (
    typeof globalThis.speechSynthesis !== "undefined" &&
    typeof globalThis.SpeechSynthesisUtterance !== "undefined"
  );
}
