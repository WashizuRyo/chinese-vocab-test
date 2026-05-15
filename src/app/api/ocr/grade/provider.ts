import { detectTextWithAzureVision } from "@/app/api/ocr/grade/azureVision";
import { detectTextWithGoogleVision } from "@/app/api/ocr/grade/googleVision";
import type { DetectText } from "@/app/api/ocr/grade/handler";

export function getConfiguredOcrProvider(): DetectText {
  const provider = process.env.OCR_PROVIDER;

  if (provider === "google") return detectTextWithGoogleVision;
  if (provider === "azure") return detectTextWithAzureVision;

  if (process.env.AZURE_VISION_ENDPOINT && process.env.AZURE_VISION_KEY) {
    return detectTextWithAzureVision;
  }

  return detectTextWithGoogleVision;
}
