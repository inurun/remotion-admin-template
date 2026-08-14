import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import type { VoiceOption, VoicevoxSynthesisSettings } from "@/_schemas";
import { getProjectTtsDir, toProjectTtsSrc } from "@/server/_shared/storage";
import type { ServerEnv } from "@/server/core/env";
import type { components } from "@/server/generated/voicevox/schema";
import type { SynthesizeResponse } from "@/server/features/voisona/contract";
import { getWavDurationSeconds } from "@/server/features/voisona/wav";
import { getVoicevoxClient } from "./client";
import {
  voicevoxAnalyzeRequestSchema,
  voicevoxSynthesizeRequestSchema,
  type VoicevoxSynthesizeRequest,
} from "./contract";

type AudioQuery = components["schemas"]["AudioQuery"];
type Speaker = components["schemas"]["Speaker"];

const inFlightSyntheses = new Map<string, Promise<SynthesizeResponse>>();

function getVoicevoxErrorMessage(error: unknown) {
  return JSON.stringify(error ?? "empty_response");
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }

  if (value && typeof value === "object") {
    return `{${Object.entries(value)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, entry]) => `${JSON.stringify(key)}:${stableStringify(entry)}`)
      .join(",")}}`;
  }

  return JSON.stringify(value);
}

function parseSpeakerId(voiceName: string) {
  const speaker = Number(voiceName);
  if (!Number.isInteger(speaker)) {
    throw new Error(`VOICEVOX voiceName must be a style id: ${voiceName}`);
  }

  return speaker;
}

function toTalkVoiceOptions(speakers: Speaker[]): VoiceOption[] {
  return speakers.flatMap((speaker) =>
    speaker.styles
      .filter((style) => style.type === "talk")
      .map((style) => ({
        provider: "voicevox" as const,
        voiceName: String(style.id),
        voiceVersion: speaker.version,
        displayName: `${speaker.name} / ${style.name}`,
      })),
  );
}

export async function listVoicevoxVoices(serverEnv: ServerEnv) {
  const response = await getVoicevoxClient(serverEnv).GET("/speakers", {
    cache: "no-store",
  });

  if (!response.response.ok || !response.data) {
    throw new Error(
      `Unable to fetch VOICEVOX voices (/speakers: ${getVoicevoxErrorMessage(response.error)})`,
    );
  }

  return toTalkVoiceOptions(response.data);
}

async function createAudioQuery(
  serverEnv: ServerEnv,
  input: { text: string; voiceName: string },
): Promise<AudioQuery> {
  const parsed = voicevoxAnalyzeRequestSchema.parse(input);
  const response = await getVoicevoxClient(serverEnv).POST("/audio_query", {
    params: {
      query: {
        text: parsed.text,
        speaker: parseSpeakerId(parsed.voiceName),
        enable_katakana_english: true,
      },
    },
  });

  if (!response.response.ok || !response.data) {
    throw new Error(
      `VOICEVOX audio query request failed: ${getVoicevoxErrorMessage(response.error)}`,
    );
  }

  return response.data;
}

export async function analyzeVoicevoxText(
  serverEnv: ServerEnv,
  input: { text: string; voiceName: string },
) {
  return {
    analysis: stableStringify(await createAudioQuery(serverEnv, input)),
  };
}

function parseAnalysisJson(analysis: string) {
  const parsed = JSON.parse(analysis) as unknown;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("VOICEVOX analysis must be a JSON object");
  }

  return parsed as AudioQuery;
}

function applyVoicevoxDefaults(audioQuery: AudioQuery): AudioQuery {
  return {
    ...audioQuery,
    outputStereo: true,
    prePhonemeLength: 0,
    postPhonemeLength: 0.1,
    pauseLengthScale: 0.5,
  };
}

function mergeSynthesisSettings(
  audioQuery: AudioQuery,
  synthesisSettings: VoicevoxSynthesisSettings | undefined,
): AudioQuery {
  return {
    ...applyVoicevoxDefaults(audioQuery),
    ...synthesisSettings,
  };
}

async function getAudioQueryForSynthesis(serverEnv: ServerEnv, parsed: VoicevoxSynthesizeRequest) {
  if (parsed.analysis?.trim()) {
    return parseAnalysisJson(parsed.analysis);
  }

  return createAudioQuery(serverEnv, parsed);
}

async function getCachedSynthesisResult(outputPath: string, audioSrc: string) {
  try {
    await fs.access(outputPath);
    return {
      outputPath,
      audioSrc,
      durationSec: await getWavDurationSeconds(outputPath),
    } satisfies SynthesizeResponse;
  } catch {
    return null;
  }
}

async function requestSynthesis(
  serverEnv: ServerEnv,
  parsed: VoicevoxSynthesizeRequest,
  body: AudioQuery,
) {
  const response = await getVoicevoxClient(serverEnv).POST("/synthesis", {
    params: {
      query: {
        speaker: parseSpeakerId(parsed.voiceName),
      },
    },
    body,
    parseAs: "blob",
  });

  if (!response.response.ok || !response.data) {
    throw new Error(
      `VOICEVOX synthesis request failed: ${getVoicevoxErrorMessage(response.error)}`,
    );
  }

  return response.data;
}

function createSynthesisTask({
  audioSrc,
  outputPath,
  parsed,
  serverEnv,
}: {
  audioSrc: string;
  outputPath: string;
  parsed: VoicevoxSynthesizeRequest;
  serverEnv: ServerEnv;
}) {
  return (async () => {
    await fs.mkdir(path.dirname(outputPath), { recursive: true });

    const cached = await getCachedSynthesisResult(outputPath, audioSrc);
    if (cached) {
      return cached;
    }

    const audioQuery = await getAudioQueryForSynthesis(serverEnv, parsed);
    const body = mergeSynthesisSettings(audioQuery, parsed.synthesisSettings ?? undefined);
    const audio = await requestSynthesis(serverEnv, parsed, body);
    await fs.writeFile(outputPath, new Uint8Array(await audio.arrayBuffer()));

    return {
      outputPath,
      audioSrc,
      durationSec: await getWavDurationSeconds(outputPath),
    } satisfies SynthesizeResponse;
  })();
}

export async function synthesizeVoicevox(input: {
  serverEnv: ServerEnv;
  projectPath: string;
  text: string;
  analysis?: string;
  voiceName: string;
  voiceVersion?: string;
  synthesisSettings?: VoicevoxSynthesisSettings;
}) {
  const { serverEnv, projectPath, ...payload } = input;
  const parsed = voicevoxSynthesizeRequestSchema.parse(payload);
  const cacheKey = crypto
    .createHash("md5")
    .update(
      stableStringify({
        provider: "voicevox",
        text: parsed.text,
        analysis: parsed.analysis,
        voiceName: parsed.voiceName,
        voiceVersion: parsed.voiceVersion,
        synthesisSettings: parsed.synthesisSettings,
      }),
    )
    .digest("hex");
  const fileName = `${cacheKey}.wav`;
  const outputPath = path.join(getProjectTtsDir(projectPath), fileName);
  const audioSrc = toProjectTtsSrc(projectPath, fileName);

  const existing = inFlightSyntheses.get(outputPath);
  if (existing) {
    return existing;
  }

  const task = createSynthesisTask({
    audioSrc,
    outputPath,
    parsed,
    serverEnv,
  });

  inFlightSyntheses.set(outputPath, task);

  try {
    return await task;
  } finally {
    if (inFlightSyntheses.get(outputPath) === task) {
      inFlightSyntheses.delete(outputPath);
    }
  }
}
