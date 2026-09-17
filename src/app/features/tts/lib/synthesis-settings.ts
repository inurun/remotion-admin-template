import type { VoiceOption, VoicePreset, VoiceIdentity } from "@/_schemas";
import { toVoiceIdentity, voicePresetId } from "@/_schemas";

type TtsSynthesisFields = {
  provider: VoicePreset["provider"];
  voiceName?: string;
  voiceVersion?: string;
  speakerUuid?: string;
  styleId?: number;
  modelVersion?: string;
  synthesisSettings?: VoicePreset["synthesisSettings"] | null;
};

function getConcreteSynthesisSettings(value: TtsSynthesisFields["synthesisSettings"]) {
  return !value || Object.keys(value).length === 0 ? undefined : value;
}

export function getVoicePresetSettings(
  presets: Record<string, VoicePreset>,
  voice: VoiceOption | VoiceIdentity,
) {
  return presets[voicePresetId(voice)]?.synthesisSettings;
}

export function getEffectiveTtsSynthesisSettings(
  item: TtsSynthesisFields,
  presets: Record<string, VoicePreset>,
) {
  const identity = toVoiceIdentity(item);
  return (
    getConcreteSynthesisSettings(item.synthesisSettings) ??
    getConcreteSynthesisSettings(identity ? getVoicePresetSettings(presets, identity) : undefined)
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
