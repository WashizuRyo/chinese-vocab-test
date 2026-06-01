#!/usr/bin/env node
import { execFileSync, spawnSync } from "node:child_process";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const DEFAULT_ENDPOINT = "https://texttospeech.googleapis.com/v1beta1/text:synthesize";
const DEFAULT_MODEL = "gemini-3.1-flash-tts-preview";
const DEFAULT_VOICE = "Achernar";
const DEFAULT_LANGUAGE = "cmn-CN";
const DEFAULT_RATE = 0.95;
const DEFAULT_BITRATE = "128k";
const DEFAULT_NOISE = "-35dB";
const SILENCE_DURATIONS = [0.3, 0.25, 0.2, 0.15];

function usage() {
  console.log(`Usage:
  node generate-google-tts-batch-audio.mjs --lesson-file <path> [options]

Options:
  --lesson-file <path>       TypeScript lesson file containing words with hanzi, pinyin, audioSrc
  --range <start-end>        1-based inclusive word range, e.g. 51-100
  --batch-size <n>           Number of words per TTS request; default is all selected words
  --quota-project <id>       Google Cloud quota/billing project; can also use GOOGLE_CLOUD_QUOTA_PROJECT
  --speaking-rate <number>   TTS speakingRate; default ${DEFAULT_RATE}
  --voice <name>             Gemini TTS voice name; default ${DEFAULT_VOICE}
  --model <name>             Gemini TTS modelName; default ${DEFAULT_MODEL}
  --language <code>          Language code; default ${DEFAULT_LANGUAGE}
  --keep-batches <dir>       Save batch WAV/request files for inspection
  --dry-run                  Parse and print batches without calling Google or writing audio
  --help                     Show this help
`);
}

