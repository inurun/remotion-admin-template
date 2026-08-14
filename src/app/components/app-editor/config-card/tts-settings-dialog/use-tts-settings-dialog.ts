import { useFormContext, useWatch } from "react-hook-form";
import type { DraftProject } from "@/_schemas";
import { SynthesisSettingsFields } from "@/app/features/settings/components/synthesis-settings-fields";
import { getVoicePresetSettings, useSettings } from "@/app/features/settings";
import { useSelectedPage } from "@/app/features/page";
import { useSelectedTts } from "@/app/features/tts";

export function useTtsSettingsDialog() {
  const { selectedPageIndex } = useSelectedPage();
  const { selectedTtsIndex } = useSelectedTts();
  const { control, setValue } = useFormContext<DraftProject>();
  const { voiceSettings } = useSettings();
  const name = `pages.${selectedPageIndex}.tts.${selectedTtsIndex}` as const;
  const item = useWatch({ control, name });

  const setSynthesisSettings: Parameters<typeof SynthesisSettingsFields>[0]["onChange"] = (
    value,
  ) => {
    setValue(`${name}.synthesisSettings`, value, {
      shouldDirty: true,
      shouldValidate: true,
    });
  };

  const loadPreset = () => {
    setSynthesisSettings(
      getVoicePresetSettings(voiceSettings, {
        provider: item.provider,
        voiceName: item.voiceName ?? "",
        voiceVersion: item.voiceVersion ?? "",
      }),
    );
  };

  return {
    item,
    loadPreset,
    setSynthesisSettings,
  };
}
