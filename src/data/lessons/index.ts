import type { Lesson } from "@/lib/types";
import { lesson01 } from "./lesson01";
import { lesson02 } from "./lesson02";
import { lesson03 } from "./lesson03";
import { lesson04 } from "./lesson04";
import { lesson05 } from "./lesson05";
import { lesson06 } from "./lesson06";
import { number } from "./number";

export const lessons: Lesson[] = [
  number,
  lesson01,
  lesson02,
  lesson03,
  lesson04,
  lesson05,
  lesson06,
];

export function getLesson(id: string): Lesson | undefined {
  return lessons.find((lesson) => lesson.id === id);
}
