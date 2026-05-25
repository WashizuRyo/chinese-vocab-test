import { number } from "@/data/lessons/number";
import { shuffle } from "@/lib/shuffle";
import type { Word } from "@/lib/types";

const NUMBER_COUNT = 2;

export function createConfiguredWords({
  selectedWords,
  shuffleOn,
  numberQuestionsOn,
  shuffleWords = shuffle,
}: {
  selectedWords: Word[];
  shuffleOn: boolean;
  numberQuestionsOn: boolean;
  shuffleWords?: (words: Word[]) => Word[];
}) {
  const orderedWords = shuffleOn ? shuffleWords(selectedWords) : selectedWords;
  const numberWords = numberQuestionsOn ? shuffleWords(number.words).slice(0, NUMBER_COUNT) : [];

  return {
    lessonWords: orderedWords,
    numberWords,
    words: [...orderedWords, ...numberWords],
  };
}
