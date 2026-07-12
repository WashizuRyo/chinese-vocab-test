import { afterEach, describe, expect, test, vi } from "vitest";
import {
  createDefaultLessonSettings,
  loadQuizSettings,
  loadTestSettings,
  saveQuizSettings,
  saveTestSettings,
} from "@/lib/lesson-settings";
import type { Lesson, Word } from "@/lib/types";

const ni: Word = {
  hanzi: "你",
  pinyin: "nǐ",
  japanese: "あなた",
  audioSrc: "/audio/words/你-nǐ.mp3",
};
const wo: Word = {
  hanzi: "我",
  pinyin: "wǒ",
  japanese: "私",
  audioSrc: "/audio/words/我-wǒ.mp3",
};
const lesson: Lesson = {
  id: "lesson-settings-test",
  title: "設定テスト課",
  words: [ni, wo],
};

describe("loadQuizSettings, loadTestSettings", () => {
  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  describe("共通処理", () => {
    test("保存データがなければ初期設定を返すこと", () => {
      expect(loadQuizSettings(lesson)).toEqual(createDefaultLessonSettings(lesson));
    });

    test("保存された出題設定を復元できること", () => {
      const settings = {
        shuffleOn: true,
        numberQuestionsOn: true,
        selectedWords: [wo],
      };

      saveQuizSettings(lesson, settings);

      expect(loadQuizSettings(lesson)).toEqual(settings);
    });

    test("不正な保存データなら初期設定を返すこと", () => {
      vi.spyOn(window.localStorage, "getItem").mockReturnValue("{invalid json");

      expect(loadQuizSettings(lesson)).toEqual(createDefaultLessonSettings(lesson));
    });

    test("古い保存データなら初期設定を返すこと", () => {
      vi.spyOn(window.localStorage, "getItem").mockReturnValue(
        JSON.stringify({
          version: 0,
          lessonWordKeys: [],
          selectedWordKeys: [],
          shuffleOn: true,
          numberQuestionsOn: true,
        }),
      );

      expect(loadQuizSettings(lesson)).toEqual(createDefaultLessonSettings(lesson));
    });

    test("課の単語構成が異なれば初期設定を返すこと", () => {
      saveQuizSettings(lesson, {
        shuffleOn: true,
        numberQuestionsOn: true,
        selectedWords: [wo],
      });
      const changedLesson: Lesson = {
        ...lesson,
        words: [ni],
      };

      expect(loadQuizSettings(changedLesson)).toEqual(createDefaultLessonSettings(changedLesson));
    });
  });

  describe("課・モード別の保存", () => {
    test("課ごとに設定を別々に保存できること", () => {
      const anotherLesson: Lesson = {
        ...lesson,
        id: "another-lesson-settings-test",
        title: "別の設定テスト課",
      };
      const lessonSettings = {
        shuffleOn: true,
        numberQuestionsOn: false,
        selectedWords: [ni],
      };
      const anotherLessonSettings = {
        shuffleOn: false,
        numberQuestionsOn: true,
        selectedWords: [wo],
      };

      saveQuizSettings(lesson, lessonSettings);
      saveQuizSettings(anotherLesson, anotherLessonSettings);

      expect(loadQuizSettings(lesson)).toEqual(lessonSettings);
      expect(loadQuizSettings(anotherLesson)).toEqual(anotherLessonSettings);
    });

    test("モードごとに設定を別々に保存できること", () => {
      const quizSettings = {
        shuffleOn: true,
        numberQuestionsOn: false,
        selectedWords: [ni],
      };
      const testSettings = {
        shuffleOn: false,
        numberQuestionsOn: true,
        selectedWords: [wo],
      };

      saveQuizSettings(lesson, quizSettings);
      saveTestSettings(lesson, testSettings);

      expect(loadQuizSettings(lesson)).toEqual(quizSettings);
      expect(loadTestSettings(lesson)).toEqual(testSettings);
    });
  });
});
