import { existsSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "vitest";
import { lessons } from "@/data/lessons";

test("単語データの audioSrc に対応する音声ファイルが存在すること", () => {
  for (const lesson of lessons) {
    for (const word of lesson.words) {
      expect(
        existsSync(join(process.cwd(), "public", word.audioSrc.slice(1))),
        `${lesson.id}: ${word.hanzi} (${word.audioSrc})`,
      ).toBe(true);
    }
  }
});
