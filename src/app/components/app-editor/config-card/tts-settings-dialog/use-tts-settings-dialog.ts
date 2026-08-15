import { useFormContext, useWatch } from "react-hook-form";
import type { DraftProject, DraftTts, VoicePreset } from "@/_schemas";
import { SynthesisSettingsFields } from "@/app/features/settings/components/synthesis-settings-fields";
import {
  getEffectiveTtsSynthesisSettings,
  getVoicePresetSettings,
} from "@/_shared/project/voice-presets";
import { useSelectedPage } from "@/app/features/page";
import { useSelectedTts } from "@/app/features/tts";

export function getDisplayedTtsSynthesisSettings(
  item: Pick<DraftTts, "provider" | "voiceName" | "voiceVersion" | "synthesisSettings">,
  presets: VoicePreset[],
) {
  return getEffectiveTtsSynthesisSettings(item, presets);
}

export function toStoredTtsSynthesisSettings(
  value: DraftTts["synthesisSettings"] | undefined,
): DraftTts["synthesisSettings"] {
  return value ?? null;
}

export function useTtsSettingsDialog() {
  const { selectedPageIndex } = useSelectedPage();
  const { selectedTtsIndex } = useSelectedTts();
  const { control, getValues, setValue } = useFormContext<DraftProject>();
  const name = `pages.${selectedPageIndex}.tts.${selectedTtsIndex}` as const;
  const item = useWatch({ control, name });
  const voicePresets = useWatch({ control, name: "voicePresets" }) ?? [];

  const setSynthesisSettings: Parameters<typeof SynthesisSettingsFields>[0]["onChange"] = (
    value,
  ) => {
    setValue(`${name}.synthesisSettings`, toStoredTtsSynthesisSettings(value), {
      shouldDirty: true,
      shouldValidate: true,
    });
  };

  const loadPreset = () => {
    setSynthesisSettings(
      getVoicePresetSettings(getValues("voicePresets"), {
        provider: item.provider,
        voiceName: item.voiceName ?? "",
        voiceVersion: item.voiceVersion ?? "",
      }),
    );
  };

  return {
    item,
    displayedSynthesisSettings: item
      ? getDisplayedTtsSynthesisSettings(item, voicePresets)
      : undefined,
    loadPreset,
    setSynthesisSettings,
  };
}
