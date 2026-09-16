import type { VoiceOption, VoicePreset } from "@/_schemas";
import { voicePresetId } from "@/_schemas";

type TtsSynthesisFields = {
  provider: VoicePreset["provider"];
  voiceName?: string;
  voiceVersion?: string;
  synthesisSettings?: VoicePreset["synthesisSettings"] | null;
};

function getConcreteSynthesisSettings(value: TtsSynthesisFields["synthesisSettings"]) {
  return !value || Object.keys(value).length === 0 ? undefined : value;
}

export function getVoicePresetSettings(
  presets: Record<string, VoicePreset>,
  voice: Pick<VoiceOption, "provider" | "voiceName" | "voiceVersion">,
) {
  return presets[voicePresetId(voice)]?.synthesisSettings;
}

export function getEffectiveTtsSynthesisSettings(
  item: Pick<TtsSynthesisFields, "provider" | "voiceName" | "voiceVersion" | "synthesisSettings">,
  presets: Record<string, VoicePreset>,
) {
  return (
    getConcreteSynthesisSettings(item.synthesisSettings) ??
    getConcreteSynthesisSettings(
      getVoicePresetSettings(presets, {
        provider: item.provider,
        voiceName: item.voiceName ?? "",
        voiceVersion: item.voiceVersion ?? "",
      }),
    )
  );
}

export function resolveTtsSynthesisSettings<T extends TtsSynthesisFields>(
  item: T,
  presets: Record<string, VoicePreset>,
): T {
  const synthesisSettings = getEffectiveTtsSynthesisSettings(item, presets);
  return {
    ...item,
    ...(synthesisSettings ? { synthesisSettings } : { synthesisSettings: undefined }),
  };
}
