const TONE_MARKS = {
  a: ["ā", "á", "ǎ", "à"],
  e: ["ē", "é", "ě", "è"],
  i: ["ī", "í", "ǐ", "ì"],
  o: ["ō", "ó", "ǒ", "ò"],
  u: ["ū", "ú", "ǔ", "ù"],
  ü: ["ǖ", "ǘ", "ǚ", "ǜ"],
} as const;

type ToneBase = keyof typeof TONE_MARKS;

const MARK_TO_BASE = new Map<string, ToneBase>(
  Object.entries(TONE_MARKS).flatMap(([base, marks]) =>
    marks.map((mark) => [mark, base as ToneBase] as const),
  ),
);

const VOWELS = ["a", "e", "o", "i", "u", "ü", "v"];

function normalizeToneBase(char: string): ToneBase | null {
  if (char === "v") return "ü";
  return VOWELS.includes(char) ? (char as ToneBase) : null;
}

function addUnique(values: string[], value: string, excluded: Set<string>, limit: number) {
  if (values.length >= limit || excluded.has(value)) return;
  values.push(value);
  excluded.add(value);
}

function findMarkedVowels(value: string): Array<{ index: number; base: ToneBase }> {
  const marked: Array<{ index: number; base: ToneBase }> = [];

  for (const [index, char] of Array.from(value).entries()) {
    const base = MARK_TO_BASE.get(char);
    if (base) marked.push({ index, base });
  }

  return marked;
}

function replaceAt(value: string, index: number, replacement: string): string {
  const chars = Array.from(value);
  chars[index] = replacement;
  return chars.join("");
}

function findNeutralToneTargetIndex(value: string): { index: number; base: ToneBase } | null {
  const chars = Array.from(value.toLowerCase());
  const firstA = chars.indexOf("a");
  if (firstA >= 0) return { index: firstA, base: "a" };

  const firstE = chars.indexOf("e");
  if (firstE >= 0) return { index: firstE, base: "e" };

  const ouIndex = value.toLowerCase().indexOf("ou");
  if (ouIndex >= 0) return { index: Array.from(value.slice(0, ouIndex)).length, base: "o" };

  for (let i = chars.length - 1; i >= 0; i--) {
    const base = normalizeToneBase(chars[i] ?? "");
    if (base) return { index: i, base };
  }

  return null;
}

function toneVariantsForMarkedPinyin(value: string): string[] {
  const variants: string[] = [];
  const marked = findMarkedVowels(value);

  for (const toneIndex of [0, 1, 2, 3]) {
    for (const { index, base } of marked) {
      const mark = TONE_MARKS[base][toneIndex];
      if (!mark) continue;
      variants.push(replaceAt(value, index, mark));
    }
  }

  return variants;
}

function toneVariantsForNeutralPinyin(value: string): string[] {
  const target = findNeutralToneTargetIndex(value);
  if (!target) return [];

  return TONE_MARKS[target.base].map((mark) => replaceAt(value, target.index, mark));
}

export function buildPinyinToneChoices(
  correctPinyin: string,
  fallbackPinyins: string[] = [],
  limit = 4,
): string[] {
  const choices: string[] = [];
  const seen = new Set<string>();
  addUnique(choices, correctPinyin, seen, limit);

  const toneVariants =
    findMarkedVowels(correctPinyin).length > 0
      ? toneVariantsForMarkedPinyin(correctPinyin)
      : toneVariantsForNeutralPinyin(correctPinyin);

  for (const variant of toneVariants) {
    addUnique(choices, variant, seen, limit);
  }

  for (const fallback of fallbackPinyins) {
    addUnique(choices, fallback, seen, limit);
  }

  return choices;
}
