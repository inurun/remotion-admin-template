import type { VoiceOption } from "@/_schemas";
import type { ServerEnv } from "@/server/core/env";
import { clearProjectTtsCache } from "@/server/_shared/storage";
import { getVoisonaBase } from "@/server/features/voisona/client";
import { listVoisonaVoices } from "@/server/features/voisona/use-case";
import { getVoicepeakBase, listVoicepeakVoices } from "@/server/features/voicepeak/use-case";
import { getVoicevoxBase } from "@/server/features/voicevox/client";
import { listVoicevoxVoices } from "@/server/features/voicevox/use-case";
import {
  ttsAnalyzeRequestSchema,
  ttsClearCacheRequestSchema,
  ttsSynthesizeRequestSchema,
} from "./contract";
import { getTtsProvider } from "./providers/registry";
import type { TtsSynthesisInput } from "./providers/types";

async function loadProviderVoices<T>(label: string, baseUrl: string, task: Promise<T>): Promise<T> {
  try {
    return await task;
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to load ${label} voices (${baseUrl}): ${detail}`, { cause: error });
  }
}

async function loadOptionalProviderVoices(
  label: string,
  baseUrl: string,
  task: Promise<VoiceOption[]>,
): Promise<VoiceOption[]> {
  try {
    return await task;
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    console.warn(`Skipping ${label} voices (${baseUrl}): ${detail}`);
    return [];
  }
}

export async function listTtsVoices(serverEnv: ServerEnv) {
  const [voisona, voicevox, voicepeak] = await Promise.all([
    loadProviderVoices("Voisona", getVoisonaBase(serverEnv), listVoisonaVoices(serverEnv)),
    loadProviderVoices("VOICEVOX", getVoicevoxBase(serverEnv), listVoicevoxVoices(serverEnv)),
    loadOptionalProviderVoices(
      "VoicePeak",
      getVoicepeakBase(serverEnv),
      listVoicepeakVoices(serverEnv),
    ),
  ]);

  return [...voisona, ...voicevox, ...voicepeak];
}

export async function analyzeTts(serverEnv: ServerEnv, input: unknown) {
  const parsed = ttsAnalyzeRequestSchema.parse(input);
  const analysis = await getTtsProvider(parsed.provider).analyze(serverEnv, {
    provider: parsed.provider,
    text: parsed.text,
    readText: parsed.text,
    voiceName: "voiceName" in parsed ? parsed.voiceName : "",
    voiceVersion: "",
    analysis: "",
  } as never);

  return { analysis };
}

export async function synthesizeTts(serverEnv: ServerEnv, input: unknown) {
  const parsed = ttsSynthesizeRequestSchema.parse(input);
  const synthesisInput = {
    provider: parsed.provider,
    projectPath: parsed.projectPath,
    text: parsed.text,
    readText: parsed.text,
    voiceName: parsed.voiceName,
    voiceVersion: parsed.voiceVersion ?? "",
    analysis: parsed.analysis ?? "",
    synthesisSettings: parsed.synthesisSettings ?? undefined,
  } satisfies TtsSynthesisInput<typeof parsed.provider>;

  return getTtsProvider(parsed.provider).synthesize(serverEnv, synthesisInput as never);
}

export async function clearTtsCache(input: unknown) {
  const parsed = ttsClearCacheRequestSchema.parse(input);
  await clearProjectTtsCache(parsed.projectPath);
  return { ok: true as const };
}
