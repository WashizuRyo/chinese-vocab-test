// @vitest-environment node

import { describe, expect, test, vi } from "vitest";
import { handleGradeRequest, normalizeHanzi, normalizePinyin } from "@/app/api/ocr/grade/handler";

const pngDataUrl = "data:image/png;base64,dGVzdA==";

function request(body: unknown) {
  return new Request("http://localhost/api/ocr/grade", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("OCR grade handler", () => {
  test("OCR結果を正規化して正誤判定すること", async () => {
    const detectText = vi.fn().mockResolvedValue({
      hanziText: " 你。",
      pinyinText: "ＮǏ ",
    });

    const response = await handleGradeRequest(
      request({
        hanziImage: pngDataUrl,
        pinyinImage: pngDataUrl,
        expected: { hanzi: "你", pinyin: "nǐ" },
      }),
      detectText,
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(detectText).toHaveBeenCalledWith({
      hanziImageBase64: "dGVzdA==",
      pinyinImageBase64: "dGVzdA==",
    });
    expect(data.hanzi.correct).toBe(true);
    expect(data.pinyin.correct).toBe(true);
  });

  test("不正なData URLは400を返すこと", async () => {
    const response = await handleGradeRequest(
      request({
        hanziImage: "not-data-url",
        pinyinImage: pngDataUrl,
        expected: { hanzi: "你", pinyin: "nǐ" },
      }),
      vi.fn(),
    );
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data).toEqual({
      ok: false,
      error: "hanziImage はPNGのData URLで送信してください",
    });
  });

  test("Vision呼び出し失敗時は502を返すこと", async () => {
    const response = await handleGradeRequest(
      request({
        hanziImage: pngDataUrl,
        pinyinImage: pngDataUrl,
        expected: { hanzi: "你", pinyin: "nǐ" },
      }),
      vi.fn().mockRejectedValue(new Error("Vision API error")),
    );
    const data = await response.json();

    expect(response.status).toBe(502);
    expect(data).toEqual({ ok: false, error: "Vision API error" });
  });

  test("MVPの正規化ルールが固定されていること", () => {
    expect(normalizeHanzi(" 你，好！")).toBe("你好");
    expect(normalizePinyin("ＮǏ, Hǎo！")).toBe("nǐhǎo");
  });
});
