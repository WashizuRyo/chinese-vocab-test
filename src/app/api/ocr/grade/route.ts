import { handleGradeRequest } from "@/app/api/ocr/grade/handler";
import { getConfiguredOcrProvider } from "@/app/api/ocr/grade/provider";

export const runtime = "nodejs";

export async function POST(request: Request) {
  return handleGradeRequest(request, getConfiguredOcrProvider());
}
