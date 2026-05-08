export type SpeechAvailability = "available" | "no-zh-voice" | "unsupported";

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

function pickChineseVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  const langMatch = (lang: string) => lang.toLowerCase().replace("_", "-");
  const candidates = voices.filter((v) => {
    const lang = langMatch(v.lang);
    return lang.startsWith("zh");
  });

  if (candidates.length === 0) return null;

  const cn = candidates.find((v) => langMatch(v.lang).startsWith("zh-cn"));
  if (cn) return cn;

  const hans = candidates.find((v) => langMatch(v.lang).includes("hans"));
  if (hans) return hans;

  return candidates[0];
}

export async function getSpeechAvailability(): Promise<SpeechAvailability> {
  if (!isSpeechSupported()) return "unsupported";
  const voices = await loadVoices();
  if (voices.length === 0) return "no-zh-voice";
  const zh = pickChineseVoice(voices);
  return zh ? "available" : "no-zh-voice";
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
