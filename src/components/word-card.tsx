import type { ReactNode } from "react";
import { WordPlayer } from "@/components/word-player";
import type { Word } from "@/lib/types";

interface Props {
  word: Word;
  footer?: ReactNode;
}

function getHanziClassName(hanzi: string): string {
  const length = Array.from(hanzi).length;
  if (length <= 2) return "text-5xl";
  if (length <= 4) return "text-4xl";
  return "text-3xl";
}

function RubyHanzi({ word }: { word: Word }) {
  const chars = Array.from(word.hanzi);
  const pinyinParts = word.pinyin.trim().split(/\s+/).filter(Boolean);
  const hanziClassName = getHanziClassName(word.hanzi);
  const rubyParts = chars.map((char, index) => ({
    char,
    key: `${chars.slice(0, index + 1).join("")}-${pinyinParts[index] ?? ""}`,
    pinyin: pinyinParts[index],
  }));

  if (pinyinParts.length === chars.length) {
    return (
      <div className="flex min-w-0 flex-wrap items-end gap-x-1 gap-y-2">
        {rubyParts.map((part) => (
          <span key={part.key} className="flex flex-col items-center">
            <span className="text-sm leading-relaxed text-muted-foreground">{part.pinyin}</span>
            <span
              lang="zh-CN"
              className={`font-serif ${hanziClassName} leading-tight text-foreground`}
            >
              {part.char}
            </span>
          </span>
        ))}
      </div>
    );
  }

  return (
    <div className="min-w-0">
      <div className="break-words text-sm leading-relaxed text-muted-foreground">{word.pinyin}</div>
      <div
        lang="zh-CN"
        className={`break-words font-serif ${hanziClassName} leading-tight text-foreground`}
      >
        {word.hanzi}
      </div>
    </div>
  );
}

export function WordCard({ word, footer }: Props) {
  return (
    <article
      aria-label={`${word.hanzi}の単語カード`}
      className="rounded-2xl border border-border bg-card px-4 py-5 shadow-sm"
    >
      <div className="flex items-end justify-between gap-4">
        <RubyHanzi word={word} />
        <WordPlayer word={word} />
      </div>
      <div className="mt-4 h-px bg-border" />
      <div className="mt-4 break-words text-base leading-relaxed text-card-foreground">
        {word.japanese}
      </div>
      {footer ? (
        <>
          <div className="mt-4 h-px bg-border" />
          <div className="mt-3">{footer}</div>
        </>
      ) : null}
    </article>
  );
}
