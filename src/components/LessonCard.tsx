"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { formatTakenAt, type LessonScore, loadLessonScore } from "@/lib/storage";
import type { Lesson } from "@/lib/types";

interface Props {
  lesson: Lesson;
}

export function LessonCard({ lesson }: Props) {
  const [score, setScore] = useState<LessonScore | null>(null);

  useEffect(() => {
    setScore(loadLessonScore(lesson.id));
  }, [lesson.id]);

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
        <div className="text-right">
          {score ? (
            <>
              <div className="text-sm font-medium text-zinc-700">
                {score.hanziCorrect + score.pinyinCorrect} / {score.total * 2}
              </div>
              <div className="text-xs text-zinc-400">{formatTakenAt(score.takenAt)}</div>
            </>
          ) : (
            <span className="text-xs text-zinc-400">テスト未実施</span>
          )}
        </div>
      </div>
    </Link>
  );
}
