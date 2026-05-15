let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const AudioContextClass =
    window.AudioContext ??
    (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextClass) return null;

  audioContext ??= new AudioContextClass();
  return audioContext;
}

function playTone(
  ctx: AudioContext,
  startTime: number,
  frequency: number,
  duration: number,
  gainValue: number,
  type: OscillatorType,
) {
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, startTime);
  gain.gain.setValueAtTime(0.0001, startTime);
  gain.gain.exponentialRampToValueAtTime(gainValue, startTime + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

  oscillator.connect(gain);
  gain.connect(ctx.destination);
  oscillator.start(startTime);
  oscillator.stop(startTime + duration);
}

function playLayeredTone(
  ctx: AudioContext,
  startTime: number,
  frequency: number,
  duration: number,
) {
  playTone(ctx, startTime, frequency / 2, duration + 0.035, 0.07, "sine");
  playTone(ctx, startTime, frequency, duration, 0.115, "triangle");
}

export function playCorrectSound(): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    playLayeredTone(ctx, now, 1760, 0.075);
    playLayeredTone(ctx, now + 0.05, 2349, 0.085);
    playLayeredTone(ctx, now + 0.105, 3136, 0.14);
  } catch {
    // Sound effects are optional feedback.
  }
}
