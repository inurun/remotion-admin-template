import type { VoiceOption } from "@/_schemas";
import type { ServerEnv } from "@/server/core/env";
import { clearProjectTtsCache } from "@/server/_shared/storage";
import { analyzeText } from "@/server/features/haqumei-api/analyze";
import { validateG2pItem } from "@/server/features/haqumei-api/validate";
import {
  listOptionalVoisonaVoices,
  listVoicevoxVoices,
} from "@/server/features/haqumei-api/voices";
import { getHaqumeiApiUrl } from "@/server/features/haqumei-api/client";
import { getVoicepeakBase, listVoicepeakVoices } from "@/server/features/voicepeak/use-case";
import {
  ttsAnalyzeRequestSchema,
  ttsClearCacheRequestSchema,
  ttsSynthesizeRequestSchema,
  ttsValidateRequestSchema,
} from "./contract";
import { getEffectiveReadText, getUsableG2p } from "./providers/comparison";
import { getTtsProvider } from "./providers/registry";
import type { TtsSynthesisInput } from "./providers/types";

export { analyzeTtsPageWithLlm } from "./llm-analysis";

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
  const haqumeiApiUrl = getHaqumeiApiUrl(serverEnv);
  const [voisona, voicevox, voicepeak] = await Promise.all([
    loadProviderVoices("VoiSona", haqumeiApiUrl, listOptionalVoisonaVoices(serverEnv)),
    loadProviderVoices("VOICEVOX", haqumeiApiUrl, listVoicevoxVoices(serverEnv)),
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
  return { g2p: await analyzeText(serverEnv, parsed.text) };
}

export async function validateTtsG2p(serverEnv: ServerEnv, input: unknown) {
  const parsed = ttsValidateRequestSchema.parse(input);
  return { g2p: await validateG2pItem(serverEnv, parsed) };
}

export async function synthesizeTts(serverEnv: ServerEnv, input: unknown) {
  const parsed = ttsSynthesizeRequestSchema.parse(input);
  const provider = getTtsProvider(parsed.provider);
  const readText = getEffectiveReadText(parsed);
  const g2p = provider.usesG2p
    ? (getUsableG2p(parsed.g2p, readText) ?? (await analyzeText(serverEnv, readText)))
    : parsed.g2p;
  const synthesisInput = {
    provider: parsed.provider,
    projectPath: parsed.projectPath,
    text: parsed.text,
    readText,
    voiceName: parsed.voiceName,
    voiceVersion: parsed.voiceVersion ?? "",
    ...(g2p ? { g2p } : {}),
    synthesisSettings: parsed.synthesisSettings ?? undefined,
  } satisfies TtsSynthesisInput<typeof parsed.provider>;

  return provider.synthesize(serverEnv, synthesisInput as never);
}

export async function clearTtsCache(input: unknown) {
  const parsed = ttsClearCacheRequestSchema.parse(input);
  await clearProjectTtsCache(parsed.projectPath);
  return { ok: true as const };
}
