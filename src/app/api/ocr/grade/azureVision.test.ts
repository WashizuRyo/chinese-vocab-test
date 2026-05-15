// @vitest-environment node

import { describe, expect, test } from "vitest";
import { extractAzureReadText } from "@/app/api/ocr/grade/azureVision";

describe("Azure Vision OCR", () => {
  test("Read OCRレスポンスから行テキストを抽出すること", () => {
    expect(
      extractAzureReadText({
        readResult: {
          blocks: [
            {
              lines: [{ text: "你" }, { text: "好" }],
            },
          ],
        },
      }),
    ).toBe("你\n好");
  });

  test("読み取り結果がない場合は空文字を返すこと", () => {
    expect(extractAzureReadText({})).toBe("");
  });
});
