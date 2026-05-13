"use client";

import { useEffect, useRef, useState } from "react";
import { speakChinese } from "@/lib/speech";

interface Props {
  text: string;
  autoPlayOnChange: boolean;
}

export function WordPlayer({ text, autoPlayOnChange }: Props) {
  const [speaking, setSpeaking] = useState(false);
  const lastTextRef = useRef<string | null>(null);

  useEffect(() => {
    if (!autoPlayOnChange) return;
    if (lastTextRef.current === text) return;
    lastTextRef.current = text;
    setSpeaking(true);
    void speakChinese(text).finally(() => setSpeaking(false));
  }, [text, autoPlayOnChange]);

  const handleReplay = () => {
    setSpeaking(true);
    void speakChinese(text).finally(() => setSpeaking(false));
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        type="button"
        onClick={handleReplay}
        className="flex h-24 w-24 items-center justify-center rounded-full bg-zinc-900 text-white shadow-md active:scale-95 transition-transform"
        aria-label="発音を再生"
      >
        {speaking ? <SpeakerWaveIcon /> : <PlayIcon />}
      </button>
      <span className="text-xs text-zinc-500">タップでもう一度再生</span>
    </div>
  );
}

function PlayIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className="h-10 w-10"
      aria-hidden="true"
    >
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

function SpeakerWaveIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className="h-10 w-10 animate-pulse"
      aria-hidden="true"
    >
      <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3a4.5 4.5 0 0 0-2.5-4.03v8.06A4.5 4.5 0 0 0 16.5 12zM14 3.23v2.06a7 7 0 0 1 0 13.42v2.06A9 9 0 0 0 14 3.23z" />
    </svg>
  );
}
