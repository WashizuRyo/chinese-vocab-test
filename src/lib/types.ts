export interface Word {
  hanzi: string;
  pinyin: string;
  japanese: string;
  audioSrc: string;
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

export type QuestionKind = "hanzi" | "pinyin";

export interface Question {
  kind: QuestionKind;
  word: Word;
  answer: string;
  choices: string[];
}

export interface Quiz {
  questions: Question[];
}

export interface QuizResult {
  question: Question;
  selectedAnswer: string;
  correct: boolean;
}