function parseArgs(argv) {
  const options = {
    endpoint: DEFAULT_ENDPOINT,
    model: DEFAULT_MODEL,
    voice: DEFAULT_VOICE,
    language: DEFAULT_LANGUAGE,
    speakingRate: DEFAULT_RATE,
    bitrate: DEFAULT_BITRATE,
    noise: DEFAULT_NOISE,
    quotaProject: process.env.GOOGLE_CLOUD_QUOTA_PROJECT,
    dryRun: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = () => {
      i += 1;
      if (i >= argv.length) throw new Error(`Missing value for ${arg}`);
      return argv[i];
    };

    switch (arg) {
      case "--lesson-file":
        options.lessonFile = next();
        break;
      case "--range":
        options.range = next();
        break;
      case "--batch-size":
        options.batchSize = Number(next());
        break;
      case "--quota-project":
        options.quotaProject = next();
        break;
      case "--speaking-rate":
        options.speakingRate = Number(next());
        break;
      case "--voice":
        options.voice = next();
        break;
      case "--model":
        options.model = next();
        break;
      case "--language":
        options.language = next();
        break;
      case "--keep-batches":
        options.keepBatches = next();
        break;
      case "--dry-run":
        options.dryRun = true;
        break;
      case "--help":
        usage();
        process.exit(0);
        break;
      case "-h":
        usage();
        process.exit(0);
        break;
      default:
        throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (!options.lessonFile) throw new Error("--lesson-file is required");
  if (
    options.batchSize !== undefined &&
    (!Number.isInteger(options.batchSize) || options.batchSize <= 0)
  ) {
    throw new Error("--batch-size must be a positive integer");
  }
  if (!Number.isFinite(options.speakingRate) || options.speakingRate <= 0) {
    throw new Error("--speaking-rate must be a positive number");
  }

  return options;
}

function parseLessonWords(lessonFile) {
  const source = readFileSync(lessonFile, "utf8");
  const matches = [
    ...source.matchAll(/hanzi: "([^"]+)",[\s\S]*?pinyin: "([^"]+)",[\s\S]*?audioSrc: "([^"]+)"/g),
  ];
  const words = matches.map((match) => ({
    hanzi: match[1],
    pinyin: match[2],
    audioSrc: match[3],
  }));
  if (words.length === 0) throw new Error(`No words found in ${lessonFile}`);
  return words;
}

function selectRange(words, rangeText) {
  if (!rangeText) return words;
  const match = rangeText.match(/^(\d+)-(\d+)$/);
  if (!match) throw new Error("--range must look like 51-100");
  const start = Number(match[1]);
  const end = Number(match[2]);
  if (start < 1 || end < start || end > words.length) {
    throw new Error(`Invalid --range ${rangeText} for ${words.length} words`);
  }
  return words.slice(start - 1, end);
}

function chunkWords(words, batchSize) {
  const size = batchSize ?? words.length;
  const batches = [];
  for (let i = 0; i < words.length; i += size) {
    batches.push({ startIndex: i, words: words.slice(i, i + size) });
  }
  return batches;
}

function getAccessToken() {
  return execFileSync("gcloud", ["auth", "application-default", "print-access-token"], {
    encoding: "utf8",
  }).trim();
}

function requestPrompt(batchWords) {
  const allNumbers = batchWords.every(
    (word) => /^\d+$/.test(word.japanese ?? "") || /^[一二三四五六七八九十百]+$/.test(word.hanzi),
  );
  if (allNumbers) {
    return "Read the Chinese numbers exactly. Use standard Mainland Mandarin. Use a neutral, consistent teaching voice. Keep a clear short pause between each number. Do not add extra words.";
  }
  return "Read the Chinese text exactly. Use standard Mainland Mandarin. Use a neutral, consistent teaching voice. Keep a short pause between words. Do not add extra words.";
}

async function synthesizeBatch(batchWords, options, label, workDir) {
  const text = `${batchWords.map((word) => word.hanzi).join("。")}。`;
  const body = {
    audioConfig: {
      audioEncoding: "LINEAR16",
      pitch: 0,
      speakingRate: options.speakingRate,
    },
    input: {
      prompt: requestPrompt(batchWords),
      text,
    },
    voice: {
      languageCode: options.language,
      modelName: options.model,
      name: options.voice,
    },
  };

  if (options.keepBatches) {
    mkdirSync(options.keepBatches, { recursive: true });
    writeFileSync(
      path.join(options.keepBatches, `${label}-request.json`),
      `${JSON.stringify(body, null, 2)}\n`,
    );
  }

  const token = options.accessToken ?? getAccessToken();
  options.accessToken = token;
  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
  if (options.quotaProject) headers["x-goog-user-project"] = options.quotaProject;

  const response = await fetch(options.endpoint, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  const responseText = await response.text();
  if (!response.ok) throw new Error(`${label}: HTTP ${response.status}\n${responseText}`);
  const json = JSON.parse(responseText);
  if (!json.audioContent) throw new Error(`${label}: missing audioContent`);

  const wavPath = path.join(workDir, `${label}.wav`);
  writeFileSync(wavPath, Buffer.from(json.audioContent, "base64"));
  if (options.keepBatches) copyFileSync(wavPath, path.join(options.keepBatches, `${label}.wav`));
  return wavPath;
}

function probeDuration(filePath) {
  return Number(
    execFileSync(
      "ffprobe",
      [
        "-v",
        "error",
        "-show_entries",
        "format=duration",
        "-of",
        "default=noprint_wrappers=1:nokey=1",
        filePath,
      ],
      { encoding: "utf8" },
    ).trim(),
  );
}

function detectSilences(input, noise, silenceDuration, totalDuration) {
  const result = spawnSync(
    "ffmpeg",
    [
      "-hide_banner",
      "-i",
      input,
      "-af",
      `silencedetect=noise=${noise}:d=${silenceDuration}`,
      "-f",
      "null",
      "-",
    ],
    { encoding: "utf8" },
  );
  if (result.status !== 0) throw new Error(result.stderr);

  const silences = [];
  let currentStart = null;
  for (const line of result.stderr.split("\n")) {
    const startMatch = line.match(/silence_start: ([0-9.]+)/);
    if (startMatch) currentStart = Number(startMatch[1]);
    const endMatch = line.match(/silence_end: ([0-9.]+)/);
    if (endMatch && currentStart !== null) {
      silences.push({ start: currentStart, end: Number(endMatch[1]) });
      currentStart = null;
    }
  }
  if (currentStart !== null) silences.push({ start: currentStart, end: totalDuration });
  return silences;
}

function buildSegments(silences, totalDuration) {
  const segments = [];
  let previousSilenceEnd = 0;
  for (const silence of silences) {
    if (silence.start - previousSilenceEnd > 0.1) {
      segments.push({
        start: Math.max(0, previousSilenceEnd - 0.03),
        end: Math.min(totalDuration, silence.start + 0.12),
      });
    }
    previousSilenceEnd = silence.end;
  }
  if (totalDuration - previousSilenceEnd > 0.1) {
    segments.push({
      start: Math.max(0, previousSilenceEnd - 0.03),
      end: totalDuration,
    });
  }
  return segments;
}

function mergeExtraSegments(words, rawSegments) {
  const segments = rawSegments.map((segment) => ({ ...segment }));
  let extraCount = segments.length - words.length;
  if (extraCount <= 0) return segments;

  for (let wordIndex = 0; wordIndex < words.length && extraCount > 0; wordIndex += 1) {
    const chunkCount =
      words[wordIndex].hanzi.length > 1
        ? Math.min(words[wordIndex].hanzi.length, extraCount + 1)
        : 1;
    if (chunkCount <= 1) continue;
    const segmentIndex = wordIndex;
    if (segmentIndex + chunkCount - 1 >= segments.length) break;
    segments[segmentIndex] = {
      start: segments[segmentIndex].start,
      end: segments[segmentIndex + chunkCount - 1].end,
    };
    segments.splice(segmentIndex + 1, chunkCount - 1);
    extraCount -= chunkCount - 1;
  }
  return segments;
}

function chooseSegments(wavPath, words, options, label) {
  const totalDuration = probeDuration(wavPath);
  let best = null;
  for (const silenceDuration of SILENCE_DURATIONS) {
    const silences = detectSilences(wavPath, options.noise, silenceDuration, totalDuration);
    const rawSegments = buildSegments(silences, totalDuration);
    const segments = mergeExtraSegments(words, rawSegments);
    console.log(
      `${label}: silence=${silenceDuration}, silences=${silences.length}, rawSegments=${rawSegments.length}, segments=${segments.length}`,
    );
    if (segments.length === words.length) return segments;
    if (
      !best ||
      Math.abs(segments.length - words.length) < Math.abs(best.segments.length - words.length)
    ) {
      best = { silences, rawSegments, segments };
    }
  }

  throw new Error(`${label}: expected ${words.length} segments, got ${best?.segments.length ?? 0}`);
}

function cutAndWrite(wavPath, words, segments, options, workDir, selectedOffset) {
  for (const [index, word] of words.entries()) {
    const segment = segments[index];
    const targetPath = path.resolve("public", word.audioSrc.replace(/^\//, ""));
    const tempPath = path.join(workDir, path.basename(word.audioSrc));
    const targetDir = path.dirname(targetPath);
    if (!existsSync(targetDir)) mkdirSync(targetDir, { recursive: true });
    execFileSync("ffmpeg", [
      "-y",
      "-v",
      "error",
      "-i",
      wavPath,
      "-af",
      `atrim=start=${segment.start.toFixed(3)}:end=${segment.end.toFixed(3)},asetpts=PTS-STARTPTS`,
      "-codec:a",
      "libmp3lame",
      "-b:a",
      options.bitrate,
      tempPath,
    ]);
    copyFileSync(tempPath, targetPath);
    const displayIndex = selectedOffset + index + 1;
    console.log(
      `${String(displayIndex).padStart(3, "0")} ${word.hanzi} ${segment.start.toFixed(3)}-${segment.end.toFixed(3)} -> ${targetPath}`,
    );
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const lessonFile = path.resolve(options.lessonFile);
  const allWords = parseLessonWords(lessonFile);
  const selectedWords = selectRange(allWords, options.range);
  const selectedOffset = options.range ? Number(options.range.match(/^(\d+)-/)?.[1] ?? 1) - 1 : 0;
  const batches = chunkWords(selectedWords, options.batchSize);

  console.log(`lessonFile=${lessonFile}`);
  console.log(
    `words=${allWords.length}, selected=${selectedWords.length}, batches=${batches.length}`,
  );
  for (const [batchIndex, batch] of batches.entries()) {
    console.log(`batch ${batchIndex + 1}: ${batch.words.map((word) => word.hanzi).join(" ")}`);
  }
  if (options.dryRun) return;

  const workDir = mkdtempSync(path.join(tmpdir(), "google-tts-batch-audio-"));
  for (const batch of batches) {
    const labelStart = selectedOffset + batch.startIndex + 1;
    const labelEnd = selectedOffset + batch.startIndex + batch.words.length;
    const label = `${String(labelStart).padStart(3, "0")}-${String(labelEnd).padStart(3, "0")}`;
    console.log(`${label}: generating ${batch.words.length} words`);
    const wavPath = await synthesizeBatch(batch.words, options, label, workDir);
    const segments = chooseSegments(wavPath, batch.words, options, label);
    cutAndWrite(
      wavPath,
      batch.words,
      segments,
      options,
      workDir,
      selectedOffset + batch.startIndex,
    );
  }
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
