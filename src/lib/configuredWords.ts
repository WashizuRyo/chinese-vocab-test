import { number } from "@/data/lessons/number";
import { shuffle } from "@/lib/shuffle";
import type { Word } from "@/lib/types";

const NUMBER_COUNT = 2;

export function createConfiguredWords({
  selectedWords,
  shuffleOn,
  numberQuestionsOn,
}: {
  selectedWords: Word[];
  shuffleOn: boolean;
  numberQuestionsOn: boolean;
}) {
  const orderedWords = shuffleOn ? shuffle(selectedWords) : selectedWords;
  const numberWords = numberQuestionsOn ? shuffle(number.words).slice(0, NUMBER_COUNT) : [];

  return {
    lessonWords: orderedWords,
    numberWords,
    words: [...orderedWords, ...numberWords],
  };
}
