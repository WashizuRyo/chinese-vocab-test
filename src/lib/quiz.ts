import { number } from "@/data/lessons/number";
import type { Question, Quiz, Word } from "@/lib/types";

export function shuffle<T>(items: T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const current = out[i];
    const swap = out[j];
    if (current === undefined || swap === undefined) continue;
    out[i] = swap;
    out[j] = current;
  }
  return out;
}

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
  settings,
}: {
  lessonWords: Word[];
  numberWords: Word[];
  settings: {
    wordCount: number;
    shuffleOn: boolean;
  };
}): Quiz {
  const lessonTargets = (settings.shuffleOn ? shuffle(lessonWords) : lessonWords).slice(
    0,
    settings.wordCount,
  );

  return {
    questions: [
      ...createQuestions({ words: lessonTargets, source: lessonWords }),
      ...createQuestions({ words: numberWords, source: number.words }),
    ],
  };
}
