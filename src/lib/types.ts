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

export interface OcrFieldResult {
  rawText: string;
  normalizedText: string;
  expectedText: string;
  correct: boolean;
}

export type OcrGradeState =
  | { status: "loading" }
  | {
      status: "success";
      hanzi: OcrFieldResult;
      pinyin: OcrFieldResult;
    }
  | {
      status: "error";
      message: string;
    };
