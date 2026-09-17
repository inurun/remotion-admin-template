import type { VoicePreset, VoiceOption, VoiceIdentity } from "@/_schemas";
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

function presetIdFor(item: TtsSynthesisFields) {
  const identity = toVoiceIdentity(item);
  return identity ? voicePresetId(identity) : undefined;
}

export function getEffectiveTtsSynthesisSettings(
  item: TtsSynthesisFields,
  presets: Record<string, VoicePreset>,
) {
  const presetId = presetIdFor(item);
  const preset = presetId ? presets[presetId] : undefined;
  return (
    getConcreteSynthesisSettings(item.synthesisSettings) ??
    getConcreteSynthesisSettings(preset?.synthesisSettings)
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

export function getVoicePresetSettings(
  presets: Record<string, VoicePreset>,
  voice: VoiceOption | VoiceIdentity,
) {
  return presets[voicePresetId(voice)]?.synthesisSettings;
}
