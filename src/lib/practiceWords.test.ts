import { describe, expect, test, vi } from "vitest";
import { number } from "@/data/lessons/number";
import { selectPracticeWords } from "@/lib/practiceWords";
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

describe("selectPracticeWords", () => {
  test("選択されたVocabulary wordだけを返すこと", () => {
    const selection = selectPracticeWords({
      selectedWords: [ni, shi],
      shuffleOn: false,
      numberQuestionsOn: false,
    });

    expect(selection.words).toEqual([ni, shi]);
  });

  test("shuffleOnがtrueなら選択されたVocabulary wordsを並び替えること", () => {
    const randomSpy = vi.spyOn(Math, "random").mockReturnValue(0);
    try {
      const selection = selectPracticeWords({
        selectedWords: words,
        shuffleOn: true,
        numberQuestionsOn: false,
      });

      expect(selection.words).toEqual([wo, shi, ni]);
    } finally {
      randomSpy.mockRestore();
    }
  });

  test("numberQuestionsOnがtrueなら数字のVocabulary wordsを2件追加すること", () => {
    const selection = selectPracticeWords({
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
    const selection = selectPracticeWords({
      selectedWords: [wo],
      shuffleOn: false,
      numberQuestionsOn: true,
    });

    expect(selection.lessonWords).toEqual([wo]);
    expect(selection.numberWords).toHaveLength(2);
    expect(selection.words).toEqual([wo, ...selection.numberWords]);
  });
});
