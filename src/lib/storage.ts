const STORAGE_PREFIX = "chinese-vocab:lesson:";

export interface LessonScore {
  hanziCorrect: number;
  pinyinCorrect: number;
  total: number;
  takenAt: string;
}

export function loadLessonScore(lessonId: string): LessonScore | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_PREFIX + lessonId);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LessonScore;
    if (
      typeof parsed.hanziCorrect === "number" &&
      typeof parsed.pinyinCorrect === "number" &&
      typeof parsed.total === "number" &&
      typeof parsed.takenAt === "string"
    ) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

export function saveLessonScore(lessonId: string, score: LessonScore): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_PREFIX + lessonId, JSON.stringify(score));
  } catch {
    // ignore quota errors
  }
}

export function formatTakenAt(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}/${m}/${day}`;
}
