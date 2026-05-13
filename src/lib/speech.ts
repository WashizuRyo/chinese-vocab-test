let cachedVoices: SpeechSynthesisVoice[] | null = null;
let voicesLoadPromise: Promise<SpeechSynthesisVoice[]> | null = null;

export function isSpeechSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

function loadVoices(): Promise<SpeechSynthesisVoice[]> {
  if (!isSpeechSupported()) return Promise.resolve([]);
  if (cachedVoices && cachedVoices.length > 0) return Promise.resolve(cachedVoices);
  if (voicesLoadPromise) return voicesLoadPromise;

  voicesLoadPromise = new Promise<SpeechSynthesisVoice[]>((resolve) => {
    const synth = window.speechSynthesis;
    const initial = synth.getVoices();
    if (initial.length > 0) {
      cachedVoices = initial;
      resolve(initial);
      return;
    }

    let resolved = false;
    const handler = () => {
      const voices = synth.getVoices();
      if (voices.length > 0 && !resolved) {
        resolved = true;
        cachedVoices = voices;
        synth.removeEventListener("voiceschanged", handler);
        resolve(voices);
      }
    };
    synth.addEventListener("voiceschanged", handler);

    setTimeout(() => {
      if (!resolved) {
        resolved = true;
        synth.removeEventListener("voiceschanged", handler);
        const voices = synth.getVoices();
        cachedVoices = voices;
        resolve(voices);
      }
    }, 1500);
  });

  return voicesLoadPromise;
}

const MALE_VOICE_NAMES = new Set([
  "Han",
  "Bobo",
  "Taotao",
  "Binbin",
  "Li-Mu",
  "Haohao",
  "Microsoft Yunjian Online (Natural) - Chinese (Mainland)",
  "Microsoft Yunyang Online (Natural) - Chinese (Mainland)",
  "Microsoft Yunxi Online (Natural) - Chinese (Mainland)",
  "Microsoft Kangkang - Chinese (Simplified, PRC)",
  "Microsoft Zhiwei - Chinese (Traditional, Taiwan)",
  "Microsoft YunJhe Online (Natural) - Chinese (Taiwan)",
]);

const MALE_ANDROID_SUBSTRINGS = ["x-ccd", "x-cce", "x-ctd", "x-cte"];

const SKIP_VOICE_BASENAMES = new Set([
  "Eddy",
  "Flo",
  "Grandma",
  "Grandpa",
  "Reed",
  "Rocko",
  "Sandy",
  "Shelley",
]);

const PREFERRED_FEMALE_VOICES = [
  "Tingting",
  "Ting-Ting",
  "Microsoft Xiaoxiao Online (Natural) - Chinese (Mainland)",
  "Microsoft Xiaoyi Online (Natural) - Chinese (Mainland)",
  "Google 普通话（中国大陆）",
  "Microsoft Huihui - Chinese (Simplified, PRC)",
  "Microsoft Yaoyao - Chinese (Simplified, PRC)",
];

function getVoiceBasename(name: string): string {
  const idx = name.indexOf(" (");
  return (idx === -1 ? name : name.slice(0, idx)).trim();
}

function shouldSkip(v: SpeechSynthesisVoice): boolean {
  if (MALE_VOICE_NAMES.has(v.name)) return true;
  if (MALE_ANDROID_SUBSTRINGS.some((s) => v.name.includes(s))) return true;
  if (/男/.test(v.name)) return true;
  if (SKIP_VOICE_BASENAMES.has(getVoiceBasename(v.name))) return true;
  return false;
}

function pickChineseVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  const langMatch = (lang: string) => lang.toLowerCase().replace("_", "-");
  const zhVoices = voices.filter((v) => langMatch(v.lang).startsWith("zh"));
  if (zhVoices.length === 0) return null;

  const female = zhVoices.filter((v) => !shouldSkip(v));

  for (const name of PREFERRED_FEMALE_VOICES) {
    const hit = female.find((v) => v.name === name);
    if (hit) return hit;
  }

  const cn = female.find((v) => langMatch(v.lang).startsWith("zh-cn"));
  if (cn) return cn;

  const hans = female.find((v) => langMatch(v.lang).includes("hans"));
  if (hans) return hans;

  return female[0] ?? zhVoices[0] ?? null;
}

export async function speakChinese(text: string, rate = 0.85): Promise<void> {
  if (!isSpeechSupported()) return;
  const synth = window.speechSynthesis;
  synth.cancel();

  const voices = await loadVoices();
  const voice = pickChineseVoice(voices);

  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = "zh-CN";
  utter.rate = rate;
  utter.pitch = 1;
  if (voice) utter.voice = voice;

  synth.speak(utter);
}

export function cancelSpeech(): void {
  if (!isSpeechSupported()) return;
  window.speechSynthesis.cancel();
}

export function primeSpeechEngine(): void {
  if (!isSpeechSupported()) return;
  try {
    const synth = window.speechSynthesis;
    const utter = new SpeechSynthesisUtterance("");
    utter.volume = 0;
    synth.speak(utter);
  } catch {
    // ignore
  }
}
