import type { OcrFieldResult } from "@/lib/types";

interface GradeRequestBody {
  hanziImage?: unknown;
  pinyinImage?: unknown;
  expected?: {
    hanzi?: unknown;
    pinyin?: unknown;
  };
}

export interface GradeSuccessResponse {
  ok: true;
  provider: "google-vision";
  feature: "DOCUMENT_TEXT_DETECTION";
  hanzi: OcrFieldResult;
  pinyin: OcrFieldResult;
}

export interface GradeErrorResponse {
  ok: false;
  error: string;
}

export type GradeResponse = GradeSuccessResponse | GradeErrorResponse;

export type DetectText = (images: {
  hanziImageBase64: string;
  pinyinImageBase64: string;
}) => Promise<{ hanziText: string; pinyinText: string }>;

class GradeRequestError extends Error {}

const DATA_URL_PATTERN = /^data:image\/png;base64,([A-Za-z0-9+/=]+)$/;
const PUNCTUATION_AND_SPACES =
  /[\s、。，．,.!?！？;；:：'"“”‘’`´~〜\-ー＿_[\]()（）{}<>《》〈〉・/\\|]+/g;

function toHalfWidthAscii(value: string): string {
  return value.replace(/[！-～]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 0xfee0));
}

export function normalizeHanzi(value: string): string {
  return value.normalize("NFKC").replace(PUNCTUATION_AND_SPACES, "");
}

export function normalizePinyin(value: string): string {
  return toHalfWidthAscii(value).normalize("NFC").toLowerCase().replace(PUNCTUATION_AND_SPACES, "");
}

function gradeField(
  rawText: string,
  expectedText: string,
  kind: "hanzi" | "pinyin",
): OcrFieldResult {
  const normalize = kind === "hanzi" ? normalizeHanzi : normalizePinyin;
  const normalizedText = normalize(rawText);
  const normalizedExpected = normalize(expectedText);

  return {
    rawText,
    normalizedText,
    expectedText,
    correct: normalizedText.length > 0 && normalizedText === normalizedExpected,
  };
}

function extractPngBase64(value: unknown, fieldName: string): string {
  if (typeof value !== "string") {
    throw new GradeRequestError(`${fieldName} が送信されていません`);
  }

  const match = value.match(DATA_URL_PATTERN);
  const base64 = match?.[1];
  if (!base64) {
    throw new GradeRequestError(`${fieldName} はPNGのData URLで送信してください`);
  }

  return base64;
}

function parseExpected(body: GradeRequestBody): { hanzi: string; pinyin: string } {
  const hanzi = body.expected?.hanzi;
  const pinyin = body.expected?.pinyin;

  if (typeof hanzi !== "string" || typeof pinyin !== "string" || !hanzi || !pinyin) {
    throw new GradeRequestError("正解データが不足しています");
  }

  return { hanzi, pinyin };
}

export async function handleGradeRequest(
  request: Request,
  detectText: DetectText,
): Promise<Response> {
  try {
    const body = (await request.json()) as GradeRequestBody;
    const expected = parseExpected(body);
    const hanziImageBase64 = extractPngBase64(body.hanziImage, "hanziImage");
    const pinyinImageBase64 = extractPngBase64(body.pinyinImage, "pinyinImage");

    const detected = await detectText({ hanziImageBase64, pinyinImageBase64 });
    const response: GradeSuccessResponse = {
      ok: true,
      provider: "google-vision",
      feature: "DOCUMENT_TEXT_DETECTION",
      hanzi: gradeField(detected.hanziText, expected.hanzi, "hanzi"),
      pinyin: gradeField(detected.pinyinText, expected.pinyin, "pinyin"),
    };

    return Response.json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : "OCRに失敗しました";
    const response: GradeErrorResponse = { ok: false, error: message };
    const status = error instanceof GradeRequestError ? 400 : 502;

    console.error("[ocr-grade] failed", {
      message,
      status,
      error,
    });

    return Response.json(response, { status });
  }
}
