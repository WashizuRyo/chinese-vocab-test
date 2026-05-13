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
