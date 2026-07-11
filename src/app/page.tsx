import { LessonCard } from "@/components/lesson-card";
import { ThemeToggle } from "@/components/theme-toggle";
import { lessons } from "@/data/lessons";

export default function Home() {
  return (
    <main className="flex flex-1 w-full flex-col px-4 pt-6 pb-10">
      <header className="mb-5 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-foreground">単語学習</h1>
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
