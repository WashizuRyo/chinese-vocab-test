# Google TTS Batch Notes

## Request Shape

Use Gemini TTS with a short prompt. Long prompts with a full pinyin guide can return `400 INVALID_ARGUMENT`.

```json
{
  "audioConfig": {
    "audioEncoding": "LINEAR16",
    "pitch": 0,
    "speakingRate": 0.95
  },
  "input": {
    "prompt": "Read the Chinese text exactly. Use standard Mainland Mandarin. Use a neutral, consistent teaching voice. Keep a short pause between words. Do not add extra words.",
    "text": "现在。点。半。"
  },
  "voice": {
    "languageCode": "cmn-CN",
    "modelName": "gemini-3.1-flash-tts-preview",
    "name": "Achernar"
  }
}
```

For number batches, use:

```text
Read the Chinese numbers exactly. Use standard Mainland Mandarin. Use a neutral, consistent teaching voice. Keep a clear short pause between each number. Do not add extra words.
```

## Cutting Strategy

1. Request one batch WAV.
2. Run `ffmpeg` `silencedetect` at `noise=-35dB`.
3. Try silence durations from strict to loose: `0.3`, `0.25`, `0.2`, `0.15`.
4. Convert speech spans to segments.
5. If there are too many raw segments, merge extra segments into multi-character words.
6. Abort if final segment count does not equal word count.
7. Cut with `atrim`, reset timestamps, and encode as MP3 128k.

## Operational Rules

- Keep `audioSrc` stable; replace file contents unless the lesson data is intentionally extended.
- For number lessons, add future ranges and generate only the new range, normally 50 numbers at a time.
- Delete temporary `public/audio/samples/` files before committing unless the user explicitly asks to keep samples.
- The generated files are intended for browser playback from `public/audio/words/`.
