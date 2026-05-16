const CORRECT_SOUND_PATH = "/sounds/correct-answer.mp3";
const CORRECT_SOUND_VOLUME = 1;

let audioContext: AudioContext | null = null;
let correctSound: HTMLAudioElement | null = null;
let correctSoundBuffer: AudioBuffer | null = null;
let correctSoundBufferPromise: Promise<AudioBuffer | null> | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const AudioContextClass =
    window.AudioContext ??
    (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextClass) return null;

  audioContext ??= new AudioContextClass();
  return audioContext;
}

function getFallbackSound(): HTMLAudioElement | null {
  if (typeof Audio === "undefined") return null;

  correctSound ??= new Audio(CORRECT_SOUND_PATH);
  correctSound.preload = "auto";
  correctSound.volume = CORRECT_SOUND_VOLUME;
  return correctSound;
}

function loadCorrectSoundBuffer(): Promise<AudioBuffer | null> {
  if (correctSoundBuffer) return Promise.resolve(correctSoundBuffer);
  if (correctSoundBufferPromise) return correctSoundBufferPromise;
  if (typeof fetch === "undefined") return Promise.resolve(null);

  const ctx = getAudioContext();
  if (!ctx) return Promise.resolve(null);

  correctSoundBufferPromise = fetch(CORRECT_SOUND_PATH)
    .then((response) => {
      if (!response.ok) throw new Error(`Failed to load ${CORRECT_SOUND_PATH}`);
      return response.arrayBuffer();
    })
    .then((arrayBuffer) => ctx.decodeAudioData(arrayBuffer))
    .then((buffer) => {
      correctSoundBuffer = buffer;
      return buffer;
    })
    .catch(() => null);

  return correctSoundBufferPromise;
}

function playFallbackSound(): void {
  const sound = getFallbackSound();
  if (!sound) return;

  sound.currentTime = 0;
  sound.volume = CORRECT_SOUND_VOLUME;
  const result = sound.play();
  if (result) void result.catch(() => {});
}

function playBufferSound(ctx: AudioContext, buffer: AudioBuffer): void {
  const source = ctx.createBufferSource();
  const gain = ctx.createGain();

  source.buffer = buffer;
  gain.gain.value = CORRECT_SOUND_VOLUME;
  source.connect(gain);
  gain.connect(ctx.destination);
  source.start();
}

export function preloadCorrectSound(): void {
  try {
    getFallbackSound()?.load();
    void loadCorrectSoundBuffer();
  } catch {
    // Sound effects are optional feedback.
  }
}

export function playCorrectSound(): void {
  try {
    const ctx = getAudioContext();
    if (ctx && correctSoundBuffer) {
      if (ctx.state === "suspended") {
        void ctx
          .resume()
          .then(() => playBufferSound(ctx, correctSoundBuffer as AudioBuffer))
          .catch(() => playFallbackSound());
        return;
      }

      playBufferSound(ctx, correctSoundBuffer);
      return;
    }

    void loadCorrectSoundBuffer();
    playFallbackSound();
  } catch {
    // Sound effects are optional feedback.
  }
}
