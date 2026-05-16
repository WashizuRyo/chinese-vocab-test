const CORRECT_SOUND_PATH = "/sounds/correct-answer.mp3";
const CORRECT_SOUND_VOLUME = 1;

let correctSound: HTMLAudioElement | null = null;

function getCorrectSound(): HTMLAudioElement | null {
  if (typeof Audio === "undefined") return null;

  correctSound ??= new Audio(CORRECT_SOUND_PATH);
  correctSound.preload = "auto";
  correctSound.volume = CORRECT_SOUND_VOLUME;
  return correctSound;
}

export function playCorrectSound(): void {
  try {
    const sound = getCorrectSound();
    if (!sound) return;

    sound.currentTime = 0;
    sound.volume = CORRECT_SOUND_VOLUME;
    const result = sound.play();
    if (result) void result.catch(() => {});
  } catch {
    // Sound effects are optional feedback.
  }
}
