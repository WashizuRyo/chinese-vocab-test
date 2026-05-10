import type { Lesson } from "@/lib/types";
import { lesson01 } from "./lesson01";
import { lesson02 } from "./lesson02";
import { number } from "./number";

export const lessons: Lesson[] = [number, lesson01, lesson02];

export function getLesson(id: string): Lesson | undefined {
  return lessons.find((lesson) => lesson.id === id);
}
