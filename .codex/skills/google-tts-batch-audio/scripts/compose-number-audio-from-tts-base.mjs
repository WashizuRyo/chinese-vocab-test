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

function usage() {
  console.log(`Usage:
  node compose-number-audio-from-tts-base.mjs --lesson-file <path> [options]

Options:
  --lesson-file <path>       TypeScript number lesson file containing hanzi, japanese number, audioSrc
  --range <start-end>        1-based inclusive word range to write, e.g. 1-99
  --quota-project <id>       Google Cloud quota/billing project; can also use GOOGLE_CLOUD_QUOTA_PROJECT
  --speaking-rate <number>   TTS speakingRate for base 1-10; default ${DEFAULT_RATE}
  --keep-base <dir>          Save base 1-10 WAV/components for inspection
  --dry-run                  Parse and print component plans without calling Google or writing audio
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
      case "--quota-project":
        options.quotaProject = next();
        break;
      case "--speaking-rate":
        options.speakingRate = Number(next());
        break;
      case "--keep-base":
        options.keepBase = next();
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
  return options;
}

function parseLessonWords(lessonFile) {
  const source = readFileSync(lessonFile, "utf8");
  const matches = [
    ...source.matchAll(
      /hanzi: "([^"]+)",[\s\S]*?pinyin: "([^"]+)",[\s\S]*?japanese: "([^"]+)",[\s\S]*?audioSrc: "([^"]+)"/g,
    ),
  ];
  const words = matches.map((match) => ({
    hanzi: match[1],
    pinyin: match[2],
    japanese: match[3],
    audioSrc: match[4],
  }));
  if (words.length === 0) throw new Error(`No words found in ${lessonFile}`);
  return words;
}

function selectRange(words, rangeText) {
  if (!rangeText) return words;
  const match = rangeText.match(/^(\d+)-(\d+)$/);
  if (!match) throw new Error("--range must look like 1-99");
  const start = Number(match[1]);
  const end = Number(match[2]);
  if (start < 1 || end < start || end > words.length)
    throw new Error(`Invalid --range ${rangeText}`);
  return words.slice(start - 1, end);
}

function partsForNumber(numberValue) {
  if (numberValue < 1 || numberValue > 99)
    throw new Error(`Can only compose 1-99, got ${numberValue}`);
  if (numberValue <= 10) return [numberValue];
  if (numberValue < 20) return [10, numberValue % 10];
  const tens = Math.floor(numberValue / 10);
  const ones = numberValue % 10;
  return ones === 0 ? [tens, 10] : [tens, 10, ones];
}

function getAccessToken() {
  return execFileSync("gcloud", ["auth", "application-default", "print-access-token"], {
    encoding: "utf8",
  }).trim();
}

async function synthesizeBase(words, options, workDir) {
  const body = {
    audioConfig: { audioEncoding: "LINEAR16", pitch: 0, speakingRate: options.speakingRate },
    input: {
      prompt:
        "Read the Chinese numbers exactly. Use standard Mainland Mandarin. Use a neutral, consistent teaching voice. Keep a clear short pause between each number. Do not add extra words.",
      text: `${words.map((word) => word.hanzi).join("。")}。`,
    },
    voice: { languageCode: options.language, modelName: options.model, name: options.voice },
  };

  const headers = {
    Authorization: `Bearer ${getAccessToken()}`,
    "Content-Type": "application/json",
  };
  if (options.quotaProject) headers["x-goog-user-project"] = options.quotaProject;

  const response = await fetch(options.endpoint, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  const responseText = await response.text();
  if (!response.ok) throw new Error(`HTTP ${response.status}\n${responseText}`);
  const json = JSON.parse(responseText);
  if (!json.audioContent) throw new Error("missing audioContent");

  const wavPath = path.join(workDir, "base-1-10.wav");
  writeFileSync(wavPath, Buffer.from(json.audioContent, "base64"));
  if (options.keepBase) {
    mkdirSync(options.keepBase, { recursive: true });
    writeFileSync(
      path.join(options.keepBase, "base-1-10-request.json"),
      `${JSON.stringify(body, null, 2)}\n`,
    );
    copyFileSync(wavPath, path.join(options.keepBase, "base-1-10.wav"));
  }
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

function detectSilences(input, duration, totalDuration) {
  const result = spawnSync(
    "ffmpeg",
    [
      "-hide_banner",
      "-i",
      input,
      "-af",
      `silencedetect=noise=-35dB:d=${duration}`,
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

function buildSegments(input, expectedCount) {
  const totalDuration = probeDuration(input);
  for (const duration of [0.3, 0.25, 0.2, 0.15]) {
    const silences = detectSilences(input, duration, totalDuration);
    const segments = [];
    let previousSilenceEnd = 0;
    for (const silence of silences) {
      if (silence.start - previousSilenceEnd > 0.1) {
        segments.push({
          start: Math.max(0, previousSilenceEnd - 0.015),
          end: Math.min(totalDuration, silence.start + 0.04),
        });
      }
      previousSilenceEnd = silence.end;
    }
    if (totalDuration - previousSilenceEnd > 0.1) {
      segments.push({ start: Math.max(0, previousSilenceEnd - 0.015), end: totalDuration });
    }
    console.log(
      `base cut: silence=${duration}, silences=${silences.length}, segments=${segments.length}`,
    );
    if (segments.length === expectedCount) return segments;
  }
  throw new Error(`Could not split base audio into ${expectedCount} segments`);
}

function run(cmd, args) {
  execFileSync(cmd, args, { stdio: ["ignore", "pipe", "inherit"] });
}

function createComponents(baseWav, baseWords, options, workDir) {
  const segments = buildSegments(baseWav, baseWords.length);
  const componentPaths = new Map();
  for (const [index, word] of baseWords.entries()) {
    const numberValue = Number(word.japanese);
    const segment = segments[index];
    const rawPath = path.join(workDir, `raw-${numberValue}.wav`);
    const componentPath = path.join(workDir, `component-${numberValue}.wav`);
    run("ffmpeg", [
      "-y",
      "-v",
      "error",
      "-i",
      baseWav,
      "-af",
      `atrim=start=${segment.start.toFixed(3)}:end=${segment.end.toFixed(3)},asetpts=PTS-STARTPTS`,
      rawPath,
    ]);
    run("ffmpeg", [
      "-y",
      "-v",
      "error",
      "-i",
      rawPath,
      "-af",
      "silenceremove=start_periods=1:start_duration=0.01:start_threshold=-45dB:stop_periods=1:stop_duration=0.04:stop_threshold=-45dB,apad=pad_dur=0.015",
      componentPath,
    ]);
    if (options.keepBase)
      copyFileSync(componentPath, path.join(options.keepBase, `component-${numberValue}.wav`));
    componentPaths.set(numberValue, componentPath);
    console.log(
      `component ${numberValue}: ${word.hanzi} ${segment.start.toFixed(3)}-${segment.end.toFixed(3)}`,
    );
  }
  return componentPaths;
}

function concatParts(partPaths, outputMp3, workDir) {
  const listPath = path.join(workDir, `concat-${path.basename(outputMp3)}.txt`);
  writeFileSync(
    listPath,
    partPaths.map((partPath) => `file '${partPath.replaceAll("'", "'\\''")}'`).join("\n"),
  );
  const targetDir = path.dirname(outputMp3);
  if (!existsSync(targetDir)) mkdirSync(targetDir, { recursive: true });
  run("ffmpeg", [
    "-y",
    "-v",
    "error",
    "-f",
    "concat",
    "-safe",
    "0",
    "-i",
    listPath,
    "-codec:a",
    "libmp3lame",
    "-b:a",
    "128k",
    outputMp3,
  ]);
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const lessonFile = path.resolve(options.lessonFile);
  const allWords = parseLessonWords(lessonFile);
  const selectedWords = selectRange(allWords, options.range);
  const baseWords = allWords.slice(0, 10);

  if (
    baseWords.length !== 10 ||
    baseWords.some((word, index) => Number(word.japanese) !== index + 1)
  ) {
    throw new Error("The first 10 lesson words must be numbers 1-10");
  }

  console.log(`lessonFile=${lessonFile}`);
  console.log(`words=${allWords.length}, selected=${selectedWords.length}`);
  for (const word of selectedWords) {
    console.log(
      `${word.japanese}: ${word.hanzi} <- ${partsForNumber(Number(word.japanese)).join("+")}`,
    );
  }
  if (options.dryRun) return;

  const workDir = mkdtempSync(path.join(tmpdir(), "number-composite-tts-"));
  const baseWav = await synthesizeBase(baseWords, options, workDir);
  const componentPaths = createComponents(baseWav, baseWords, options, workDir);

  for (const word of selectedWords) {
    const numberValue = Number(word.japanese);
    const partPaths = partsForNumber(numberValue).map((part) => componentPaths.get(part));
    if (partPaths.some((partPath) => !partPath))
      throw new Error(`Missing component for ${word.hanzi}`);
    const targetPath = path.resolve("public", word.audioSrc.replace(/^\//, ""));
    concatParts(partPaths, targetPath, workDir);
    console.log(`${String(numberValue).padStart(2, "0")} ${word.hanzi} -> ${targetPath}`);
  }
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
