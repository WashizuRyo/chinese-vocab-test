"use client";

import type { Word } from "@/lib/types";
import { wordKey } from "@/lib/word";

export function WordSelection({
  words,
  selectedWordKeys,
  onChange,
}: {
  words: Word[];
  selectedWordKeys: string[];
  onChange: (selectedWordKeys: string[]) => void;
}) {
  const selectedWordKeySet = new Set(selectedWordKeys);

  const handleToggleWord = (word: Word, checked: boolean) => {
    const key = wordKey(word);
    const nextKeys = checked
      ? [...selectedWordKeys, key]
      : selectedWordKeys.filter((selectedKey) => selectedKey !== key);
    onChange(nextKeys);
  };

  return (
    <section className="mt-6 rounded-2xl border border-zinc-200 bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-medium text-zinc-700">出題する単語</h2>
        <span className="text-sm font-semibold tabular-nums text-zinc-900">
          {selectedWordKeys.length} / {words.length}
        </span>
      </div>
      <div className="mt-3 grid grid-cols-1 gap-2">
        {words.map((word) => (
          <label
            key={wordKey(word)}
            className="flex items-center justify-between gap-4 rounded-xl border border-zinc-200 px-3 py-2"
          >
            <span className="min-w-0">
              <span className="block text-base font-semibold text-zinc-900">{word.hanzi}</span>
              <span className="block truncate text-xs text-zinc-500">
                {word.pinyin} / {word.japanese}
              </span>
            </span>
            <input
              type="checkbox"
              aria-label={word.hanzi}
              checked={selectedWordKeySet.has(wordKey(word))}
              onChange={(e) => handleToggleWord(word, e.target.checked)}
              className="h-5 w-5 shrink-0"
            />
          </label>
        ))}
      </div>
    </section>
  );
}
