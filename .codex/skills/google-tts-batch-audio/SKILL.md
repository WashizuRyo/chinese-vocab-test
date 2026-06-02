---
name: google-tts-batch-audio
description: Generate consistent Chinese vocabulary or number MP3 assets with Google Cloud Text-to-Speech by synthesizing whole lesson/range batches, cutting them on silence boundaries, and writing files to each word's audioSrc. Use when asked to create, replace, regenerate, extend, or standardize Chinese pronunciation audio in this project with Google TTS, Gemini TTS, batch TTS, or 50-item number batches.
---

# Google TTS Batch Audio

Use this skill to reproduce the audio workflow used in this project:

1. Read lesson words from a TypeScript lesson file.
2. Send one Google Gemini TTS request per batch, usually one lesson or 50 numbers.
3. Save the returned WAV in a temporary directory.
4. Detect long silence between words.
5. Cut the batch recording into per-word MP3 files.
6. Write each MP3 to the word's existing `audioSrc`.

The main script is:

```bash
node .codex/skills/google-tts-batch-audio/scripts/generate-google-tts-batch-audio.mjs \
  --lesson-file src/data/lessons/lesson03.ts \
  --quota-project chinese-496402
```

## Common Commands

Replace one lesson's existing audio:

```bash
node .codex/skills/google-tts-batch-audio/scripts/generate-google-tts-batch-audio.mjs \
  --lesson-file src/data/lessons/lesson01.ts \
  --quota-project chinese-496402
```

Generate numbers in 50-item batches:

```bash
node .codex/skills/google-tts-batch-audio/scripts/generate-google-tts-batch-audio.mjs \
  --lesson-file src/data/lessons/number.ts \
  --batch-size 50 \
  --quota-project chinese-496402
```

Generate only a specific range from a lesson file:

```bash
node .codex/skills/google-tts-batch-audio/scripts/generate-google-tts-batch-audio.mjs \
  --lesson-file src/data/lessons/number.ts \
  --range 51-100 \
  --batch-size 50 \
  --quota-project chinese-496402
```

Keep the generated batch WAV files for manual inspection:

```bash
node .codex/skills/google-tts-batch-audio/scripts/generate-google-tts-batch-audio.mjs \
  --lesson-file src/data/lessons/number.ts \
  --batch-size 50 \
  --keep-batches public/audio/samples/number-batches
```

## Defaults

- API endpoint: `https://texttospeech.googleapis.com/v1beta1/text:synthesize`
- Model: `gemini-3.1-flash-tts-preview`
- Voice: `Achernar`
- Language: `cmn-CN`
- Speaking rate: `0.95`
- Input audio encoding: `LINEAR16`
- Output asset format: MP3, `128 kbps / 24 kHz / mono`
- Default batch size: all words in the lesson file

## Authentication

Use ADC. The script calls:

```bash
gcloud auth application-default print-access-token
```

If Google returns a quota project error, set ADC quota project first:

```bash
gcloud auth application-default set-quota-project chinese-496402
```

The script also sends `x-goog-user-project` when `--quota-project` or `GOOGLE_CLOUD_QUOTA_PROJECT` is set.

## Verification

After replacing audio in this project, run the project-required checks:

```bash
pnpm format
pnpm check-types
pnpm test
```

Also inspect at least a few files:

```bash
file public/audio/words/你-nǐ.mp3
```

Expected output includes `128 kbps, 24 kHz, Monaural`.

## Notes

- Prefer batch synthesis over individual word synthesis when voice consistency matters.
- Use 50-item batches for growing number lessons instead of rebuilding all existing numbers.
- If segment count does not match word count, do not overwrite manually. Inspect the logs, listen to the batch WAV if kept, and adjust batch size or silence settings.
- For detailed request and cutting behavior, see `references/google-tts-batch-notes.md`.
