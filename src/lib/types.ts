export interface Word {
  hanzi: string;
  pinyin: string;
  japanese: string;
}

export interface Lesson {
  id: string;
  title: string;
  words: Word[];
}

export interface WordResult {
  word: Word;
  hanziCorrect: boolean;
  pinyinCorrect: boolean;
}

export type ChoiceQuestionKind = "hanzi" | "pinyin";

export interface ChoiceQuestion {
  kind: ChoiceQuestionKind;
  word: Word;
  answer: string;
  choices: string[];
}

export interface ChoiceResult {
  question: ChoiceQuestion;
  selectedChoice: string;
  correct: boolean;
}
