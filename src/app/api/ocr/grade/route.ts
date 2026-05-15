import { detectTextWithGoogleVision } from "@/app/api/ocr/grade/googleVision";
import { handleGradeRequest } from "@/app/api/ocr/grade/handler";

export const runtime = "nodejs";

export async function POST(request: Request) {
  return handleGradeRequest(request, detectTextWithGoogleVision);
}
