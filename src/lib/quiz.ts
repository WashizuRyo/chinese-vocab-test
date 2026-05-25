import { number } from "@/data/lessons/number";
import { shuffle } from "@/lib/shuffle";
import type { Question, Quiz, Word } from "@/lib/types";

function createChoices({
  target,
  source,
  field,
}: {
  target: Word;
  source: Word[];
  field: "hanzi" | "pinyin";
}): string[] {
  const correct = target[field];
  const wrongChoices = source
    .map((word) => word[field])
    .filter((option) => option !== correct)
    .slice(0, 3);

  return [correct, ...wrongChoices];
}

function createQuestions({ words, source }: { words: Word[]; source: Word[] }): Question[] {
  if (words.length === 0) return [];

  return words.flatMap((word) => [
    {
      kind: "hanzi" as const,
      word,
      answer: word.hanzi,
      choices: shuffle(createChoices({ target: word, source, field: "hanzi" })),
    },
    {
      kind: "pinyin" as const,
      word,
      answer: word.pinyin,
      choices: shuffle(createChoices({ target: word, source, field: "pinyin" })),
    },
  ]);
}

export function createQuiz({
  lessonWords,
  numberWords,
}: {
  lessonWords: Word[];
  numberWords: Word[];
}): Quiz {
  return {
    questions: [
      ...createQuestions({ words: lessonWords, source: lessonWords }),
      ...createQuestions({ words: numberWords, source: number.words }),
    ],
  };
}
