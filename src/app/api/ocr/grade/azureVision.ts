import type { DetectText } from "@/app/api/ocr/grade/handler";

interface AzureReadLine {
  text?: string;
}

interface AzureReadBlock {
  lines?: AzureReadLine[];
}

interface AzureReadResponse {
  readResult?: {
    blocks?: AzureReadBlock[];
  };
  error?: {
    code?: string;
    message?: string;
  };
}

function getAzureConfig(): { endpoint: string; key: string } {
  const endpoint = process.env.AZURE_VISION_ENDPOINT?.replace(/\/+$/, "");
  const key = process.env.AZURE_VISION_KEY;

  if (!endpoint || !key) {
    throw new Error("AZURE_VISION_ENDPOINT または AZURE_VISION_KEY が設定されていません");
  }

  return { endpoint, key };
}

export function extractAzureReadText(response: AzureReadResponse): string {
  return (
    response.readResult?.blocks
      ?.flatMap((block) => block.lines ?? [])
      .map((line) => line.text?.trim() ?? "")
      .filter(Boolean)
      .join("\n") ?? ""
  );
}

async function readImage(base64: string): Promise<string> {
  const { endpoint, key } = getAzureConfig();
  const url = new URL(`${endpoint}/computervision/imageanalysis:analyze`);
  url.searchParams.set("features", "read");
  url.searchParams.set("model-version", "latest");
  url.searchParams.set("api-version", "2024-02-01");

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/octet-stream",
      "Ocp-Apim-Subscription-Key": key,
    },
    body: Buffer.from(base64, "base64"),
  });

  const data = (await response.json()) as AzureReadResponse;
  if (!response.ok) {
    const details = data.error?.message ?? response.statusText;
    throw new Error(`Azure Vision OCR failed: ${details}`);
  }

  return extractAzureReadText(data);
}

export const detectTextWithAzureVision: DetectText = async ({
  hanziImageBase64,
  pinyinImageBase64,
}) => {
  const [hanziText, pinyinText] = await Promise.all([
    readImage(hanziImageBase64),
    readImage(pinyinImageBase64),
  ]);

  return {
    hanziText,
    pinyinText,
    provider: "azure-vision",
    feature: "READ",
  };
};
