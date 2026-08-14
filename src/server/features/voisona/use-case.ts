import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import type { VoisonaSynthesisSettings } from "@/_schemas";
import type { ServerEnv } from "@/server/core/env";
import { getProjectTtsDir, toProjectTtsSrc } from "@/server/_shared/storage";
import { getVoisonaClient, waitForVoisonaRequest } from "./client";
import {
  synthesizeRequestSchema,
  type SynthesizeRequest,
  type SynthesizeResponse,
  textAnalysisRequestSchema,
} from "./contract";
import { applyVoisonaTextTransforms } from "./text";
import { collectVoiceOptions, dedupeVoiceOptions } from "./voice-options";
import { getWavDurationSeconds } from "./wav";

const inFlightSyntheses = new Map<string, Promise<SynthesizeResponse>>();

function getVoisonaErrorMessage(error: unknown) {
  return JSON.stringify(error ?? "empty_response");
}

export async function analyzeVoisonaText(
  serverEnv: ServerEnv,
  input: { text: string; language?: string },
) {
  const { text, language } = textAnalysisRequestSchema.parse(input);
  const client = getVoisonaClient(serverEnv);
  const response = await client.POST("/text-analyses", {
    body: {
      language,
      text: applyVoisonaTextTransforms(text),
      force_enqueue: true,
    },
  });

  if (!response.response.ok || !response.data) {
    throw new Error(
      `VoiSona text analysis request failed: ${getVoisonaErrorMessage(response.error)}`,
    );
  }

  const result = await waitForVoisonaRequest(serverEnv, "text-analyses", response.data.uuid);

  if (!result.analyzed_text) {
    throw new Error("VoiSona text analysis succeeded without analyzed_text");
  }

  return {
    analysis: result.analyzed_text,
  };
}

export async function synthesizeVoisona(input: {
  serverEnv: ServerEnv;
  projectPath: string;
  text: string;
  analysis?: string;
  analyzedText?: string;
  voiceName: string;
  voiceVersion?: string;
  synthesisSettings?: VoisonaSynthesisSettings;
}) {
  const { serverEnv, projectPath, ...payload } = input;
  const parsed = synthesizeRequestSchema.parse(payload);
  const transformedText = applyVoisonaTextTransforms(parsed.text);
  const analysis = parsed.analysis ?? parsed.analyzedText;
  const cacheKey = crypto
    .createHash("md5")
    .update(
      JSON.stringify({
        provider: "voisona",
        text: transformedText,
        analysis,
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
    transformedText,
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

function getSpeechSynthesisBody(
  parsed: SynthesizeRequest,
  transformedText: string,
  outputPath: string,
) {
  return {
    language: "ja_JP",
    ...getSpeechSynthesisTextBody(parsed, transformedText),
    destination: "file" as const,
    can_overwrite_file: true,
    output_file_path: outputPath,
    voice_name: parsed.voiceName,
    ...getVoiceVersionBody(parsed.voiceVersion),
    ...getGlobalParametersBody(parsed),
    force_enqueue: true,
  };
}

function getSpeechSynthesisTextBody(parsed: SynthesizeRequest, transformedText: string) {
  const analysis = parsed.analysis ?? parsed.analyzedText;
  if (analysis) {
    return { analyzed_text: analysis, text: "" };
  }

  return { text: transformedText };
}

function getVoiceVersionBody(voiceVersion: string | undefined) {
  if (!voiceVersion) {
    return {};
  }

  return { voice_version: voiceVersion };
}

function getGlobalParametersBody(parsed: SynthesizeRequest) {
  if (!parsed.synthesisSettings) {
    return {};
  }

  return { global_parameters: parsed.synthesisSettings };
}

async function requestSpeechSynthesis(
  serverEnv: ServerEnv,
  parsed: SynthesizeRequest,
  transformedText: string,
  outputPath: string,
) {
  const client = getVoisonaClient(serverEnv);
  const response = await client.POST("/speech-syntheses", {
    body: getSpeechSynthesisBody(parsed, transformedText, outputPath),
  });

  if (!response.response.ok || !response.data) {
    throw new Error(`VoiSona synthesis request failed: ${getVoisonaErrorMessage(response.error)}`);
  }

  return response.data;
}

function createSynthesisTask({
  audioSrc,
  outputPath,
  parsed,
  serverEnv,
  transformedText,
}: {
  audioSrc: string;
  outputPath: string;
  parsed: SynthesizeRequest;
  serverEnv: ServerEnv;
  transformedText: string;
}) {
  return (async () => {
    await fs.mkdir(path.dirname(outputPath), { recursive: true });

    const cached = await getCachedSynthesisResult(outputPath, audioSrc);
    if (cached) {
      return cached;
    }

    const { uuid } = await requestSpeechSynthesis(serverEnv, parsed, transformedText, outputPath);
    await waitForVoisonaRequest(serverEnv, "speech-syntheses", uuid);

    return {
      outputPath,
      audioSrc,
      durationSec: await getWavDurationSeconds(outputPath),
    } satisfies SynthesizeResponse;
  })();
}

function collectVoicesResult(json: Parameters<typeof collectVoiceOptions>[0]) {
  const options: Parameters<typeof dedupeVoiceOptions>[0] = [];
  collectVoiceOptions(json, options);
  const deduped = dedupeVoiceOptions(options);

  if (deduped.length === 0) {
    throw new Error("Unable to fetch VoiSona voices (/voices: empty_response)");
  }

  return deduped;
}

export async function listVoisonaVoices(serverEnv: ServerEnv) {
  const response = await getVoisonaClient(serverEnv).GET("/voices", {
    cache: "no-store",
  });

  if (!response.response.ok || !response.data) {
    throw new Error(
      `Unable to fetch VoiSona voices (/voices: ${getVoisonaErrorMessage(response.error)})`,
    );
  }

  return collectVoicesResult(response.data as Parameters<typeof collectVoiceOptions>[0]);
}
