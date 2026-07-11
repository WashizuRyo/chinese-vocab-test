"use client";

import type { Word } from "@/lib/types";
import { wordKey } from "@/lib/word";

export function WordSelection({
  words,
  selectedWords,
  onChange,
}: {
  words: Word[];
  selectedWords: Word[];
  onChange: (selectedWords: Word[]) => void;
}) {
  const isSameWord = (a: Word, b: Word) => a.hanzi === b.hanzi && a.pinyin === b.pinyin;

  const handleToggleWord = (word: Word, checked: boolean) => {
    const nextWords = checked
      ? [...selectedWords, word]
      : selectedWords.filter((selectedWord) => !isSameWord(selectedWord, word));
    onChange(nextWords);
  };

  return (
    <section className="mt-6 rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-medium text-card-foreground">出題する単語</h2>
        <span className="text-sm font-semibold tabular-nums text-foreground">
          {selectedWords.length} / {words.length}
        </span>
      </div>
      <div className="mt-3 grid grid-cols-1 gap-2">
        {words.map((word) => (
          <label
            key={wordKey(word)}
            className="flex items-center justify-between gap-4 rounded-xl border border-border px-3 py-2"
          >
            <span className="min-w-0">
              <span lang="zh-CN" className="block text-base font-semibold text-foreground">
                {word.hanzi}
              </span>
              <span className="block truncate text-xs text-muted-foreground">
                {word.pinyin} / {word.japanese}
              </span>
            </span>
            <input
              type="checkbox"
              aria-label={word.hanzi}
              checked={selectedWords.some((selectedWord) => isSameWord(selectedWord, word))}
              onChange={(e) => handleToggleWord(word, e.target.checked)}
              className="h-5 w-5 shrink-0"
            />
          </label>
        ))}
      </div>
    </section>
  );
}
