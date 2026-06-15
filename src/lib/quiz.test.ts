import { describe, expect, test, vi } from "vitest";
import { number } from "@/data/lessons/number";
import { createQuiz } from "@/lib/quiz";
import type { Word } from "@/lib/types";

const words: Word[] = [
  { hanzi: "你", pinyin: "nǐ", japanese: "あなた", audioSrc: "/audio/words/你-nǐ.mp3" },
  { hanzi: "我", pinyin: "wǒ", japanese: "私", audioSrc: "/audio/words/我-wǒ.mp3" },
  { hanzi: "是", pinyin: "shì", japanese: "〜です", audioSrc: "/audio/words/是-shì.mp3" },
  { hanzi: "吗", pinyin: "ma", japanese: "か", audioSrc: "/audio/words/吗-ma.mp3" },
];

describe("quiz", () => {
  test("課の単語ごとに漢字問題とピンイン問題を作ること", () => {
    const generatedQuiz = createQuiz({
      lessonWords: words,
      lessonChoiceSourceWords: words,
      numberWords: [],
      numberChoiceSourceWords: number.words,
    });

    expect(generatedQuiz.questions).toHaveLength(8);
    expect(generatedQuiz.questions).toContainEqual(
      expect.objectContaining({
        kind: "hanzi",
        word: words[0],
        answer: "你",
        choices: expect.arrayContaining(["你", "我", "是", "吗"]),
      }),
    );
    expect(generatedQuiz.questions).toContainEqual(
      expect.objectContaining({
        kind: "pinyin",
        word: words[0],
        answer: "nǐ",
        choices: expect.arrayContaining(["nǐ", "nī", "ní", "nì"]),
      }),
    );
  });

  test("数字単語を渡すと課の単語のあとに数字問題を追加すること", () => {
    const generatedQuiz = createQuiz({
      lessonWords: words.slice(0, 1),
      lessonChoiceSourceWords: words,
      numberWords: number.words.slice(0, 2),
      numberChoiceSourceWords: number.words,
    });

    expect(generatedQuiz.questions).toHaveLength(6);
    expect(generatedQuiz.questions.filter((question) => question.word.hanzi === "你")).toHaveLength(
      2,
    );
    expect(
      generatedQuiz.questions.filter((question) => /^\d+$/.test(question.word.japanese)),
    ).toHaveLength(4);
  });

  test("漢字問題の誤答候補を課の先頭3語に固定しないこと", () => {
    const randomSpy = vi.spyOn(Math, "random").mockReturnValue(0);
    const sourceWords: Word[] = [
      ...words,
      { hanzi: "好", pinyin: "hǎo", japanese: "よい", audioSrc: "/audio/words/好-hǎo.mp3" },
    ];

    try {
      const generatedQuiz = createQuiz({
        lessonWords: words.slice(0, 1),
        lessonChoiceSourceWords: sourceWords,
        numberWords: [],
        numberChoiceSourceWords: number.words,
      });

      const hanziQuestion = generatedQuiz.questions.find((question) => question.kind === "hanzi");

      expect(hanziQuestion?.choices).toContain("好");
    } finally {
      randomSpy.mockRestore();
    }
  });
});
