"use client";

import Link from "next/link";
import type { Lesson } from "@/lib/types";

interface Props {
  lesson: Lesson;
}

export function LessonCard({ lesson }: Props) {
  return (
    <Link
      href={`/lesson/${lesson.id}`}
      className="block rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm active:bg-zinc-50"
    >
      <div className="flex items-center justify-between">
        <div>
          <div className="text-lg font-semibold text-zinc-900">{lesson.title}</div>
          <div className="mt-0.5 text-sm text-zinc-500">{lesson.words.length} 単語</div>
        </div>
      </div>
    </Link>
  );
}
