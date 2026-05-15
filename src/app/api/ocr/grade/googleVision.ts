import { ImageAnnotatorClient } from "@google-cloud/vision";

import type { DetectText } from "@/app/api/ocr/grade/handler";

interface ServiceAccountCredentials {
  client_email: string;
  private_key: string;
  project_id?: string;
}

let client: ImageAnnotatorClient | null = null;

function getCredentials(): ServiceAccountCredentials {
  const raw = process.env.GOOGLE_CLOUD_CREDENTIALS_JSON;
  if (!raw) {
    throw new Error("GOOGLE_CLOUD_CREDENTIALS_JSON が設定されていません");
  }

  const parsed = JSON.parse(raw) as Partial<ServiceAccountCredentials>;
  if (!parsed.client_email || !parsed.private_key) {
    throw new Error("Google CloudサービスアカウントJSONの形式が正しくありません");
  }

  return {
    client_email: parsed.client_email,
    private_key: parsed.private_key.replace(/\\n/g, "\n"),
    project_id: parsed.project_id,
  };
}

function getClient() {
  if (client) return client;

  const credentials = getCredentials();
  client = new ImageAnnotatorClient({
    credentials,
    fallback: true,
    projectId: credentials.project_id,
  });
  return client;
}

function firstTextDescription(response: unknown): string {
  const annotations = (response as { textAnnotations?: Array<{ description?: string }> })
    .textAnnotations;
  return annotations?.[0]?.description?.trim() ?? "";
}

export const detectTextWithGoogleVision: DetectText = async ({
  hanziImageBase64,
  pinyinImageBase64,
}) => {
  const [response] = await getClient().batchAnnotateImages({
    requests: [
      {
        image: { content: hanziImageBase64 },
        features: [{ type: "DOCUMENT_TEXT_DETECTION" }],
        imageContext: { languageHints: ["zh-Hans"] },
      },
      {
        image: { content: pinyinImageBase64 },
        features: [{ type: "DOCUMENT_TEXT_DETECTION" }],
        imageContext: { languageHints: ["en"] },
      },
    ],
  });

  const hanziResponse = response.responses?.[0];
  const pinyinResponse = response.responses?.[1];
  const visionError = hanziResponse?.error?.message ?? pinyinResponse?.error?.message;

  if (visionError) {
    throw new Error(visionError);
  }

  return {
    hanziText: firstTextDescription(hanziResponse),
    pinyinText: firstTextDescription(pinyinResponse),
  };
};
