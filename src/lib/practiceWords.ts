import { number } from "@/data/lessons/number";
import { shuffle } from "@/lib/shuffle";
import type { Word } from "@/lib/types";

const NUMBER_QUESTION_COUNT = 2;

export interface PracticeWordSelectionSettings {
  selectedWords: Word[];
  shuffleOn: boolean;
  numberQuestionsOn: boolean;
}

export interface PracticeWordSelection {
  lessonWords: Word[];
  numberWords: Word[];
  words: Word[];
}

export function selectPracticeWords({
  selectedWords,
  shuffleOn,
  numberQuestionsOn,
}: PracticeWordSelectionSettings): PracticeWordSelection {
  const orderedWords = shuffleOn ? shuffle(selectedWords) : selectedWords;
  const numberWords = numberQuestionsOn
    ? shuffle(number.words).slice(0, NUMBER_QUESTION_COUNT)
    : [];

  return {
    lessonWords: orderedWords,
    numberWords,
    words: [...orderedWords, ...numberWords],
  };
}
