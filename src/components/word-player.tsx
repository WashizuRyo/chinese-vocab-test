"use client";

import type { Word } from "@/lib/types";
import { wordAudio } from "@/lib/word-audio";

interface Props {
  word: Word;
}

export function WordPlayer({ word }: Props) {
  const handleReplay = () => {
    wordAudio.play(word);
  };

  return (
    <div className="flex flex-col items-center">
      <button
        type="button"
        onClick={handleReplay}
        className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-900 text-white shadow-sm transition-transform active:scale-95 dark:bg-zinc-100 dark:text-zinc-950"
        aria-label="発音を再生"
      >
        <PlayIcon />
      </button>
    </div>
  );
}

function PlayIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}
