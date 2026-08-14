import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import type { VoiceOption, VoicepeakSynthesisSettings } from "@/_schemas";
import { getProjectTtsDir, toProjectTtsSrc } from "@/server/_shared/storage";
import type { ServerEnv } from "@/server/core/env";
import type { SynthesizeResponse } from "@/server/features/voisona/contract";
import { getWavDurationSeconds } from "@/server/features/voisona/wav";
import { getVoicepeakPath, listNarrators, runVoicepeakSynthesis } from "./cli";
import {
  voicepeakAnalyzeRequestSchema,
  voicepeakSynthesizeRequestSchema,
  type VoicepeakSynthesizeRequest,
} from "./contract";
import {
  DEFAULT_KASANE_TETO_EMOTION,
  DEFAULT_VOICEPEAK_PITCH,
  DEFAULT_VOICEPEAK_SPEED,
  KASANE_TETO_NARRATOR,
  VOICEPEAK_DIRECT_ANALYSIS,
} from "./defaults";

const inFlightSyntheses = new Map<string, Promise<SynthesizeResponse>>();

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

function toVoiceOptions(narrators: string[]): VoiceOption[] {
  return narrators.map((narrator) => ({
    provider: "voicepeak" as const,
    voiceName: narrator,
    displayName: narrator,
  }));
}

export function getVoicepeakBase(serverEnv: ServerEnv) {
  return getVoicepeakPath(serverEnv);
}

export async function listVoicepeakVoices(serverEnv: ServerEnv) {
  return toVoiceOptions(await listNarrators(serverEnv));
}

export async function analyzeVoicepeakText(_serverEnv: ServerEnv, input: { text: string }) {
  voicepeakAnalyzeRequestSchema.parse(input);
  return { analysis: VOICEPEAK_DIRECT_ANALYSIS };
}

function resolveSynthesisSettings(
  narrator: string,
  synthesisSettings: VoicepeakSynthesisSettings | null | undefined,
) {
  const speed = synthesisSettings?.speed ?? DEFAULT_VOICEPEAK_SPEED;
  const pitch = synthesisSettings?.pitch ?? DEFAULT_VOICEPEAK_PITCH;
  const emotion =
    synthesisSettings?.emotion ??
    (narrator === KASANE_TETO_NARRATOR ? { ...DEFAULT_KASANE_TETO_EMOTION } : undefined);

  return { speed, pitch, emotion };
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

function createSynthesisTask({
  audioSrc,
  outputPath,
  parsed,
  serverEnv,
}: {
  audioSrc: string;
  outputPath: string;
  parsed: VoicepeakSynthesizeRequest;
  serverEnv: ServerEnv;
}) {
  return (async () => {
    await fs.mkdir(path.dirname(outputPath), { recursive: true });

    const cached = await getCachedSynthesisResult(outputPath, audioSrc);
    if (cached) {
      return cached;
    }

    const resolved = resolveSynthesisSettings(parsed.voiceName, parsed.synthesisSettings);

    try {
      await runVoicepeakSynthesis(serverEnv, {
        text: parsed.text,
        narrator: parsed.voiceName,
        outputPath,
        ...(resolved.emotion ? { emotion: resolved.emotion } : {}),
        speed: resolved.speed,
        pitch: resolved.pitch,
      });
    } catch (error) {
      await fs.unlink(outputPath).catch(() => {});
      throw error;
    }

    return {
      outputPath,
      audioSrc,
      durationSec: await getWavDurationSeconds(outputPath),
    } satisfies SynthesizeResponse;
  })();
}

export async function synthesizeVoicepeak(input: {
  serverEnv: ServerEnv;
  projectPath: string;
  text: string;
  analysis?: string;
  voiceName: string;
  voiceVersion?: string;
  synthesisSettings?: VoicepeakSynthesisSettings;
}) {
  const { serverEnv, projectPath, ...payload } = input;
  const parsed = voicepeakSynthesizeRequestSchema.parse(payload);
  const resolved = resolveSynthesisSettings(parsed.voiceName, parsed.synthesisSettings);
  const cacheKey = crypto
    .createHash("md5")
    .update(
      stableStringify({
        provider: "voicepeak",
        text: parsed.text,
        voiceName: parsed.voiceName,
        voiceVersion: parsed.voiceVersion,
        speed: resolved.speed,
        pitch: resolved.pitch,
        emotion: resolved.emotion,
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
