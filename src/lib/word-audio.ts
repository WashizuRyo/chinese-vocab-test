import type { Word } from "@/lib/types";

export interface WordAudio {
  play(word: Word): void;
  stop(): void;
}

export function createWordAudio(): WordAudio {
  let currentAudio: HTMLAudioElement | null = null;

  return {
    play(word) {
      currentAudio?.pause();
      if (currentAudio) currentAudio.currentTime = 0;

      currentAudio = new Audio(word.audioSrc);
      currentAudio.play();
    },
    stop() {
      currentAudio?.pause();
      if (currentAudio) currentAudio.currentTime = 0;
      currentAudio = null;
    },
  };
}

export const wordAudio = createWordAudio();
