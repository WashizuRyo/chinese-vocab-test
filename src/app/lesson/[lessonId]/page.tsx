import { notFound } from "next/navigation";
import { LessonRunner } from "@/components/lesson-runner";
import { getLesson } from "@/data/lessons";

export default async function LessonPage(props: PageProps<"/lesson/[lessonId]">) {
  const { lessonId } = await props.params;
  const lesson = getLesson(lessonId);
  if (!lesson) notFound();
  return <LessonRunner lesson={lesson} />;
}
