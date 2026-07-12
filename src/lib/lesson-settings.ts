import * as v from "valibot";
import type { Lesson, Word } from "@/lib/types";
import { wordKey } from "@/lib/word";

export interface LessonSettings {
  shuffleOn: boolean;
  numberQuestionsOn: boolean;
  selectedWords: Word[];
}

type SettingsMode = "quiz" | "test";

const STORAGE_PREFIX = "chinese-vocab-test:lesson-settings";
const STORAGE_VERSION = 1;

const storedLessonSettingsSchema = v.pipe(
  v.string(),
  v.parseJson(),
  v.object({
    version: v.literal(STORAGE_VERSION),
    lessonWordKeys: v.array(v.string()),
    selectedWordKeys: v.array(v.string()),
    shuffleOn: v.boolean(),
    numberQuestionsOn: v.boolean(),
  }),
);

type StoredLessonSettings = v.InferOutput<typeof storedLessonSettingsSchema>;

export function createDefaultLessonSettings(lesson: Lesson): LessonSettings {
  return {
    shuffleOn: false,
    numberQuestionsOn: false,
    selectedWords: lesson.words,
  };
}

function storageKey(lessonId: string, mode: SettingsMode): string {
  return `${STORAGE_PREFIX}:${lessonId}:${mode}`;
}

function getLocalStorage(): Storage | null {
  if (typeof window === "undefined") return null;

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function arraysEqual(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

function parseStoredSettings(value: string): StoredLessonSettings | null {
  const result = v.safeParse(storedLessonSettingsSchema, value);
  return result.success ? result.output : null;
}

function loadSettings(lesson: Lesson, mode: SettingsMode): LessonSettings {
  const defaultSettings = createDefaultLessonSettings(lesson);
  const storage = getLocalStorage();
  if (storage === null) return defaultSettings;

  const key = storageKey(lesson.id, mode);
  const storedValue = storage.getItem(key);
  if (storedValue === null) return defaultSettings;

  const stored = parseStoredSettings(storedValue);
  if (stored === null) return defaultSettings;

  const lessonWordKeys = lesson.words.map(wordKey);
  const lessonWordsByKey = new Map(lesson.words.map((word) => [wordKey(word), word]));
  const selectedWordKeySet = new Set(stored.selectedWordKeys);
  const isValid =
    arraysEqual(stored.lessonWordKeys, lessonWordKeys) &&
    selectedWordKeySet.size === stored.selectedWordKeys.length &&
    stored.selectedWordKeys.every((selectedWordKey) => lessonWordsByKey.has(selectedWordKey));

  if (!isValid) return defaultSettings;

  return {
    shuffleOn: stored.shuffleOn,
    numberQuestionsOn: stored.numberQuestionsOn,
    selectedWords: stored.selectedWordKeys.map((selectedWordKey) => {
      const word = lessonWordsByKey.get(selectedWordKey);
      if (word === undefined) throw new Error(`Unknown stored word key: ${selectedWordKey}`);
      return word;
    }),
  };
}

function saveSettings(lesson: Lesson, mode: SettingsMode, settings: LessonSettings): void {
  const storage = getLocalStorage();
  if (!storage) return;

  const stored: StoredLessonSettings = {
    version: STORAGE_VERSION,
    lessonWordKeys: lesson.words.map(wordKey),
    selectedWordKeys: settings.selectedWords.map(wordKey),
    shuffleOn: settings.shuffleOn,
    numberQuestionsOn: settings.numberQuestionsOn,
  };

  try {
    storage.setItem(storageKey(lesson.id, mode), JSON.stringify(stored));
  } catch {
    // Persistence failures must not prevent practice from starting.
  }
}

export function loadQuizSettings(lesson: Lesson): LessonSettings {
  return loadSettings(lesson, "quiz");
}

export function saveQuizSettings(lesson: Lesson, settings: LessonSettings) {
  saveSettings(lesson, "quiz", settings);
}

export function loadTestSettings(lesson: Lesson): LessonSettings {
  return loadSettings(lesson, "test");
}

export function saveTestSettings(lesson: Lesson, settings: LessonSettings) {
  saveSettings(lesson, "test", settings);
}
