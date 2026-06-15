import { buildPinyinToneChoices } from "@/lib/pinyin-choices";
import { shuffle } from "@/lib/shuffle";
import type { Question, Quiz, Word } from "@/lib/types";

function createHanziChoices({ target, source }: { target: Word; source: Word[] }): string[] {
  const correct = target.hanzi;
  const wrongChoices = shuffle(
    source.map((word) => word.hanzi).filter((option) => option !== correct),
  ).slice(0, 3);

  return [correct, ...wrongChoices];
}

function createPinyinChoices({ target, source }: { target: Word; source: Word[] }): string[] {
  const fallbackPinyins = source
    .map((word) => word.pinyin)
    .filter((option) => option !== target.pinyin);

  return buildPinyinToneChoices(target.pinyin, fallbackPinyins);
}

function createQuestions({ words, source }: { words: Word[]; source: Word[] }): Question[] {
  if (words.length === 0) return [];

  return words.flatMap((word) => [
    {
      kind: "hanzi" as const,
      word,
      answer: word.hanzi,
      choices: shuffle(createHanziChoices({ target: word, source })),
    },
    {
      kind: "pinyin" as const,
      word,
      answer: word.pinyin,
      choices: shuffle(createPinyinChoices({ target: word, source })),
    },
  ]);
}

export function createQuiz({
  lessonWords,
  lessonChoiceSourceWords,
  numberWords,
  numberChoiceSourceWords,
}: {
  lessonWords: Word[];
  lessonChoiceSourceWords: Word[];
  numberWords: Word[];
  numberChoiceSourceWords: Word[];
}): Quiz {
  return {
    questions: [
      ...createQuestions({ words: lessonWords, source: lessonChoiceSourceWords }),
      ...createQuestions({ words: numberWords, source: numberChoiceSourceWords }),
    ],
  };
}
