// @vitest-environment node

import { afterEach, describe, expect, test, vi } from "vitest";
import { detectTextWithGoogleVision } from "@/app/api/ocr/grade/googleVision";

describe("Google Vision client", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  test("認証情報が未設定ならGoogle Visionを呼ぶ前に失敗すること", async () => {
    vi.stubEnv("GOOGLE_CLOUD_CREDENTIALS_JSON", "");

    await expect(
      detectTextWithGoogleVision({
        hanziImageBase64: "test",
        pinyinImageBase64: "test",
      }),
    ).rejects.toThrow("GOOGLE_CLOUD_CREDENTIALS_JSON が設定されていません");
  });
});
