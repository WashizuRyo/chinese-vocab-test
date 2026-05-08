export type Word = {
  hanzi: string;
  pinyin: string;
  japanese: string;
};

export type Lesson = {
  id: string;
  title: string;
  words: Word[];
};

export type WordResult = {
  word: Word;
  hanziCorrect: boolean | null;
  pinyinCorrect: boolean | null;
};
