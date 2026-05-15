import { describe, expect, test } from "vitest";
import { buildPinyinToneChoices } from "@/lib/pinyinChoices";

describe("buildPinyinToneChoices", () => {
  test("単音節の声調違い候補を生成すること", () => {
    expect(buildPinyinToneChoices("shì")).toEqual(["shì", "shī", "shí", "shǐ"]);
  });

  test("複数音節のうち1音節だけ変えた候補を生成すること", () => {
    const choices = buildPinyinToneChoices("xuéxí");

    expect(choices).toHaveLength(4);
    expect(choices).toContain("xuéxí");
    expect(choices).toContain("xuēxí");
    expect(choices).toContain("xuéxī");
    expect(choices).toContain("xuěxí");
  });

  test("軽声の単語に声調付き候補を補うこと", () => {
    expect(buildPinyinToneChoices("ma")).toEqual(["ma", "mā", "má", "mǎ"]);
  });

  test("候補が重複せず最大4件になること", () => {
    const choices = buildPinyinToneChoices("nǐ", ["nǐ", "wǒ", "shì"]);

    expect(new Set(choices).size).toBe(choices.length);
    expect(choices).toHaveLength(4);
    expect(choices).toContain("nǐ");
  });
});
