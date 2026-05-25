import { describe, expect, test } from "vitest";
import { number } from "@/data/lessons/number";
import { createConfiguredWords } from "@/lib/create-configured-words";
import type { Word } from "@/lib/types";

const ni: Word = {
  hanzi: "你",
  pinyin: "nǐ",
  japanese: "あなた",
  audioSrc: "/audio/words/你-nǐ.mp3",
};
const wo: Word = { hanzi: "我", pinyin: "wǒ", japanese: "私", audioSrc: "/audio/words/我-wǒ.mp3" };
const shi: Word = {
  hanzi: "是",
  pinyin: "shì",
  japanese: "〜です",
  audioSrc: "/audio/words/是-shì.mp3",
};
const words: Word[] = [ni, wo, shi];

describe("createConfiguredWords", () => {
  test("選択された単語だけを返すこと", () => {
    const selection = createConfiguredWords({
      selectedWords: [ni, shi],
      shuffleOn: false,
      numberQuestionsOn: false,
    });

    expect(selection.words).toEqual([ni, shi]);
  });

  test("シャッフル設定がオンなら選択された単語を並び替えること", () => {
    const selection = createConfiguredWords({
      selectedWords: words,
      shuffleOn: true,
      numberQuestionsOn: false,
      shuffleWords: () => [wo, shi, ni],
    });

    expect(selection.words).toEqual([wo, shi, ni]);
  });

  test("数字追加設定がオンなら数字の単語を2件追加すること", () => {
    const selection = createConfiguredWords({
      selectedWords: [ni],
      shuffleOn: false,
      numberQuestionsOn: true,
    });

    expect(selection.words).toHaveLength(3);
    expect(selection.words[0]).toBe(ni);
    for (const word of selection.words.slice(1)) {
      expect(number.words).toContain(word);
    }
  });

  test("lessonWordsとnumberWordsを分けて返すこと", () => {
    const selection = createConfiguredWords({
      selectedWords: [wo],
      shuffleOn: false,
      numberQuestionsOn: true,
    });

    expect(selection.lessonWords).toEqual([wo]);
    expect(selection.numberWords).toHaveLength(2);
    expect(selection.words).toEqual([wo, ...selection.numberWords]);
  });
});
