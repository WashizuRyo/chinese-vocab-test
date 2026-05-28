import { LessonCard } from "@/components/lesson-card";
import { ThemeToggle } from "@/components/theme-toggle";
import { lessons } from "@/data/lessons";

export default function Home() {
  return (
    <main className="flex flex-1 w-full flex-col px-4 pt-6 pb-10">
      <header className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">中国語 単語学習</h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            課を選んで、暗記・クイズ・テストを開始
          </p>
        </div>
        <ThemeToggle />
      </header>
      <div className="flex flex-col gap-3">
        {lessons.map((lesson) => (
          <LessonCard key={lesson.id} lesson={lesson} />
        ))}
      </div>
    </main>
  );
}
