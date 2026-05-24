import type { Word } from "@/lib/types";

export function wordKey(word: Word): string {
  return `${word.hanzi}\u0000${word.pinyin}`;
}
