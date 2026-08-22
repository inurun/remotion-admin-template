import type { VoicevoxSynthesisSettings, VoisonaSynthesisSettings } from "@/_schemas";
import type { components } from "@/server/generated/haqumei-api/schema";

export const VOICEVOX_SYNTHESIS_DEFAULTS = {
  outputStereo: true,
  prePhonemeLength: 0,
  postPhonemeLength: 0.1,
  pauseLengthScale: 0.5,
} as const;

const SYNTHESIS_SCHEMA_VERSION = "2";

function omitUndefinedSettings<T extends Record<string, unknown>>(value: T) {
  return Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined)) as T;
}

function omitNullExceptPauseLength(value: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(value).filter(([key, entry]) => entry !== null || key === "pauseLength"),
  );
}

export function buildVoicevoxSynthesisSettings(
  effective?: VoicevoxSynthesisSettings,
): components["schemas"]["VoicevoxSynthesisSettings"] {
  return omitNullExceptPauseLength(
    omitUndefinedSettings({
      ...VOICEVOX_SYNTHESIS_DEFAULTS,
      ...effective,
    }),
  ) as components["schemas"]["VoicevoxSynthesisSettings"];
}

export function buildVoicevoxSynthesisRequest(input: {
  item: components["schemas"]["G2pItem"];
  speaker: number;
  synthesisSettings?: VoicevoxSynthesisSettings;
}): components["schemas"]["VoicevoxSynthesisRequest"] {
  return {
    schema_version: SYNTHESIS_SCHEMA_VERSION,
    item: input.item,
    speaker: input.speaker,
    synthesis_settings: buildVoicevoxSynthesisSettings(input.synthesisSettings),
  };
}

function isEmptyVoisonaSettings(settings?: VoisonaSynthesisSettings) {
  if (!settings) {
    return true;
  }

  return Object.values(settings).every((value) => value === undefined);
}

export function buildVoisonaSynthesisRequest(input: {
  item: components["schemas"]["G2pItem"];
  voiceName: string;
  voiceVersion?: string;
  synthesisSettings?: VoisonaSynthesisSettings;
}): components["schemas"]["VoisonaSynthesisRequest"] {
  const synthesisSettings = isEmptyVoisonaSettings(input.synthesisSettings)
    ? undefined
    : omitUndefinedSettings(input.synthesisSettings ?? {});

  return {
    schema_version: SYNTHESIS_SCHEMA_VERSION,
    item: input.item,
    voice_name: input.voiceName,
    ...(input.voiceVersion ? { voice_version: input.voiceVersion } : {}),
    ...(synthesisSettings
      ? {
          synthesis_settings:
            synthesisSettings as components["schemas"]["VoisonaSynthesisSettings"],
        }
      : {}),
  };
}
